// Backend/services/interview/answer/answer.counter.service.js

const Question = require("../../../model/question.model");

const { MAX_QUESTIONS } = require("./answer.constants");

const { debug } = require("./answer.helpers");

// ============================================================
// UPDATE INTERVIEW COUNTERS
// ============================================================

const updateInterviewCounters = async (interview) => {
  const interviewId = interview._id;

  const [generatedQuestions, answeredQuestions, skippedQuestions] =
    await Promise.all([
      Question.countDocuments({
        interview: interviewId,
      }),

      Question.countDocuments({
        interview: interviewId,
        status: "answered",
      }),

      Question.countDocuments({
        interview: interviewId,
        status: "skipped",
      }),
    ]);

  const targetQuestions = Math.min(
    Math.max(Number(interview.totalQuestions) || 0, 0),
    MAX_QUESTIONS,
  );

  const safeGenerated = Math.min(
    Math.max(Number(generatedQuestions) || 0, 0),
    MAX_QUESTIONS,
  );

  const safeAnswered = Math.min(
    Math.max(Number(answeredQuestions) || 0, 0),
    targetQuestions,
  );

  const safeSkipped = Math.min(
    Math.max(Number(skippedQuestions) || 0, 0),
    targetQuestions,
  );

  const completedQuestions = Math.min(
    safeAnswered + safeSkipped,
    targetQuestions,
  );

  interview.generatedQuestions = safeGenerated;

  interview.answeredQuestions = safeAnswered;

  interview.skippedQuestions = safeSkipped;

  interview.completedQuestions = completedQuestions;

  // IMPORTANT:
  // Do not normally change navigation position here.

  if (!interview.currentQuestionNumber) {
    if (targetQuestions > 0) {
      interview.currentQuestionNumber = Math.min(
        completedQuestions + 1,
        targetQuestions,
      );
    }
  }

  if (interview.currentQuestionNumber) {
    interview.currentQuestionNumber = Math.min(
      Math.max(Number(interview.currentQuestionNumber) || 1, 1),
      targetQuestions,
    );
  }

  interview.lastActivityAt = new Date();

  await interview.save();

  debug("Interview counters updated", {
    interviewId: String(interviewId),
    generatedQuestions: safeGenerated,
    answeredQuestions: safeAnswered,
    skippedQuestions: safeSkipped,
    completedQuestions,
    totalQuestions: targetQuestions,
    currentQuestionNumber: interview.currentQuestionNumber,
  });

  return interview;
};

module.exports = {
  updateInterviewCounters,
};
