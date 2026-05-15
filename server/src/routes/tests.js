// ── FILE: server/src/routes/tests.js ──
const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

const TEST_TYPES = ['FULL', 'LISTENING_ONLY', 'READING_ONLY', 'WRITING_ONLY', 'SPEAKING_ONLY'];

const testInclude = {
  modules: {
    orderBy: { orderIndex: 'asc' },
    include: { questions: { orderBy: { orderIndex: 'asc' } }, mediaFiles: true }
  }
};

function pickTestUpdateData(body) {
  const allowed = ['title', 'description', 'type', 'isPublished', 'duration', 'price', 'bkashNumber', 'bankAccount', 'bankName', 'isPaid'];
  const data = {};
  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(body, key)) {
      data[key] = body[key];
    }
  }
  return data;
}

router.get('/', authenticate, async (req, res) => {
  try {
    const where = req.user.role === 'ADMIN' ? {} : { isPublished: true };
    const tests = await req.prisma.test.findMany({
      where,
      include: { modules: { include: { _count: { select: { questions: true } } } }, _count: { select: { enrollments: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(tests);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch tests' });
  }
});

// Public: list of published tests (no auth required) for marketing / sample-tests page
router.get('/public', async (req, res) => {
  try {
    const tests = await req.prisma.test.findMany({
      where: { isPublished: true },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        description: true,
        type: true,
        duration: true,
        price: true,
        createdAt: true,
        _count: { select: { modules: true, enrollments: true } }
      }
    });
    res.json(tests.map(t => ({
      id: t.id,
      title: t.title,
      description: t.description,
      type: t.type,
      duration: t.duration,
      price: t.price || 0,
      modulesCount: t._count.modules,
      enrolledCount: t._count.enrollments
    })));
  } catch (err) {
    console.error('[tests/public]', err);
    res.status(500).json({ error: 'Failed to fetch tests' });
  }
});

router.get('/:id', authenticate, async (req, res) => {
  try {
    const test = await req.prisma.test.findUnique({
      where: { id: req.params.id },
      include: testInclude
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
    const desc = req.body.description != null ? String(req.body.description).trim() : '';
    const data = {
      title: req.body.title.trim(),
      description: desc || null,
      type: TEST_TYPES.includes(req.body.type) ? req.body.type : 'FULL',
      duration: Math.max(1, parseInt(String(req.body.duration ?? 165), 10) || 165),
      isPublished: !!req.body.isPublished,
      price: Math.max(0, parseFloat(String(req.body.price ?? 0)) || 0),
      isPaid: false,
      bkashNumber: req.body.bkashNumber?.trim() || null,
      bankAccount: req.body.bankAccount?.trim() || null,
      bankName: req.body.bankName?.trim() || null
    };
    // Source of truth = price. Keep legacy flag in sync.
    data.isPaid = data.price > 0;
    const test = await req.prisma.test.create({ data, include: testInclude });
    res.json(test);
  } catch (err) {
    console.error('[tests POST]', err);
    res.status(500).json({ error: err.message || 'Failed to create test' });
  }
});

router.patch('/:id', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const data = pickTestUpdateData(req.body);
    if (Object.keys(data).length === 0) {
      return res.status(400).json({ error: 'No updatable fields provided' });
    }
    if (data.type !== undefined && !TEST_TYPES.includes(data.type)) {
      return res.status(400).json({ error: `Invalid test type: ${data.type}` });
    }
    if (data.title !== undefined && (typeof data.title !== 'string' || !data.title.trim())) {
      return res.status(400).json({ error: 'Title cannot be empty' });
    }
    if (data.title !== undefined) data.title = data.title.trim();
    if (data.description !== undefined && data.description === '') data.description = null;
    if (data.duration !== undefined) {
      const d = parseInt(String(data.duration), 10);
      if (Number.isNaN(d) || d < 1) {
        return res.status(400).json({ error: 'duration must be a positive integer' });
      }
      data.duration = d;
    }
    if (data.price !== undefined) {
      data.price = Math.max(0, parseFloat(String(req.body.price)) || 0);
      // Keep legacy isPaid flag in sync with price for any code paths that still read it
      data.isPaid = data.price > 0;
    }

    const test = await req.prisma.test.update({
      where: { id: req.params.id },
      data,
      include: testInclude
    });
    res.json(test);
  } catch (err) {
    console.error('[tests PATCH]', err);
    if (err.code === 'P2025') return res.status(404).json({ error: 'Test not found' });
    res.status(500).json({ error: err.message || 'Failed to update test' });
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