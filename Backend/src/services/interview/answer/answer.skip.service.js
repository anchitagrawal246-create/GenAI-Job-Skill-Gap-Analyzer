// Backend/services/interview/answer/answer.skip.service.js

const Answer = require("../../../model/answer.model");

const { validateObjectId, cleanString } = require("./answer.validation");

const { normalizeSubmission, debug } = require("./answer.helpers");

const {
  getOwnedInterview,
  getInterviewQuestion,
} = require("./answer.validation.helpers");

const { updateInterviewCounters } = require("./answer.counter.service");

// ============================================================
// SKIP QUESTION
// ============================================================

const skipQuestion = async (
  userId,
  interviewId,
  questionId,
  skipReason = "user-skipped",
) => {
  validateObjectId(userId, "user ID");
  validateObjectId(interviewId, "interview ID");
  validateObjectId(questionId, "question ID");

  debug("Skipping question", {
    userId: String(userId),
    interviewId: String(interviewId),
    questionId: String(questionId),
  });

  const interview = await getOwnedInterview(userId, interviewId);

  if (interview.status !== "in-progress") {
    throw new Error(
      `Interview cannot skip questions in status ${interview.status}`,
    );
  }

  const question = await getInterviewQuestion(interviewId, questionId);

  if (question.status === "answered") {
    throw new Error("Answered questions cannot be skipped");
  }

  if (question.status === "skipped") {
    await updateInterviewCounters(interview);

    return {
      question,
      interview,
      alreadySkipped: true,
    };
  }

  const existingAnswer = await Answer.findOne({
    interview: interviewId,
    question: questionId,
    user: userId,
  });

  if (existingAnswer) {
    throw new Error("Cannot skip a question that already has an answer");
  }

  const now = new Date();

  question.status = "skipped";

  question.skippedAt = now;

  question.skipReason = cleanString(skipReason) || "user-skipped";

  question.answeredAt = null;

  await question.save();

  await updateInterviewCounters(interview);

  debug("Question skipped successfully", {
    questionId: String(questionId),
    questionNumber: question.questionNumber,
    completedQuestions: interview.completedQuestions,
    targetQuestions: interview.totalQuestions,
    currentQuestionNumber: interview.currentQuestionNumber,
  });

  return {
    question,
    interview,
    alreadySkipped: false,
  };
};

// ============================================================
// ANSWER SKIPPED QUESTION
// ============================================================

const answerSkippedQuestion = async (
  userId,
  interviewId,
  questionId,
  payload,
) => {
  validateObjectId(userId, "user ID");
  validateObjectId(interviewId, "interview ID");
  validateObjectId(questionId, "question ID");

  const interview = await getOwnedInterview(userId, interviewId);

  if (interview.status !== "in-progress") {
    throw new Error("Interview is not accepting answers");
  }

  const question = await getInterviewQuestion(interviewId, questionId);

  if (question.status !== "skipped") {
    throw new Error("Only skipped questions can use answerSkippedQuestion()");
  }

  const existingAnswer = await Answer.findOne({
    interview: interviewId,
    question: questionId,
    user: userId,
  });

  if (existingAnswer) {
    throw new Error("Answer already exists for this question");
  }

  const submission = normalizeSubmission(question, payload);

  const now = new Date();

  const answer = await Answer.create({
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

  question.status = "answered";
  question.answeredAt = now;
  question.skippedAt = null;
  question.skipReason = null;

  await question.save();

  await updateInterviewCounters(interview);

  interview.lastActivityAt = now;

  await interview.save();

  debug("Skipped question answered", {
    answerId: String(answer._id),
    questionId: String(questionId),
    version: 1,
  });

  return answer;
};

module.exports = {
  skipQuestion,
  answerSkippedQuestion,
};
