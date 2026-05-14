// ── FILE: server/src/routes/liveSpeaking.js ──
const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../middleware/auth');
const { uploadSpeaking, cloudinary } = require('../config/cloudinary');
const { getProvider } = require('../services/meetingProviders');
const { notify, notifyAdmins } = require('../services/notificationService');
const emailService = require('../services/emailService');

function liveInclude() {
  return {
    examiner: { select: { id: true, name: true, email: true } },
    moduleSession: {
      include: {
        session: { include: { user: { select: { id: true, name: true, email: true } }, test: true } },
        module: true
      }
    }
  };
}

// Student requests a slot
router.post('/request', authenticate, async (req, res) => {
  try {
    const { moduleSessionId, preferredAt, notes } = req.body;
    if (!moduleSessionId || !preferredAt) return res.status(400).json({ error: 'moduleSessionId and preferredAt required' });

    const ms = await req.prisma.moduleSession.findUnique({
      where: { id: moduleSessionId },
      include: { session: true, module: true }
    });
    if (!ms) return res.status(404).json({ error: 'Module session not found' });
    if (ms.session.userId !== req.user.id) return res.status(403).json({ error: 'Access denied' });
    if (ms.module.type !== 'SPEAKING' || ms.module.speakingMode !== 'LIVE') {
      return res.status(400).json({ error: 'Module is not configured for live speaking' });
    }

    const existing = await req.prisma.liveSpeakingSession.findUnique({ where: { moduleSessionId } });
    if (existing && !['CANCELLED', 'NO_SHOW'].includes(existing.status)) {
      return res.status(409).json({ error: 'A live session already exists for this module', existing });
    }
    if (existing) {
      await req.prisma.liveSpeakingSession.delete({ where: { id: existing.id } });
    }

    const live = await req.prisma.liveSpeakingSession.create({
      data: {
        moduleSessionId,
        scheduledAt: new Date(preferredAt),
        studentPreferredAt: new Date(preferredAt),
        status: 'REQUESTED',
        notes: notes || null,
      },
      include: liveInclude()
    });

    await notifyAdmins(req.prisma, {
      type: 'LIVE_SPEAKING_REQUESTED',
      title: 'New live speaking request',
      message: `${live.moduleSession.session.user.name} requested a slot at ${new Date(preferredAt).toUTCString()}`,
      link: '/admin/live-speaking',
      meta: { liveId: live.id, preferredAt }
    });

    res.json(live);
  } catch (err) {
    console.error('[live-speaking request]', err);
    res.status(500).json({ error: 'Failed to request slot' });
  }
});

// Admin creates / confirms a session (calls provider API to create meeting)
router.post('/', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const { moduleSessionId, examinerId, scheduledAt, durationMins, meetingProvider, notes } = req.body;
    if (!moduleSessionId || !examinerId || !scheduledAt || !meetingProvider) {
      return res.status(400).json({ error: 'moduleSessionId, examinerId, scheduledAt, meetingProvider required' });
    }

    const ms = await req.prisma.moduleSession.findUnique({
      where: { id: moduleSessionId },
      include: { session: { include: { user: true, test: true } }, module: true }
    });
    if (!ms) return res.status(404).json({ error: 'Module session not found' });
    if (ms.module.type !== 'SPEAKING' || ms.module.speakingMode !== 'LIVE') {
      return res.status(400).json({ error: 'Module is not configured for live speaking' });
    }

    const examiner = await req.prisma.user.findUnique({ where: { id: examinerId } });
    if (!examiner || examiner.role !== 'EXAMINER') {
      return res.status(400).json({ error: 'examinerId does not match an EXAMINER user' });
    }

    const integration = await req.prisma.examinerIntegration.findUnique({
      where: { userId_provider: { userId: examinerId, provider: meetingProvider } }
    });
    if (!integration) {
      return res.status(412).json({ error: `Examiner has not connected ${meetingProvider}`, code: 'PROVIDER_NOT_CONNECTED' });
    }

    // Check overlap: no other scheduled session in [scheduledAt, scheduledAt+durationMins]
    const start = new Date(scheduledAt);
    const end = new Date(start.getTime() + (durationMins || 15) * 60_000);
    const overlap = await req.prisma.liveSpeakingSession.findFirst({
      where: {
        examinerId,
        status: { in: ['SCHEDULED', 'RESCHEDULED'] },
        scheduledAt: { lt: end, gte: new Date(start.getTime() - 60 * 60_000) }
      }
    });
    if (overlap) {
      return res.status(409).json({ error: 'Examiner has overlapping session', conflict: overlap });
    }

    let externalId = null;
    let meetingUrl = null;
    try {
      const provider = getProvider(meetingProvider);
      const result = await provider.createMeeting(req.prisma, integration, {
        summary: `IELTS Speaking - ${ms.session.user.name} - ${ms.session.test.title}`,
        description: notes || 'IELTS Speaking interview',
        startISO: start.toISOString(),
        durationMins: durationMins || 15,
        attendees: [
          { email: ms.session.user.email },
          { email: examiner.email }
        ]
      });
      externalId = result.externalId;
      meetingUrl = result.meetingUrl;
    } catch (provErr) {
      console.error('[live-speaking provider create]', provErr.response?.data || provErr.message);
      return res.status(502).json({ error: `Failed to create meeting via ${meetingProvider}: ${provErr.message}` });
    }

    // Upsert against unique(moduleSessionId)
    const existing = await req.prisma.liveSpeakingSession.findUnique({ where: { moduleSessionId } });
    const data = {
      examinerId,
      scheduledAt: start,
      durationMins: durationMins || 15,
      meetingUrl,
      meetingProvider,
      meetingExternalId: externalId,
      status: 'SCHEDULED',
      notes: notes || null,
    };
    const live = existing
      ? await req.prisma.liveSpeakingSession.update({ where: { id: existing.id }, data, include: liveInclude() })
      : await req.prisma.liveSpeakingSession.create({ data: { moduleSessionId, ...data }, include: liveInclude() });

    // Notifications + emails
    await notify(req.prisma, {
      userId: ms.session.userId,
      type: 'LIVE_SPEAKING_SCHEDULED',
      title: 'Speaking interview scheduled',
      message: `Your live speaking interview is on ${start.toUTCString()}`,
      link: '/my-speaking',
      meta: { liveId: live.id, meetingUrl, scheduledAt: start }
    });
    await notify(req.prisma, {
      userId: examinerId,
      type: 'LIVE_SPEAKING_SCHEDULED',
      title: 'New session assigned',
      message: `${ms.session.user.name} on ${start.toUTCString()}`,
      link: '/examiner',
      meta: { liveId: live.id, meetingUrl, scheduledAt: start }
    });
    emailService.sendLiveSpeakingScheduled(ms.session.user, ms.session.test, live, examiner).catch(() => {});

    res.json(live);
  } catch (err) {
    console.error('[live-speaking create]', err);
    res.status(500).json({ error: 'Failed to create live session' });
  }
});

router.get('/', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const where = {};
    if (req.query.status) where.status = req.query.status;
    if (req.query.examinerId) where.examinerId = req.query.examinerId;
    if (req.query.from) where.scheduledAt = { ...(where.scheduledAt || {}), gte: new Date(req.query.from) };
    if (req.query.to) where.scheduledAt = { ...(where.scheduledAt || {}), lte: new Date(req.query.to) };
    const list = await req.prisma.liveSpeakingSession.findMany({
      where,
      include: liveInclude(),
      orderBy: { scheduledAt: 'asc' }
    });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: 'Failed to list sessions' });
  }
});

router.get('/mine', authenticate, async (req, res) => {
  try {
    const list = await req.prisma.liveSpeakingSession.findMany({
      where: { moduleSession: { session: { userId: req.user.id } } },
      include: liveInclude(),
      orderBy: { scheduledAt: 'asc' }
    });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

router.get('/examiner', authenticate, requireRole('EXAMINER', 'ADMIN'), async (req, res) => {
  try {
    const list = await req.prisma.liveSpeakingSession.findMany({
      where: { examinerId: req.user.id },
      include: liveInclude(),
      orderBy: { scheduledAt: 'asc' }
    });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

router.get('/:id', authenticate, async (req, res) => {
  try {
    const live = await req.prisma.liveSpeakingSession.findUnique({
      where: { id: req.params.id },
      include: liveInclude()
    });
    if (!live) return res.status(404).json({ error: 'Not found' });
    const isOwner = live.moduleSession.session.user.id === req.user.id;
    const isExaminer = live.examinerId === req.user.id;
    if (!isOwner && !isExaminer && req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Access denied' });
    res.json(live);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch session' });
  }
});

router.patch('/:id', authenticate, requireRole('ADMIN', 'EXAMINER'), async (req, res) => {
  try {
    const live = await req.prisma.liveSpeakingSession.findUnique({
      where: { id: req.params.id },
      include: liveInclude()
    });
    if (!live) return res.status(404).json({ error: 'Not found' });
    if (req.user.role === 'EXAMINER' && live.examinerId !== req.user.id) {
      return res.status(403).json({ error: 'Not your session' });
    }

    const { scheduledAt, durationMins, status, recordingUrl, notes } = req.body;
    const data = {};
    const wasRescheduled = scheduledAt && new Date(scheduledAt).getTime() !== new Date(live.scheduledAt).getTime();

    if (scheduledAt) data.scheduledAt = new Date(scheduledAt);
    if (durationMins) data.durationMins = durationMins;
    if (status) {
      if (!['REQUESTED', 'SCHEDULED', 'RESCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }
      data.status = wasRescheduled ? 'RESCHEDULED' : status;
    } else if (wasRescheduled) {
      data.status = 'RESCHEDULED';
    }
    if (recordingUrl !== undefined) data.recordingUrl = recordingUrl;
    if (notes !== undefined) data.notes = notes;

    // If rescheduling on provider side, attempt API patch
    if (wasRescheduled && live.meetingExternalId && live.meetingProvider !== 'OTHER') {
      try {
        const integration = await req.prisma.examinerIntegration.findUnique({
          where: { userId_provider: { userId: live.examinerId, provider: live.meetingProvider } }
        });
        if (integration) {
          const provider = getProvider(live.meetingProvider);
          const result = await provider.rescheduleMeeting(req.prisma, integration, live.meetingExternalId, {
            startISO: new Date(scheduledAt).toISOString(),
            durationMins: durationMins || live.durationMins,
          });
          if (result?.meetingUrl) data.meetingUrl = result.meetingUrl;
        }
      } catch (provErr) {
        console.error('[live-speaking reschedule provider]', provErr.message);
      }
    }

    const updated = await req.prisma.liveSpeakingSession.update({
      where: { id: live.id },
      data,
      include: liveInclude()
    });

    // If marked COMPLETED, ensure SpeakingSubmission exists and flip moduleSession to SUBMITTED
    if (data.status === 'COMPLETED') {
      let sub = await req.prisma.speakingSubmission.findUnique({ where: { moduleSessionId: live.moduleSessionId } });
      if (!sub) {
        sub = await req.prisma.speakingSubmission.create({ data: { moduleSessionId: live.moduleSessionId } });
      }
      await req.prisma.moduleSession.update({
        where: { id: live.moduleSessionId },
        data: { status: 'SUBMITTED', submittedAt: new Date() }
      });
    }

    // Notification on reschedule / cancel
    if (wasRescheduled) {
      await notify(req.prisma, {
        userId: live.moduleSession.session.user.id,
        type: 'LIVE_SPEAKING_RESCHEDULED',
        title: 'Speaking interview rescheduled',
        message: `New time: ${new Date(scheduledAt).toUTCString()}`,
        link: '/my-speaking',
        meta: { liveId: live.id }
      });
      emailService.sendLiveSpeakingRescheduled(
        live.moduleSession.session.user,
        live.moduleSession.session.test,
        updated,
        live.examiner
      ).catch(() => {});
    } else if (status === 'CANCELLED') {
      await notify(req.prisma, {
        userId: live.moduleSession.session.user.id,
        type: 'LIVE_SPEAKING_CANCELLED',
        title: 'Speaking interview cancelled',
        message: `Your scheduled session on ${new Date(live.scheduledAt).toUTCString()} was cancelled.`,
        link: '/my-speaking',
        meta: { liveId: live.id }
      });
      emailService.sendLiveSpeakingCancelled(
        live.moduleSession.session.user,
        live.moduleSession.session.test,
        live
      ).catch(() => {});
    }

    res.json(updated);
  } catch (err) {
    console.error('[live-speaking patch]', err);
    res.status(500).json({ error: 'Failed to update session' });
  }
});

router.post('/:id/recording', authenticate, requireRole('EXAMINER', 'ADMIN'), uploadSpeaking.single('recording'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No recording file' });
    const live = await req.prisma.liveSpeakingSession.findUnique({ where: { id: req.params.id } });
    if (!live) return res.status(404).json({ error: 'Not found' });
    if (req.user.role === 'EXAMINER' && live.examinerId !== req.user.id) {
      return res.status(403).json({ error: 'Not your session' });
    }
    if (live.recordingPublicId) {
      await cloudinary.uploader.destroy(live.recordingPublicId, { resource_type: 'video' }).catch(() => {});
    }
    const updated = await req.prisma.liveSpeakingSession.update({
      where: { id: live.id },
      data: { recordingUrl: req.file.path, recordingPublicId: req.file.filename }
    });
    res.json(updated);
  } catch (err) {
    console.error('[live-speaking recording]', err);
    res.status(500).json({ error: 'Failed to upload recording' });
  }
});

router.delete('/:id', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const live = await req.prisma.liveSpeakingSession.findUnique({
      where: { id: req.params.id },
      include: liveInclude()
    });
    if (!live) return res.status(404).json({ error: 'Not found' });

    if (live.meetingExternalId && live.examinerId) {
      try {
        const integration = await req.prisma.examinerIntegration.findUnique({
          where: { userId_provider: { userId: live.examinerId, provider: live.meetingProvider } }
        });
        if (integration) {
          const provider = getProvider(live.meetingProvider);
          await provider.cancelMeeting(req.prisma, integration, live.meetingExternalId);
        }
      } catch (provErr) {
        console.error('[live-speaking provider cancel]', provErr.message);
      }
    }

    const updated = await req.prisma.liveSpeakingSession.update({
      where: { id: live.id },
      data: { status: 'CANCELLED' },
      include: liveInclude()
    });

    await notify(req.prisma, {
      userId: live.moduleSession.session.user.id,
      type: 'LIVE_SPEAKING_CANCELLED',
      title: 'Speaking interview cancelled',
      message: `Your scheduled session on ${new Date(live.scheduledAt).toUTCString()} was cancelled.`,
      link: '/my-speaking',
      meta: { liveId: live.id }
    });
    emailService.sendLiveSpeakingCancelled(
      live.moduleSession.session.user,
      live.moduleSession.session.test,
      live
    ).catch(() => {});

    res.json(updated);
  } catch (err) {
    console.error('[live-speaking delete]', err);
    res.status(500).json({ error: 'Failed to cancel session' });
  }
});

module.exports = router;
