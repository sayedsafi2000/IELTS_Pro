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
    const count = await req.prisma.module.count({ where: { testId: req.body.testId } });
    const module = await req.prisma.module.create({ data: { ...req.body, orderIndex: count } });
    res.json(module);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create module' });
  }
});

router.patch('/:id', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const module = await req.prisma.module.update({ where: { id: req.params.id }, data: req.body });
    res.json(module);
  } catch (err) {
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

router.post('/:id/upload-audio', authenticate, requireRole('ADMIN'), uploadAudio.single('audio'), async (req, res) => {
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
    res.status(500).json({ error: 'Failed to upload audio' });
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