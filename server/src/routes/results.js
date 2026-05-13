// ── FILE: server/src/routes/results.js ──
const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../middleware/auth');

router.get('/session/:sessionId', authenticate, async (req, res) => {
  try {
    const session = await req.prisma.testSession.findUnique({ where: { id: req.params.sessionId } });
    if (!session) return res.status(404).json({ error: 'Session not found' });
    if (session.userId !== req.user.id && req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Access denied' });

    const result = await req.prisma.result.findUnique({ where: { sessionId: req.params.sessionId } });
    if (!result) return res.status(404).json({ error: 'Result not found' });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch result' });
  }
});

router.get('/admin/all', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const { testId, studentId, page = 1, limit = 20 } = req.query;
    const where = {};
    if (testId) where.session = { testId };
    if (studentId) where.userId = studentId;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [results, total] = await Promise.all([
      req.prisma.result.findMany({
        where,
        include: { session: { include: { user: true, test: true } } },
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' }
      }),
      req.prisma.result.count({ where })
    ]);
    res.json({ results, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch results' });
  }
});

router.get('/student/my', authenticate, async (req, res) => {
  try {
    const results = await req.prisma.result.findMany({
      where: { session: { userId: req.user.id } },
      include: { session: { include: { test: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch results' });
  }
});

router.patch('/:id/release', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const result = await req.prisma.result.findUnique({ where: { id: req.params.id } });
    if (!result) return res.status(404).json({ error: 'Result not found' });

    const session = await req.prisma.testSession.findUnique({ where: { id: result.sessionId } });
    const user = await req.prisma.user.findUnique({ where: { id: session.userId } });
    const test = await req.prisma.test.findUnique({ where: { id: session.testId } });

    const updated = await req.prisma.result.update({
      where: { id: req.params.id },
      data: { isReleased: true, releasedAt: new Date() }
    });

    await req.prisma.notification.create({
      data: { userId: user.id, title: 'Results Released', message: `Your results for "${test.title}" are now available.` }
    });

    const { sendResultEmail } = require('../services/emailService');
    await sendResultEmail(user, test, updated);

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to release result' });
  }
});

module.exports = router;