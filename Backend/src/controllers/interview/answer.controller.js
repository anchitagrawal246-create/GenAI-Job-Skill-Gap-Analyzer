const answerService = require("../../services/interview/answer.service");

const {
  debug,
  debugError,
  getUserId,
  getErrorStatus,
} = require("./interview.utils");

// ============================================================
// SUBMIT ANSWER
// ============================================================

const submitAnswer = async (req, res) => {
  try {
    const { id: interviewId, questionId } = req.params;

    const userId = getUserId(req);
    const payload = req.body || {};

    debug("SUBMIT ANSWER", {
      userId: String(userId),
      interviewId: String(interviewId),
      questionId: String(questionId),
      answerType: payload.answerType || "auto",
    });

    const answer = await answerService.submitAnswer(
      userId,
      interviewId,
      questionId,
      payload,
    );

    return res.status(201).json({
      success: true,
      message: "Answer submitted successfully",
      data: answer,
    });
  } catch (error) {
    debugError("SUBMIT ANSWER failed", error);

    return res.status(getErrorStatus(error)).json({
      success: false,
      message: error?.message || "Failed to submit answer",
    });
  }
};

// ============================================================
// RESUBMIT ANSWER
// ============================================================

const resubmitAnswer = async (req, res) => {
  try {
    const { id: interviewId, questionId } = req.params;

    const answer = await answerService.resubmitAnswer(
      getUserId(req),
      interviewId,
      questionId,
      req.body || {},
    );

    return res.status(200).json({
      success: true,
      message: "Answer resubmitted successfully",
      data: answer,
    });
  } catch (error) {
    debugError("RESUBMIT ANSWER failed", error);

    return res.status(getErrorStatus(error)).json({
      success: false,
      message: error?.message || "Failed to resubmit answer",
    });
  }
};

// ============================================================
// RUN CODE
// ============================================================

const runCode = async (req, res) => {
  try {
    const { id: interviewId, questionId } = req.params;

    const result = await answerService.recordCodeRun(
      getUserId(req),
      interviewId,
      questionId,
      req.body || {},
    );

    return res.status(200).json({
      success: true,
      message: "Code run recorded successfully",
      data: result,
    });
  } catch (error) {
    debugError("RUN CODE failed", error);

    return res.status(getErrorStatus(error)).json({
      success: false,
      message: error?.message || "Failed to run code",
    });
  }
};

// ============================================================
// SKIP QUESTION
// ============================================================

const skipQuestion = async (req, res) => {
  try {
    const { id: interviewId, questionId } = req.params;

    const skipReason = req.body?.skipReason || "user-skipped";

    const result = await answerService.skipQuestion(
      getUserId(req),
      interviewId,
      questionId,
      skipReason,
    );

    return res.status(200).json({
      success: true,
      message: "Question skipped successfully",
      data: result,
    });
  } catch (error) {
    debugError("SKIP QUESTION failed", error);

    return res.status(getErrorStatus(error)).json({
      success: false,
      message: error?.message || "Failed to skip question",
    });
  }
};

// ============================================================
// ANSWER SKIPPED QUESTION
// ============================================================

const answerSkippedQuestion = async (req, res) => {
  try {
    const { id: interviewId, questionId } = req.params;

    const result = await answerService.answerSkippedQuestion(
      getUserId(req),
      interviewId,
      questionId,
      req.body || {},
    );

    return res.status(200).json({
      success: true,
      message: "Skipped question answered successfully",
      data: result,
    });
  } catch (error) {
    debugError("ANSWER SKIPPED QUESTION failed", error);

    return res.status(getErrorStatus(error)).json({
      success: false,
      message: error?.message || "Failed to answer skipped question",
    });
  }
};

// ============================================================
// GET SINGLE ANSWER
// ============================================================

const getAnswer = async (req, res) => {
  try {
    const { id: interviewId, questionId } = req.params;

    const answer = await answerService.getAnswer(
      getUserId(req),
      interviewId,
      questionId,
    );

    if (!answer) {
      return res.status(404).json({
        success: false,
        message: "Answer not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: answer,
    });
  } catch (error) {
    debugError("GET ANSWER failed", error);

    return res.status(getErrorStatus(error)).json({
      success: false,
      message: error?.message || "Failed to fetch answer",
    });
  }
};

// ============================================================
// GET ALL INTERVIEW ANSWERS
// ============================================================

const getInterviewAnswers = async (req, res) => {
  try {
    const answers = await answerService.getInterviewAnswers(
      getUserId(req),
      req.params.id,
    );

    return res.status(200).json({
      success: true,
      data: answers,
    });
  } catch (error) {
    debugError("GET ANSWERS failed", error);

    return res.status(getErrorStatus(error)).json({
      success: false,
      message: error?.message || "Failed to fetch interview answers",
    });
  }
};

// ============================================================
// GET QUESTION STATUSES
// ============================================================

const getInterviewQuestionStatuses = async (req, res) => {
  try {
    const result = await answerService.getInterviewQuestionStatuses(
      getUserId(req),
      req.params.id,
    );

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    debugError("GET QUESTION STATUSES failed", error);

    return res.status(getErrorStatus(error)).json({
      success: false,
      message: error?.message || "Failed to fetch question statuses",
    });
  }
};

module.exports = {
  submitAnswer,
  resubmitAnswer,
  runCode,
  skipQuestion,
  answerSkippedQuestion,
  getAnswer,
  getInterviewAnswers,
  getInterviewQuestionStatuses,
};
