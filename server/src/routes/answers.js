// ── FILE: server/src/routes/answers.js ──
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

router.post('/save', authenticate, [
  body('moduleSessionId').isUUID(),
  body('questionId').isUUID()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { moduleSessionId, questionId, answer } = req.body;
    const ms = await req.prisma.moduleSession.findFirst({ where: { id: moduleSessionId } });
    if (!ms || ms.status === 'SUBMITTED') return res.status(403).json({ error: 'Module already submitted' });

    if (!ms.startedAt) {
      await req.prisma.moduleSession.update({ where: { id: moduleSessionId }, data: { status: 'IN_PROGRESS', startedAt: new Date() } });
    }

    const existing = await req.prisma.answer.findFirst({ where: { moduleSessionId, questionId } });
    if (existing) {
      await req.prisma.answer.update({ where: { id: existing.id }, data: { studentAnswer: answer || existing.studentAnswer } });
    } else {
      await req.prisma.answer.create({ data: { moduleSessionId, questionId, studentAnswer: answer } });
    }
    res.json({ saved: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save answer' });
  }
});

router.post('/flag', authenticate, async (req, res) => {
  try {
    const { moduleSessionId, questionId } = req.body;
    const answer = await req.prisma.answer.findFirst({ where: { moduleSessionId, questionId } });
    if (!answer) return res.status(404).json({ error: 'Answer not found' });
    const updated = await req.prisma.answer.update({ where: { id: answer.id }, data: { isFlagged: !answer.isFlagged } });
    res.json({ isFlagged: updated.isFlagged });
  } catch (err) {
    res.status(500).json({ error: 'Failed to toggle flag' });
  }
});

router.post('/bulk-save', authenticate, async (req, res) => {
  try {
    const { answers } = req.body;
    if (!Array.isArray(answers)) return res.status(400).json({ error: 'Answers must be an array' });

    for (const { moduleSessionId, questionId, answer } of answers) {
      const ms = await req.prisma.moduleSession.findFirst({ where: { id: moduleSessionId } });
      if (ms && ms.status !== 'SUBMITTED') {
        if (!ms.startedAt) {
          await req.prisma.moduleSession.update({ where: { id: moduleSessionId }, data: { status: 'IN_PROGRESS', startedAt: new Date() } });
        }
        const existing = await req.prisma.answer.findFirst({ where: { moduleSessionId, questionId } });
        if (existing) {
          await req.prisma.answer.update({ where: { id: existing.id }, data: { studentAnswer: answer } });
        } else {
          await req.prisma.answer.create({ data: { moduleSessionId, questionId, studentAnswer: answer } });
        }
      }
    }
    res.json({ saved: true, count: answers.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to bulk save' });
  }
});

module.exports = router;