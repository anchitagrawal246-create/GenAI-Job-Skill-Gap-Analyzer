
const evaluationService = require("../../services/interview/evaluation.service");

// ============================================================
// HELPERS
// ============================================================

const getUserId = (req) => {
  const userId = req?.user?.id;

  if (!userId) {
    throw new Error("Authenticated user not found");
  }

  return userId;
};

const safeNumber = (value) => {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return 0;
  }

  return Math.max(0, Math.min(100, number));
};

const average = (values) => {
  if (!Array.isArray(values) || values.length === 0) {
    return 0;
  }

  const total = values.reduce(
    (sum, value) => sum + safeNumber(value),
    0
  );

  return Math.round((total / values.length) * 100) / 100;
};

// ============================================================
// ERROR STATUS
// ============================================================

const getErrorStatus = (error) => {
  const message = error?.message || "";

  const notFoundMessages = [
    "Interview not found",
    "Question not found",
    "Answer not found",
    "Evaluation not found",
    "Original evaluation must exist before re-evaluation",
  ];

  if (notFoundMessages.includes(message)) {
    return 404;
  }

  return 400;
};

// ============================================================
// EVALUATE ANSWER
// POST /api/interviews/:id/questions/:questionId/evaluate
// ============================================================

const evaluateAnswer = async (req, res) => {
  try {
    const { id: interviewId, questionId } = req.params;

    const result = await evaluationService.evaluateAnswer(
      getUserId(req),
      interviewId,
      questionId
    );

    return res.status(200).json({
      success: true,
      message: result?.alreadyEvaluated
        ? "Answer was already evaluated"
        : "Answer evaluated successfully",
      data: result,
    });
  } catch (error) {
    console.error("Evaluate answer error:", error);

    return res.status(getErrorStatus(error)).json({
      success: false,
      message:
        error?.message || "Failed to evaluate answer",
    });
  }
};

// ============================================================
// RE-EVALUATE ONE ANSWER
// POST /api/interviews/:id/questions/:questionId/re-evaluate
// ============================================================

const reEvaluateAnswer = async (req, res) => {
  try {
    const { id: interviewId, questionId } = req.params;

    const body = req.body || {};

    const payload = {
      answerType:
        typeof body.answerType === "string"
          ? body.answerType
          : undefined,

      answerText:
        typeof body.answerText === "string"
          ? body.answerText
          : undefined,

      code:
        typeof body.code === "string"
          ? body.code
          : undefined,

      language:
        typeof body.language === "string"
          ? body.language
          : undefined,
    };

    const result = await evaluationService.reEvaluateAnswer(
      getUserId(req),
      interviewId,
      questionId,
      payload
    );

    return res.status(200).json({
      success: true,
      message: "Answer re-evaluated successfully",
      data: result,
    });
  } catch (error) {
    console.error("Re-evaluate answer error:", error);

    return res.status(getErrorStatus(error)).json({
      success: false,
      message:
        error?.message || "Failed to re-evaluate answer",
    });
  }
};

// ============================================================
// RE-EVALUATE ENTIRE INTERVIEW
// POST /api/interviews/:id/re-evaluate
// ============================================================

const reEvaluateInterview = async (req, res) => {
  try {
    const { id: interviewId } = req.params;

    const result =
      await evaluationService.reEvaluateInterview(
        getUserId(req),
        interviewId
      );

    return res.status(200).json({
      success: true,

      message:
        result?.failedQuestions > 0
          ? "Interview re-evaluation completed with some failures"
          : "Interview re-evaluated successfully",

      data: result,
    });
  } catch (error) {
    console.error("Re-evaluate interview error:", error);

    return res.status(getErrorStatus(error)).json({
      success: false,
      message:
        error?.message ||
        "Failed to re-evaluate interview",
    });
  }
};

// ============================================================
// GET SINGLE EVALUATION
// GET /api/interviews/:id/questions/:questionId/evaluation
// ============================================================

const getEvaluation = async (req, res) => {
  try {
    const { id: interviewId, questionId } = req.params;

    const result = await evaluationService.getEvaluation(
      getUserId(req),
      interviewId,
      questionId
    );

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Get evaluation error:", error);

    return res.status(getErrorStatus(error)).json({
      success: false,
      message:
        error?.message || "Failed to fetch evaluation",
    });
  }
};

// ============================================================
// GET ALL INTERVIEW EVALUATIONS
// GET /api/interviews/:id/evaluations
// ============================================================

const getInterviewEvaluations = async (req, res) => {
  try {
    const { id: interviewId } = req.params;

    const result =
      await evaluationService.getInterviewEvaluations(
        getUserId(req),
        interviewId
      );

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error(
      "Get interview evaluations error:",
      error
    );

    return res.status(getErrorStatus(error)).json({
      success: false,
      message:
        error?.message || "Failed to fetch evaluations",
    });
  }
};

// ============================================================
// GET OVERALL INTERVIEW SCORE
// GET /api/interviews/:id/score
// ============================================================

const getInterviewScore = async (req, res) => {
  try {
    const { id: interviewId } = req.params;

    const evaluations =
      await evaluationService.getInterviewEvaluations(
        getUserId(req),
        interviewId
      );

    const currentEvaluations = Array.isArray(
      evaluations?.current
    )
      ? evaluations.current
      : [];

    // --------------------------------------------------------
    // NO EVALUATIONS
    // --------------------------------------------------------

    if (currentEvaluations.length === 0) {
      return res.status(200).json({
        success: true,

        data: {
          interviewId,
          overallScore: 0,
          totalEvaluations: 0,
          evaluatedQuestions: 0,

          dimensions: {
            correctness: 0,
            technicalKnowledge: 0,
            communication: 0,
            problemSolving: 0,
          },

          categoryScores: {},
          technologyScores: {},

          message: "No evaluated questions found",
        },
      });
    }

    // --------------------------------------------------------
    // SCORE COLLECTIONS
    // --------------------------------------------------------

    const overallScores = [];
    const correctnessScores = [];
    const technicalScores = [];
    const communicationScores = [];
    const problemSolvingScores = [];

    const categories = {};
    const technologies = {};

    // --------------------------------------------------------
    // PROCESS EVALUATIONS
    // --------------------------------------------------------

    for (const evaluation of currentEvaluations) {
      const overallScore = safeNumber(
        evaluation?.overallScore
      );

      const correctnessScore = safeNumber(
        evaluation?.correctnessScore
      );

      const technicalScore = safeNumber(
        evaluation?.technicalScore
      );

      const communicationScore = safeNumber(
        evaluation?.communicationScore
      );

      const problemSolvingScore = safeNumber(
        evaluation?.problemSolvingScore
      );

      overallScores.push(overallScore);
      correctnessScores.push(correctnessScore);
      technicalScores.push(technicalScore);
      communicationScores.push(communicationScore);
      problemSolvingScores.push(problemSolvingScore);

      // ------------------------------------------------------
      // CATEGORY
      // ------------------------------------------------------

      const category =
        evaluation?.category ||
        evaluation?.question?.category ||
        "uncategorized";

      if (!categories[category]) {
        categories[category] = {
          scores: [],
          questions: 0,
        };
      }

      categories[category].scores.push(
        overallScore
      );

      categories[category].questions += 1;

      // ------------------------------------------------------
      // TECHNOLOGY
      // ------------------------------------------------------

      const technology =
        evaluation?.technology ||
        evaluation?.question?.skill ||
        evaluation?.question?.technology ||
        "Unknown";

      if (!technologies[technology]) {
        technologies[technology] = {
          scores: [],
          questions: 0,
        };
      }

      technologies[technology].scores.push(
        overallScore
      );

      technologies[technology].questions += 1;
    }

    // --------------------------------------------------------
    // CATEGORY SCORES
    // --------------------------------------------------------

    const categoryScores = {};

    for (const [
      category,
      categoryData,
    ] of Object.entries(categories)) {
      categoryScores[category] = {
        score: average(categoryData.scores),
        questions: categoryData.questions,
      };
    }

    // --------------------------------------------------------
    // TECHNOLOGY SCORES
    // --------------------------------------------------------

    const technologyScores = {};

    for (const [
      technology,
      technologyData,
    ] of Object.entries(technologies)) {
      technologyScores[technology] = {
        score: average(technologyData.scores),
        questions: technologyData.questions,
      };
    }

    // --------------------------------------------------------
    // FINAL RESULT
    // --------------------------------------------------------

    const result = {
      interviewId,

      overallScore: average(overallScores),

      totalEvaluations: currentEvaluations.length,

      evaluatedQuestions: currentEvaluations.length,

      dimensions: {
        correctness: average(correctnessScores),
        technicalKnowledge: average(technicalScores),
        communication: average(communicationScores),
        problemSolving: average(problemSolvingScores),
      },

      categoryScores,

      technologyScores,
    };

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error(
      "Get interview score error:",
      error
    );

    return res.status(getErrorStatus(error)).json({
      success: false,
      message:
        error?.message ||
        "Failed to calculate interview score",
    });
  }
};

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  evaluateAnswer,
  reEvaluateAnswer,
  reEvaluateInterview,
  getEvaluation,
  getInterviewEvaluations,
  getInterviewScore,
};
