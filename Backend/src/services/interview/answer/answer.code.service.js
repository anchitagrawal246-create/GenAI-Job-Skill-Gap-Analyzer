// Backend/services/interview/answer/answer.code.service.js

const Answer = require("../../../model/answer.model");

const { MAX_CODE_RUNS, MAX_ANSWER_LENGTH } = require("./answer.constants");

const { validateObjectId } = require("./answer.validation");

const { cleanString, debug } = require("./answer.helpers");

const {
  getOwnedInterview,
  getInterviewQuestion,
} = require("./answer.validation.helpers");

// ============================================================
// RECORD CODE RUN
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

module.exports = {
  recordCodeRun,
};
