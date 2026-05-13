// ── FILE: server/src/routes/enrollments.js ──
const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../middleware/auth');

router.get('/', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const enrollments = await req.prisma.enrollment.findMany({
      include: { user: true, test: true },
      orderBy: { assignedAt: 'desc' }
    });
    res.json(enrollments);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch enrollments' });
  }
});

router.post('/', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const { testIds, userIds } = req.body;
    if (!Array.isArray(testIds) || !Array.isArray(userIds)) {
      return res.status(400).json({ error: 'testIds and userIds must be arrays' });
    }
    const data = [];
    for (const testId of testIds) {
      for (const userId of userIds) {
        data.push({ testId, userId, assignedBy: req.user.id });
      }
    }
    await req.prisma.enrollment.createMany({ data, skipDuplicates: true });
    res.json({ message: 'Enrollments created', count: data.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create enrollments' });
  }
});

router.delete('/:id', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    await req.prisma.enrollment.delete({ where: { id: req.params.id } });
    res.json({ message: 'Enrollment removed' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove enrollment' });
  }
});

module.exports = router;