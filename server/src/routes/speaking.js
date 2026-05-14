// ── FILE: server/src/routes/speaking.js ──
const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../middleware/auth');
const { uploadSpeaking } = require('../config/cloudinary');
const { cloudinary } = require('../config/cloudinary');
const { roundToHalf } = require('../services/scoreService');

// Per-question speaking response upload. New canonical endpoint.
router.post('/response', authenticate, uploadSpeaking.single('audio'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No audio file' });
    const { moduleSessionId, questionId, duration } = req.body;
    if (!moduleSessionId || !questionId) return res.status(400).json({ error: 'moduleSessionId and questionId required' });

    const ms = await req.prisma.moduleSession.findUnique({
      where: { id: moduleSessionId },
      include: { session: true, module: true }
    });
    if (!ms) return res.status(404).json({ error: 'Module session not found' });
    if (ms.session.userId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const question = await req.prisma.question.findUnique({ where: { id: questionId } });
    if (!question || question.moduleId !== ms.moduleId) {
      return res.status(400).json({ error: 'Question does not belong to this module' });
    }

    let submission = await req.prisma.speakingSubmission.findUnique({ where: { moduleSessionId } });
    if (!submission) {
      submission = await req.prisma.speakingSubmission.create({ data: { moduleSessionId } });
    }

    const existing = await req.prisma.speakingResponse.findUnique({
      where: { submissionId_questionId: { submissionId: submission.id, questionId } }
    });

    if (existing) {
      if (existing.audioPublicId) {
        await cloudinary.uploader.destroy(existing.audioPublicId, { resource_type: 'video' }).catch(() => {});
      }
      const updated = await req.prisma.speakingResponse.update({
        where: { id: existing.id },
        data: {
          audioUrl: req.file.path,
          audioPublicId: req.file.filename,
          duration: duration ? Number.parseInt(duration, 10) : null,
          recordedAt: new Date()
        }
      });
      return res.json(updated);
    }

    const created = await req.prisma.speakingResponse.create({
      data: {
        submissionId: submission.id,
        questionId,
        audioUrl: req.file.path,
        audioPublicId: req.file.filename,
        duration: duration ? Number.parseInt(duration, 10) : null
      }
    });
    res.json(created);
  } catch (err) {
    console.error('[speaking response]', err);
    res.status(500).json({ error: 'Failed to upload response' });
  }
});

// Legacy single-blob upload (kept for backward-compat; deprecated).
router.post('/upload', authenticate, uploadSpeaking.single('audio'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No audio file' });
    const { moduleSessionId } = req.body;

    const ms = await req.prisma.moduleSession.findUnique({
      where: { id: moduleSessionId },
      include: { session: true }
    });
    if (!ms) return res.status(404).json({ error: 'Module session not found' });
    if (ms.session.userId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const existing = await req.prisma.speakingSubmission.findUnique({ where: { moduleSessionId } });
    if (existing) {
      if (existing.audioPublicId) {
        await cloudinary.uploader.destroy(existing.audioPublicId, { resource_type: 'video' }).catch(() => {});
      }
      const updated = await req.prisma.speakingSubmission.update({
        where: { id: existing.id },
        data: { audioUrl: req.file.path, audioPublicId: req.file.filename }
      });
      return res.json({ audioUrl: req.file.path, publicId: req.file.filename, submissionId: updated.id });
    }
    const submission = await req.prisma.speakingSubmission.create({
      data: { moduleSessionId, audioUrl: req.file.path, audioPublicId: req.file.filename }
    });
    res.json({ audioUrl: req.file.path, publicId: req.file.filename, submissionId: submission.id });
  } catch (err) {
    console.error('[speaking upload]', err);
    res.status(500).json({ error: 'Failed to upload' });
  }
});

router.get('/pending', authenticate, requireRole('ADMIN', 'EXAMINER'), async (req, res) => {
  try {
    const submissions = await req.prisma.speakingSubmission.findMany({
      where: { bandScore: null },
      include: {
        responses: { include: { question: true }, orderBy: { recordedAt: 'asc' } },
        moduleSession: {
          include: {
            session: { include: { user: true, test: true } },
            module: true,
            liveSpeakingSession: { include: { examiner: { select: { id: true, name: true, email: true } } } }
          }
        }
      },
      orderBy: { moduleSession: { submittedAt: 'asc' } }
    });
    res.json(submissions);
  } catch (err) {
    console.error('[speaking pending]', err);
    res.status(500).json({ error: 'Failed to fetch pending' });
  }
});

router.patch('/:id/evaluate', authenticate, requireRole('ADMIN', 'EXAMINER'), async (req, res) => {
  try {
    const { fluencyCoherence, lexicalResource, grammaticalRange, pronunciation, feedback } = req.body;
    const submission = await req.prisma.speakingSubmission.findUnique({
      where: { id: req.params.id },
      include: { moduleSession: true }
    });
    if (!submission) return res.status(404).json({ error: 'Submission not found' });

    const band = roundToHalf((fluencyCoherence + lexicalResource + grammaticalRange + pronunciation) / 4);
    const updated = await req.prisma.speakingSubmission.update({
      where: { id: req.params.id },
      data: { fluencyCoherence, lexicalResource, grammaticalRange, pronunciation, bandScore: band, feedback, evaluatedBy: req.user.id, evaluatedAt: new Date() }
    });

    const sessionId = submission.moduleSession.sessionId;
    const result = await req.prisma.result.findUnique({ where: { sessionId } });
    if (result) {
      await req.prisma.result.update({ where: { id: result.id }, data: { speakingBand: band } });
    } else {
      await req.prisma.result.create({ data: { sessionId, speakingBand: band } });
    }

    res.json(updated);
  } catch (err) {
    console.error('[speaking evaluate]', err);
    res.status(500).json({ error: 'Failed to evaluate' });
  }
});

module.exports = router;
