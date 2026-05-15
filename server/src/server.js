// ── FILE: server/src/server.js ──
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const { PrismaClient } = require('@prisma/client');
const winston = require('winston');
const path = require('path');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const testRoutes = require('./routes/tests');
const moduleRoutes = require('./routes/modules');
const questionRoutes = require('./routes/questions');
const sessionRoutes = require('./routes/sessions');
const answerRoutes = require('./routes/answers');
const writingRoutes = require('./routes/writing');
const speakingRoutes = require('./routes/speaking');
const resultRoutes = require('./routes/results');
const enrollmentRoutes = require('./routes/enrollments');
const adminRoutes = require('./routes/admin');
const notificationRoutes = require('./routes/notifications');
const liveSpeakingRoutes = require('./routes/liveSpeaking');
const integrationsRoutes = require('./routes/integrations');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console()]
});

const prisma = new PrismaClient();
const app = express();

// In production we sit behind nginx + Coolify's reverse proxy. Without this,
// express-rate-limit keys every request by the proxy's IP, so one user's
// failed login locks out everyone behind the same proxy.
app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS ?? 1));

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());

const staticDir = path.join(__dirname, '..', 'uploads');
app.use('/uploads', express.static(staticDir));

// Helper: per-user (when logged in) or per-IP rate-limit key, so one user
// can't burn the whole IP's budget for everyone else on the same network.
const keyByUserOrIp = (req, _res) => {
  const auth = req.headers.authorization || '';
  if (auth.startsWith('Bearer ')) {
    // Cheap fingerprint: don't decode the JWT here, just hash the token tail.
    return 'u:' + auth.slice(-24);
  }
  return 'ip:' + req.ip;
};

// General limiter — generous so legitimate use (auto-saves, polling) never trips.
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_GENERAL ?? 1000),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: keyByUserOrIp,
  message: { error: 'Too many requests, please slow down and try again shortly.' }
});

// Login limiter — keyed by IP + email so one user typing the wrong password
// doesn't block everyone behind the same NAT/proxy.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_AUTH ?? 30),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const email = (req.body?.email || '').toLowerCase().trim();
    return 'login:' + req.ip + ':' + email;
  },
  // Successful logins shouldn't count against the limit
  skipSuccessfulRequests: true,
  message: { error: 'Too many login attempts. Please wait a few minutes and try again.' }
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_REGISTER ?? 20),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => 'register:' + req.ip,
  message: { error: 'Too many registration attempts from this network. Please try again later.' }
});

app.use('/api', generalLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', registerLimiter);

app.use((req, res, next) => {
  req.prisma = prisma;
  req.logger = logger;
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tests', testRoutes);
app.use('/api/modules', moduleRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/answers', answerRoutes);
app.use('/api/writing', writingRoutes);
app.use('/api/speaking', speakingRoutes);
app.use('/api/results', resultRoutes);
app.use('/api/enrollments', enrollmentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/live-speaking', liveSpeakingRoutes);
app.use('/api/integrations', integrationsRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use((err, req, res, next) => {
  logger.error({ err, path: req.path });
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
