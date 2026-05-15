// ── FILE: server/src/routes/enrollments.js ──
const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../middleware/auth');

// Student: Enroll in a test
router.post('/', authenticate, async (req, res) => {
  try {
    const { testId, trxId } = req.body;

    const test = await req.prisma.test.findUnique({ where: { id: testId } });
    if (!test) return res.status(404).json({ error: 'Test not found' });

    // Check if already enrolled
    const existing = await req.prisma.enrollment.findFirst({
      where: { userId: req.user.id, testId }
    });
    if (existing) return res.status(400).json({ error: 'Already enrolled in this test' });

    // Auto-derive paid status from price (price > 0 = paid).
    // If test is paid, require trxId
    if (test.price > 0) {
      if (!trxId) return res.status(400).json({ error: 'Transaction ID is required for paid tests' });

      const enrollment = await req.prisma.enrollment.create({
        data: {
          userId: req.user.id,
          testId,
          status: 'PENDING',
          trxId,
          paidAt: new Date(),
          assignedBy: req.user.id
        },
        include: { test: true, user: true }
      });

      // Notify admins
      const admins = await req.prisma.user.findMany({ where: { role: 'ADMIN' } });
      for (const admin of admins) {
        await req.prisma.notification.create({
          data: {
            userId: admin.id,
            title: 'New Payment Enrollment',
            message: `${req.user.name} paid ৳${test.price} for "${test.title}" (TRX: ${trxId}). Please verify and approve.`
          }
        });
      }

      return res.json({ enrollment, message: 'Payment submitted. Waiting for admin approval.' });
    }

    // Free test - auto approve
    const enrollment = await req.prisma.enrollment.create({
      data: {
        userId: req.user.id,
        testId,
        status: 'APPROVED',
        assignedBy: req.user.id,
        approvedAt: new Date(),
        approvedBy: req.user.id
      },
      include: { test: true, user: true }
    });

    res.json(enrollment);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create enrollment' });
  }
});

// Student: Get my enrollments
router.get('/student/my', authenticate, async (req, res) => {
  try {
    const enrollments = await req.prisma.enrollment.findMany({
      where: { userId: req.user.id },
      include: { test: true },
      orderBy: { assignedAt: 'desc' }
    });
    res.json(enrollments);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch enrollments' });
  }
});

// Student: Get available tests (not enrolled)
router.get('/student/available', authenticate, async (req, res) => {
  try {
    const tests = await req.prisma.test.findMany({
      where: { isPublished: true },
      include: {
        modules: { include: { _count: { select: { questions: true } } } },
        _count: { select: { enrollments: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    const myEnrollments = await req.prisma.enrollment.findMany({
      where: { userId: req.user.id },
      select: { testId: true, status: true }
    });
    const enrolledMap = new Map(myEnrollments.map(e => [e.testId, e.status]));

    const availableTests = tests.map(test => ({
      ...test,
      isEnrolled: enrolledMap.has(test.id),
      enrollmentStatus: enrolledMap.get(test.id) || null
    }));

    res.json(availableTests);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch tests' });
  }
});

// Admin: Get all enrollments with filters
router.get('/admin/all', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const { status, testId } = req.query;
    const where = {};
    if (status && status !== 'all') where.status = status;
    if (testId) where.testId = testId;

    const enrollments = await req.prisma.enrollment.findMany({
      where,
      include: { user: true, test: true },
      orderBy: { assignedAt: 'desc' }
    });
    res.json(enrollments);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch enrollments' });
  }
});

// Admin: Approve enrollment
router.patch('/:id/approve', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const enrollment = await req.prisma.enrollment.update({
      where: { id: req.params.id },
      data: {
        status: 'APPROVED',
        approvedAt: new Date(),
        approvedBy: req.user.id
      },
      include: { user: true, test: true }
    });

    await req.prisma.notification.create({
      data: {
        userId: enrollment.userId,
        title: 'Enrollment Approved',
        message: `Your enrollment for "${enrollment.test.title}" has been approved. You can now start the test!`
      }
    });

    res.json(enrollment);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to approve enrollment' });
  }
});

// Admin: Reject enrollment
router.patch('/:id/reject', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const { reason } = req.body;
    const enrollment = await req.prisma.enrollment.update({
      where: { id: req.params.id },
      data: { status: 'REJECTED' },
      include: { user: true, test: true }
    });

    await req.prisma.notification.create({
      data: {
        userId: enrollment.userId,
        title: 'Enrollment Rejected',
        message: reason ? `Your enrollment for "${enrollment.test.title}" was rejected. Reason: ${reason}` : `Your enrollment for "${enrollment.test.title}" was rejected. Please contact support.`
      }
    });

    res.json(enrollment);
  } catch (err) {
    res.status(500).json({ error: 'Failed to reject enrollment' });
  }
});

// Admin: Delete enrollment
router.delete('/:id', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    await req.prisma.enrollment.delete({ where: { id: req.params.id } });
    res.json({ message: 'Enrollment deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete enrollment' });
  }
});

module.exports = router;