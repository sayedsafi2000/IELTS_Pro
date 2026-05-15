// ── FILE: server/src/routes/enrollments.js ──
const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../middleware/auth');

const VALID_PAYMENT_METHODS = ['BKASH', 'NAGAD', 'BANK', 'MANUAL'];

function normalizePaymentMethod(input) {
  if (!input) return null;
  const v = String(input).toUpperCase();
  return VALID_PAYMENT_METHODS.includes(v) ? v : null;
}

// Student: enroll in a test (free or paid).
// - Free test  → auto-approve
// - Paid test  → require trxId + paymentMethod, store details, status PENDING
// - Re-enrollment after rejection is allowed: the existing rejected row is
//   reused and reset to PENDING (no duplicate rows).
router.post('/', authenticate, async (req, res) => {
  try {
    const { testId, trxId, paymentMethod } = req.body;
    if (!testId) return res.status(400).json({ error: 'testId is required' });

    const test = await req.prisma.test.findUnique({ where: { id: testId } });
    if (!test) return res.status(404).json({ error: 'Test not found' });
    if (!test.isPublished) return res.status(403).json({ error: 'Test is not available' });

    const isPaid = (test.price || 0) > 0;
    const method = normalizePaymentMethod(paymentMethod) || (isPaid ? 'BKASH' : null);

    if (isPaid) {
      const hasMobile = !!(test.bkashNumber && String(test.bkashNumber).trim());
      const hasBank = !!(test.bankAccount && String(test.bankAccount).trim());
      if (!hasMobile && !hasBank) {
        return res.status(400).json({
          error: 'This paid test has no payment method configured. Please contact the admin.'
        });
      }
      if (!trxId || !String(trxId).trim()) {
        return res.status(400).json({ error: 'Transaction ID is required for paid tests' });
      }
      if (!method) {
        return res.status(400).json({ error: 'Invalid payment method' });
      }
    }

    // Find any existing enrollment for this user/test
    const existing = await req.prisma.enrollment.findFirst({ where: { userId: req.user.id, testId } });

    if (existing) {
      if (existing.status === 'APPROVED') {
        return res.status(400).json({ error: 'You are already enrolled in this test' });
      }
      if (existing.status === 'PENDING') {
        return res.status(400).json({ error: 'Your enrollment is already pending approval' });
      }
      // Rejected → allow re-enrollment by resetting the same row
      const refreshed = await req.prisma.enrollment.update({
        where: { id: existing.id },
        data: isPaid ? {
          status: 'PENDING',
          trxId: String(trxId).trim(),
          paymentMethod: method,
          amountPaid: test.price,
          paidAt: new Date(),
          rejectedAt: null,
          rejectedBy: null,
          rejectionReason: null,
          approvedAt: null,
          approvedBy: null
        } : {
          status: 'APPROVED',
          paymentMethod: null,
          trxId: null,
          paidAt: null,
          approvedAt: new Date(),
          approvedBy: req.user.id,
          rejectedAt: null,
          rejectedBy: null,
          rejectionReason: null
        },
        include: { test: true, user: true }
      });
      if (isPaid) await notifyAdmins(req, refreshed, test);
      return res.json({
        enrollment: refreshed,
        message: isPaid ? 'Payment resubmitted. Waiting for admin approval.' : 'Enrolled successfully.'
      });
    }

    // No prior enrollment → create fresh
    if (isPaid) {
      const enrollment = await req.prisma.enrollment.create({
        data: {
          userId: req.user.id,
          testId,
          status: 'PENDING',
          trxId: String(trxId).trim(),
          paymentMethod: method,
          amountPaid: test.price,
          paidAt: new Date(),
          assignedBy: req.user.id
        },
        include: { test: true, user: true }
      });
      await notifyAdmins(req, enrollment, test);
      return res.json({ enrollment, message: 'Payment submitted. Waiting for admin approval.' });
    }

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
    res.json({ enrollment, message: 'Enrolled successfully.' });
  } catch (err) {
    console.error('[enrollments POST]', err);
    res.status(500).json({ error: 'Failed to create enrollment' });
  }
});

async function notifyAdmins(req, enrollment, test) {
  try {
    const admins = await req.prisma.user.findMany({ where: { role: 'ADMIN', isActive: true } });
    await Promise.all(admins.map(a => req.prisma.notification.create({
      data: {
        userId: a.id,
        type: 'ENROLLMENT_UPDATE',
        title: 'New Payment Enrollment',
        message: `${req.user.name} paid ৳${test.price} for "${test.title}" (TRX: ${enrollment.trxId}). Please verify and approve.`,
        link: '/admin/enrollments'
      }
    })));
  } catch (e) {
    console.error('[enrollments notifyAdmins]', e);
  }
}

// Student: my enrollments
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

// Student: available published tests with my enrollment status
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
      select: { testId: true, status: true, rejectionReason: true }
    });
    const enrolledMap = new Map(myEnrollments.map(e => [e.testId, e]));

    const availableTests = tests.map(test => {
      const en = enrolledMap.get(test.id);
      return {
        ...test,
        isEnrolled: !!en,
        enrollmentStatus: en?.status || null,
        rejectionReason: en?.rejectionReason || null
      };
    });

    res.json(availableTests);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch tests' });
  }
});

// Admin: list enrollments with filters
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

// Admin: approve
router.patch('/:id/approve', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const enrollment = await req.prisma.enrollment.update({
      where: { id: req.params.id },
      data: {
        status: 'APPROVED',
        approvedAt: new Date(),
        approvedBy: req.user.id,
        rejectedAt: null,
        rejectedBy: null,
        rejectionReason: null
      },
      include: { user: true, test: true }
    });

    await req.prisma.notification.create({
      data: {
        userId: enrollment.userId,
        type: 'ENROLLMENT_UPDATE',
        title: 'Enrollment Approved',
        message: `Your enrollment for "${enrollment.test.title}" has been approved. You can now start the test!`,
        link: `/tests/${enrollment.testId}`
      }
    }).catch(() => {});

    res.json(enrollment);
  } catch (err) {
    console.error('[enrollments approve]', err);
    if (err.code === 'P2025') return res.status(404).json({ error: 'Enrollment not found' });
    res.status(500).json({ error: 'Failed to approve enrollment' });
  }
});

// Admin: reject (with optional reason)
router.patch('/:id/reject', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const reason = (req.body?.reason || '').trim() || null;
    const enrollment = await req.prisma.enrollment.update({
      where: { id: req.params.id },
      data: {
        status: 'REJECTED',
        rejectedAt: new Date(),
        rejectedBy: req.user.id,
        rejectionReason: reason
      },
      include: { user: true, test: true }
    });

    await req.prisma.notification.create({
      data: {
        userId: enrollment.userId,
        type: 'ENROLLMENT_UPDATE',
        title: 'Enrollment Rejected',
        message: reason
          ? `Your enrollment for "${enrollment.test.title}" was rejected. Reason: ${reason}`
          : `Your enrollment for "${enrollment.test.title}" was rejected. Please contact support.`,
        link: `/tests/${enrollment.testId}`
      }
    }).catch(() => {});

    res.json(enrollment);
  } catch (err) {
    console.error('[enrollments reject]', err);
    if (err.code === 'P2025') return res.status(404).json({ error: 'Enrollment not found' });
    res.status(500).json({ error: 'Failed to reject enrollment' });
  }
});

// Admin: delete
router.delete('/:id', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    await req.prisma.enrollment.delete({ where: { id: req.params.id } });
    res.json({ message: 'Enrollment deleted' });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Enrollment not found' });
    res.status(500).json({ error: 'Failed to delete enrollment' });
  }
});

module.exports = router;
