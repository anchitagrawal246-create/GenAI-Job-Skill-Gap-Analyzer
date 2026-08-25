
const { Router } = require("express");

// ============================================================
// CONTROLLERS
// ============================================================

const {
  createInterview,
  getInterviews,
  getInterview,
  startInterview,
  getInterviewQuestions,
  generateInterviewQuestion,
  submitAnswer,
  completeInterview,
} = require("../../controllers/interview/interview.controller");

const {
  evaluateAnswer,
  getEvaluation,
  getInterviewEvaluations,
} = require("../../controllers/interview/evaluation.controller");

// ============================================================
// MIDDLEWARE
// ============================================================

const authMiddleware = require("../../middleware/auth.middleware");
const validateObjectId = require("../../middleware/validateObjectId.middleware");

// ============================================================
// ROUTER
// ============================================================

const router = Router();

// ============================================================
// AUTHENTICATION
// ============================================================

// Every interview route requires authentication.
router.use(authMiddleware);

// ============================================================
// INTERVIEW ROUTES
// ============================================================

// ------------------------------------------------------------
// CREATE INTERVIEW
// POST /api/interviews
// ------------------------------------------------------------

router.post("/", createInterview);

// ------------------------------------------------------------
// GET USER INTERVIEWS
// GET /api/interviews
// ------------------------------------------------------------

router.get("/", getInterviews);

// ------------------------------------------------------------
// GET SINGLE INTERVIEW
// GET /api/interviews/:id
// ------------------------------------------------------------

router.get(
  "/:id",
  validateObjectId("id"),
  getInterview
);

// ------------------------------------------------------------
// START INTERVIEW
// POST /api/interviews/:id/start
// ------------------------------------------------------------

router.post(
  "/:id/start",
  validateObjectId("id"),
  startInterview
);

// ------------------------------------------------------------
// GET INTERVIEW QUESTIONS
// GET /api/interviews/:id/questions
// ------------------------------------------------------------

router.get(
  "/:id/questions",
  validateObjectId("id"),
  getInterviewQuestions
);

// ------------------------------------------------------------
// GENERATE NEXT AI QUESTION
// POST /api/interviews/:id/question
// ------------------------------------------------------------

router.post(
  "/:id/question",
  validateObjectId("id"),
  generateInterviewQuestion
);

// ============================================================
// ANSWER ROUTES
// ============================================================

// ------------------------------------------------------------
// SUBMIT ANSWER
// POST /api/interviews/:id/questions/:questionId/answer
// ------------------------------------------------------------

router.post(
  "/:id/questions/:questionId/answer",
  validateObjectId("id"),
  validateObjectId("questionId"),
  submitAnswer
);

// ============================================================
// EVALUATION ROUTES
// ============================================================

// ------------------------------------------------------------
// EVALUATE ANSWER
// POST /api/interviews/:id/questions/:questionId/evaluate
// ------------------------------------------------------------

router.post(
  "/:id/questions/:questionId/evaluate",
  validateObjectId("id"),
  validateObjectId("questionId"),
  evaluateAnswer
);

// ------------------------------------------------------------
// GET SINGLE EVALUATION
// GET /api/interviews/:id/questions/:questionId/evaluation
// ------------------------------------------------------------

router.get(
  "/:id/questions/:questionId/evaluation",
  validateObjectId("id"),
  validateObjectId("questionId"),
  getEvaluation
);

// ------------------------------------------------------------
// GET ALL INTERVIEW EVALUATIONS
// GET /api/interviews/:id/evaluations
// ------------------------------------------------------------

router.get(
  "/:id/evaluations",
  validateObjectId("id"),
  getInterviewEvaluations
);

// ============================================================
// COMPLETE INTERVIEW
// ============================================================

// ------------------------------------------------------------
// COMPLETE INTERVIEW
// POST /api/interviews/:id/complete
// ------------------------------------------------------------

router.post(
  "/:id/complete",
  validateObjectId("id"),
  completeInterview
);

// ============================================================
// EXPORT
// ============================================================

module.exports = router;
