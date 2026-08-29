const { Router } = require("express");

// ============================================================
// INTERVIEW CONTROLLER AGGREGATOR
// ============================================================

const {
  // ----------------------------------------------------------
  // INTERVIEW / LIFECYCLE
  // ----------------------------------------------------------
  createInterview,
  getInterviews,
  getInterview,
  startInterview,
  pauseInterview,
  resumeInterview,
  completeInterview,
  cancelInterview,
  getInterviewProgress,

  // ----------------------------------------------------------
  // QUESTIONS
  // ----------------------------------------------------------
  getInterviewQuestions,
  generateInterviewQuestion,
  getCurrentQuestion,
  getNextQuestion,
  getPreviousQuestion,
  getQuestionByNumber,
  selectQuestion,

  // ----------------------------------------------------------
  // ANSWERS
  // ----------------------------------------------------------
  submitAnswer,
  resubmitAnswer,
  runCode,
  skipQuestion,
  answerSkippedQuestion,
  getAnswer,
  getInterviewAnswers,
  getInterviewQuestionStatuses,

  // ----------------------------------------------------------
  // EVALUATION
  // ----------------------------------------------------------
  evaluateAnswer,
  reEvaluateAnswer,
  reEvaluateInterview,
  getEvaluation,
  getInterviewEvaluations,
  getInterviewScore,

  // ----------------------------------------------------------
  // REPORTS
  // ----------------------------------------------------------
  getInterviewReport,
  generateInterviewReport,
} = require("../../controllers/interview/interview.controller");

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
// GLOBAL AUTH
// ============================================================

router.use((req, res, next) => {
  console.log("==================================================");
  console.log("[INTERVIEW ROUTE]");
  console.log("METHOD:", req.method);
  console.log("URL:", req.originalUrl);
  console.log("BEFORE AUTH USER:", req.user);
  console.log("==================================================");

  return authMiddleware(req, res, next);
});

// ============================================================
// ROOT INTERVIEW ROUTES
// ============================================================

// POST /api/interviews
router.post("/", createInterview);

// GET /api/interviews
router.get("/", getInterviews);

// ============================================================
// INTERVIEW DETAIL / ACTION ROUTES
// ============================================================

// GET /api/interviews/:id/score
router.get("/:id/score", validateObjectId("id"), getInterviewScore);

// GET /api/interviews/:id/progress
router.get("/:id/progress", validateObjectId("id"), getInterviewProgress);

// GET /api/interviews/:id/report
router.get("/:id/report", validateObjectId("id"), getInterviewReport);

// POST /api/interviews/:id/report
router.post("/:id/report", validateObjectId("id"), generateInterviewReport);

// GET /api/interviews/:id/evaluations
router.get("/:id/evaluations", validateObjectId("id"), getInterviewEvaluations);

// POST /api/interviews/:id/re-evaluate
router.post("/:id/re-evaluate", validateObjectId("id"), reEvaluateInterview);

// GET /api/interviews/:id/answers
router.get("/:id/answers", validateObjectId("id"), getInterviewAnswers);

// GET /api/interviews/:id/question-statuses
router.get(
  "/:id/question-statuses",
  validateObjectId("id"),
  getInterviewQuestionStatuses,
);

// GET /api/interviews/:id/current-question
router.get("/:id/current-question", validateObjectId("id"), getCurrentQuestion);

// GET /api/interviews/:id/next-question
router.get("/:id/next-question", validateObjectId("id"), getNextQuestion);

// GET /api/interviews/:id/previous-question
router.get(
  "/:id/previous-question",
  validateObjectId("id"),
  getPreviousQuestion,
);

// GET /api/interviews/:id/questions/next
router.get("/:id/questions/next", validateObjectId("id"), getNextQuestion);

// GET /api/interviews/:id/questions/previous
router.get(
  "/:id/questions/previous",
  validateObjectId("id"),
  getPreviousQuestion,
);

// POST /api/interviews/:id/start
router.post("/:id/start", validateObjectId("id"), startInterview);

// POST /api/interviews/:id/pause
router.post("/:id/pause", validateObjectId("id"), pauseInterview);

// POST /api/interviews/:id/resume
router.post("/:id/resume", validateObjectId("id"), resumeInterview);

// POST /api/interviews/:id/complete
router.post("/:id/complete", validateObjectId("id"), completeInterview);

// POST /api/interviews/:id/cancel
router.post("/:id/cancel", validateObjectId("id"), cancelInterview);

// ============================================================
// QUESTION ROUTES
// ============================================================

// GET /api/interviews/:id/questions
router.get("/:id/questions", validateObjectId("id"), getInterviewQuestions);

// GET /api/interviews/:id/questions/:questionNumber
router.get(
  "/:id/questions/:questionNumber",
  validateObjectId("id"),
  getQuestionByNumber,
);

// POST /api/interviews/:id/questions/:questionNumber/select
router.post(
  "/:id/questions/:questionNumber/select",
  validateObjectId("id"),
  selectQuestion,
);

// POST /api/interviews/:id/question
router.post("/:id/question", validateObjectId("id"), generateInterviewQuestion);

// ============================================================
// ANSWER ROUTES
// ============================================================

// POST /api/interviews/:id/questions/:questionId/answer
router.post(
  "/:id/questions/:questionId/answer",
  validateObjectId("id"),
  validateObjectId("questionId"),
  submitAnswer,
);

// PUT /api/interviews/:id/questions/:questionId/answer
router.put(
  "/:id/questions/:questionId/answer",
  validateObjectId("id"),
  validateObjectId("questionId"),
  resubmitAnswer,
);

// POST /api/interviews/:id/questions/:questionId/resubmit
router.post(
  "/:id/questions/:questionId/resubmit",
  validateObjectId("id"),
  validateObjectId("questionId"),
  resubmitAnswer,
);

// POST /api/interviews/:id/questions/:questionId/run
router.post(
  "/:id/questions/:questionId/run",
  validateObjectId("id"),
  validateObjectId("questionId"),
  runCode,
);

// GET /api/interviews/:id/questions/:questionId/answer
router.get(
  "/:id/questions/:questionId/answer",
  validateObjectId("id"),
  validateObjectId("questionId"),
  getAnswer,
);

// POST /api/interviews/:id/questions/:questionId/skip
router.post(
  "/:id/questions/:questionId/skip",
  validateObjectId("id"),
  validateObjectId("questionId"),
  skipQuestion,
);

// POST /api/interviews/:id/questions/:questionId/answer-skipped
router.post(
  "/:id/questions/:questionId/answer-skipped",
  validateObjectId("id"),
  validateObjectId("questionId"),
  answerSkippedQuestion,
);

// ============================================================
// EVALUATION ROUTES
// ============================================================

// POST /api/interviews/:id/questions/:questionId/evaluate
router.post(
  "/:id/questions/:questionId/evaluate",
  validateObjectId("id"),
  validateObjectId("questionId"),
  evaluateAnswer,
);

// POST /api/interviews/:id/questions/:questionId/re-evaluate
router.post(
  "/:id/questions/:questionId/re-evaluate",
  validateObjectId("id"),
  validateObjectId("questionId"),
  reEvaluateAnswer,
);

// GET /api/interviews/:id/questions/:questionId/evaluation
router.get(
  "/:id/questions/:questionId/evaluation",
  validateObjectId("id"),
  validateObjectId("questionId"),
  getEvaluation,
);

// ============================================================
// GET INTERVIEW BY ID
// ============================================================
//
// IMPORTANT:
// Keep this LAST among interview routes.
// Otherwise /:id can interfere with more specific routes.
//

router.get("/:id", validateObjectId("id"), getInterview);

// ============================================================
// EXPORT
// ============================================================

module.exports = router;
