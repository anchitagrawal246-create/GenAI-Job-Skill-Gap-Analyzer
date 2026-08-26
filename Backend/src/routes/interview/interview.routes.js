const { Router } = require("express");

// ============================================================
// INTERVIEW CONTROLLER
// ============================================================

const {
  createInterview,
  getInterviews,
  getInterview,
  startInterview,
  getInterviewQuestions,
  generateInterviewQuestion,
  getNextQuestion,
  submitAnswer,
  getAnswer,
  getInterviewAnswers,
  completeInterview,
  cancelInterview,
  getInterviewProgress,
} = require("../../controllers/interview/interview.controller");

// ============================================================
// EVALUATION CONTROLLER
// ============================================================

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
// GLOBAL AUTH
// ============================================================

router.use((req, res, next) => {
  console.log("==================================================");
  console.log("[INTERVIEW ROUTE]");
  console.log("METHOD:", req.method);
  console.log("URL:", req.originalUrl);
  console.log("BEFORE AUTH USER:", req.user);
  console.log("==================================================");

  authMiddleware(req, res, next);
});

// ============================================================
// CREATE
// ============================================================

router.post("/", (req, res, next) => {
  console.log("[ROUTE] POST /interviews");
  console.log("[ROUTE] BODY:", req.body);

  createInterview(req, res, next);
});

// ============================================================
// GET ALL
// ============================================================

router.get("/", (req, res, next) => {
  console.log("[ROUTE] GET /interviews");

  getInterviews(req, res, next);
});

// ============================================================
// GET BY ID
// ============================================================

router.get("/:id", validateObjectId("id"), (req, res, next) => {
  console.log("[ROUTE] GET /interviews/:id");
  console.log("[ROUTE] PARAMS:", req.params);

  getInterview(req, res, next);
});

// ============================================================
// START
// ============================================================

router.post("/:id/start", validateObjectId("id"), (req, res, next) => {
  console.log("[ROUTE] POST /interviews/:id/start");
  console.log("[ROUTE] PARAMS:", req.params);

  startInterview(req, res, next);
});

// ============================================================
// QUESTIONS
// ============================================================

router.get("/:id/questions", validateObjectId("id"), (req, res, next) => {
  console.log("[ROUTE] GET /interviews/:id/questions");

  getInterviewQuestions(req, res, next);
});

router.get("/:id/next-question", validateObjectId("id"), (req, res, next) => {
  console.log("[ROUTE] GET /interviews/:id/next-question");

  getNextQuestion(req, res, next);
});

// ============================================================
// GENERATE QUESTION
// ============================================================

router.post("/:id/question", validateObjectId("id"), (req, res, next) => {
  console.log("==================================================");
  console.log("[ROUTE] POST /interviews/:id/question");
  console.log("PARAMS:", req.params);
  console.log("USER:", req.user);
  console.log("BODY:", req.body);
  console.log("==================================================");

  generateInterviewQuestion(req, res, next);
});

// ============================================================
// ANSWERS
// ============================================================

router.post(
  "/:id/questions/:questionId/answer",
  validateObjectId("id"),
  validateObjectId("questionId"),
  (req, res, next) => {
    console.log("[ROUTE] POST /interviews/:id/questions/:questionId/answer");

    submitAnswer(req, res, next);
  },
);

router.get(
  "/:id/questions/:questionId/answer",
  validateObjectId("id"),
  validateObjectId("questionId"),
  getAnswer,
);

router.get("/:id/answers", validateObjectId("id"), getInterviewAnswers);

// ============================================================
// EVALUATIONS
// ============================================================

router.post(
  "/:id/questions/:questionId/evaluate",
  validateObjectId("id"),
  validateObjectId("questionId"),
  evaluateAnswer,
);

router.get(
  "/:id/questions/:questionId/evaluation",
  validateObjectId("id"),
  validateObjectId("questionId"),
  getEvaluation,
);

router.get("/:id/evaluations", validateObjectId("id"), getInterviewEvaluations);

// ============================================================
// PROGRESS
// ============================================================

router.get("/:id/progress", validateObjectId("id"), getInterviewProgress);

// ============================================================
// COMPLETE
// ============================================================

router.post("/:id/complete", validateObjectId("id"), completeInterview);

// ============================================================
// CANCEL
// ============================================================

router.post("/:id/cancel", validateObjectId("id"), cancelInterview);

// ============================================================
// EXPORT
// ============================================================

module.exports = router;
