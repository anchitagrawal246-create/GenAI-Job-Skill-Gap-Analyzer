const evaluationService = require("../../services/interview/evaluation.service");

// ============================================================
// EVALUATE ANSWER
// ============================================================

const evaluateAnswer = async (req, res) => {
  try {
    const { id: interviewId, questionId } = req.params;

    const result = await evaluationService.evaluateAnswer(
      req.user.id,
      interviewId,
      questionId,
    );

    return res.status(200).json({
      success: true,
      message: result.alreadyEvaluated
        ? "Answer was already evaluated"
        : "Answer evaluated successfully",
      data: result,
    });
  } catch (error) {
    console.error("Evaluate answer error:", error);

    return res.status(400).json({
      success: false,
      message: error.message || "Failed to evaluate answer",
    });
  }
};

// ============================================================
// GET SINGLE EVALUATION
// ============================================================

const getEvaluation = async (req, res) => {
  try {
    const { id: interviewId, questionId } = req.params;

    const evaluation = await evaluationService.getEvaluation(
      req.user.id,
      interviewId,
      questionId,
    );

    return res.status(200).json({
      success: true,
      data: evaluation,
    });
  } catch (error) {
    console.error("Get evaluation error:", error);

    const statusCode =
      error.message === "Interview not found" ||
      error.message === "Evaluation not found"
        ? 404
        : 400;

    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to fetch evaluation",
    });
  }
};

// ============================================================
// GET ALL INTERVIEW EVALUATIONS
// ============================================================

const getInterviewEvaluations = async (req, res) => {
  try {
    const { id: interviewId } = req.params;

    const evaluations = await evaluationService.getInterviewEvaluations(
      req.user.id,
      interviewId,
    );

    return res.status(200).json({
      success: true,
      data: evaluations,
    });
  } catch (error) {
    console.error("Get interview evaluations error:", error);

    const statusCode = error.message === "Interview not found" ? 404 : 400;

    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to fetch evaluations",
    });
  }
};

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  evaluateAnswer,
  getEvaluation,
  getInterviewEvaluations,
};
