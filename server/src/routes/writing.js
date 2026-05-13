// ── FILE: server/src/routes/writing.js ──
const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../middleware/auth');
const { calculateOverallBand, roundToHalf } = require('../services/scoreService');

router.get('/pending', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const submissions = await req.prisma.writingSubmission.findMany({
      where: { bandScore: null },
      include: {
        moduleSession: {
          include: {
            session: { include: { user: true, test: true } }
          }
        }
      },
      orderBy: { moduleSession: { submittedAt: 'asc' } }
    });
    res.json(submissions);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch pending submissions' });
  }
});

router.get('/:id', authenticate, async (req, res) => {
  try {
    const submission = await req.prisma.writingSubmission.findUnique({
      where: { id: req.params.id },
      include: {
        moduleSession: {
          include: { session: { include: { test: true } } }
        }
      }
    });
    if (!submission) return res.status(404).json({ error: 'Submission not found' });
    if (req.user.role === 'STUDENT' && submission.moduleSession.session.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    res.json(submission);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch submission' });
  }
});

router.patch('/:id/evaluate', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const { taskAchievement, coherenceCohesion, lexicalResource, grammaticalRange, feedback } = req.body;
    const submission = await req.prisma.writingSubmission.findUnique({ where: { id: req.params.id } });
    if (!submission) return res.status(404).json({ error: 'Submission not found' });

    const band = roundToHalf((taskAchievement + coherenceCohesion + lexicalResource + grammaticalRange) / 4);
    const updated = await req.prisma.writingSubmission.update({
      where: { id: req.params.id },
      data: { taskAchievement, coherenceCohesion, lexicalResource, grammaticalRange, bandScore: band, feedback, evaluatedBy: req.user.id, evaluatedAt: new Date() }
    });

    const allSubmissions = await req.prisma.writingSubmission.findMany({
      where: { moduleSessionId: submission.moduleSessionId, bandScore: { not: null } }
    });

    if (allSubmissions.length >= 2) {
      const task1 = allSubmissions.find(s => s.taskNumber === 1);
      const task2 = allSubmissions.find(s => s.taskNumber === 2);
      if (task1 && task2) {
        const writingBand = roundToHalf(task1.bandScore * 0.33 + task2.bandScore * 0.67);
        const session = await req.prisma.moduleSession.findUnique({ where: { id: submission.moduleSessionId } });
        const result = await req.prisma.result.findUnique({ where: { sessionId: session.sessionId } });
        if (result) {
          await req.prisma.result.update({ where: { id: result.id }, data: { writingBand } });
        } else {
          await req.prisma.result.create({ data: { sessionId: session.sessionId, writingBand } });
        }
      }
    }

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to evaluate' });
  }
});

router.post('/save', authenticate, async (req, res) => {
  try {
    const { moduleSessionId, taskNumber, content, wordCount } = req.body;
    const existing = await req.prisma.writingSubmission.findFirst({ where: { moduleSessionId, taskNumber } });
    if (existing) {
      await req.prisma.writingSubmission.update({ where: { id: existing.id }, data: { content, wordCount } });
    } else {
      await req.prisma.writingSubmission.create({ data: { moduleSessionId, taskNumber, content, wordCount } });
    }
    res.json({ saved: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save writing' });
  }
});

module.exports = router;