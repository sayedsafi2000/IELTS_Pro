// ── FILE: server/src/services/scoreService.js ──
function bandFromRaw(correct, total, moduleType = 'LISTENING') {
  if (total === 0) return 0;
  const score = correct;
  if (score >= 39) return 9;
  if (score >= 37) return 8.5;
  if (score >= 35) return 8;
  if (score >= 33) return 7.5;
  if (score >= 30) return 7;
  if (score >= 26) return 6.5;
  if (score >= 23) return 6;
  if (score >= 18) return 5.5;
  if (score >= 16) return 5;
  if (score >= 13) return 4.5;
  if (score >= 11) return 4;
  if (score >= 9) return 3.5;
  if (score >= 7) return 3;
  if (score >= 5) return 2.5;
  if (score >= 4) return 2;
  return 1;
}

function roundToHalf(num) {
  return Math.round(num * 2) / 2;
}

function calculateOverallBand(listening, reading, writing, speaking) {
  const bands = [listening, reading, writing, speaking].filter(b => b != null);
  if (bands.length === 0) return null;
  const avg = bands.reduce((a, b) => a + b, 0) / bands.length;
  return roundToHalf(avg);
}

function checkAnswer(studentAnswer, correctAnswer, acceptedAnswers = []) {
  if (!studentAnswer) return false;
  const normalized = studentAnswer.trim().toLowerCase();
  const correctNormalized = (correctAnswer || '').toString().trim().toLowerCase();
  if (normalized === correctNormalized) return true;
  if (Array.isArray(acceptedAnswers)) {
    return acceptedAnswers.some(a => a.toString().trim().toLowerCase() === normalized);
  }
  return false;
}

module.exports = { bandFromRaw, roundToHalf, calculateOverallBand, checkAnswer };