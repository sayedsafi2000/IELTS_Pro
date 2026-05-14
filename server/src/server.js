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

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: 'Too many requests, please try again later.' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts, please try again later.' }
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { error: 'Too many registration attempts, please try again later.' }
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