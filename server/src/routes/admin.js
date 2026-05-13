// ── FILE: server/src/routes/admin.js ──
const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../middleware/auth');

router.get('/stats', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const [totalStudents, totalTests, todaySessions, avgOverall] = await Promise.all([
      req.prisma.user.count({ where: { role: 'STUDENT' } }),
      req.prisma.test.count(),
      req.prisma.testSession.count({
        where: { startedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } }
      }),
      req.prisma.result.aggregate({ _avg: { overallBand: true } })
    ]);
    res.json({
      totalStudents,
      totalTests,
      sessionsToday: todaySessions,
      averageOverallBand: avgOverall._avg.overallBand ? Math.round(avgOverall._avg.overallBand * 10) / 10 : null
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

router.get('/analytics/:testId', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const sessions = await req.prisma.testSession.findMany({
      where: { testId: req.params.testId, status: { in: ['SUBMITTED', 'EVALUATED'] } },
      include: { result: true, modulesSessions: { include: { answers: true } } }
    });

    const totalAttempts = sessions.length;
    if (totalAttempts === 0) return res.json({ error: 'No attempts yet' });

    const overallBands = sessions.map(s => s.result?.overallBand).filter(Boolean);
    const avgOverall = overallBands.length ? overallBands.reduce((a, b) => a + b, 0) / overallBands.length : null;

    const bandDistribution = {};
    for (let i = 1; i <= 9; i++) bandDistribution[i] = 0;
    overallBands.forEach(b => {
      const rounded = Math.round(b);
      if (rounded >= 1 && rounded <= 9) bandDistribution[rounded]++;
    });

    const moduleAnalytics = {};
    const modules = await req.prisma.module.findMany({ where: { testId: req.params.testId }, orderBy: { orderIndex: 'asc' } });
    for (const mod of modules) {
      const modSessions = sessions.filter(s => s.modulesSessions.some(ms => ms.moduleId === mod.id));
      const answers = modSessions.flatMap(s => s.modulesSessions.find(ms => ms.moduleId === mod.id)?.answers || []);
      const correct = answers.filter(a => a.isCorrect).length;
      const total = answers.length;
      moduleAnalytics[mod.type] = {
        attempts: modSessions.length,
        avgAccuracy: total ? Math.round(correct / total * 100) : 0,
        totalAnswers: total
      };
    }

    const questions = await req.prisma.question.findMany({
      where: { module: { testId: req.params.testId } },
      include: { answers: true }
    });

    const questionAccuracy = questions.map(q => {
      const answered = q.answers.filter(a => a.studentAnswer !== null);
      const correct = answered.filter(a => a.isCorrect).length;
      return { id: q.id, questionText: q.questionText, type: q.type, accuracy: answered.length ? Math.round(correct / answered.length * 100) : 0, totalAnswers: answered.length };
    }).sort((a, b) => a.accuracy - b.accuracy);

    res.json({
      totalAttempts,
      avgOverall: avgOverall ? Math.round(avgOverall * 10) / 10 : null,
      bandDistribution,
      moduleAnalytics,
      questionAccuracy: questionAccuracy.slice(0, 20)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

module.exports = router;