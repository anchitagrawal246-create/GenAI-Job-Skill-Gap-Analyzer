// Backend/services/interview/answer.service.js

const { submitAnswer } = require("./answer/answer.submit.service");

const { resubmitAnswer } = require("./answer/answer.resubmit.service");

const { recordCodeRun } = require("./answer/answer.code.service");

const {
  skipQuestion,
  answerSkippedQuestion,
} = require("./answer/answer.skip.service");

const {
  getAnswer,
  getInterviewAnswers,
  getInterviewQuestionStatuses,
  getLatestQuestionEvaluation,
} = require("./answer/answer.query.service");

// ============================================================
// AGGREGATOR
// ============================================================

module.exports = {
  // Answer
  submitAnswer,
  resubmitAnswer,
  answerSkippedQuestion,

  // Code
  recordCodeRun,

  // Question
  skipQuestion,

  // Queries
  getAnswer,
  getInterviewAnswers,
  getInterviewQuestionStatuses,
  getLatestQuestionEvaluation,
};
