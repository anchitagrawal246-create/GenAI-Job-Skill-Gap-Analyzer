const { redisClient } = require("../config/redis");

// =========================================================
// CONFIGURATION
// =========================================================

const BLACKLIST_PREFIX = "blacklist:access:";

// =========================================================
// HELPERS
// =========================================================

/**
 * Generate Redis blacklist key.
 *
 * Example:
 * blacklist:access:<jti>
 */
function getBlacklistKey(jti) {
  return `${BLACKLIST_PREFIX}${jti}`;
}

/**
 * Validate JWT ID.
 *
 * generateToken() creates jti using crypto.randomUUID(),
 * so a valid JTI should be a non-empty string.
 */
function isValidJti(jti) {
  return typeof jti === "string" && jti.length > 0 && jti.length <= 128;
}

/**
 * Normalize TTL.
 *
 * Redis EX requires a positive integer.
 */
function normalizeTTL(expiresInSeconds) {
  const ttl = Number(expiresInSeconds);

  if (!Number.isFinite(ttl) || ttl <= 0) {
    return 0;
  }

  return Math.max(1, Math.ceil(ttl));
}

// =========================================================
// BLACKLIST ACCESS TOKEN
// =========================================================

/**
 * Blacklist an access token by its JTI.
 *
 * The blacklist entry automatically expires when the
 * original access token would have expired.
 *
 * Therefore Redis does not accumulate old blacklist entries.
 *
 * @param {string} jti
 * @param {number} expiresInSeconds
 * @returns {Promise<boolean>}
 */
async function blacklistAccessToken(jti, expiresInSeconds) {
  if (!isValidJti(jti)) {
    return false;
  }

  const ttl = normalizeTTL(expiresInSeconds);

  if (ttl <= 0) {
    return false;
  }

  await redisClient.set(getBlacklistKey(jti), "1", {
    EX: ttl,
  });

  return true;
}

// =========================================================
// CHECK BLACKLIST
// =========================================================

/**
 * Check whether an access token has been revoked.
 *
 * Used by:
 * middleware/auth.middleware.js
 *
 * @param {string} jti
 * @returns {Promise<boolean>}
 */
async function isAccessTokenBlacklisted(jti) {
  if (!isValidJti(jti)) {
    return false;
  }

  const exists = await redisClient.exists(getBlacklistKey(jti));

  return exists === 1;
}

// =========================================================
// REMOVE BLACKLIST ENTRY
// =========================================================

/**
 * Remove a token from the blacklist.
 *
 * Normally this is unnecessary because Redis automatically
 * removes the entry after its TTL.
 *
 * Useful for administrative/security operations.
 *
 * @param {string} jti
 * @returns {Promise<boolean>}
 */
async function removeBlacklistedAccessToken(jti) {
  if (!isValidJti(jti)) {
    return false;
  }

  const deleted = await redisClient.del(getBlacklistKey(jti));

  return deleted > 0;
}

// =========================================================
// EXPORT
// =========================================================

module.exports = {
  blacklistAccessToken,
  isAccessTokenBlacklisted,
  removeBlacklistedAccessToken,
};
