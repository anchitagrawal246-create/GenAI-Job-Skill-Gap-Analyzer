// =========================================================
// REDIS RECOVERY KEY GENERATORS
// =========================================================

/**
 * Generate Redis key for OTP.
 *
 * Example:
 *
 * recovery:otp:REGISTER:test@gmail.com
 */
function getOTPKey(userId, purpose) {
  return `recovery:otp:${purpose}:${userId}`;
}

/**
 * Generate Redis key for OTP resend cooldown.
 *
 * Example:
 *
 * recovery:cooldown:REGISTER:test@gmail.com
 */
function getCooldownKey(userId, purpose) {
  return `recovery:cooldown:${purpose}:${userId}`;
}

/**
 * Generate Redis key for password reset token.
 *
 * Example:
 *
 * recovery:reset:abc123...
 */
function getPasswordResetKey(token) {
  return `recovery:reset:${token}`;
}

module.exports = {
  getOTPKey,
  getCooldownKey,
  getPasswordResetKey,
};
