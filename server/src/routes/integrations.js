// ── FILE: server/src/routes/integrations.js ──
const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../middleware/auth');
const { encrypt } = require('../services/cryptoService');
const google = require('../services/meetingProviders/google');
const zoom = require('../services/meetingProviders/zoom');

// State store: short-lived in-memory map keyed by state token -> userId.
// For a real prod deployment, use Redis or signed JWT. MVP uses memory + 10-min expiry.
const stateStore = new Map();
function putState(userId) {
  const token = require('crypto').randomBytes(16).toString('hex');
  stateStore.set(token, { userId, expires: Date.now() + 10 * 60_000 });
  return token;
}
function takeState(token) {
  const entry = stateStore.get(token);
  if (!entry) return null;
  stateStore.delete(token);
  if (entry.expires < Date.now()) return null;
  return entry;
}

router.get('/', authenticate, async (req, res) => {
  try {
    const rows = await req.prisma.examinerIntegration.findMany({
      where: { userId: req.user.id },
      select: { id: true, provider: true, externalAccountEmail: true, expiresAt: true, createdAt: true, updatedAt: true }
    });
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to list integrations' });
  }
});

router.get('/google/authorize-url', authenticate, requireRole('EXAMINER', 'ADMIN'), (req, res) => {
  const state = putState(req.user.id);
  res.json({ url: google.authUrl(state) });
});

router.get('/google/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    if (!code || !state) return res.status(400).send('Missing code/state');
    const entry = takeState(state);
    if (!entry) return res.status(400).send('Invalid or expired state');

    const tokens = await google.exchangeCode(code);
    await req.prisma.examinerIntegration.upsert({
      where: { userId_provider: { userId: entry.userId, provider: 'GOOGLE_MEET' } },
      create: {
        userId: entry.userId,
        provider: 'GOOGLE_MEET',
        accessToken: encrypt(tokens.accessToken),
        refreshToken: tokens.refreshToken ? encrypt(tokens.refreshToken) : null,
        expiresAt: tokens.expiresAt,
        scope: tokens.scope,
        externalAccountEmail: tokens.externalAccountEmail,
      },
      update: {
        accessToken: encrypt(tokens.accessToken),
        refreshToken: tokens.refreshToken ? encrypt(tokens.refreshToken) : undefined,
        expiresAt: tokens.expiresAt,
        scope: tokens.scope,
        externalAccountEmail: tokens.externalAccountEmail,
      }
    });

    res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/examiner/integrations?connected=google`);
  } catch (err) {
    console.error('[google callback]', err.response?.data || err.message);
    res.status(500).send('Google connection failed');
  }
});

router.get('/zoom/authorize-url', authenticate, requireRole('EXAMINER', 'ADMIN'), (req, res) => {
  const state = putState(req.user.id);
  res.json({ url: zoom.authUrl(state) });
});

router.get('/zoom/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    if (!code || !state) return res.status(400).send('Missing code/state');
    const entry = takeState(state);
    if (!entry) return res.status(400).send('Invalid or expired state');

    const tokens = await zoom.exchangeCode(code);
    await req.prisma.examinerIntegration.upsert({
      where: { userId_provider: { userId: entry.userId, provider: 'ZOOM' } },
      create: {
        userId: entry.userId,
        provider: 'ZOOM',
        accessToken: encrypt(tokens.accessToken),
        refreshToken: tokens.refreshToken ? encrypt(tokens.refreshToken) : null,
        expiresAt: tokens.expiresAt,
        scope: tokens.scope,
        externalAccountEmail: tokens.externalAccountEmail,
      },
      update: {
        accessToken: encrypt(tokens.accessToken),
        refreshToken: tokens.refreshToken ? encrypt(tokens.refreshToken) : undefined,
        expiresAt: tokens.expiresAt,
        scope: tokens.scope,
        externalAccountEmail: tokens.externalAccountEmail,
      }
    });

    res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/examiner/integrations?connected=zoom`);
  } catch (err) {
    console.error('[zoom callback]', err.response?.data || err.message);
    res.status(500).send('Zoom connection failed');
  }
});

router.delete('/:provider', authenticate, async (req, res) => {
  try {
    const provider = req.params.provider.toUpperCase() === 'GOOGLE' ? 'GOOGLE_MEET' : req.params.provider.toUpperCase();
    await req.prisma.examinerIntegration.delete({
      where: { userId_provider: { userId: req.user.id, provider } }
    }).catch(() => {});
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to disconnect' });
  }
});

module.exports = router;
