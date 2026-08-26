const Answer = require("../../model/answer.model");
const Interview = require("../../model/interview.model");
const Question = require("../../model/question.model");

// ============================================================
// CONSTANTS
// ============================================================

const MAX_QUESTIONS = 100;

// ============================================================
// SUBMIT ANSWER
// ============================================================

const submitAnswer = async (userId, interviewId, questionId, answerText) => {
  if (typeof answerText !== "string" || !answerText.trim()) {
    throw new Error("Answer cannot be empty");
  }

  const trimmedAnswer = answerText.trim();

  if (trimmedAnswer.length > 20000) {
    throw new Error("Answer cannot exceed 20000 characters");
  }

  const interview = await Interview.findOne({
    _id: interviewId,
    user: userId,
  });

  if (!interview) {
    throw new Error("Interview not found");
  }

  if (interview.status !== "in-progress") {
    throw new Error("Interview is not in progress");
  }

  const question = await Question.findOne({
    _id: questionId,
    interview: interviewId,
  });

  if (!question) {
    throw new Error("Question not found");
  }

  // A question can only be answered once.
  if (question.status === "answered") {
    throw new Error("This question has already been answered");
  }

  if (question.status === "skipped") {
    throw new Error("This question has been skipped");
  }

  // Hard maximum.
  if (question.questionNumber > MAX_QUESTIONS) {
    throw new Error("Interview cannot exceed 100 questions");
  }

  const existingAnswer = await Answer.findOne({
    interview: interviewId,
    question: questionId,
    user: userId,
  });

  if (existingAnswer) {
    throw new Error("Answer already submitted for this question");
  }

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
    if (error.code === 11000) {
      throw new Error("Answer already submitted for this question");
    }

    throw error;
  }

  question.status = "answered";

  await question.save();

  return answer;
};

// ============================================================
// GET ANSWER
// ============================================================

const getAnswer = async (userId, interviewId, questionId) => {
  const interview = await Interview.findOne({
    _id: interviewId,
    user: userId,
  }).lean();

  if (!interview) {
    throw new Error("Interview not found");
  }

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
// GET ALL ANSWERS
// ============================================================

const getInterviewAnswers = async (userId, interviewId) => {
  const interview = await Interview.findOne({
    _id: interviewId,
    user: userId,
  }).lean();

  if (!interview) {
    throw new Error("Interview not found");
  }

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
