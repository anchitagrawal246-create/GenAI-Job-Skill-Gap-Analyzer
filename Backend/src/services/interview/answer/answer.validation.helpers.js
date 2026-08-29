// Backend/services/interview/answer/answer.validation.helpers.js

const Interview = require("../../../model/interview.model");
const Question = require("../../../model/question.model");

const { validateObjectId } = require("./answer.validation");

// ============================================================
// GET OWNED INTERVIEW
// ============================================================

const getOwnedInterview = async (userId, interviewId) => {
  validateObjectId(userId, "user ID");
  validateObjectId(interviewId, "interview ID");

  const interview = await Interview.findOne({
    _id: interviewId,
    user: userId,
  });

  if (!interview) {
    throw new Error("Interview not found");
  }

  return interview;
};

// ============================================================
// GET INTERVIEW QUESTION
// ============================================================

const getInterviewQuestion = async (interviewId, questionId) => {
  validateObjectId(interviewId, "interview ID");
  validateObjectId(questionId, "question ID");

  const question = await Question.findOne({
    _id: questionId,
    interview: interviewId,
  });

  if (!question) {
    throw new Error("Question not found");
  }

  return question;
};

module.exports = {
  getOwnedInterview,
  getInterviewQuestion,
};
