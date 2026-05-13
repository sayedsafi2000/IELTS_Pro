// ── FILE: server/src/routes/questions.js ──
const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../middleware/auth');
const { uploadImage } = require('../config/cloudinary');
const { cloudinary } = require('../config/cloudinary');
const { body, validationResult } = require('express-validator');

router.get('/:id', authenticate, async (req, res) => {
  try {
    const question = await req.prisma.question.findUnique({ where: { id: req.params.id } });
    if (!question) return res.status(404).json({ error: 'Question not found' });
    res.json(question);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch question' });
  }
});

router.post('/', authenticate, requireRole('ADMIN'), [
  body('moduleId').isUUID(),
  body('type').notEmpty(),
  body('questionText').trim().isLength({ min: 1 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const count = await req.prisma.question.count({ where: { moduleId: req.body.moduleId } });
    const question = await req.prisma.question.create({ data: { ...req.body, orderIndex: count } });
    res.json(question);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create question' });
  }
});

router.patch('/:id', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const question = await req.prisma.question.update({ where: { id: req.params.id }, data: req.body });
    res.json(question);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update question' });
  }
});

router.delete('/:id', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const question = await req.prisma.question.findUnique({ where: { id: req.params.id } });
    if (question?.imagePublicId) {
      await cloudinary.uploader.destroy(question.imagePublicId, { resource_type: 'image' }).catch(() => {});
    }
    await req.prisma.question.delete({ where: { id: req.params.id } });
    res.json({ message: 'Question deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete question' });
  }
});

router.post('/bulk-import', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const questions = req.body.questions;
    if (!Array.isArray(questions)) return res.status(400).json({ error: 'Questions must be an array' });
    const created = await req.prisma.question.createMany({ data: questions });
    res.json({ count: created.count });
  } catch (err) {
    res.status(500).json({ error: 'Failed to import questions' });
  }
});

router.post('/:id/upload-image', authenticate, requireRole('ADMIN'), uploadImage.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image file uploaded' });
    const url = req.file.path;
    const publicId = req.file.filename;
    const question = await req.prisma.question.update({
      where: { id: req.params.id },
      data: { imageUrl: url, imagePublicId: publicId }
    });
    res.json({ imageUrl: url, publicId, question });
  } catch (err) {
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

module.exports = router;