const interviewService = require("../../services/interview/interview.service");

const {
  debug,
  debugError,
  getUserId,
  getErrorStatus,
} = require("./interview.utils");

// ============================================================
// GET ALL INTERVIEW QUESTIONS
// ============================================================

const getInterviewQuestions = async (req, res) => {
  try {
    const userId = getUserId(req);
    const interviewId = req.params.id;

    const questions = await interviewService.getInterviewQuestions(
      userId,
      interviewId,
    );

    return res.status(200).json({
      success: true,
      data: questions,
    });
  } catch (error) {
    debugError("GET QUESTIONS failed", error);

    return res.status(getErrorStatus(error)).json({
      success: false,
      message: error?.message || "Failed to fetch interview questions",
    });
  }
};

// ============================================================
// GENERATE NEXT ADAPTIVE QUESTION
// ============================================================

const generateInterviewQuestion = async (req, res) => {
  try {
    const userId = getUserId(req);
    const interviewId = req.params.id;

    debug("GENERATE QUESTION", {
      userId: String(userId),
      interviewId: String(interviewId),
    });

    const result = await interviewService.generateInterviewQuestion(
      userId,
      interviewId,
    );

    return res.status(200).json({
      success: true,
      message: result?.question
        ? "Next interview question generated successfully"
        : "Interview has no further question to generate",
      data: result,
    });
  } catch (error) {
    debugError("GENERATE QUESTION failed", error);

    return res.status(getErrorStatus(error)).json({
      success: false,
      message: error?.message || "Failed to generate next interview question",
    });
  }
};

// ============================================================
// GET CURRENT QUESTION
// ============================================================

const getCurrentQuestion = async (req, res) => {
  try {
    const result = await interviewService.getCurrentQuestion(
      getUserId(req),
      req.params.id,
    );

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    debugError("GET CURRENT QUESTION failed", error);

    return res.status(getErrorStatus(error)).json({
      success: false,
      message: error?.message || "Failed to fetch current question",
    });
  }
};

// ============================================================
// GET NEXT QUESTION
// ============================================================

const getNextQuestion = async (req, res) => {
  try {
    const result = await interviewService.getNextQuestion(
      getUserId(req),
      req.params.id,
    );

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    debugError("NEXT QUESTION failed", error);

    return res.status(getErrorStatus(error)).json({
      success: false,
      message: error?.message || "Failed to move to next question",
    });
  }
};

// ============================================================
// GET PREVIOUS QUESTION
// ============================================================

const getPreviousQuestion = async (req, res) => {
  try {
    const result = await interviewService.getPreviousQuestion(
      getUserId(req),
      req.params.id,
    );

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    debugError("PREVIOUS QUESTION failed", error);

    return res.status(getErrorStatus(error)).json({
      success: false,
      message: error?.message || "Failed to move to previous question",
    });
  }
};

// ============================================================
// GET QUESTION BY NUMBER
// ============================================================

const getQuestionByNumber = async (req, res) => {
  try {
    const result = await interviewService.getQuestionByNumber(
      getUserId(req),
      req.params.id,
      req.params.questionNumber,
    );

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    debugError("GET QUESTION BY NUMBER failed", error);

    return res.status(getErrorStatus(error)).json({
      success: false,
      message: error?.message || "Failed to fetch question",
    });
  }
};

// ============================================================
// SELECT QUESTION
// ============================================================

const selectQuestion = async (req, res) => {
  try {
    const result = await interviewService.selectQuestion(
      getUserId(req),
      req.params.id,
      req.params.questionNumber,
    );

    return res.status(200).json({
      success: true,
      message: "Question selected successfully",
      data: result,
    });
  } catch (error) {
    debugError("SELECT QUESTION failed", error);

    return res.status(getErrorStatus(error)).json({
      success: false,
      message: error?.message || "Failed to select question",
    });
  }
};

module.exports = {
  getInterviewQuestions,
  generateInterviewQuestion,
  getCurrentQuestion,
  getNextQuestion,
  getPreviousQuestion,
  getQuestionByNumber,
  selectQuestion,
};
