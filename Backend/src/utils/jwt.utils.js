const crypto = require("crypto");
const jwt = require("jsonwebtoken");

// =========================================================
// ACCESS TOKEN CONFIGURATION
// =========================================================

/**
 * Short lifetime for access tokens.
 *
 * Example:
 * ACCESS_TOKEN_EXPIRES_IN=15m
 *
 * @type {string}
 */
const ACCESS_TOKEN_EXPIRES_IN = process.env.ACCESS_TOKEN_EXPIRES_IN || "15m";

// =========================================================
// GENERATE ACCESS TOKEN
// =========================================================

/**
 * Generates a short-lived JWT access token.
 *
 * The access token contains:
 * - User ID
 * - Username
 * - Redis session ID
 * - Unique JWT ID (jti)
 *
 * The token is later verified by:
 *
 * middleware/auth.middleware.js
 *
 * Authentication flow:
 *
 * Login
 *   ↓
 * createSession()
 *   ↓
 * generateToken()
 *   ↓
 * accessToken cookie
 *   ↓
 * authMiddleware
 *   ↓
 * JWT verification
 *   ↓
 * Redis session verification
 *
 * @param {Object} user
 * @param {string} sessionId
 * @returns {string} Signed JWT access token
 * @throws {Error} If JWT secret or session ID is missing
 */
function generateToken(user, sessionId) {
  // -------------------------------------------------------
  // Validate JWT secret
  // -------------------------------------------------------

  if (!process.env.JWT_SECRET_KEY) {
    throw new Error("JWT_SECRET_KEY is missing from .env");
  }

  // -------------------------------------------------------
  // Validate Redis session ID
  // -------------------------------------------------------

  if (!sessionId) {
    throw new Error("sessionId is required to generate access token");
  }

  // -------------------------------------------------------
  // Generate unique JWT ID
  // -------------------------------------------------------

  const jti = crypto.randomUUID();

  // -------------------------------------------------------
  // Create JWT
  // -------------------------------------------------------

  return jwt.sign(
    {
      // MongoDB user ID
      id: user._id,

      // Username
      username: user.username,

      // Redis session ID
      sessionId,

      // Unique token identifier
      jti,
    },

    // JWT signing secret
    process.env.JWT_SECRET_KEY,

    {
      // Short-lived access token
      expiresIn: ACCESS_TOKEN_EXPIRES_IN,

      // JWT issuer
      issuer: process.env.JWT_ISSUER || "ai-interview",

      // JWT audience
      audience: process.env.JWT_AUDIENCE || "ai-interview-client",
    },
  );
}

// =========================================================
// EXPORT
// =========================================================

module.exports = {
  generateToken,
};
