// ── FILE: server/src/services/resultService.js ──
// Centralised helper to keep Result.overallBand and isReleased in sync
// whenever a band component (listening / reading / writing / speaking) changes.

const { roundToHalf } = require('./scoreService');

/**
 * Recomputes overallBand from the four sub-bands and, if the test session is
 * already submitted and all four bands are present, marks the result as
 * released. Idempotent.
 *
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {string} sessionId
 */
async function recomputeAndMaybeReleaseResult(prisma, sessionId) {
  const session = await prisma.testSession.findUnique({
    where: { id: sessionId },
    include: { user: true, test: true }
  });
  if (!session) return null;

  let result = await prisma.result.findUnique({ where: { sessionId } });
  if (!result) return null;

  const { listeningBand, readingBand, writingBand, speakingBand } = result;
  const updates = {};

  if (listeningBand != null && readingBand != null && writingBand != null && speakingBand != null) {
    const overall = roundToHalf((listeningBand + readingBand + writingBand + speakingBand) / 4);
    if (result.overallBand !== overall) updates.overallBand = overall;

    // Auto-release once everything is in and the session is submitted.
    if (!result.isReleased && session.status !== 'IN_PROGRESS') {
      updates.isReleased = true;
      updates.releasedAt = new Date();
    }
  }

  if (Object.keys(updates).length === 0) return result;

  result = await prisma.result.update({ where: { id: result.id }, data: updates });

  if (updates.isReleased) {
    await prisma.notification.create({
      data: {
        userId: session.userId,
        type: 'RESULT_RELEASED',
        title: 'Results Released',
        message: `Your results for "${session.test?.title || 'the test'}" are now available.`,
        link: `/results/${session.id}`
      }
    }).catch(() => {});
  }

  return result;
}

module.exports = { recomputeAndMaybeReleaseResult };
