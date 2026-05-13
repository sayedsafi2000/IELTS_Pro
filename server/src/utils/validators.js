// ── FILE: server/src/utils/validators.js ──
const { body, param, query } = require('express-validator');

const registerValidation = [
  body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('phone').optional().trim()
];

const loginValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
];

const createTestValidation = [
  body('title').trim().isLength({ min: 1 }).withMessage('Title required'),
  body('type').optional().isIn(['FULL', 'LISTENING_ONLY', 'READING_ONLY', 'WRITING_ONLY', 'SPEAKING_ONLY'])
];

const createModuleValidation = [
  body('testId').isUUID(),
  body('type').isIn(['LISTENING', 'READING', 'WRITING', 'SPEAKING']),
  body('title').trim().isLength({ min: 1 }),
  body('durationMins').isInt({ min: 1 })
];

const createQuestionValidation = [
  body('moduleId').isUUID(),
  body('type').notEmpty(),
  body('questionText').trim().isLength({ min: 1 }),
  body('marks').optional().isInt({ min: 1 })
];

const saveAnswerValidation = [
  body('moduleSessionId').isUUID(),
  body('questionId').isUUID(),
  body('answer').optional()
];

const startSessionValidation = [
  body('testId').isUUID(),
  body('mode').optional().isIn(['EXAM', 'PRACTICE'])
];

module.exports = {
  registerValidation,
  loginValidation,
  createTestValidation,
  createModuleValidation,
  createQuestionValidation,
  saveAnswerValidation,
  startSessionValidation
};