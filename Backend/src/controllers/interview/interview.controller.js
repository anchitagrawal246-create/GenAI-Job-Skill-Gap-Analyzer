const interviewService = require("../../services/interview/interview.service");
const answerService = require("../../services/interview/answer.service");
const evaluationService = require("../../services/interview/evaluation.service");

// ============================================================
// HELPER
// ============================================================

const getUserId = (req) => {
  if (!req?.user?.id) {
    throw new Error("Authenticated user not found");
  }

  return req.user.id;
};

// ============================================================
// CREATE INTERVIEW
// ============================================================

const createInterview = async (req, res) => {
  try {
    const userId = getUserId(req);

    console.log("==============================================");
    console.log("[INTERVIEW] CREATE");
    console.log("User:", userId);
    console.log("Body:", req.body);
    console.log("==============================================");

    const interview = await interviewService.createInterview(userId, req.body);

    return res.status(201).json({
      success: true,
      message: "Interview created successfully",
      data: interview,
    });
  } catch (error) {
    console.error("[INTERVIEW] CREATE ERROR:", error);

    return res.status(400).json({
      success: false,
      message: error?.message || "Failed to create interview",
    });
  }
};

// ============================================================
// GET USER INTERVIEWS
// ============================================================

const getInterviews = async (req, res) => {
  try {
    const interviews = await interviewService.getUserInterviews(getUserId(req));

    return res.status(200).json({
      success: true,
      data: interviews,
    });
  } catch (error) {
    console.error("[INTERVIEW] GET ALL ERROR:", error);

    return res.status(400).json({
      success: false,
      message: error?.message || "Failed to fetch interviews",
    });
  }
};

// ============================================================
// GET INTERVIEW BY ID
// ============================================================

const getInterview = async (req, res) => {
  try {
    const interview = await interviewService.getInterviewById(
      getUserId(req),
      req.params.id,
    );

    if (!interview) {
      return res.status(404).json({
        success: false,
        message: "Interview not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: interview,
    });
  } catch (error) {
    console.error("[INTERVIEW] GET ERROR:", error);

    return res.status(400).json({
      success: false,
      message: error?.message || "Failed to fetch interview",
    });
  }
};

// ============================================================
// START INTERVIEW
// ============================================================

const startInterview = async (req, res) => {
  try {
    const userId = getUserId(req);
    const interviewId = req.params.id;

    console.log("==============================================");
    console.log("[INTERVIEW] START");
    console.log("User:", userId);
    console.log("Interview:", interviewId);
    console.log("==============================================");

    const interview = await interviewService.startInterview(
      userId,
      interviewId,
    );

    console.log("[INTERVIEW] STARTED");
    console.log("Status:", interview?.status);
    console.log("Started At:", interview?.startedAt);

    return res.status(200).json({
      success: true,
      message: "Interview started successfully",
      data: interview,
    });
  } catch (error) {
    console.error("[INTERVIEW] START ERROR:", error);

    return res.status(400).json({
      success: false,
      message: error?.message || "Failed to start interview",
    });
  }
};

// ============================================================
// GET ALL INTERVIEW QUESTIONS
// ============================================================

const getInterviewQuestions = async (req, res) => {
  try {
    const questions = await interviewService.getInterviewQuestions(
      getUserId(req),
      req.params.id,
    );

    return res.status(200).json({
      success: true,
      data: questions,
    });
  } catch (error) {
    console.error("[INTERVIEW] GET QUESTIONS ERROR:", error);

    return res.status(400).json({
      success: false,
      message: error?.message || "Failed to fetch interview questions",
    });
  }
};

// ============================================================
// GENERATE NEXT ADAPTIVE QUESTION
// ============================================================

const generateInterviewQuestion = async (req, res) => {
  const userId = getUserId(req);
  const interviewId = req.params.id;

  console.log("");
  console.log("==================================================");
  console.log("[INTERVIEW AGENT] GENERATE QUESTION");
  console.log("User ID:", userId);
  console.log("Interview ID:", interviewId);
  console.log("==================================================");

  try {
    const result = await interviewService.generateInterviewQuestion(
      userId,
      interviewId,
    );

    console.log("");
    console.log("==================================================");
    console.log("[INTERVIEW AGENT] QUESTION GENERATED");
    console.log("Question ID:", result?.question?._id);
    console.log("Question Number:", result?.questionNumber);
    console.log("Question:", result?.question?.question);
    console.log("Category:", result?.question?.category);
    console.log("Difficulty:", result?.question?.difficulty);
    console.log("Provider:", result?.provider);
    console.log("Model:", result?.model);
    console.log("==================================================");

    return res.status(200).json({
      success: true,
      message: "Next interview question generated successfully",
      data: result,
    });
  } catch (error) {
    console.error("");
    console.error("==================================================");
    console.error("[INTERVIEW AGENT] GENERATION FAILED");
    console.error("Name:", error?.name);
    console.error("Message:", error?.message);
    console.error("Stack:", error?.stack);
    console.error("==================================================");

    return res.status(400).json({
      success: false,
      message: error?.message || "Failed to generate next interview question",
      error: {
        name: error?.name || "Error",
        message: error?.message || "Unknown interview generation error",
      },
    });
  }
};

// ============================================================
// GET CURRENT / NEXT PENDING QUESTION
// ============================================================

const getNextQuestion = async (req, res) => {
  try {
    const question = await interviewService.getNextQuestion(
      getUserId(req),
      req.params.id,
    );

    return res.status(200).json({
      success: true,
      data: question,
    });
  } catch (error) {
    console.error("[INTERVIEW] GET NEXT QUESTION ERROR:", error);

    return res.status(400).json({
      success: false,
      message: error?.message || "Failed to fetch next question",
    });
  }
};

// ============================================================
// SUBMIT ANSWER
// ============================================================

const submitAnswer = async (req, res) => {
  try {
    const { id: interviewId, questionId } = req.params;

    const { answerText } = req.body;

    const answer = await answerService.submitAnswer(
      getUserId(req),
      interviewId,
      questionId,
      answerText,
    );

    return res.status(201).json({
      success: true,
      message: "Answer submitted successfully",
      data: answer,
    });
  } catch (error) {
    console.error("[INTERVIEW] SUBMIT ANSWER ERROR:", error);

    return res.status(400).json({
      success: false,
      message: error?.message || "Failed to submit answer",
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

    return res.status(200).json({
      success: true,
      data: answer,
    });
  } catch (error) {
    console.error("[INTERVIEW] GET ANSWER ERROR:", error);

    return res.status(400).json({
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
    console.error("[INTERVIEW] GET ANSWERS ERROR:", error);

    return res.status(400).json({
      success: false,
      message: error?.message || "Failed to fetch interview answers",
    });
  }
};

// ============================================================
// EVALUATE ANSWER
// ============================================================

const evaluateAnswer = async (req, res) => {
  try {
    const { id: interviewId, questionId } = req.params;

    const result = await evaluationService.evaluateAnswer(
      getUserId(req),
      interviewId,
      questionId,
    );

    return res.status(200).json({
      success: true,
      message: "Answer evaluated successfully",
      data: result,
    });
  } catch (error) {
    console.error("[INTERVIEW] EVALUATE ANSWER ERROR:", error);

    return res.status(400).json({
      success: false,
      message: error?.message || "Failed to evaluate answer",
    });
  }
};

// ============================================================
// GET SINGLE EVALUATION
// ============================================================

const getEvaluation = async (req, res) => {
  try {
    const { id: interviewId, questionId } = req.params;

    const result = await evaluationService.getEvaluation(
      getUserId(req),
      interviewId,
      questionId,
    );

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("[INTERVIEW] GET EVALUATION ERROR:", error);

    return res.status(400).json({
      success: false,
      message: error?.message || "Failed to fetch evaluation",
    });
  }
};

// ============================================================
// GET ALL INTERVIEW EVALUATIONS
// ============================================================

const getInterviewEvaluations = async (req, res) => {
  try {
    const evaluations = await evaluationService.getInterviewEvaluations(
      getUserId(req),
      req.params.id,
    );

    return res.status(200).json({
      success: true,
      data: evaluations,
    });
  } catch (error) {
    console.error("[INTERVIEW] GET EVALUATIONS ERROR:", error);

    return res.status(400).json({
      success: false,
      message: error?.message || "Failed to fetch interview evaluations",
    });
  }
};

// ============================================================
// COMPLETE INTERVIEW
// ============================================================

const completeInterview = async (req, res) => {
  try {
    const result = await interviewService.completeInterview(
      getUserId(req),
      req.params.id,
    );

    return res.status(200).json({
      success: true,
      message: "Interview completed successfully",
      data: result,
    });
  } catch (error) {
    console.error("[INTERVIEW] COMPLETE ERROR:", error);

    return res.status(400).json({
      success: false,
      message: error?.message || "Failed to complete interview",
    });
  }
};

// ============================================================
// CANCEL INTERVIEW
// ============================================================

const cancelInterview = async (req, res) => {
  try {
    const exitReason = req.body?.exitReason || "user-exit";

    const interview = await interviewService.cancelInterview(
      getUserId(req),
      req.params.id,
      exitReason,
    );

    return res.status(200).json({
      success: true,
      message: "Interview cancelled successfully",
      data: interview,
    });
  } catch (error) {
    console.error("[INTERVIEW] CANCEL ERROR:", error);

    return res.status(400).json({
      success: false,
      message: error?.message || "Failed to cancel interview",
    });
  }
};

// ============================================================
// GET INTERVIEW PROGRESS
// ============================================================

const getInterviewProgress = async (req, res) => {
  try {
    const progress = await interviewService.getInterviewProgress(
      getUserId(req),
      req.params.id,
    );

    return res.status(200).json({
      success: true,
      data: progress,
    });
  } catch (error) {
    console.error("[INTERVIEW] PROGRESS ERROR:", error);

    return res.status(400).json({
      success: false,
      message: error?.message || "Failed to fetch interview progress",
    });
  }
};

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
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
  evaluateAnswer,
  getEvaluation,
  getInterviewEvaluations,
  completeInterview,
  cancelInterview,
  getInterviewProgress,
};
