const { redisClient } = require("../../config/redis");

const { RESEND_COOLDOWN } = require("./recovery.config");

const { getCooldownKey } = require("./recovery.keys");

// =========================================================
// CHECK RESEND
// =========================================================

/**
 * Check whether the user is allowed
 * to request another OTP.
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
 * Get remaining cooldown time.
 */
async function getResendCooldown({ userId, purpose }) {
  const key = getCooldownKey(userId, purpose);

  const ttl = await redisClient.ttl(key);

  return ttl > 0 ? ttl : 0;
}

module.exports = {
  isResendAllowed,
  setResendCooldown,
  getResendCooldown,
};
