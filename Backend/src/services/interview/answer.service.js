const mongoose = require("mongoose");

const Answer = require("../../model/answer.model");
const Evaluation = require("../../model/evaluation.model");
const Interview = require("../../model/interview.model");
const Question = require("../../model/question.model");

// ============================================================
// CONSTANTS
// ============================================================

const MAX_QUESTIONS = 100;
const MAX_ANSWER_LENGTH = 50000;
const MAX_SUBMISSIONS = 100;
const MAX_CODE_RUNS = 200;

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
// VALIDATION
// ============================================================

const validateObjectId = (id, fieldName) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error(`Invalid ${fieldName}`);
  }

  return id;
};

// ============================================================
// HELPERS
// ============================================================

const cleanString = (value) => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length ? trimmed : null;
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

// ============================================================
// GET LATEST EVALUATION FOR QUESTION
// ============================================================

const getLatestQuestionEvaluation = async (
  interviewId,
  questionId,
  answerId = null,
) => {
  const query = {
    interview: interviewId,
    question: questionId,
    status: "completed",
  };

  if (answerId) {
    query.answer = answerId;
  }

  return Evaluation.findOne(query)
    .sort({
      version: -1,
      createdAt: -1,
    })
    .lean();
};

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

  // ----------------------------------------------------------
  // Only new/unanswered questions
  // ----------------------------------------------------------

  if (question.status === "answered") {
    throw new Error(
      "This question has already been answered. Use resubmitAnswer() to change it.",
    );
  }

  const submission = normalizeSubmission(question, payload);

  const now = new Date();

  // ----------------------------------------------------------
  // Prevent duplicate answer document
  // ----------------------------------------------------------

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

  // ----------------------------------------------------------
  // CREATE ANSWER
  // ----------------------------------------------------------

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

      // ------------------------------------------------------
      // ORIGINAL ANSWER
      // ------------------------------------------------------

      originalAnswer: {
        text: submission.text || null,

        code: submission.code || null,

        language: submission.language || null,

        submittedAt: now,
      },

      // ------------------------------------------------------
      // CURRENT ANSWER
      // ------------------------------------------------------

      currentAnswer: {
        text: submission.text || null,

        code: submission.code || null,

        language: submission.language || null,

        version: 1,
        submittedAt: now,
      },

      // ------------------------------------------------------
      // ANSWER VERSION HISTORY
      // ------------------------------------------------------

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

      // ------------------------------------------------------
      // EVALUATION STATE
      // ------------------------------------------------------

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

  // ==========================================================
  // QUESTION -> ANSWERED
  // ==========================================================

  question.status = "answered";
  question.answeredAt = now;
  question.skippedAt = null;
  question.skipReason = null;

  await question.save();

  // ==========================================================
  // UPDATE INTERVIEW COUNTERS
  // ==========================================================

  await updateInterviewCounters(interview);

  debug("Answer submitted successfully", {
    answerId: String(answer._id),
    questionId: String(questionId),
    questionNumber: question.questionNumber,
    answerType: answer.answerType,

    hasText: Boolean(cleanString(answer.answerText)),

    hasCode: Boolean(cleanString(answer.code)),
  });

  return answer;
};

// ============================================================
// RESUBMIT ANSWER
//
// v1 -> v2 -> v3 -> v4...
//
// Old versions remain untouched.
// currentAnswer always points to newest version.
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

  // ----------------------------------------------------------
  // Skipped question
  // ----------------------------------------------------------

  if (question.status === "skipped") {
    throw new Error(
      "Skipped question has no answer to resubmit. Use answerSkippedQuestion() instead.",
    );
  }

  // ----------------------------------------------------------
  // Must be answered
  // ----------------------------------------------------------

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

  // ----------------------------------------------------------
  // APPEND NEW ANSWER VERSION
  // ----------------------------------------------------------

  answer.answerVersions.push({
    version: nextVersion,

    text: submission.text || null,

    code: submission.code || null,

    language: submission.language || null,

    submissionType: "resubmission",

    submittedAt: now,
  });

  // ----------------------------------------------------------
  // CURRENT ANSWER
  // ----------------------------------------------------------

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

  // ----------------------------------------------------------
  // RESET EVALUATION
  // ----------------------------------------------------------

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

// ============================================================
// RECORD CODE RUN
//
// This records the result returned by an external/trusted
// execution service.
//
// It does NOT execute arbitrary code inside Express.
// ============================================================

const recordCodeRun = async (userId, interviewId, questionId, runData) => {
  validateObjectId(userId, "user ID");
  validateObjectId(interviewId, "interview ID");
  validateObjectId(questionId, "question ID");

  const interview = await getOwnedInterview(userId, interviewId);

  if (interview.status !== "in-progress") {
    throw new Error("Code cannot be run outside an active interview");
  }

  const question = await getInterviewQuestion(interviewId, questionId);

  if (
    question.category !== "coding" &&
    question.category !== "dsa" &&
    question.category !== "debugging"
  ) {
    throw new Error(
      "Code execution is only available for coding/debugging questions",
    );
  }

  const answer = await Answer.findOne({
    interview: interviewId,
    question: questionId,
    user: userId,
  });

  if (!answer) {
    throw new Error("Answer not found. Submit code before running it.");
  }

  if (!runData || typeof runData !== "object") {
    throw new Error("Run result is required");
  }

  const allowedStatuses = [
    "passed",
    "failed",
    "error",
    "timeout",
    "compile-error",
    "runtime-error",
  ];

  if (!allowedStatuses.includes(runData.status)) {
    throw new Error("Invalid code execution status");
  }

  const currentRuns = Array.isArray(answer.runHistory)
    ? answer.runHistory.length
    : 0;

  if (currentRuns >= MAX_CODE_RUNS) {
    throw new Error("Maximum code execution history reached");
  }

  const runNumber = currentRuns + 1;

  const now = new Date();

  const safeNumber = (value, fallback = null) => {
    const number = Number(value);

    return Number.isFinite(number) ? Math.max(0, number) : fallback;
  };

  // ----------------------------------------------------------
  // TEST RESULTS
  // ----------------------------------------------------------

  const tests = Array.isArray(runData.tests)
    ? runData.tests.slice(0, 100).map((test, index) => ({
        testNumber: Number.isInteger(test?.testNumber)
          ? test.testNumber
          : index + 1,

        passed: Boolean(test?.passed),

        input: test?.input ?? null,

        expectedOutput: test?.expectedOutput ?? null,

        actualOutput: test?.actualOutput ?? null,

        error: cleanString(test?.error),
      }))
    : [];

  // ----------------------------------------------------------
  // RUN OBJECT
  // ----------------------------------------------------------

  const run = {
    runNumber,

    code:
      typeof runData.code === "string"
        ? runData.code.slice(0, MAX_ANSWER_LENGTH)
        : answer.code,

    language:
      cleanString(runData.language) ||
      answer.language ||
      question?.coding?.language ||
      question?.debugging?.language ||
      null,

    status: runData.status,

    output:
      typeof runData.output === "string"
        ? runData.output.slice(0, 20000)
        : null,

    error:
      typeof runData.error === "string" ? runData.error.slice(0, 10000) : null,

    executionTimeMs: safeNumber(runData.executionTimeMs),

    memoryUsedKb: safeNumber(runData.memoryUsedKb),

    passedTests: safeNumber(runData.passedTests, 0),

    totalTests: safeNumber(runData.totalTests, 0),

    tests,

    executedAt: now,
  };

  // ----------------------------------------------------------
  // SAVE RUN
  // ----------------------------------------------------------

  if (!Array.isArray(answer.runHistory)) {
    answer.runHistory = [];
  }

  answer.runHistory.push(run);

  answer.debug = {
    ...(answer.debug || {}),

    lastRunNumber: runNumber,

    lastExecutionStatus: run.status,

    lastExecutionAt: now,

    lastError: run.error,
  };

  await answer.save();

  interview.lastActivityAt = now;

  await interview.save();

  debug("Code run recorded", {
    answerId: String(answer._id),
    runNumber,
    status: run.status,
  });

  return run;
};

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

  const totalQuestions = Number(interview.totalQuestions) || 0;

  if (totalQuestions < 1 || totalQuestions > MAX_QUESTIONS) {
    throw new Error("Interview has an invalid question limit");
  }

  const questionNumber = Number(question.questionNumber) || 0;

  if (questionNumber < 1 || questionNumber > totalQuestions) {
    throw new Error("Question is outside the interview limit");
  }

  // ----------------------------------------------------------
  // ALREADY ANSWERED
  // ----------------------------------------------------------

  if (question.status === "answered") {
    throw new Error("Answered questions cannot be skipped");
  }

  // ----------------------------------------------------------
  // ALREADY SKIPPED
  // ----------------------------------------------------------

  if (question.status === "skipped") {
    await updateInterviewCounters(interview);

    return {
      question,
      interview,
      alreadySkipped: true,
    };
  }

  // ----------------------------------------------------------
  // SAFETY CHECK
  // ----------------------------------------------------------

  const existingAnswer = await Answer.findOne({
    interview: interviewId,
    question: questionId,
    user: userId,
  });

  if (existingAnswer) {
    throw new Error("Cannot skip a question that already has an answer");
  }

  const now = new Date();

  // ----------------------------------------------------------
  // MARK QUESTION SKIPPED
  // ----------------------------------------------------------

  question.status = "skipped";

  question.skippedAt = now;

  question.skipReason = cleanString(skipReason) || "user-skipped";

  question.answeredAt = null;

  await question.save();

  // ----------------------------------------------------------
  // UPDATE COUNTERS
  // ----------------------------------------------------------

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
//
// skipped -> answered -> evaluated
//
// Creates answer version 1.
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

  // ----------------------------------------------------------
  // Must actually be skipped
  // ----------------------------------------------------------

  if (question.status !== "skipped") {
    throw new Error("Only skipped questions can use answerSkippedQuestion()");
  }

  // ----------------------------------------------------------
  // Prevent duplicate answer
  // ----------------------------------------------------------

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

  // ----------------------------------------------------------
  // CREATE ANSWER
  // ----------------------------------------------------------

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

    // --------------------------------------------------------
    // ORIGINAL ANSWER
    // --------------------------------------------------------

    originalAnswer: {
      text: submission.text || null,

      code: submission.code || null,

      language: submission.language || null,

      submittedAt: now,
    },

    // --------------------------------------------------------
    // CURRENT ANSWER
    // --------------------------------------------------------

    currentAnswer: {
      text: submission.text || null,

      code: submission.code || null,

      language: submission.language || null,

      version: 1,

      submittedAt: now,
    },

    // --------------------------------------------------------
    // VERSION HISTORY
    // --------------------------------------------------------

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

    // --------------------------------------------------------
    // EVALUATION STATE
    // --------------------------------------------------------

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

  // ----------------------------------------------------------
  // SKIPPED -> ANSWERED
  // ----------------------------------------------------------

  question.status = "answered";

  question.answeredAt = now;

  question.skippedAt = null;

  question.skipReason = null;

  await question.save();

  // ----------------------------------------------------------
  // UPDATE COUNTERS
  // ----------------------------------------------------------

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

// ============================================================
// GET SINGLE ANSWER
// ============================================================

const getAnswer = async (userId, interviewId, questionId) => {
  validateObjectId(userId, "user ID");
  validateObjectId(interviewId, "interview ID");
  validateObjectId(questionId, "question ID");

  await getOwnedInterview(userId, interviewId);

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
  validateObjectId(userId, "user ID");
  validateObjectId(interviewId, "interview ID");

  await getOwnedInterview(userId, interviewId);

  const answers = await Answer.find({
    interview: interviewId,
    user: userId,
  })
    .populate("question")
    .lean();

  answers.sort((a, b) => {
    const aNumber = Number(a?.question?.questionNumber) || 0;

    const bNumber = Number(b?.question?.questionNumber) || 0;

    if (aNumber !== bNumber) {
      return aNumber - bNumber;
    }

    return new Date(a?.createdAt || 0) - new Date(b?.createdAt || 0);
  });

  return answers;
};

// ============================================================
// GET QUESTION STATUSES
//
// Used by the frontend question sidebar/navigation.
//
// This does NOT perform navigation.
// Navigation remains in interview.service.js.
// ============================================================

const getInterviewQuestionStatuses = async (userId, interviewId) => {
  validateObjectId(userId, "user ID");
  validateObjectId(interviewId, "interview ID");

  const interview = await getOwnedInterview(userId, interviewId);

  const questions = await Question.find({
    interview: interviewId,
  })
    .sort({
      questionNumber: 1,
    })
    .lean();

  const answers = await Answer.find({
    interview: interviewId,
    user: userId,
  }).lean();

  // ----------------------------------------------------------
  // ANSWER MAP
  // ----------------------------------------------------------

  const answerMap = new Map();

  for (const answer of answers) {
    answerMap.set(String(answer.question), answer);
  }

  // ----------------------------------------------------------
  // QUESTION STATUS
  // ----------------------------------------------------------

  const questionStatuses = questions.map((question) => {
    const answer = answerMap.get(String(question._id)) || null;

    return {
      questionId: question._id,

      questionNumber: question.questionNumber,

      status: question.status,

      category: question.category,

      difficulty: question.difficulty,

      skill: question.skill,

      answeredAt: question.answeredAt || null,

      skippedAt: question.skippedAt || null,

      skipReason: question.skipReason || null,

      hasAnswer: Boolean(answer),

      answerId: answer?._id || null,

      answerType: answer?.answerType || null,

      submissionVersion: Number(answer?.submissionVersion) || 0,

      evaluationStatus: answer?.evaluationStatus || null,

      evaluationVersion: Number(answer?.evaluationVersion) || 0,

      evaluatedAt: answer?.evaluatedAt || null,

      hasOriginalAnswer: Boolean(answer?.originalAnswer),

      hasCurrentAnswer: Boolean(answer?.currentAnswer),

      answerVersionCount: Array.isArray(answer?.answerVersions)
        ? answer.answerVersions.length
        : 0,

      codeRunCount: Array.isArray(answer?.runHistory)
        ? answer.runHistory.length
        : 0,
    };
  });

  return {
    interview: {
      interviewId: interview._id,

      totalQuestions: interview.totalQuestions,

      generatedQuestions: interview.generatedQuestions,

      answeredQuestions: interview.answeredQuestions,

      skippedQuestions: interview.skippedQuestions,

      completedQuestions: interview.completedQuestions,

      currentQuestionNumber: interview.currentQuestionNumber,

      status: interview.status,

      difficulty: interview.difficulty,

      currentDifficulty: interview.currentDifficulty,
    },

    questions: questionStatuses,
  };
};

// ============================================================
// UPDATE INTERVIEW COUNTERS
//
// IMPORTANT:
// This function MUST NOT change the active navigation position.
//
// currentQuestionNumber belongs to interview.service.js.
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

  // ----------------------------------------------------------
  // IMPORTANT
  //
  // DO NOT reset currentQuestionNumber.
  //
  // Navigation service owns it.
  // ----------------------------------------------------------

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

// ============================================================
// EXPORTS
//
// Navigation is intentionally NOT exported from here.
//
// Navigation belongs to interview.service.js:
//   getCurrentQuestion()
//   getNextQuestion()
//   getPreviousQuestion()
//   selectQuestion()
// ============================================================

module.exports = {
  submitAnswer,
  resubmitAnswer,
  answerSkippedQuestion,
  recordCodeRun,
  skipQuestion,
  getAnswer,
  getInterviewAnswers,
  getInterviewQuestionStatuses,
};
