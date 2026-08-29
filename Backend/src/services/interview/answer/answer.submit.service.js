// Backend/services/interview/answer/answer.submit.service.js

const Answer = require("../../../model/answer.model");

const { MAX_QUESTIONS } = require("./answer.constants");

const { validateObjectId } = require("./answer.validation");

const { normalizeSubmission, debug, debugError } = require("./answer.helpers");

const {
  getOwnedInterview,
  getInterviewQuestion,
} = require("./answer.validation.helpers");

const { updateInterviewCounters } = require("./answer.counter.service");

// ============================================================
// SUBMIT ANSWER
// ============================================================

const submitAnswer = async (userId, interviewId, questionId, payload) => {
  validateObjectId(userId, "user ID");
  validateObjectId(interviewId, "interview ID");
  validateObjectId(questionId, "question ID");

  debug("Submitting answer", {
    userId: String(userId),
    interviewId: String(interviewId),
    questionId: String(questionId),
  });

  const interview = await getOwnedInterview(userId, interviewId);

  if (interview.status !== "in-progress") {
    throw new Error(
      `Interview is not accepting answers. Current status: ${interview.status}`,
    );
  }

  const totalQuestions = Number(interview.totalQuestions) || 0;

  if (totalQuestions < 1 || totalQuestions > MAX_QUESTIONS) {
    throw new Error("Interview has an invalid question limit");
  }

  const question = await getInterviewQuestion(interviewId, questionId);

  const questionNumber = Number(question.questionNumber) || 0;

  if (questionNumber < 1 || questionNumber > totalQuestions) {
    throw new Error(
      "Question exceeds the interview's configured question limit",
    );
  }

  if (question.status === "answered") {
    throw new Error(
      "This question has already been answered. Use resubmitAnswer() to change it.",
    );
  }

  const submission = normalizeSubmission(question, payload);

  const now = new Date();

  const existingAnswer = await Answer.findOne({
    interview: interviewId,
    question: questionId,
    user: userId,
  });

  if (existingAnswer) {
    throw new Error(
      "Answer already exists for this question. Use resubmitAnswer() to change it.",
    );
  }

  let answer;

  try {
    answer = await Answer.create({
      interview: interviewId,
      question: questionId,
      user: userId,

      answerType: submission.answerType,

      answerText: submission.text || null,

      code: submission.code || null,

      language: submission.language || null,

      submittedAt: now,
      lastSubmissionAt: now,

      submissionVersion: 1,

      originalAnswer: {
        text: submission.text || null,
        code: submission.code || null,
        language: submission.language || null,
        submittedAt: now,
      },

      currentAnswer: {
        text: submission.text || null,
        code: submission.code || null,
        language: submission.language || null,
        version: 1,
        submittedAt: now,
      },

      answerVersions: [
        {
          version: 1,
          text: submission.text || null,
          code: submission.code || null,
          language: submission.language || null,
          submissionType: "initial",
          submittedAt: now,
        },
      ],

      evaluationStatus: "pending",
      evaluationVersion: 0,
      evaluatedAt: null,

      evaluationError: {
        code: null,
        message: null,
        provider: null,
        occurredAt: null,
      },
    });
  } catch (error) {
    debugError("Failed to create answer", error);

    if (error?.code === 11000) {
      throw new Error("Answer already submitted for this question");
    }

    throw error;
  }

  question.status = "answered";
  question.answeredAt = now;
  question.skippedAt = null;
  question.skipReason = null;

  await question.save();

  await updateInterviewCounters(interview);

  debug("Answer submitted successfully", {
    answerId: String(answer._id),
    questionId: String(questionId),
    questionNumber: question.questionNumber,
    answerType: answer.answerType,
    hasText: Boolean(answer.answerText),
    hasCode: Boolean(answer.code),
  });

  return answer;
};

module.exports = {
  submitAnswer,
};
