const crypto = require("crypto");

const { redisClient } = require("../config/redis");

// =========================================================
// CONFIGURATION
// =========================================================

const OTP_EXPIRY = 5 * 60;
// OTP remains valid for 5 minutes.

const RESEND_COOLDOWN = 60;
// User must wait 60 seconds before requesting another OTP.

const MAX_ATTEMPTS = 5;
// Maximum incorrect OTP attempts.

const PASSWORD_RESET_EXPIRY = 10 * 60;
// Password reset token remains valid for 10 minutes.

// =========================================================
// RECOVERY TOKEN
// =========================================================

/**
 * Generate a cryptographically secure recovery token.
 *
 * @returns {string}
 */
function generateRecoveryToken() {
  return crypto.randomBytes(32).toString("hex");
}

// =========================================================
// OTP KEY
// =========================================================

/**
 * Generate Redis key for an OTP.
 *
 * @param {string} userId
 * @param {string} purpose
 * @returns {string}
 */
function getOTPKey(userId, purpose) {
  return `recovery:otp:${purpose}:${userId}`;
}

// =========================================================
// COOLDOWN KEY
// =========================================================

/**
 * Generate Redis key for resend cooldown.
 *
 * @param {string} userId
 * @param {string} purpose
 * @returns {string}
 */
function getCooldownKey(userId, purpose) {
  return `recovery:cooldown:${purpose}:${userId}`;
}

// =========================================================
// CREATE OTP
// =========================================================

/**
 * Create and store OTP data in Redis.
 *
 * Creating a new OTP automatically replaces
 * the previous OTP for the same user and purpose.
 *
 * @param {Object} options
 * @param {string} options.userId
 * @param {string} options.purpose
 * @param {string} options.email
 * @param {string} options.otpHash
 *
 * @returns {Promise<string>}
 */
async function createOTP({ userId, purpose, email, otpHash }) {
  const key = getOTPKey(userId, purpose);

  const data = {
    email,
    otpHash,
    attempts: 0,
  };

  await redisClient.set(key, JSON.stringify(data), {
    EX: OTP_EXPIRY,
  });

  return key;
}

// =========================================================
// GET OTP
// =========================================================

/**
 * Get OTP data from Redis.
 *
 * @param {Object} options
 * @param {string} options.userId
 * @param {string} options.purpose
 *
 * @returns {Promise<Object|null>}
 */
async function getOTP({ userId, purpose }) {
  const key = getOTPKey(userId, purpose);

  const data = await redisClient.get(key);

  if (!data) {
    return null;
  }

  try {
    return {
      key,
      data: JSON.parse(data),
    };
  } catch (error) {
    console.error("OTP Redis data parse error:", error);

    // Remove corrupted OTP data.
    await redisClient.del(key);

    return null;
  }
}

// =========================================================
// RESEND ALLOWED
// =========================================================

/**
 * Check whether a new OTP can be requested.
 *
 * @param {Object} options
 * @param {string} options.userId
 * @param {string} options.purpose
 *
 * @returns {Promise<boolean>}
 */
async function isResendAllowed({ userId, purpose }) {
  const key = getCooldownKey(userId, purpose);

  const exists = await redisClient.exists(key);

  return exists === 0;
}

// =========================================================
// SET RESEND COOLDOWN
// =========================================================

/**
 * Start OTP resend cooldown.
 *
 * @param {Object} options
 * @param {string} options.userId
 * @param {string} options.purpose
 *
 * @returns {Promise<void>}
 */
async function setResendCooldown({ userId, purpose }) {
  const key = getCooldownKey(userId, purpose);

  await redisClient.set(key, "1", {
    EX: RESEND_COOLDOWN,
  });
}

// =========================================================
// GET RESEND COOLDOWN
// =========================================================

/**
 * Get remaining resend cooldown.
 *
 * @param {Object} options
 * @param {string} options.userId
 * @param {string} options.purpose
 *
 * @returns {Promise<number>}
 */
async function getResendCooldown({ userId, purpose }) {
  const key = getCooldownKey(userId, purpose);

  const ttl = await redisClient.ttl(key);

  return ttl > 0 ? ttl : 0;
}

// =========================================================
// VERIFY OTP
// =========================================================

/**
 * Verify OTP.
 *
 * Maximum 5 incorrect attempts are allowed.
 *
 * @param {Object} options
 * @param {string} options.userId
 * @param {string} options.purpose
 * @param {string} options.otpHash
 *
 * @returns {Promise<Object>}
 */
async function verifyOTP({ userId, purpose, otpHash }) {
  const result = await getOTP({
    userId,
    purpose,
  });

  // =====================================================
  // OTP DOES NOT EXIST
  // =====================================================

  if (!result) {
    return {
      success: false,
      reason: "EXPIRED",
    };
  }

  const { key, data } = result;

  // =====================================================
  // MAXIMUM ATTEMPTS
  // =====================================================

  if (data.attempts >= MAX_ATTEMPTS) {
    await redisClient.del(key);

    return {
      success: false,
      reason: "MAX_ATTEMPTS",
    };
  }

  // =====================================================
  // INVALID OTP
  // =====================================================

  if (data.otpHash !== otpHash) {
    data.attempts += 1;

    const ttl = await redisClient.ttl(key);

    if (ttl > 0) {
      await redisClient.set(key, JSON.stringify(data), {
        EX: ttl,
      });
    }

    const attemptsRemaining = Math.max(0, MAX_ATTEMPTS - data.attempts);

    // Delete OTP immediately after
    // the fifth incorrect attempt.
    if (data.attempts >= MAX_ATTEMPTS) {
      await redisClient.del(key);

      return {
        success: false,
        reason: "MAX_ATTEMPTS",
        attemptsRemaining: 0,
      };
    }

    return {
      success: false,
      reason: "INVALID",
      attemptsRemaining,
    };
  }

  // =====================================================
  // OTP VALID
  // =====================================================

  return {
    success: true,
    key,
  };
}

// =========================================================
// DELETE OTP
// =========================================================

/**
 * Delete OTP from Redis.
 *
 * @param {string} key
 * @returns {Promise<void>}
 */
async function deleteOTP(key) {
  if (!key) {
    return;
  }

  await redisClient.del(key);
}

// =========================================================
// CREATE PASSWORD RESET TOKEN
// =========================================================

/**
 * Create temporary password reset token.
 *
 * @param {Object} options
 * @param {string} options.userId
 *
 * @returns {Promise<string>}
 */
async function createPasswordResetToken({ userId }) {
  const token = generateRecoveryToken();

  const key = `recovery:reset:${token}`;

  await redisClient.set(key, userId.toString(), {
    EX: PASSWORD_RESET_EXPIRY,
  });

  return token;
}

// =========================================================
// GET PASSWORD RESET USER
// =========================================================

/**
 * Get user ID from password reset token.
 *
 * @param {string} token
 *
 * @returns {Promise<Object|null>}
 */
async function getPasswordResetUser(token) {
  if (!token) {
    return null;
  }

  const key = `recovery:reset:${token}`;

  const userId = await redisClient.get(key);

  if (!userId) {
    return null;
  }

  return {
    key,
    userId,
  };
}

// =========================================================
// DELETE PASSWORD RESET TOKEN
// =========================================================

/**
 * Delete password reset token.
 *
 * @param {string} key
 * @returns {Promise<void>}
 */
async function deletePasswordResetToken(key) {
  if (!key) {
    return;
  }

  await redisClient.del(key);
}

// =========================================================
// EXPORT
// =========================================================

module.exports = {
  createOTP,
  getOTP,
  verifyOTP,
  deleteOTP,

  isResendAllowed,
  setResendCooldown,
  getResendCooldown,

  createPasswordResetToken,
  getPasswordResetUser,
  deletePasswordResetToken,
};
