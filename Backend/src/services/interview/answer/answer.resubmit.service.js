// Backend/services/interview/answer/answer.resubmit.service.js

const Answer = require("../../../model/answer.model");

const { MAX_SUBMISSIONS } = require("./answer.constants");

const { validateObjectId } = require("./answer.validation");

const { normalizeSubmission, debug } = require("./answer.helpers");

const {
  getOwnedInterview,
  getInterviewQuestion,
} = require("./answer.validation.helpers");

// ============================================================
// RESUBMIT ANSWER
// ============================================================

const resubmitAnswer = async (userId, interviewId, questionId, payload) => {
  validateObjectId(userId, "user ID");
  validateObjectId(interviewId, "interview ID");
  validateObjectId(questionId, "question ID");

  const interview = await getOwnedInterview(userId, interviewId);

  if (interview.status !== "in-progress") {
    throw new Error("Interview is not accepting answer changes");
  }

  const question = await getInterviewQuestion(interviewId, questionId);

  if (question.status === "skipped") {
    throw new Error(
      "Skipped question has no answer to resubmit. Use answerSkippedQuestion() instead.",
    );
  }

  if (question.status !== "answered") {
    throw new Error("Question has not been answered yet");
  }

  const submission = normalizeSubmission(question, payload);

  const answer = await Answer.findOne({
    interview: interviewId,
    question: questionId,
    user: userId,
  });

  if (!answer) {
    throw new Error("Original answer not found");
  }

  const currentVersion = Number(answer.submissionVersion) || 1;

  const nextVersion = currentVersion + 1;

  if (nextVersion > MAX_SUBMISSIONS) {
    throw new Error(
      `Maximum of ${MAX_SUBMISSIONS} submissions allowed for one question`,
    );
  }

  const now = new Date();

  if (!Array.isArray(answer.answerVersions)) {
    answer.answerVersions = [];
  }

  answer.answerVersions.push({
    version: nextVersion,

    text: submission.text || null,

    code: submission.code || null,

    language: submission.language || null,

    submissionType: "resubmission",

    submittedAt: now,
  });

  answer.answerType = submission.answerType;

  answer.answerText = submission.text || null;

  answer.code = submission.code || null;

  answer.language = submission.language || null;

  answer.currentAnswer = {
    text: submission.text || null,
    code: submission.code || null,
    language: submission.language || null,
    version: nextVersion,
    submittedAt: now,
  };

  answer.submissionVersion = nextVersion;

  answer.lastSubmissionAt = now;

  answer.evaluationStatus = "pending";

  answer.evaluationVersion = 0;

  answer.evaluatedAt = null;

  answer.evaluationError = {
    code: null,
    message: null,
    provider: null,
    occurredAt: null,
  };

  await answer.save();

  interview.lastActivityAt = now;

  await interview.save();

  debug("Answer resubmitted", {
    answerId: String(answer._id),
    version: nextVersion,
    questionId: String(questionId),
  });

  return answer;
};

module.exports = {
  resubmitAnswer,
};
