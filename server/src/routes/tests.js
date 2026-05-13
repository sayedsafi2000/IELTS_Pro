// ── FILE: server/src/routes/tests.js ──
const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

router.get('/', authenticate, async (req, res) => {
  try {
    const where = req.user.role === 'ADMIN' ? {} : { isPublished: true };
    const tests = await req.prisma.test.findMany({
      where,
      include: { modules: { include: { _count: { select: { questions: true } } } }, _count: { select: { enrollments: true } } },
      orderBy: { createdAt: 'desc' }
    });
    if (req.user.role === 'STUDENT') {
      const enrollments = await req.prisma.enrollment.findMany({ where: { userId: req.user.id } });
      const enrolledIds = new Set(enrollments.map(e => e.testId));
      res.json(tests.filter(t => enrolledIds.has(t.id)));
    } else {
      res.json(tests);
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch tests' });
  }
});

router.get('/:id', authenticate, async (req, res) => {
  try {
    const test = await req.prisma.test.findUnique({
      where: { id: req.params.id },
      include: {
        modules: {
          orderBy: { orderIndex: 'asc' },
          include: { questions: { orderBy: { orderIndex: 'asc' } }, mediaFiles: true }
        }
      }
    });
    if (!test) return res.status(404).json({ error: 'Test not found' });
    if (!test.isPublished && req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Test not published' });
    res.json(test);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch test' });
  }
});

router.post('/', authenticate, requireRole('ADMIN'), [
  body('title').trim().isLength({ min: 1 }).withMessage('Title required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const test = await req.prisma.test.create({ data: req.body });
    res.json(test);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create test' });
  }
});

router.patch('/:id', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const test = await req.prisma.test.update({ where: { id: req.params.id }, data: req.body });
    res.json(test);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update test' });
  }
});

router.delete('/:id', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    await req.prisma.test.delete({ where: { id: req.params.id } });
    res.json({ message: 'Test deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete test' });
  }
});

router.patch('/:id/publish', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const test = await req.prisma.test.update({ where: { id: req.params.id }, data: { isPublished: req.body.isPublished ?? true } });
    res.json(test);
  } catch (err) {
    res.status(500).json({ error: 'Failed to publish test' });
  }
});

router.get('/:id/preview', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const test = await req.prisma.test.findUnique({
      where: { id: req.params.id },
      include: {
        modules: {
          orderBy: { orderIndex: 'asc' },
          include: { questions: { orderBy: { orderIndex: 'asc' }, select: { id: true, type: true, questionText: true, instructions: true, imageUrl: true, options: true, marks: true, orderIndex: true, section: true } }, mediaFiles: true }
        }
      }
    });
    if (!test) return res.status(404).json({ error: 'Test not found' });
    res.json(test);
  } catch (err) {
    res.status(500).json({ error: 'Failed to preview test' });
  }
});

router.post('/:id/duplicate', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const original = await req.prisma.test.findUnique({
      where: { id: req.params.id },
      include: {
        modules: {
          include: { questions: true, mediaFiles: true }
        }
      }
    });
    if (!original) return res.status(404).json({ error: 'Test not found' });

    const newTestData = {
      title: `${original.title} (Copy)`,
      description: original.description,
      type: original.type,
      isPublished: false,
      duration: original.duration
    };
    const newTest = await req.prisma.test.create({ data: newTestData });

    for (const mod of original.modules) {
      const newModule = await req.prisma.module.create({
        data: {
          testId: newTest.id,
          type: mod.type,
          title: mod.title,
          instructions: mod.instructions,
          durationMins: mod.durationMins,
          orderIndex: mod.orderIndex,
          audioUrl: mod.audioUrl
        }
      });
      for (const q of mod.questions) {
        await req.prisma.question.create({
          data: {
            moduleId: newModule.id,
            type: q.type,
            questionText: q.questionText,
            instructions: q.instructions,
            imageUrl: q.imageUrl,
            options: q.options,
            correctAnswer: q.correctAnswer,
            acceptedAnswers: q.acceptedAnswers,
            marks: q.marks,
            orderIndex: q.orderIndex,
            section: q.section
          }
        });
      }
      for (const f of mod.mediaFiles) {
        await req.prisma.mediaFile.create({
          data: { moduleId: newModule.id, fileUrl: f.fileUrl, fileType: f.fileType, purpose: f.purpose, orderIndex: f.orderIndex }
        });
      }
    }
    res.json(newTest);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to duplicate test' });
  }
});

module.exports = router;