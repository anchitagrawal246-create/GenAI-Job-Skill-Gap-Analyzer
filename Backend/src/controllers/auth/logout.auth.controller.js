const jwt = require("jsonwebtoken");

const {
  destroySession,
  destroyAllUserSessions,
} = require("../../services/session.service");

const {
  blacklistAccessToken,
} = require("../../services/tokenBlacklist.service");

const { clearAuthCookies } = require("../../utils/cookie.utils");

// =========================================================
// JWT CONFIGURATION
// =========================================================

const JWT_ISSUER = process.env.JWT_ISSUER || "ai-interview";

const JWT_AUDIENCE = process.env.JWT_AUDIENCE || "ai-interview-client";

// =========================================================
// HELPER
// =========================================================

/**
 * Blacklist an access token until its original expiration.
 *
 * Logout should still succeed if the token is already expired
 * or invalid, so errors are intentionally swallowed here.
 */
async function blacklistCurrentAccessToken(accessToken) {
  if (!accessToken) {
    return false;
  }

  if (!process.env.JWT_SECRET_KEY) {
    console.error(
      "JWT_SECRET_KEY is missing while attempting token revocation",
    );

    return false;
  }

  try {
    const decoded = jwt.verify(accessToken, process.env.JWT_SECRET_KEY, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });

    if (
      !decoded ||
      typeof decoded !== "object" ||
      typeof decoded.jti !== "string" ||
      !decoded.jti
    ) {
      return false;
    }

    const now = Math.floor(Date.now() / 1000);

    const expiration = Number(decoded.exp) || 0;

    const remainingSeconds = expiration - now;

    // Token has already expired.
    // No blacklist entry is necessary.
    if (remainingSeconds <= 0) {
      return false;
    }

    return await blacklistAccessToken(decoded.jti, remainingSeconds);
  } catch (error) {
    /*
     * Logout must not fail simply because the access token
     * is expired, malformed, or already invalid.
     *
     * Redis session cleanup is still performed by the caller.
     */
    console.warn(
      "Could not blacklist access token during logout:",
      error.message,
    );

    return false;
  }
}

// =========================================================
// LOGOUT CURRENT DEVICE
// =========================================================

/**
 * Logout the current browser/device.
 *
 * Route:
 *   POST /api/auth/logout
 *
 * Access:
 *   Public
 *
 * Why public?
 *
 * Logout should work even when:
 * - access token is expired
 * - access token is invalid
 * - session is already missing
 *
 * Flow:
 *
 * accessToken cookie
 *       ↓
 * optional JWT blacklist
 *       ↓
 * sessionId cookie
 *       ↓
 * destroy Redis session
 *       ↓
 * clear authentication cookies
 */
async function LogoutUserController(req, res) {
  try {
    // =====================================================
    // 1. GET COOKIES
    // =====================================================

    const accessToken = req.cookies?.accessToken;
    const sessionId = req.cookies?.sessionId;

    // =====================================================
    // 2. BLACKLIST CURRENT ACCESS TOKEN
    // =====================================================

    /*
     * This is best-effort.
     *
     * If the access token is already expired, there is
     * nothing useful to blacklist.
     */
    await blacklistCurrentAccessToken(accessToken);

    // =====================================================
    // 3. DESTROY REDIS SESSION
    // =====================================================

    if (sessionId) {
      try {
        await destroySession(sessionId);
      } catch (sessionError) {
        console.error("Logout session destruction error:", sessionError);

        /*
         * Continue to cookie cleanup.
         *
         * We do not want authentication cookies to remain
         * in the browser simply because Redis failed.
         */
      }
    }

    // =====================================================
    // 4. CLEAR AUTH COOKIES
    // =====================================================

    clearAuthCookies(res);

    // =====================================================
    // 5. SUCCESS
    // =====================================================

    return res.status(200).json({
      success: true,
      message: "User logged out successfully",
    });
  } catch (error) {
    console.error("Logout Error:", error);

    // Always attempt local authentication cleanup.
    clearAuthCookies(res);

    return res.status(500).json({
      success: false,
      message: "Logout completed locally, but server session cleanup failed",
      code: "LOGOUT_CLEANUP_ERROR",
    });
  }
}

// =========================================================
// LOGOUT ALL DEVICES
// =========================================================

/**
 * Logout all devices for the authenticated user.
 *
 * Route:
 *   POST /api/auth/logout-all
 *
 * Access:
 *   Private
 *
 * Middleware:
 *   authMiddleware
 *
 * Required:
 *   req.user.id
 *
 * Flow:
 *
 * authMiddleware
 *       ↓
 * req.user.id
 *       ↓
 * destroyAllUserSessions()
 *       ↓
 * clear current browser cookies
 *
 * Destroying all Redis sessions immediately invalidates
 * access tokens belonging to those sessions.
 */
async function LogoutAllDevicesController(req, res) {
  try {
    // =====================================================
    // 1. VERIFY AUTHENTICATED USER
    // =====================================================

    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
        code: "UNAUTHORIZED",
      });
    }

    // =====================================================
    // 2. DESTROY ALL USER SESSIONS
    // =====================================================

    const deletedCount = await destroyAllUserSessions(req.user.id);

    // =====================================================
    // 3. CLEAR CURRENT BROWSER COOKIES
    // =====================================================

    clearAuthCookies(res);

    // =====================================================
    // 4. SUCCESS
    // =====================================================

    return res.status(200).json({
      success: true,
      message: "All sessions have been logged out",
      sessionsRevoked: deletedCount,
    });
  } catch (error) {
    console.error("Logout All Devices Error:", error);

    // Always remove current browser authentication cookies.
    clearAuthCookies(res);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
      code: "LOGOUT_ALL_ERROR",
    });
  }
}

// =========================================================
// EXPORT
// =========================================================

module.exports = {
  LogoutUserController,
  LogoutAllDevicesController,
};
