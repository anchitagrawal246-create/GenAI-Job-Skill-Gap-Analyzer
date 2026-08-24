const jwt = require("jsonwebtoken");

const { verifyAccessSession } = require("../services/session.service");

const {
  isAccessTokenBlacklisted,
} = require("../services/tokenBlacklist.service");

// =========================================================
// JWT CONFIGURATION
// =========================================================

const JWT_ISSUER = process.env.JWT_ISSUER || "ai-interview";

const JWT_AUDIENCE = process.env.JWT_AUDIENCE || "ai-interview-client";

// =========================================================
// AUTH MIDDLEWARE
// =========================================================

/**
 * Authentication middleware.
 *
 * Authentication flow:
 *
 * Browser
 *    │
 *    │ accessToken HttpOnly cookie
 *    ▼
 * JWT verification
 *    │
 *    ▼
 * JWT payload validation
 *    │
 *    ▼
 * Access-token blacklist check
 *    │
 *    ▼
 * Redis session verification
 *    │
 *    ▼
 * JWT user/session consistency check
 *    │
 *    ▼
 * req.user + req.session
 *
 * IMPORTANT:
 *
 * - Only the access token is used here.
 * - Refresh token is NOT used here.
 * - Redis session must still be active.
 * - Blacklisted access tokens are rejected.
 * - Expired access tokens return ACCESS_TOKEN_EXPIRED.
 * - Frontend should then call POST /api/auth/refresh.
 */
async function authMiddleware(req, res, next) {
  try {
    // =====================================================
    // 1. GET ACCESS TOKEN
    // =====================================================

    const accessToken = req.cookies?.accessToken;

    if (!accessToken) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
        code: "ACCESS_TOKEN_MISSING",
      });
    }

    // =====================================================
    // 2. JWT SECRET CHECK
    // =====================================================

    if (!process.env.JWT_SECRET_KEY) {
      console.error("JWT_SECRET_KEY is missing from environment variables");

      return res.status(500).json({
        success: false,
        message: "Authentication configuration error",
        code: "AUTH_CONFIG_ERROR",
      });
    }

    // =====================================================
    // 3. VERIFY ACCESS TOKEN
    // =====================================================

    let decoded;

    try {
      decoded = jwt.verify(accessToken, process.env.JWT_SECRET_KEY, {
        issuer: JWT_ISSUER,
        audience: JWT_AUDIENCE,
      });
    } catch (error) {
      // ---------------------------------------------------
      // Access token expired
      // ---------------------------------------------------

      if (error.name === "TokenExpiredError") {
        return res.status(401).json({
          success: false,
          message: "Access token expired",
          code: "ACCESS_TOKEN_EXPIRED",
        });
      }

      // ---------------------------------------------------
      // Invalid / malformed / wrong signature
      // ---------------------------------------------------

      if (
        error.name === "JsonWebTokenError" ||
        error.name === "NotBeforeError"
      ) {
        return res.status(401).json({
          success: false,
          message: "Invalid access token",
          code: "ACCESS_TOKEN_INVALID",
        });
      }

      // Unknown JWT verification failure
      console.error("JWT verification error:", error);

      return res.status(401).json({
        success: false,
        message: "Invalid access token",
        code: "ACCESS_TOKEN_INVALID",
      });
    }

    // =====================================================
    // 4. VALIDATE JWT PAYLOAD
    // =====================================================

    if (!decoded || typeof decoded !== "object") {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication session",
        code: "INVALID_SESSION_PAYLOAD",
      });
    }

    const { id, username, sessionId, jti } = decoded;

    // -----------------------------------------------------
    // Required claims
    // -----------------------------------------------------

    if (!id || !sessionId || !jti || !username) {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication session",
        code: "INVALID_SESSION_PAYLOAD",
      });
    }

    // -----------------------------------------------------
    // Validate claim types
    // -----------------------------------------------------

    if (typeof id !== "string" && typeof id !== "object") {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication session",
        code: "INVALID_SESSION_PAYLOAD",
      });
    }

    if (
      typeof sessionId !== "string" ||
      typeof jti !== "string" ||
      typeof username !== "string"
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication session",
        code: "INVALID_SESSION_PAYLOAD",
      });
    }

    // =====================================================
    // 5. CHECK ACCESS TOKEN BLACKLIST
    // =====================================================

    const blacklisted = await isAccessTokenBlacklisted(jti);

    if (blacklisted) {
      return res.status(401).json({
        success: false,
        message: "Access token has been revoked",
        code: "ACCESS_TOKEN_REVOKED",
      });
    }

    // =====================================================
    // 6. VERIFY REDIS SESSION
    // =====================================================

    const session = await verifyAccessSession(sessionId);

    if (!session) {
      return res.status(401).json({
        success: false,
        message: "Session expired or revoked",
        code: "SESSION_INVALID",
      });
    }

    // =====================================================
    // 7. VERIFY SESSION USER
    // =====================================================

    if (String(session.userId) !== String(id)) {
      console.error("Session/User mismatch detected", {
        tokenUserId: id,
        sessionUserId: session.userId,
        sessionId,
        jti,
      });

      return res.status(401).json({
        success: false,
        message: "Invalid authentication session",
        code: "SESSION_USER_MISMATCH",
      });
    }

    // =====================================================
    // 8. VERIFY SESSION ID CONSISTENCY
    // =====================================================

    if (!session.sessionId || String(session.sessionId) !== String(sessionId)) {
      console.error("Session ID mismatch detected", {
        tokenSessionId: sessionId,
        redisSessionId: session.sessionId,
        userId: id,
        jti,
      });

      return res.status(401).json({
        success: false,
        message: "Invalid authentication session",
        code: "SESSION_ID_MISMATCH",
      });
    }

    // =====================================================
    // 9. ATTACH AUTHENTICATED USER
    // =====================================================

    req.user = {
      id,
      username,
      sessionId,
      jti,
    };

    // =====================================================
    // 10. ATTACH REDIS SESSION
    // =====================================================

    req.session = session;

    // =====================================================
    // 11. CONTINUE REQUEST
    // =====================================================

    return next();
  } catch (error) {
    // =====================================================
    // UNEXPECTED AUTHENTICATION ERROR
    // =====================================================

    console.error("Auth Middleware Error:", error);

    return res.status(401).json({
      success: false,
      message: "Authentication failed",
      code: "AUTHENTICATION_FAILED",
    });
  }
}

// =========================================================
// EXPORT
// =========================================================

module.exports = authMiddleware;
