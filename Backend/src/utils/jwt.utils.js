const jwt = require("jsonwebtoken");

// =========================================================
// ACCESS TOKEN CONFIGURATION
// =========================================================

/**
 * Short-lived access token lifetime.
 *
 * Example:
 * ACCESS_TOKEN_EXPIRES_IN=15m
 */
const ACCESS_TOKEN_EXPIRES_IN = process.env.ACCESS_TOKEN_EXPIRES_IN || "15m";

/**
 * JWT issuer.
 */
const JWT_ISSUER = process.env.JWT_ISSUER || "ai-interview";

/**
 * JWT audience.
 */
const JWT_AUDIENCE = process.env.JWT_AUDIENCE || "ai-interview-client";

// =========================================================
// JWT SECRET
// =========================================================

/**
 * Get and validate JWT signing secret.
 *
 * @returns {string}
 * @throws {Error}
 */
function getJwtSecret() {
  const secret = process.env.JWT_SECRET_KEY;

  if (!secret) {
    throw new Error("JWT_SECRET_KEY is missing from .env");
  }

  if (typeof secret !== "string") {
    throw new Error("JWT_SECRET_KEY must be a string");
  }

  if (secret.length < 32) {
    throw new Error("JWT_SECRET_KEY must be at least 32 characters long");
  }

  return secret;
}

// =========================================================
// GENERATE ACCESS TOKEN
// =========================================================

/**
 * Generates a short-lived JWT access token.
 *
 * Access token contains:
 *
 * - id
 * - username
 * - sessionId
 * - jti
 *
 * The refresh token is NEVER placed inside the JWT.
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
 * @returns {string}
 * @throws {Error}
 */
function generateToken(user, sessionId) {
  // -------------------------------------------------------
  // Validate user
  // -------------------------------------------------------

  if (!user) {
    throw new Error("User is required to generate access token");
  }

  if (!user._id) {
    throw new Error("User ID is required to generate access token");
  }

  // -------------------------------------------------------
  // Validate session ID
  // -------------------------------------------------------

  if (!sessionId || typeof sessionId !== "string") {
    throw new Error("sessionId is required to generate access token");
  }

  // -------------------------------------------------------
  // Get JWT secret
  // -------------------------------------------------------

  const secret = getJwtSecret();

  // -------------------------------------------------------
  // JWT payload
  // -------------------------------------------------------

  const payload = {
    // MongoDB user ID
    id: String(user._id),

    // Username
    username: typeof user.username === "string" ? user.username : undefined,

    // Redis authentication session
    sessionId,
  };

  // -------------------------------------------------------
  // Create JWT
  // -------------------------------------------------------

  return jwt.sign(payload, secret, {
    // Short-lived access token
    expiresIn: ACCESS_TOKEN_EXPIRES_IN,

    // JWT issuer
    issuer: JWT_ISSUER,

    // JWT audience
    audience: JWT_AUDIENCE,

    /*
     * jsonwebtoken generates the jti claim.
     *
     * After verification:
     *
     * decoded.jti
     *
     * will be available to auth.middleware.js.
     */
    jwtid: require("crypto").randomUUID(),
  });
}

// =========================================================
// VERIFY ACCESS TOKEN
// =========================================================

/**
 * Verify an access token.
 *
 * This function centralizes JWT verification configuration
 * so middleware does not need to duplicate the secret,
 * issuer and audience configuration.
 *
 * @param {string} accessToken
 * @returns {Object}
 * @throws {Error}
 */
function verifyToken(accessToken) {
  // -------------------------------------------------------
  // Validate token
  // -------------------------------------------------------

  if (!accessToken || typeof accessToken !== "string") {
    throw new Error("Access token is required");
  }

  // -------------------------------------------------------
  // Get JWT secret
  // -------------------------------------------------------

  const secret = getJwtSecret();

  // -------------------------------------------------------
  // Verify JWT
  // -------------------------------------------------------

  return jwt.verify(accessToken, secret, {
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  });
}

// =========================================================
// EXPORT
// =========================================================

module.exports = {
  ACCESS_TOKEN_EXPIRES_IN,
  JWT_ISSUER,
  JWT_AUDIENCE,

  generateToken,
  verifyToken,
};
