// ── FILE: server/src/routes/auth.js ──
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { authenticate, requireRole } = require('../middleware/auth');
const { registerValidation, loginValidation } = require('../utils/validators');
const { sendLoginCredentials } = require('../services/emailService');

router.post('/register', registerValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { name, email, password, phone } = req.body;
    const existing = await req.prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ error: 'Email already registered' });

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await req.prisma.user.create({
      data: { name, email, passwordHash, phone }
    });

    const accessToken = jwt.sign({ userId: user.id }, process.env.JWT_ACCESS_SECRET, { expiresIn: process.env.ACCESS_TOKEN_EXPIRY || '15m' });
    const refreshToken = jwt.sign({ userId: user.id }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });

    await req.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    });

    res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: false, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 });
    res.json({ accessToken, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    console.error('Auth error:', err);
    res.status(500).json({ error: err.message || 'Registration failed' });
  }
});

router.post('/login', loginValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email, password } = req.body;
    const user = await req.prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const accessToken = jwt.sign({ userId: user.id }, process.env.JWT_ACCESS_SECRET, { expiresIn: process.env.ACCESS_TOKEN_EXPIRY || '15m' });
    const refreshToken = jwt.sign({ userId: user.id }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });

    await req.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    });

    res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: false, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 });
    res.json({ accessToken, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
});

router.post('/refresh', async (req, res) => {
  try {
    const token = req.cookies.refreshToken;
    if (!token) return res.status(401).json({ error: 'No refresh token' });

    const stored = await req.prisma.refreshToken.findUnique({ where: { token } });
    if (!stored || stored.expiresAt < new Date()) {
      if (stored) await req.prisma.refreshToken.delete({ where: { token } });
      return res.status(401).json({ error: 'Refresh token expired' });
    }

    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const accessToken = jwt.sign({ userId: decoded.userId }, process.env.JWT_ACCESS_SECRET, { expiresIn: process.env.ACCESS_TOKEN_EXPIRY || '15m' });

    res.json({ accessToken });
  } catch (err) {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

router.post('/logout', async (req, res) => {
  try {
    const token = req.cookies.refreshToken;
    if (token) await req.prisma.refreshToken.deleteMany({ where: { token } });
    res.clearCookie('refreshToken');
    res.json({ message: 'Logged out' });
  } catch (err) {
    res.status(500).json({ error: 'Logout failed' });
  }
});

router.post('/admin/create-user', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const { name, email, password, role, phone } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'name, email, password required' });
    if (!['STUDENT', 'ADMIN', 'EXAMINER'].includes(role)) return res.status(400).json({ error: 'Invalid role' });

    const existing = await req.prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ error: 'Email already registered' });

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await req.prisma.user.create({
      data: { name, email, passwordHash, phone, role }
    });
    try { await sendLoginCredentials(email, password); } catch (_) {}
    res.json({ id: user.id, name: user.name, email: user.email, role: user.role });
  } catch (err) {
    console.error('Admin create user error:', err);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

router.get('/me', authenticate, async (req, res) => {
  const user = await req.prisma.user.findUnique({
    where: { id: req.user.id },
    select: { id: true, name: true, email: true, role: true, phone: true, avatar: true, createdAt: true }
  });
  res.json(user);
});

module.exports = router;