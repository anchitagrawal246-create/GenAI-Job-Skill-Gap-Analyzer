const crypto = require("crypto");

const { redisClient } = require("../../config/redis");

const { PASSWORD_RESET_EXPIRY } = require("./recovery.config");

const { getPasswordResetKey } = require("./recovery.keys");

// =========================================================
// GENERATE RECOVERY TOKEN
// =========================================================

/**
 * Generate a cryptographically secure token.
 */
function generateRecoveryToken() {
  return crypto.randomBytes(32).toString("hex");
}

// =========================================================
// CREATE PASSWORD RESET TOKEN
// =========================================================

/**
 * Create temporary password reset token.
 *
 * Token is valid for 10 minutes.
 */
async function createPasswordResetToken({ userId }) {
  const token = generateRecoveryToken();

  const key = getPasswordResetKey(token);

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
 * Returns:
 *
 * {
 *   key,
 *   userId
 * }
 *
 * or null if token is invalid/expired.
 */
async function getPasswordResetUser(token) {
  if (!token) {
    return null;
  }

  const key = getPasswordResetKey(token);

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
 */
async function deletePasswordResetToken(key) {
  if (!key) {
    return;
  }

  await redisClient.del(key);
}

module.exports = {
  createPasswordResetToken,
  getPasswordResetUser,
  deletePasswordResetToken,
};
