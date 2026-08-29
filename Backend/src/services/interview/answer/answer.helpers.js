// Backend/services/interview/answer/answer.helpers.js

const { MAX_ANSWER_LENGTH } = require("./answer.constants");

const { cleanString } = require("./answer.validation");

// ============================================================
// DEBUG
// ============================================================

const debug = (message, data = null) => {
  console.log(`[ANSWER SERVICE] ${message}`);

  if (data !== null) {
    console.log(data);
  }
};

const debugError = (message, error = null) => {
  console.error(`[ANSWER SERVICE ERROR] ${message}`);

  if (error) {
    console.error(error?.stack || error?.message || error);
  }
};

// ============================================================
// QUESTION ANSWER TYPE
// ============================================================

const getQuestionAnswerType = (question) => {
  if (question?.category === "coding" || question?.category === "dsa") {
    return "coding";
  }

  if (question?.category === "debugging") {
    return "debugging";
  }

  return "text";
};

// ============================================================
// NORMALIZE SUBMISSION
// ============================================================

const normalizeSubmission = (question, payload) => {
  // ----------------------------------------------------------
  // Backward compatibility:
  // submitAnswer(..., "answer")
  // ----------------------------------------------------------

  if (typeof payload === "string") {
    const text = cleanString(payload);

    if (!text) {
      throw new Error("Answer cannot be empty");
    }

    if (text.length > MAX_ANSWER_LENGTH) {
      throw new Error(`Answer cannot exceed ${MAX_ANSWER_LENGTH} characters`);
    }

    const questionType = getQuestionAnswerType(question);

    if (questionType === "coding" || questionType === "debugging") {
      return {
        answerType: questionType,
        text: null,
        code: text,
        language:
          question?.coding?.language || question?.debugging?.language || null,
      };
    }

    return {
      answerType: "text",
      text,
      code: null,
      language: null,
    };
  }

  // ----------------------------------------------------------
  // Object payload
  // ----------------------------------------------------------

  if (!payload || typeof payload !== "object") {
    throw new Error("Answer payload is required");
  }

  const requestedType = cleanString(payload?.answerType);

  const questionType = getQuestionAnswerType(question);

  let answerType = requestedType || questionType;

  const text = cleanString(payload?.answerText) || cleanString(payload?.text);

  const code = cleanString(payload?.code);
  const language = cleanString(payload?.language);

  const isCodingQuestion =
    question?.category === "coding" || question?.category === "dsa";

  const isDebuggingQuestion = question?.category === "debugging";

  // ----------------------------------------------------------
  // NORMAL QUESTION
  // ----------------------------------------------------------

  if (!isCodingQuestion && !isDebuggingQuestion) {
    if (!text) {
      throw new Error("Answer cannot be empty");
    }

    if (text.length > MAX_ANSWER_LENGTH) {
      throw new Error(`Answer cannot exceed ${MAX_ANSWER_LENGTH} characters`);
    }

    return {
      answerType: "text",
      text,
      code: null,
      language: null,
    };
  }

  // ----------------------------------------------------------
  // CODING / DEBUGGING
  // ----------------------------------------------------------

  const effectiveCode = code || text;

  if (!effectiveCode) {
    throw new Error("Answer cannot be empty");
  }

  if (effectiveCode.length > MAX_ANSWER_LENGTH) {
    throw new Error(
      `Answer/code cannot exceed ${MAX_ANSWER_LENGTH} characters`,
    );
  }

  answerType = isDebuggingQuestion ? "debugging" : "coding";

  return {
    answerType,
    text: null,
    code: effectiveCode,
    language:
      language ||
      question?.coding?.language ||
      question?.debugging?.language ||
      null,
  };
};

// ============================================================
// BUILD ANSWER SNAPSHOT
// ============================================================

const buildAnswerSnapshot = (answer) => {
  if (!answer) {
    return {
      hasAnswer: false,
      answerId: null,
      answerType: null,
      answerText: null,
      code: null,
      language: null,
      submissionVersion: 0,
      currentAnswer: null,
      originalAnswer: null,
      answerVersions: [],
      evaluationStatus: null,
      evaluationVersion: 0,
      evaluatedAt: null,
    };
  }

  return {
    hasAnswer: true,
    answerId: answer?._id || null,
    answerType: answer?.answerType || null,
    answerText: answer?.answerText || null,
    code: answer?.code || null,
    language: answer?.language || null,

    submissionVersion: Number(answer?.submissionVersion) || 0,

    currentAnswer: answer?.currentAnswer || null,

    originalAnswer: answer?.originalAnswer || null,

    answerVersions: Array.isArray(answer?.answerVersions)
      ? answer.answerVersions
      : [],

    evaluationStatus: answer?.evaluationStatus || null,

    evaluationVersion: Number(answer?.evaluationVersion) || 0,

    evaluatedAt: answer?.evaluatedAt || null,
  };
};

module.exports = {
  debug,
  debugError,
  getQuestionAnswerType,
  normalizeSubmission,
  buildAnswerSnapshot,
};
