const Answer = require("../../model/answer.model");
const Interview = require("../../model/interview.model");
const Question = require("../../model/question.model");

// ============================================================
// SUBMIT ANSWER
// ============================================================

const submitAnswer = async (userId, interviewId, questionId, answerText) => {
  // ----------------------------------------------------------
  // Validate answer text
  // ----------------------------------------------------------

  if (typeof answerText !== "string" || !answerText.trim()) {
    throw new Error("Answer cannot be empty");
  }

  const trimmedAnswer = answerText.trim();

  // ----------------------------------------------------------
  // Validate answer length
  // ----------------------------------------------------------

  if (trimmedAnswer.length > 20000) {
    throw new Error("Answer cannot exceed 20000 characters");
  }

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
  // Interview must be in progress
  // ----------------------------------------------------------

  if (interview.status !== "in-progress") {
    throw new Error("Interview is not in progress");
  }

  // ----------------------------------------------------------
  // Check question limit
  // ----------------------------------------------------------

  if (
    interview.totalQuestions &&
    questionId &&
    interview.completedQuestions >= interview.totalQuestions
  ) {
    throw new Error("All interview questions have already been completed");
  }

  // ----------------------------------------------------------
  // Find question
  // ----------------------------------------------------------

  const question = await Question.findOne({
    _id: questionId,
    interview: interviewId,
  });

  if (!question) {
    throw new Error("Question not found");
  }

  // ----------------------------------------------------------
  // Prevent answering an already evaluated question
  // ----------------------------------------------------------

  if (question.status === "evaluated") {
    throw new Error("This question has already been evaluated");
  }

  // ----------------------------------------------------------
  // Prevent answering the same question twice
  // ----------------------------------------------------------

  const existingAnswer = await Answer.findOne({
    interview: interviewId,
    question: questionId,
  });

  if (existingAnswer) {
    throw new Error("Answer already submitted for this question");
  }

  // ----------------------------------------------------------
  // Create answer
  // ----------------------------------------------------------

  let answer;

  try {
    answer = await Answer.create({
      interview: interviewId,
      question: questionId,
      user: userId,
      answerText: trimmedAnswer,
      submittedAt: new Date(),
      evaluationStatus: "pending",
    });
  } catch (error) {
    // --------------------------------------------------------
    // Handle MongoDB duplicate-key race condition
    // --------------------------------------------------------

    if (error.code === 11000) {
      throw new Error("Answer already submitted for this question");
    }

    throw error;
  }

  // ----------------------------------------------------------
  // Mark question as answered
  // ----------------------------------------------------------

  question.status = "answered";

  await question.save();

  // ----------------------------------------------------------
  // Return answer
  // ----------------------------------------------------------

  return answer;
};

// ============================================================
// GET ANSWER FOR QUESTION
// ============================================================

const getAnswer = async (userId, interviewId, questionId) => {
  // ----------------------------------------------------------
  // Verify interview ownership
  // ----------------------------------------------------------

  const interview = await Interview.findOne({
    _id: interviewId,
    user: userId,
  }).lean();

  if (!interview) {
    throw new Error("Interview not found");
  }

  // ----------------------------------------------------------
  // Find answer
  // ----------------------------------------------------------

  const answer = await Answer.findOne({
    interview: interviewId,
    question: questionId,
    user: userId,
  })
    .populate("question")
    .lean();

  if (!answer) {
    throw new Error("Answer not found");
  }

  return answer;
};

// ============================================================
// GET ALL ANSWERS FOR INTERVIEW
// ============================================================

const getInterviewAnswers = async (userId, interviewId) => {
  // ----------------------------------------------------------
  // Verify interview ownership
  // ----------------------------------------------------------

  const interview = await Interview.findOne({
    _id: interviewId,
    user: userId,
  }).lean();

  if (!interview) {
    throw new Error("Interview not found");
  }

  // ----------------------------------------------------------
  // Get answers
  // ----------------------------------------------------------

  return Answer.find({
    interview: interviewId,
    user: userId,
  })
    .populate("question")
    .sort({
      createdAt: 1,
    })
    .lean();
};

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  submitAnswer,
  getAnswer,
  getInterviewAnswers,
};
