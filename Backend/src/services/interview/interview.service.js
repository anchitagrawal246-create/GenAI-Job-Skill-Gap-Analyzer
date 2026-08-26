const mongoose = require("mongoose");

const Interview = require("../../model/interview.model");
const Question = require("../../model/question.model");
const Evaluation = require("../../model/evaluation.model");

const { generateNextQuestion } = require("./interview.agent");

// ============================================================
// CONSTANTS
// ============================================================

const MAX_QUESTIONS = 100;

// ============================================================
// VALIDATE OBJECT ID
// ============================================================

const validateObjectId = (id, fieldName) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error(`Invalid ${fieldName}`);
  }
};

// ============================================================
// CREATE INTERVIEW
// ============================================================

const createInterview = async (userId, data = {}) => {
  validateObjectId(userId, "user ID");

  const { title, role, interviewType, difficulty, technologies } = data;

  // ----------------------------------------------------------
  // ROLE
  // ----------------------------------------------------------

  if (typeof role !== "string" || !role.trim()) {
    throw new Error("Role is required");
  }

  // ----------------------------------------------------------
  // INTERVIEW TYPE
  // ----------------------------------------------------------

  const allowedInterviewTypes = [
    "technical",
    "behavioral",
    "mixed",
    "coding",
    "system-design",
  ];

  if (!allowedInterviewTypes.includes(interviewType)) {
    throw new Error("Invalid interview type");
  }

  // ----------------------------------------------------------
  // DIFFICULTY
  // ----------------------------------------------------------

  const selectedDifficulty = difficulty || "adaptive";

  if (!["easy", "medium", "hard", "adaptive"].includes(selectedDifficulty)) {
    throw new Error("Invalid difficulty");
  }

  // ----------------------------------------------------------
  // TECHNOLOGIES
  // ----------------------------------------------------------

  const normalizedTechnologies = Array.isArray(technologies)
    ? technologies
        .filter((item) => typeof item === "string" && item.trim().length > 0)
        .map((item) => item.trim())
        .slice(0, 30)
    : [];

  // ----------------------------------------------------------
  // INITIAL CURRENT DIFFICULTY
  // ----------------------------------------------------------

  let initialDifficulty = "medium";

  if (selectedDifficulty === "easy") {
    initialDifficulty = "easy";
  }

  if (selectedDifficulty === "hard") {
    initialDifficulty = "hard";
  }

  // ----------------------------------------------------------
  // CREATE INTERVIEW
  // ----------------------------------------------------------

  const interview = await Interview.create({
    user: userId,

    title:
      typeof title === "string" && title.trim()
        ? title.trim()
        : `${role.trim()} Interview`,

    role: role.trim(),

    interviewType,

    difficulty: selectedDifficulty,

    currentDifficulty: initialDifficulty,

    technologies: normalizedTechnologies,

    // No target number.
    // This represents questions actually generated.
    totalQuestions: 0,

    completedQuestions: 0,

    status: "created",

    exitReason: null,

    startedAt: null,

    completedAt: null,

    overallScore: null,

    // AI will determine these after evidence exists.
    estimatedExperienceLevel: null,

    experienceConfidence: null,
  });

  return interview;
};

// ============================================================
// GET ALL USER INTERVIEWS
// ============================================================

const getUserInterviews = async (userId) => {
  validateObjectId(userId, "user ID");

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
  validateObjectId(userId, "user ID");
  validateObjectId(interviewId, "interview ID");

  return Interview.findOne({
    _id: interviewId,
    user: userId,
  }).lean();
};

// ============================================================
// START INTERVIEW
// ============================================================

const startInterview = async (userId, interviewId) => {
  validateObjectId(userId, "user ID");
  validateObjectId(interviewId, "interview ID");

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

  // Already started.
  if (interview.status === "in-progress") {
    return interview;
  }

  interview.status = "in-progress";

  if (!interview.startedAt) {
    interview.startedAt = new Date();
  }

  interview.exitReason = null;

  await interview.save();

  return interview;
};

// ============================================================
// GET INTERVIEW QUESTIONS
// ============================================================

const getInterviewQuestions = async (userId, interviewId) => {
  validateObjectId(userId, "user ID");
  validateObjectId(interviewId, "interview ID");

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
// GENERATE NEXT QUESTION
// ============================================================

const generateInterviewQuestion = async (userId, interviewId) => {
  validateObjectId(userId, "user ID");
  validateObjectId(interviewId, "interview ID");

  // ----------------------------------------------------------
  // GET INTERVIEW
  // ----------------------------------------------------------

  const interview = await Interview.findOne({
    _id: interviewId,
    user: userId,
  });

  if (!interview) {
    throw new Error("Interview not found");
  }

  // ----------------------------------------------------------
  // STATUS
  // ----------------------------------------------------------

  if (interview.status !== "in-progress") {
    throw new Error(
      `Interview is not in progress. Current status: ${interview.status}`,
    );
  }

  // ----------------------------------------------------------
  // QUESTION COUNT
  // ----------------------------------------------------------

  const questionCount = await Question.countDocuments({
    interview: interviewId,
  });

  if (questionCount >= MAX_QUESTIONS) {
    interview.status = "completed";
    interview.exitReason = "maximum-reached";
    interview.completedAt = new Date();

    await interview.save();

    throw new Error("Maximum of 100 interview questions reached");
  }

  // ----------------------------------------------------------
  // CHECK PENDING QUESTION
  // ----------------------------------------------------------

  const pendingQuestion = await Question.findOne({
    interview: interviewId,
    status: "pending",
  })
    .sort({
      questionNumber: 1,
    })
    .lean();

  if (pendingQuestion) {
    return {
      question: pendingQuestion,

      provider: null,

      model: null,

      interviewProgress: {
        currentQuestion: pendingQuestion.questionNumber,

        totalQuestions: questionCount,

        maximumQuestions: MAX_QUESTIONS,

        remainingQuestions: Math.max(
          MAX_QUESTIONS - pendingQuestion.questionNumber,
          0,
        ),

        isLastQuestion: pendingQuestion.questionNumber === MAX_QUESTIONS,

        progressPercentage: Math.round(
          (pendingQuestion.questionNumber / MAX_QUESTIONS) * 100,
        ),
      },
    };
  }

  // ----------------------------------------------------------
  // GENERATE THROUGH AI AGENT
  // ----------------------------------------------------------

  let result;

  try {
    result = await generateNextQuestion(userId, interviewId);
  } catch (error) {
    console.error("INTERVIEW AGENT GENERATION FAILED:", error);

    // Preserve the actual AI/backend error.
    throw error;
  }

  // ----------------------------------------------------------
  // VALIDATE RESULT
  // ----------------------------------------------------------

  if (!result || !result.question) {
    console.error("INTERVIEW AGENT INVALID RESULT:", result);

    throw new Error("AI interviewer failed to generate a question");
  }

  return result;
};

// ============================================================
// GET CURRENT PENDING QUESTION
// ============================================================

const getNextQuestion = async (userId, interviewId) => {
  validateObjectId(userId, "user ID");
  validateObjectId(interviewId, "interview ID");

  const interview = await Interview.findOne({
    _id: interviewId,
    user: userId,
  }).lean();

  if (!interview) {
    throw new Error("Interview not found");
  }

  if (interview.status !== "in-progress") {
    throw new Error(
      `Interview is not in progress. Current status: ${interview.status}`,
    );
  }

  return Question.findOne({
    interview: interviewId,
    status: "pending",
  })
    .sort({
      questionNumber: 1,
    })
    .lean();
};

// ============================================================
// COMPLETE INTERVIEW
// ============================================================

const completeInterview = async (userId, interviewId) => {
  validateObjectId(userId, "user ID");
  validateObjectId(interviewId, "interview ID");

  const interview = await Interview.findOne({
    _id: interviewId,
    user: userId,
  });

  if (!interview) {
    throw new Error("Interview not found");
  }

  if (interview.status === "completed") {
    return {
      interview,
      alreadyCompleted: true,
    };
  }

  if (interview.status !== "in-progress") {
    throw new Error(
      `Interview is not in progress. Current status: ${interview.status}`,
    );
  }

  // ----------------------------------------------------------
  // QUESTIONS
  // ----------------------------------------------------------

  const questions = await Question.find({
    interview: interviewId,
  })
    .sort({
      questionNumber: 1,
    })
    .lean();

  if (questions.length === 0) {
    throw new Error("No questions found for this interview");
  }

  // ----------------------------------------------------------
  // EVALUATIONS
  // ----------------------------------------------------------

  const evaluations = await Evaluation.find({
    interview: interviewId,
  })
    .sort({
      createdAt: 1,
    })
    .lean();

  // ----------------------------------------------------------
  // CHECK EVALUATED QUESTIONS
  // ----------------------------------------------------------

  const evaluatedIds = new Set(
    evaluations
      .filter((evaluation) => evaluation.question)
      .map((evaluation) => evaluation.question.toString()),
  );

  const unevaluatedQuestions = questions.filter(
    (question) => !evaluatedIds.has(question._id.toString()),
  );

  if (unevaluatedQuestions.length > 0) {
    throw new Error(
      "All interview questions must be evaluated before completing the interview",
    );
  }

  // ----------------------------------------------------------
  // VALID SCORES
  // ----------------------------------------------------------

  const validEvaluations = evaluations.filter(
    (evaluation) =>
      evaluation.question && Number.isFinite(Number(evaluation.overallScore)),
  );

  if (validEvaluations.length !== evaluatedIds.size) {
    throw new Error("Some interview evaluations are invalid");
  }

  // ----------------------------------------------------------
  // SCORE
  // ----------------------------------------------------------

  const totalScore = validEvaluations.reduce(
    (sum, evaluation) => sum + Number(evaluation.overallScore),
    0,
  );

  const overallScore =
    validEvaluations.length > 0
      ? Math.round(totalScore / validEvaluations.length)
      : 0;

  // ----------------------------------------------------------
  // FINALIZE
  // ----------------------------------------------------------

  interview.status = "completed";

  interview.completedAt = new Date();

  interview.completedQuestions = validEvaluations.length;

  interview.totalQuestions = questions.length;

  interview.overallScore = overallScore;

  interview.exitReason =
    questions.length >= MAX_QUESTIONS ? "maximum-reached" : "completed";

  await interview.save();

  return {
    interview,
    totalQuestions: questions.length,
    completedQuestions: validEvaluations.length,
    overallScore,
    evaluations: validEvaluations,
  };
};

// ============================================================
// CANCEL INTERVIEW
// ============================================================

const cancelInterview = async (
  userId,
  interviewId,
  exitReason = "user-exit",
) => {
  validateObjectId(userId, "user ID");
  validateObjectId(interviewId, "interview ID");

  const interview = await Interview.findOne({
    _id: interviewId,
    user: userId,
  });

  if (!interview) {
    throw new Error("Interview not found");
  }

  if (interview.status === "completed") {
    throw new Error("Completed interview cannot be cancelled");
  }

  if (interview.status === "cancelled") {
    throw new Error("Interview is already cancelled");
  }

  const validReasons = [
    "user-exit",
    "page-closed",
    "maximum-reached",
    "completed",
    "system-error",
  ];

  if (!validReasons.includes(exitReason)) {
    throw new Error("Invalid exit reason");
  }

  interview.status = "cancelled";

  interview.exitReason = exitReason;

  await interview.save();

  return interview;
};

// ============================================================
// GET INTERVIEW PROGRESS
// ============================================================

const getInterviewProgress = async (userId, interviewId) => {
  validateObjectId(userId, "user ID");
  validateObjectId(interviewId, "interview ID");

  const interview = await Interview.findOne({
    _id: interviewId,
    user: userId,
  }).lean();

  if (!interview) {
    throw new Error("Interview not found");
  }

  const questionCount = await Question.countDocuments({
    interview: interviewId,
  });

  const evaluationCount = await Evaluation.countDocuments({
    interview: interviewId,
  });

  const progressPercentage = Math.min(
    100,
    Math.round((questionCount / MAX_QUESTIONS) * 100),
  );

  const evaluationPercentage =
    questionCount > 0
      ? Math.min(100, Math.round((evaluationCount / questionCount) * 100))
      : 0;

  const pendingQuestion = await Question.findOne({
    interview: interviewId,
    status: "pending",
  })
    .sort({
      questionNumber: 1,
    })
    .lean();

  return {
    interviewId,

    totalQuestions: questionCount,

    maximumQuestions: MAX_QUESTIONS,

    generatedQuestions: questionCount,

    evaluatedQuestions: evaluationCount,

    completedQuestions: interview.completedQuestions,

    remainingQuestions: Math.max(MAX_QUESTIONS - questionCount, 0),

    progressPercentage,

    evaluationPercentage,

    currentQuestion: pendingQuestion?.questionNumber ?? questionCount,

    status: interview.status,

    overallScore: interview.overallScore,

    exitReason: interview.exitReason,

    currentDifficulty: interview.currentDifficulty,

    estimatedExperienceLevel: interview.estimatedExperienceLevel,

    experienceConfidence: interview.experienceConfidence,
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
  getNextQuestion,
  completeInterview,
  cancelInterview,
  getInterviewProgress,
};
