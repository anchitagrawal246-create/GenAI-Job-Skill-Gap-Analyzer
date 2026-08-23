const { redisClient } = require("../../config/redis");

const { OTP_EXPIRY, MAX_ATTEMPTS } = require("./recovery.config");

const { getOTPKey } = require("./recovery.keys");

// =========================================================
// CREATE OTP
// =========================================================

/**
 * Store OTP information in Redis.
 *
 * A new OTP automatically replaces
 * the previous OTP for the same user and purpose.
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
 * Get OTP information from Redis.
 *
 * Returns:
 *
 * {
 *   key,
 *   data
 * }
 *
 * or null if OTP does not exist.
 */
async function getOTP({ userId, purpose }) {
  const key = getOTPKey(userId, purpose);

  const data = await redisClient.get(key);

  // OTP expired or does not exist.
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

    // Delete corrupted data.
    await redisClient.del(key);

    return null;
  }
}

// =========================================================
// VERIFY OTP
// =========================================================

/**
 * Verify submitted OTP hash.
 *
 * Maximum 5 incorrect attempts are allowed.
 */
async function verifyOTP({ userId, purpose, otpHash }) {
  const result = await getOTP({
    userId,
    purpose,
  });

  // =======================================================
  // OTP DOES NOT EXIST
  // =======================================================

  if (!result) {
    return {
      success: false,
      reason: "EXPIRED",
    };
  }

  const { key, data } = result;

  // =======================================================
  // MAXIMUM ATTEMPTS
  // =======================================================

  if (data.attempts >= MAX_ATTEMPTS) {
    await redisClient.del(key);

    return {
      success: false,
      reason: "MAX_ATTEMPTS",
    };
  }

  // =======================================================
  // INVALID OTP
  // =======================================================

  if (data.otpHash !== otpHash) {
    data.attempts += 1;

    // Preserve the remaining Redis TTL.
    const ttl = await redisClient.ttl(key);

    if (ttl > 0) {
      await redisClient.set(key, JSON.stringify(data), {
        EX: ttl,
      });
    }

    const attemptsRemaining = Math.max(0, MAX_ATTEMPTS - data.attempts);

    // Delete OTP after fifth incorrect attempt.
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

  // =======================================================
  // OTP VALID
  // =======================================================

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
 */
async function deleteOTP(key) {
  if (!key) {
    return;
  }

  await redisClient.del(key);
}

module.exports = {
  createOTP,
  getOTP,
  verifyOTP,
  deleteOTP,
};
