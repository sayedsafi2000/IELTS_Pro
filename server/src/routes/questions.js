// ── FILE: server/src/routes/questions.js ──
const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../middleware/auth');
const { uploadImage } = require('../config/cloudinary');
const { cloudinary } = require('../config/cloudinary');
const { ALL_QUESTION_TYPES: QUESTION_TYPES, ALLOWED_BY_MODULE, isAllowed } = require('../constants/questionTypes');

/** Coerce Prisma Json inputs: arrays/objects pass through; JSON strings parse; plain strings stay as strings */
function normalizeJsonInput(value) {
  if (value === undefined || value === null) return null;
  if (typeof value === 'object') return value;
  if (typeof value === 'string') {
    const t = value.trim();
    if (t === '') return null;
    if (t.startsWith('[') || t.startsWith('{')) {
      try {
        return JSON.parse(t);
      } catch {
        return value;
      }
    }
    return value;
  }
  return value;
}

router.post('/', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const { moduleId, type, questionText, instructions, options, correctAnswer, acceptedAnswers, marks, section } = req.body;

    if (!moduleId || typeof moduleId !== 'string') {
      return res.status(400).json({ error: 'moduleId is required', code: 'VALIDATION' });
    }
    if (!QUESTION_TYPES.includes(type)) {
      return res.status(400).json({ error: `Invalid question type: ${type || '(missing)'}`, code: 'VALIDATION' });
    }
    if (!questionText || typeof questionText !== 'string' || !questionText.trim()) {
      return res.status(400).json({ error: 'Question text is required', code: 'VALIDATION' });
    }

    const module = await req.prisma.module.findUnique({ where: { id: moduleId } });
    if (!module) {
      return res.status(400).json({ error: 'Module not found for this moduleId', code: 'MODULE_NOT_FOUND' });
    }
    if (!isAllowed(module.type, type)) {
      return res.status(400).json({
        error: `Question type "${type}" is not allowed for ${module.type} modules. Allowed: ${ALLOWED_BY_MODULE[module.type].join(', ')}`,
        code: 'QUESTION_TYPE_NOT_ALLOWED_FOR_MODULE'
      });
    }

    const orderIndex = await req.prisma.question.count({ where: { moduleId } });
    const marksNum = Math.max(1, Number.parseInt(String(marks ?? 1), 10) || 1);
    const sectionNum = Math.max(1, Number.parseInt(String(section ?? 1), 10) || 1);

    const opts = normalizeJsonInput(options);
    const corr = normalizeJsonInput(correctAnswer);
    const acc = normalizeJsonInput(acceptedAnswers);

    const inst = instructions != null && String(instructions).trim() ? String(instructions).trim() : null;

    const question = await req.prisma.question.create({
      data: {
        moduleId,
        type,
        questionText: questionText.trim(),
        instructions: inst,
        options: opts === null ? undefined : opts,
        correctAnswer: corr === null ? undefined : corr,
        acceptedAnswers: acc === null ? undefined : acc,
        marks: marksNum,
        section: sectionNum,
        orderIndex
      }
    });
    res.json(question);
  } catch (err) {
    console.error('[questions POST]', err);
    if (err.code === 'P2002') return res.status(400).json({ error: 'Duplicate entry', code: err.code });
    if (err.code === 'P2003') return res.status(400).json({ error: 'Invalid reference (module or relation)', code: err.code });
    res.status(500).json({ error: err.message || 'Failed to create question' });
  }
});

router.post('/bulk-import', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const questions = req.body.questions;
    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ error: 'Questions must be a non-empty array' });
    }

    const moduleIds = [...new Set(questions.map(q => q.moduleId).filter(Boolean))];
    if (moduleIds.length === 0) {
      return res.status(400).json({ error: 'Every question must have a moduleId' });
    }
    const modules = await req.prisma.module.findMany({ where: { id: { in: moduleIds } } });
    const typeByModule = new Map(modules.map(m => [m.id, m.type]));

    const violations = [];
    questions.forEach((q, idx) => {
      const modType = typeByModule.get(q.moduleId);
      if (!modType) {
        violations.push(`Row ${idx}: moduleId not found`);
        return;
      }
      if (!QUESTION_TYPES.includes(q.type)) {
        violations.push(`Row ${idx}: invalid question type "${q.type}"`);
        return;
      }
      if (!isAllowed(modType, q.type)) {
        violations.push(`Row ${idx}: type "${q.type}" not allowed for ${modType} module`);
      }
    });
    if (violations.length) {
      return res.status(400).json({ error: 'Bulk import validation failed', details: violations.slice(0, 20) });
    }

    const created = await req.prisma.question.createMany({ data: questions });
    res.json({ count: created.count });
  } catch (err) {
    console.error('[questions bulk-import]', err);
    res.status(500).json({ error: 'Failed to import questions' });
  }
});

router.get('/:id', authenticate, async (req, res) => {
  try {
    const question = await req.prisma.question.findUnique({ where: { id: req.params.id } });
    if (!question) return res.status(404).json({ error: 'Question not found' });
    res.json(question);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch question' });
  }
});

router.patch('/:id', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const existing = await req.prisma.question.findUnique({
      where: { id: req.params.id },
      include: { module: true }
    });
    if (!existing) return res.status(404).json({ error: 'Question not found' });

    const { type, questionText, instructions, options, correctAnswer, acceptedAnswers, marks, section, orderIndex } = req.body;
    const data = {};
    if (type !== undefined) {
      if (!QUESTION_TYPES.includes(type)) {
        return res.status(400).json({ error: `Invalid question type: ${type}`, code: 'VALIDATION' });
      }
      if (!isAllowed(existing.module.type, type)) {
        return res.status(400).json({
          error: `Question type "${type}" is not allowed for ${existing.module.type} modules. Allowed: ${ALLOWED_BY_MODULE[existing.module.type].join(', ')}`,
          code: 'QUESTION_TYPE_NOT_ALLOWED_FOR_MODULE'
        });
      }
      data.type = type;
    }
    if (questionText !== undefined) data.questionText = questionText;
    if (instructions !== undefined) data.instructions = instructions;
    if (options !== undefined) data.options = options;
    if (correctAnswer !== undefined) data.correctAnswer = correctAnswer;
    if (acceptedAnswers !== undefined) data.acceptedAnswers = acceptedAnswers;
    if (marks !== undefined) data.marks = marks;
    if (section !== undefined) data.section = section;
    if (orderIndex !== undefined) data.orderIndex = orderIndex;

    const question = await req.prisma.question.update({ where: { id: req.params.id }, data });
    res.json(question);
  } catch (err) {
    console.error('[questions PATCH]', err);
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

function uploadQuestionImageMiddleware(req, res, next) {
  const missing = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'].filter((k) => !process.env[k]);
  if (missing.length) {
    return res.status(503).json({
      error: 'Image upload is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET on the server.',
      code: 'CLOUDINARY_NOT_CONFIGURED'
    });
  }
  uploadImage.single('image')(req, res, (err) => {
    if (err) {
      console.error('[upload-question-image]', err.message || err);
      return res.status(400).json({
        error: err.message || 'Cloudinary rejected the upload.',
        code: 'UPLOAD_FAILED'
      });
    }
    next();
  });
}

router.post('/:id/upload-image', authenticate, requireRole('ADMIN'), uploadQuestionImageMiddleware, async (req, res) => {
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
    console.error('[upload-question-image] db', err);
    res.status(500).json({ error: err.message || 'Failed to upload image' });
  }
});

module.exports = router;
