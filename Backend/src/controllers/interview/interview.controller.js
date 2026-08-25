const interviewService = require("../../services/interview/interview.service");
const answerService = require("../../services/interview/answer.service");
const {
  generateNextQuestion,
} = require("../../services/interview/interview.agent");
const {
  evaluateAnswer,
} = require("../../services/interview/evaluation.service");

// ============================================================
// CREATE INTERVIEW
// ============================================================

const createInterview = async (req, res) => {
  try {
    const interview = await interviewService.createInterview(
      req.user.id,
      req.body,
    );

    return res.status(201).json({
      success: true,
      message: "Interview created successfully",
      data: interview,
    });
  } catch (error) {
    console.error("Create interview error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create interview",
    });
  }
};

// ============================================================
// GET USER INTERVIEWS
// ============================================================

const getInterviews = async (req, res) => {
  try {
    const interviews = await interviewService.getUserInterviews(req.user.id);

    return res.status(200).json({
      success: true,
      data: interviews,
    });
  } catch (error) {
    console.error("Get interviews error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch interviews",
    });
  }
};

// ============================================================
// GET INTERVIEW BY ID
// ============================================================

const getInterview = async (req, res) => {
  try {
    const interview = await interviewService.getInterviewById(
      req.user.id,
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
    console.error("Get interview error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch interview",
    });
  }
};

// ============================================================
// START INTERVIEW
// ============================================================

const startInterview = async (req, res) => {
  try {
    const interview = await interviewService.startInterview(
      req.user.id,
      req.params.id,
    );

    return res.status(200).json({
      success: true,
      message: "Interview started successfully",
      data: interview,
    });
  } catch (error) {
    console.error("Start interview error:", error);

    return res.status(400).json({
      success: false,
      message: error.message || "Failed to start interview",
    });
  }
};

// ============================================================
// GET INTERVIEW QUESTIONS
// ============================================================

const getInterviewQuestions = async (req, res) => {
  try {
    const questions = await interviewService.getInterviewQuestions(
      req.user.id,
      req.params.id,
    );

    return res.status(200).json({
      success: true,
      data: questions,
    });
  } catch (error) {
    console.error("Get interview questions error:", error);

    return res.status(400).json({
      success: false,
      message: error.message || "Failed to fetch interview questions",
    });
  }
};

// ============================================================
// GENERATE NEXT ADAPTIVE AI QUESTION
// ============================================================

const generateInterviewQuestion = async (req, res) => {
  try {
    const result = await generateNextQuestion(req.user.id, req.params.id);

    return res.status(201).json({
      success: true,
      message: "Next interview question generated successfully",

      data: {
        question: result.question,

        // AI provider information is useful for backend
        // monitoring/debugging.
        provider: result.provider,
        model: result.model,
      },
    });
  } catch (error) {
    console.error("Generate adaptive interview question error:", error);

    return res.status(400).json({
      success: false,
      message: error.message || "Failed to generate next interview question",
    });
  }
};

// ============================================================
// SUBMIT INTERVIEW ANSWER
// ============================================================

const submitAnswer = async (req, res) => {
  try {
    const { id: interviewId, questionId } = req.params;

    const { answerText } = req.body;

    const answer = await answerService.submitAnswer(
      req.user.id,
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
    console.error("Submit answer error:", error);

    return res.status(400).json({
      success: false,
      message: error.message || "Failed to submit answer",
    });
  }
};

// ============================================================
// EVALUATE ANSWER
// ============================================================

const evaluateInterviewAnswer = async (req, res) => {
  try {
    const { id: interviewId, questionId } = req.params;

    const result = await evaluateAnswer(req.user.id, interviewId, questionId);

    return res.status(200).json({
      success: true,
      message: "Answer evaluated successfully",

      data: {
        evaluation: result.evaluation,

        provider: result.provider,
        model: result.model,

        interviewProgress: result.interviewProgress,
      },
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
// COMPLETE INTERVIEW
// ============================================================

const completeInterview = async (req, res) => {
  try {
    const result = await interviewService.completeInterview(
      req.user.id,
      req.params.id,
    );

    return res.status(200).json({
      success: true,
      message: "Interview completed successfully",
      data: result,
    });
  } catch (error) {
    console.error("Complete interview error:", error);

    return res.status(400).json({
      success: false,
      message: error.message || "Failed to complete interview",
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
  submitAnswer,
  evaluateInterviewAnswer,
  completeInterview,
};
