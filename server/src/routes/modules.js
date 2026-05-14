// ── FILE: server/src/routes/modules.js ──
const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../middleware/auth');
const { uploadAudio } = require('../config/cloudinary');
const { cloudinary } = require('../config/cloudinary');
const { body, validationResult } = require('express-validator');

router.get('/:id', authenticate, async (req, res) => {
  try {
    const module = await req.prisma.module.findUnique({
      where: { id: req.params.id },
      include: {
        questions: { orderBy: { orderIndex: 'asc' } },
        mediaFiles: true
      }
    });
    if (!module) return res.status(404).json({ error: 'Module not found' });
    res.json(module);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch module' });
  }
});

router.post('/', authenticate, requireRole('ADMIN'), [
  body('testId').isUUID(),
  body('type').isIn(['LISTENING', 'READING', 'WRITING', 'SPEAKING']),
  body('title').trim().isLength({ min: 1 }),
  body('durationMins').isInt({ min: 1 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { testId, type, title, instructions, durationMins, speakingMode } = req.body;
    const data = { testId, type, title, instructions, durationMins, orderIndex: await req.prisma.module.count({ where: { testId } }) };
    if (type === 'SPEAKING' && speakingMode) {
      if (!['RECORDED', 'LIVE'].includes(speakingMode)) {
        return res.status(400).json({ error: 'speakingMode must be RECORDED or LIVE' });
      }
      data.speakingMode = speakingMode;
    }
    const module = await req.prisma.module.create({ data });
    res.json(module);
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({
        error: `A ${req.body.type} module already exists for this test. Each module type may appear only once.`,
        code: 'MODULE_TYPE_DUPLICATE'
      });
    }
    console.error('[modules POST]', err);
    res.status(500).json({ error: 'Failed to create module' });
  }
});

router.patch('/:id', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const { title, instructions, durationMins, orderIndex, speakingMode } = req.body;
    const data = {};
    if (title !== undefined) data.title = title;
    if (instructions !== undefined) data.instructions = instructions;
    if (durationMins !== undefined) data.durationMins = durationMins;
    if (orderIndex !== undefined) data.orderIndex = orderIndex;
    if (speakingMode !== undefined) {
      const existing = await req.prisma.module.findUnique({ where: { id: req.params.id } });
      if (!existing) return res.status(404).json({ error: 'Module not found' });
      if (existing.type !== 'SPEAKING') {
        return res.status(400).json({ error: 'speakingMode can only be set on SPEAKING modules' });
      }
      if (!['RECORDED', 'LIVE'].includes(speakingMode)) {
        return res.status(400).json({ error: 'speakingMode must be RECORDED or LIVE' });
      }
      data.speakingMode = speakingMode;
    }
    const module = await req.prisma.module.update({ where: { id: req.params.id }, data });
    res.json(module);
  } catch (err) {
    console.error('[modules PATCH]', err);
    res.status(500).json({ error: 'Failed to update module' });
  }
});

router.delete('/:id', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const module = await req.prisma.module.findUnique({ where: { id: req.params.id } });
    if (module?.cloudinaryPublicId) {
      await cloudinary.uploader.destroy(module.cloudinaryPublicId, { resource_type: 'video' }).catch(() => {});
    }
    await req.prisma.module.delete({ where: { id: req.params.id } });
    res.json({ message: 'Module deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete module' });
  }
});

function uploadAudioMiddleware(req, res, next) {
  const missing = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'].filter((k) => !process.env[k]);
  if (missing.length) {
    return res.status(503).json({
      error: 'Audio upload is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET on the server.',
      code: 'CLOUDINARY_NOT_CONFIGURED'
    });
  }
  uploadAudio.single('audio')(req, res, (err) => {
    if (err) {
      console.error('[upload-audio]', err.message || err);
      return res.status(400).json({
        error: err.message || 'Cloudinary rejected the upload. Check file type (MP3, WAV, M4A, OGG) and Cloudinary settings.',
        code: 'UPLOAD_FAILED'
      });
    }
    next();
  });
}

router.post('/:id/upload-audio', authenticate, requireRole('ADMIN'), uploadAudioMiddleware, async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No audio file uploaded' });
    const url = req.file.path;
    const publicId = req.file.filename;
    const module = await req.prisma.module.update({
      where: { id: req.params.id },
      data: { audioUrl: url, cloudinaryPublicId: publicId }
    });
    res.json({ audioUrl: url, publicId, module });
  } catch (err) {
    console.error('[upload-audio] db', err);
    res.status(500).json({ error: err.message || 'Failed to save audio URL' });
  }
});

router.delete('/:id/audio', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const module = await req.prisma.module.findUnique({ where: { id: req.params.id } });
    if (!module) return res.status(404).json({ error: 'Module not found' });
    if (module.cloudinaryPublicId) {
      await cloudinary.uploader.destroy(module.cloudinaryPublicId, { resource_type: 'video' }).catch(() => {});
    }
    const updated = await req.prisma.module.update({
      where: { id: req.params.id },
      data: { audioUrl: null, cloudinaryPublicId: null }
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete audio' });
  }
});

module.exports = router;