// ============================================================
// INTERVIEW CONTROLLER UTILITIES
// ============================================================

const debug = (message, data = null) => {
  console.log(`[INTERVIEW CONTROLLER] ${message}`);

  if (data !== null) {
    console.log(data);
  }
};

// ============================================================
// DEBUG ERROR
// ============================================================

const debugError = (message, error = null) => {
  console.error(`[INTERVIEW CONTROLLER ERROR] ${message}`);

  if (error) {
    console.error(error?.stack || error?.message || error);
  }
};

// ============================================================
// GET AUTHENTICATED USER ID
// ============================================================

const getUserId = (req) => {
  const userId = req?.user?.id;

  if (!userId) {
    const error = new Error("Authenticated user not found");
    error.statusCode = 401;
    throw error;
  }

  return userId;
};

// ============================================================
// SAFE NUMBER
// Keeps score between 0 and 100
// ============================================================

const safeNumber = (value) => {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return 0;
  }

  return Math.max(0, Math.min(100, number));
};

// ============================================================
// AVERAGE
// ============================================================

const average = (values) => {
  if (!Array.isArray(values) || values.length === 0) {
    return 0;
  }

  const total = values.reduce((sum, value) => {
    return sum + safeNumber(value);
  }, 0);

  return Math.round((total / values.length) * 100) / 100;
};

// ============================================================
// ERROR STATUS
// ============================================================

const getErrorStatus = (error) => {
  // ----------------------------------------------------------
  // Explicit status from service/controller
  // ----------------------------------------------------------

  if (
    Number.isInteger(error?.statusCode) &&
    error.statusCode >= 400 &&
    error.statusCode <= 599
  ) {
    return error.statusCode;
  }

  const message = error?.message || "";

  // ----------------------------------------------------------
  // NOT FOUND
  // ----------------------------------------------------------

  const notFoundMessages = [
    "Interview not found",
    "Question not found",
    "Answer not found",
    "Evaluation not found",
    "Original answer not found",
    "Original evaluation must exist before re-evaluation",
    "Previous question not found",
  ];

  if (notFoundMessages.includes(message)) {
    return 404;
  }

  // ----------------------------------------------------------
  // BAD REQUEST
  // ----------------------------------------------------------

  if (
    message.startsWith("Invalid ") ||
    message.startsWith("Answer") ||
    message.startsWith("Question") ||
    message.startsWith("Interview") ||
    message.startsWith("Skipped") ||
    message.startsWith("Completed") ||
    message.startsWith("Cancelled") ||
    message.startsWith("At least one")
  ) {
    return 400;
  }

  // ----------------------------------------------------------
  // DEFAULT
  // ----------------------------------------------------------

  return 400;
};

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  debug,
  debugError,
  getUserId,
  safeNumber,
  average,
  getErrorStatus,
};
