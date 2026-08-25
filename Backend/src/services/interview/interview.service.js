const Interview = require("../../model/interview.model");
const Question = require("../../model/question.model");
const Evaluation = require("../../model/evaluation.model");

const { generateNextQuestion } = require("./interview.agent");

// ============================================================
// CREATE INTERVIEW
// ============================================================

const createInterview = async (userId, data) => {
  const {
    title,
    role,
    experienceLevel,
    interviewType,
    difficulty,
    technologies,
    totalQuestions,
  } = data;

  if (!role) {
    throw new Error("Role is required");
  }

  if (!experienceLevel) {
    throw new Error("Experience level is required");
  }

  if (!interviewType) {
    throw new Error("Interview type is required");
  }

  const interview = await Interview.create({
    user: userId,

    title: title || `${role} Interview`,

    role,

    experienceLevel,

    interviewType,

    difficulty: difficulty || "medium",

    technologies: Array.isArray(technologies) ? technologies : [],

    totalQuestions: totalQuestions || 10,

    completedQuestions: 0,

    status: "created",
  });

  return interview;
};

// ============================================================
// GET ALL USER INTERVIEWS
// ============================================================

const getUserInterviews = async (userId) => {
  return Interview.find({
    user: userId,
  })
    .sort({
      createdAt: -1,
    })
    .lean();
};

// ============================================================
// GET INTERVIEW BY ID
// ============================================================

const getInterviewById = async (userId, interviewId) => {
  return Interview.findOne({
    _id: interviewId,
    user: userId,
  }).lean();
};

// ============================================================
// START INTERVIEW
// ============================================================

const startInterview = async (userId, interviewId) => {
  const interview = await Interview.findOne({
    _id: interviewId,
    user: userId,
  });

  if (!interview) {
    throw new Error("Interview not found");
  }

  if (interview.status === "completed") {
    throw new Error("Interview has already been completed");
  }

  if (interview.status === "cancelled") {
    throw new Error("Interview has been cancelled");
  }

  interview.status = "in-progress";

  if (!interview.startedAt) {
    interview.startedAt = new Date();
  }

  await interview.save();

  return interview;
};

// ============================================================
// GET INTERVIEW QUESTIONS
// ============================================================

const getInterviewQuestions = async (userId, interviewId) => {
  const interview = await Interview.findOne({
    _id: interviewId,
    user: userId,
  }).lean();

  if (!interview) {
    throw new Error("Interview not found");
  }

  return Question.find({
    interview: interviewId,
  })
    .sort({
      questionNumber: 1,
    })
    .lean();
};

// ============================================================
// GENERATE NEXT AI INTERVIEW QUESTION
// ============================================================

const generateInterviewQuestion = async (userId, interviewId) => {
  const interview = await Interview.findOne({
    _id: interviewId,
    user: userId,
  }).lean();

  if (!interview) {
    throw new Error("Interview not found");
  }

  if (interview.status !== "in-progress") {
    throw new Error("Interview is not in progress");
  }

  // ----------------------------------------------------------
  // Check existing questions
  // ----------------------------------------------------------

  const existingQuestions = await Question.find({
    interview: interviewId,
  })
    .sort({
      questionNumber: 1,
    })
    .lean();

  // ----------------------------------------------------------
  // Check question limit
  // ----------------------------------------------------------

  if (existingQuestions.length >= interview.totalQuestions) {
    throw new Error("Maximum number of interview questions reached");
  }

  // ----------------------------------------------------------
  // Generate adaptive question using AI Agent
  // ----------------------------------------------------------

  const result = await generateNextQuestion(userId, interviewId);

  if (!result || !result.question) {
    throw new Error("AI interviewer failed to generate a question");
  }

  return result;
};

// ============================================================
// COMPLETE INTERVIEW
// ============================================================

const completeInterview = async (userId, interviewId) => {
  // ----------------------------------------------------------
  // Find interview
  // ----------------------------------------------------------

  const interview = await Interview.findOne({
    _id: interviewId,
    user: userId,
  });

  if (!interview) {
    throw new Error("Interview not found");
  }

  // ----------------------------------------------------------
  // Check status
  // ----------------------------------------------------------

  if (interview.status === "completed") {
    throw new Error("Interview is already completed");
  }

  if (interview.status !== "in-progress") {
    throw new Error("Interview is not in progress");
  }

  // ----------------------------------------------------------
  // Get all questions
  // ----------------------------------------------------------

  const questions = await Question.find({
    interview: interviewId,
  }).lean();

  if (questions.length === 0) {
    throw new Error("No questions found for this interview");
  }

  // ----------------------------------------------------------
  // Get all evaluations
  // ----------------------------------------------------------

  const evaluations = await Evaluation.find({
    interview: interviewId,
  }).lean();

  // ----------------------------------------------------------
  // Make sure every question has been evaluated
  // ----------------------------------------------------------

  if (evaluations.length < questions.length) {
    throw new Error(
      "All interview questions must be answered and evaluated before completing the interview",
    );
  }

  // ----------------------------------------------------------
  // Calculate final score
  // ----------------------------------------------------------

  const totalScore = evaluations.reduce(
    (sum, evaluation) => sum + Number(evaluation.overallScore || 0),
    0,
  );

  const overallScore =
    evaluations.length > 0 ? Math.round(totalScore / evaluations.length) : 0;

  // ----------------------------------------------------------
  // Update interview
  // ----------------------------------------------------------

  interview.status = "completed";

  interview.completedAt = new Date();

  interview.completedQuestions = evaluations.length;

  interview.overallScore = overallScore;

  await interview.save();

  // ----------------------------------------------------------
  // Return result
  // ----------------------------------------------------------

  return {
    interview,

    totalQuestions: questions.length,

    completedQuestions: evaluations.length,

    overallScore,
  };
};

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  createInterview,
  getUserInterviews,
  getInterviewById,
  startInterview,
  getInterviewQuestions,
  generateInterviewQuestion,
  completeInterview,
};
