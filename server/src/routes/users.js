// ── FILE: server/src/routes/users.js ──
const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../middleware/auth');

router.get('/', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = {
      role: 'STUDENT',
      ...(search ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } }
        ]
      } : {})
    };
    const [users, total] = await Promise.all([
      req.prisma.user.findMany({ where, skip, take: parseInt(limit), orderBy: { createdAt: 'desc' }, select: { id: true, name: true, email: true, phone: true, isActive: true, createdAt: true, _count: { select: { sessions: true } } } }),
      req.prisma.user.count({ where })
    ]);
    res.json({ users, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.get('/examiners', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const examiners = await req.prisma.user.findMany({
      where: { role: 'EXAMINER', isActive: true },
      orderBy: { name: 'asc' },
      select: {
        id: true, name: true, email: true, isActive: true, createdAt: true,
        integrations: { select: { provider: true, externalAccountEmail: true } }
      }
    });
    res.json(examiners);
  } catch (err) {
    console.error('[users examiners]', err);
    res.status(500).json({ error: 'Failed to fetch examiners' });
  }
});

router.get('/:id', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const user = await req.prisma.user.findUnique({
      where: { id: req.params.id },
      include: {
        sessions: { include: { test: true, result: true }, orderBy: { startedAt: 'desc' }, take: 10 },
        enrollments: { include: { test: true } }
      }
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

router.patch('/:id/status', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const user = await req.prisma.user.update({ where: { id: req.params.id }, data: { isActive: req.body.isActive } });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update status' });
  }
});

router.delete('/:id', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    await req.prisma.user.delete({ where: { id: req.params.id } });
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

module.exports = router;