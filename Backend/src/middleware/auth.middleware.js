const jwt = require("jsonwebtoken");

const { verifyAccessSession } = require("../services/session.service");

// =========================================================
// AUTH MIDDLEWARE
// =========================================================

/**
 * Authentication middleware
 *
 * Flow:
 *
 * Browser
 *   │
 *   │ accessToken cookie
 *   ▼
 * JWT verification
 *   │
 *   ▼
 * sessionId extracted from JWT
 *   │
 *   ▼
 * Redis session verification
 *   │
 *   ▼
 * req.user
 *
 * IMPORTANT:
 * Access token is short-lived.
 *
 * Refresh token is NOT used here.
 *
 * If accessToken expires, the frontend should call:
 *
 * POST /api/auth/refresh
 *
 * and receive a new access token.
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
      console.error("JWT_SECRET_KEY is missing from .env");

      return res.status(500).json({
        success: false,
        message: "Authentication configuration error",
      });
    }

    // =====================================================
    // 3. VERIFY ACCESS TOKEN
    // =====================================================

    let decoded;

    try {
      decoded = jwt.verify(accessToken, process.env.JWT_SECRET_KEY, {
        issuer: process.env.JWT_ISSUER || "ai-interview",

        audience: process.env.JWT_AUDIENCE || "ai-interview-client",
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
      // Invalid token
      // ---------------------------------------------------

      return res.status(401).json({
        success: false,
        message: "Invalid access token",
        code: "ACCESS_TOKEN_INVALID",
      });
    }

    // =====================================================
    // 4. VALIDATE JWT PAYLOAD
    // =====================================================

    if (!decoded || !decoded.id || !decoded.sessionId || !decoded.jti) {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication session",
        code: "INVALID_SESSION_PAYLOAD",
      });
    }

    // =====================================================
    // 5. VERIFY REDIS SESSION
    // =====================================================

    const session = await verifyAccessSession(decoded.sessionId);

    if (!session) {
      return res.status(401).json({
        success: false,
        message: "Session expired or revoked",
        code: "SESSION_INVALID",
      });
    }

    // =====================================================
    // 6. MAKE SURE JWT USER MATCHES SESSION USER
    // =====================================================

    if (session.userId.toString() !== decoded.id.toString()) {
      console.error("Session/User mismatch detected", {
        tokenUserId: decoded.id,

        sessionUserId: session.userId,

        sessionId: decoded.sessionId,
      });

      return res.status(401).json({
        success: false,
        message: "Invalid authentication session",
        code: "SESSION_USER_MISMATCH",
      });
    }

    // =====================================================
    // 7. ATTACH AUTH USER
    // =====================================================

    req.user = {
      id: decoded.id,

      username: decoded.username,

      sessionId: decoded.sessionId,

      jti: decoded.jti,
    };

    // =====================================================
    // 8. ATTACH SESSION
    // =====================================================

    req.session = session;

    // =====================================================
    // 9. CONTINUE
    // =====================================================

    return next();
  } catch (error) {
    console.error("Auth Middleware Error:", error);

    return res.status(401).json({
      success: false,
      message: "Authentication failed",
      code: "AUTHENTICATION_FAILED",
    });
  }
}

module.exports = authMiddleware;
