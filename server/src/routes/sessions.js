// ── FILE: server/src/routes/sessions.js ──
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const { bandFromRaw, calculateOverallBand, checkAnswer } = require('../services/scoreService');
const { recomputeAndMaybeReleaseResult } = require('../services/resultService');

router.post('/start', authenticate, [
  body('testId').isUUID(),
  body('mode').optional().isIn(['EXAM', 'PRACTICE'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const existing = await req.prisma.testSession.findFirst({
      where: { userId: req.user.id, testId: req.body.testId, status: 'IN_PROGRESS' }
    });
    if (existing) return res.json(existing);

    const test = await req.prisma.test.findUnique({
      where: { id: req.body.testId },
      include: { modules: { orderBy: { orderIndex: 'asc' } } }
    });
    if (!test) return res.status(404).json({ error: 'Test not found' });

    // Students must have an APPROVED enrollment to start the test.
    // Admins/examiners can start without enrollment (for previewing/testing).
    if (req.user.role === 'STUDENT') {
      const enrollment = await req.prisma.enrollment.findFirst({
        where: { userId: req.user.id, testId: req.body.testId }
      });
      if (!enrollment) {
        return res.status(403).json({ error: 'Please enroll in this test first', code: 'NOT_ENROLLED' });
      }
      if (enrollment.status !== 'APPROVED') {
        const msg = enrollment.status === 'PENDING'
          ? 'Your enrollment is awaiting admin approval'
          : 'Your enrollment was rejected. Please contact support.';
        return res.status(403).json({ error: msg, code: enrollment.status });
      }
    }

    const session = await req.prisma.testSession.create({
      data: {
        userId: req.user.id,
        testId: req.body.testId,
        mode: req.body.mode || 'EXAM'
      }
    });

    for (const mod of test.modules) {
      await req.prisma.moduleSession.create({ data: { sessionId: session.id, moduleId: mod.id } });
    }

    const full = await req.prisma.testSession.findUnique({
      where: { id: session.id },
      include: {
        test: { include: { modules: { orderBy: { orderIndex: 'asc' }, include: { questions: { orderBy: { orderIndex: 'asc' } } } } } },
        modulesSessions: { orderBy: { module: { orderIndex: 'asc' } } }
      }
    });
    res.json(full);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to start session' });
  }
});

router.get('/:id', authenticate, async (req, res) => {
  try {
    const session = await req.prisma.testSession.findUnique({
      where: { id: req.params.id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        test: { include: { modules: { orderBy: { orderIndex: 'asc' }, include: { questions: { orderBy: { orderIndex: 'asc' } }, mediaFiles: true } } } },
        modulesSessions: {
          orderBy: { module: { orderIndex: 'asc' } },
          include: {
            answers: true,
            writingSubmissions: true,
            speakingSubmission: { include: { responses: { include: { question: true }, orderBy: { recordedAt: 'asc' } } } },
            liveSpeakingSession: { include: { examiner: { select: { id: true, name: true, email: true } } } }
          }
        },
        result: true
      }
    });
    if (!session) return res.status(404).json({ error: 'Session not found' });
    if (session.userId !== req.user.id && req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Access denied' });
    res.json(session);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch session' });
  }
});

router.post('/:id/module/:moduleId/start', authenticate, async (req, res) => {
  try {
    const session = await req.prisma.testSession.findUnique({ where: { id: req.params.id } });
    if (!session) return res.status(404).json({ error: 'Session not found' });
    if (session.userId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (session.status !== 'IN_PROGRESS') {
      return res.status(400).json({ error: 'Session already submitted' });
    }

    const moduleSession = await req.prisma.moduleSession.findFirst({
      where: { sessionId: req.params.id, moduleId: req.params.moduleId }
    });
    if (!moduleSession) return res.status(404).json({ error: 'Module session not found' });

    if (moduleSession.status === 'NOT_STARTED' || !moduleSession.startedAt) {
      const updated = await req.prisma.moduleSession.update({
        where: { id: moduleSession.id },
        data: { status: 'IN_PROGRESS', startedAt: new Date() }
      });
      return res.json(updated);
    }
    res.json(moduleSession);
  } catch (err) {
    console.error('[sessions module start]', err);
    res.status(500).json({ error: 'Failed to start module' });
  }
});

router.post('/:id/module/:moduleId/submit', authenticate, async (req, res) => {
  try {
    const session = await req.prisma.testSession.findUnique({ where: { id: req.params.id } });
    if (!session || (session.userId !== req.user.id && req.user.role !== 'ADMIN')) return res.status(403).json({ error: 'Access denied' });
    if (session.status !== 'IN_PROGRESS') return res.status(400).json({ error: 'Session already submitted' });

    const moduleSession = await req.prisma.moduleSession.findFirst({
      where: { sessionId: req.params.id, moduleId: req.params.moduleId }
    });
    if (!moduleSession) return res.status(404).json({ error: 'Module session not found' });

    const module = await req.prisma.module.findUnique({ where: { id: req.params.moduleId } });
    const isPractice = session.mode === 'PRACTICE';
    const isLiveSpeaking = module.type === 'SPEAKING' && module.speakingMode === 'LIVE';

    if (!isPractice && !isLiveSpeaking && moduleSession.startedAt) {
      const elapsed = (Date.now() - new Date(moduleSession.startedAt).getTime()) / 1000;
      const allowed = module.durationMins * 60;
      if (elapsed > allowed) {
        return res.status(403).json({ error: 'Time expired', code: 'TIME_EXPIRED' });
      }
    }

    let timeLeft = null;
    if (!isPractice && !isLiveSpeaking && moduleSession.startedAt) {
      const elapsed = Math.floor((Date.now() - new Date(moduleSession.startedAt).getTime()) / 1000);
      timeLeft = Math.max(0, module.durationMins * 60 - elapsed);
    }

    const newStatus = isLiveSpeaking ? 'AWAITING_LIVE' : 'SUBMITTED';
    await req.prisma.moduleSession.update({
      where: { id: moduleSession.id },
      data: { status: newStatus, submittedAt: isLiveSpeaking ? null : new Date(), timeLeft }
    });

    if (module.type === 'LISTENING' || module.type === 'READING') {
      const answers = await req.prisma.answer.findMany({ where: { moduleSessionId: moduleSession.id } });
      const questions = await req.prisma.question.findMany({ where: { moduleId: module.id } });

      let correctCount = 0;
      for (const answer of answers) {
        const question = questions.find(q => q.id === answer.questionId);
        if (question && answer.studentAnswer) {
          const correct = checkAnswer(answer.studentAnswer, question.correctAnswer, question.acceptedAnswers);
          await req.prisma.answer.update({ where: { id: answer.id }, data: { isCorrect: correct, marksAwarded: correct ? question.marks : 0 } });
          if (correct) correctCount++;
        }
      }

      const totalQuestions = questions.filter(q => !['WRITING_TASK1', 'WRITING_TASK2', 'SPEAKING_PART1', 'SPEAKING_PART2', 'SPEAKING_PART3'].includes(q.type)).length;
      const band = totalQuestions > 0 ? bandFromRaw(correctCount, totalQuestions, module.type) : null;

      let resultData = {};
      if (module.type === 'LISTENING') resultData = { listeningBand: band };
      else if (module.type === 'READING') resultData = { readingBand: band };

      if (Object.keys(resultData).length > 0) {
        const existing = await req.prisma.result.findUnique({ where: { sessionId: session.id } });
        if (existing) {
          await req.prisma.result.update({ where: { id: existing.id }, data: resultData });
        } else {
          await req.prisma.result.create({ data: { sessionId: session.id, ...resultData } });
        }
      }
    }

    const allModules = await req.prisma.moduleSession.findMany({ where: { sessionId: session.id } });
    const allSubmitted = allModules.every(m => m.status === 'SUBMITTED');
    const anyAwaitingLive = allModules.some(m => m.status === 'AWAITING_LIVE');

    if (isPractice) {
      await req.prisma.testSession.update({ where: { id: session.id }, data: { status: 'SUBMITTED', submittedAt: new Date() } });
      const allResults = await req.prisma.result.findUnique({ where: { sessionId: session.id } });
      if (allResults) {
        // Calculate overall band for practice mode
        const { listeningBand, readingBand, writingBand, speakingBand } = allResults;
        if (listeningBand && readingBand && writingBand && speakingBand) {
          const overall = ((listeningBand + readingBand + writingBand + speakingBand) / 4).toFixed(1);
          await req.prisma.result.update({ where: { id: allResults.id }, data: { overallBand: parseFloat(overall), isReleased: true, releasedAt: new Date() } });
        } else {
          await req.prisma.result.update({ where: { id: allResults.id }, data: { isReleased: true, releasedAt: new Date() } });
        }
      }
    }

    if (allSubmitted && session.mode === 'EXAM') {
      // Auto-calculate overall when all modules submitted in EXAM mode
      await recomputeAndMaybeReleaseResult(req.prisma, session.id);
    }

    res.json({ message: isLiveSpeaking ? 'Module awaiting live session' : 'Module submitted', allModulesSubmitted: allSubmitted, anyAwaitingLive });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to submit module' });
  }
});

router.post('/:id/submit', authenticate, async (req, res) => {
  try {
    const session = await req.prisma.testSession.findUnique({ where: { id: req.params.id } });
    if (!session || (session.userId !== req.user.id && req.user.role !== 'ADMIN')) return res.status(403).json({ error: 'Access denied' });

    await req.prisma.moduleSession.updateMany({
      where: { sessionId: session.id, status: { not: 'SUBMITTED' } },
      data: { status: 'SUBMITTED', submittedAt: new Date() }
    });

    await req.prisma.testSession.update({
      where: { id: session.id },
      data: { status: 'SUBMITTED', submittedAt: new Date() }
    });

    if (session.mode === 'PRACTICE') {
      const result = await req.prisma.result.findUnique({ where: { sessionId: session.id } });
      if (result) await req.prisma.result.update({ where: { id: result.id }, data: { isReleased: true, releasedAt: new Date() } });
    }

    // Auto-release result for EXAM mode if writing and speaking are already evaluated
    if (session.mode === 'EXAM') {
      await recomputeAndMaybeReleaseResult(req.prisma, session.id);
    }

    res.json({ message: 'Test submitted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to submit test' });
  }
});

router.patch('/:id/tab-switch', authenticate, async (req, res) => {
  try {
    const session = await req.prisma.testSession.findUnique({ where: { id: req.params.id } });
    if (!session || session.userId !== req.user.id) return res.status(403).json({ error: 'Access denied' });

    const updated = await req.prisma.testSession.update({
      where: { id: req.params.id },
      data: { tabSwitchCount: { increment: 1 } }
    });

    if (updated.mode === 'EXAM' && updated.tabSwitchCount >= 5) {
      await req.prisma.testSession.update({
        where: { id: session.id },
        data: { status: 'ABANDONED' }
      });
      return res.json({ warning: true, count: updated.tabSwitchCount, autoSubmit: true });
    }

    res.json({ warning: true, count: updated.tabSwitchCount });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update tab switch count' });
  }
});

router.get('/my', authenticate, async (req, res) => {
  try {
    const sessions = await req.prisma.testSession.findMany({
      where: { userId: req.user.id },
      include: { test: true, result: true },
      orderBy: { startedAt: 'desc' }
    });
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

module.exports = router;