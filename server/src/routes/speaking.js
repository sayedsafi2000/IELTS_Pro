// ── FILE: server/src/routes/speaking.js ──
const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../middleware/auth');
const { uploadSpeaking } = require('../config/cloudinary');
const { cloudinary } = require('../config/cloudinary');
const { roundToHalf } = require('../services/scoreService');

router.post('/upload', authenticate, uploadSpeaking.single('audio'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No audio file' });
    const { moduleSessionId } = req.body;

    const ms = await req.prisma.moduleSession.findFirst({ where: { id: moduleSessionId } });
    if (!ms) return res.status(404).json({ error: 'Module session not found' });
    if (ms.session.userId !== req.user.id && req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Access denied' });

    const existing = await req.prisma.speakingSubmission.findUnique({ where: { moduleSessionId } });
    if (existing) {
      if (existing.audioPublicId) {
        await cloudinary.uploader.destroy(existing.audioPublicId, { resource_type: 'video' }).catch(() => {});
      }
      const updated = await req.prisma.speakingSubmission.update({
        where: { id: existing.id },
        data: { audioUrl: req.file.path, audioPublicId: req.file.filename }
      });
      res.json({ audioUrl: req.file.path, publicId: req.file.filename, submissionId: updated.id });
    } else {
      const submission = await req.prisma.speakingSubmission.create({
        data: {
          moduleSessionId,
          audioUrl: req.file.path,
          audioPublicId: req.file.filename
        }
      });
      res.json({ audioUrl: req.file.path, publicId: req.file.filename, submissionId: submission.id });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to upload' });
  }
});

router.get('/pending', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const submissions = await req.prisma.speakingSubmission.findMany({
      where: { bandScore: null },
      include: {
        moduleSession: {
          include: { session: { include: { user: true, test: true } } }
        }
      },
      orderBy: { moduleSession: { submittedAt: 'asc' } }
    });
    res.json(submissions);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch pending' });
  }
});

router.patch('/:id/evaluate', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const { fluencyCoherence, lexicalResource, grammaticalRange, pronunciation, feedback } = req.body;
    const submission = await req.prisma.speakingSubmission.findUnique({ where: { id: req.params.id } });
    if (!submission) return res.status(404).json({ error: 'Submission not found' });

    const band = roundToHalf((fluencyCoherence + lexicalResource + grammaticalRange + pronunciation) / 4);
    const updated = await req.prisma.speakingSubmission.update({
      where: { id: req.params.id },
      data: { fluencyCoherence, lexicalResource, grammaticalRange, pronunciation, bandScore: band, feedback, evaluatedBy: req.user.id, evaluatedAt: new Date() }
    });

    const result = await req.prisma.result.findUnique({ where: { sessionId: submission.moduleSession.sessionId } });
    if (result) {
      await req.prisma.result.update({ where: { id: result.id }, data: { speakingBand: band } });
    } else {
      await req.prisma.result.create({ data: { sessionId: submission.moduleSession.sessionId, speakingBand: band } });
    }

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to evaluate' });
  }
});

module.exports = router;