const UserModel = require("../../model/user.model");

const {
  rotateRefreshToken,
  destroySession,
} = require("../../services/session.service");

const { generateToken } = require("../../utils/jwt.utils");

const {
  setAuthCookies,
  clearAuthCookies,
} = require("../../utils/cookie.utils");

/**
 * Refresh access token.
 *
 * Route:
 * POST /api/auth/refresh
 *
 * Uses:
 * - refreshToken cookie
 * - sessionId cookie
 *
 * Flow:
 *
 * refreshToken + sessionId
 *          ↓
 *    Redis session
 *          ↓
 *    verify + rotate
 *          ↓
 *  new refresh token
 *          ↓
 *   new access token
 *          ↓
 *      new cookies
 */
async function RefreshTokenController(req, res) {
  try {
    // =====================================================
    // 1. GET REFRESH COOKIES
    // =====================================================

    const refreshToken = req.cookies?.refreshToken;

    const sessionId = req.cookies?.sessionId;

    // =====================================================
    // 2. CHECK REQUIRED COOKIES
    // =====================================================

    if (!refreshToken || !sessionId) {
      clearAuthCookies(res);

      return res.status(401).json({
        success: false,
        message: "Refresh session is missing or expired",
        code: "REFRESH_SESSION_MISSING",
      });
    }

    // =====================================================
    // 3. ROTATE REFRESH TOKEN
    // =====================================================
    //
    // IMPORTANT:
    // rotateRefreshToken() must verify the current
    // refresh token and replace its hash.
    //
    // Ideally this operation should be atomic in Redis.
    //

    const rotated = await rotateRefreshToken({
      sessionId,
      currentRefreshToken: refreshToken,
    });

    if (!rotated) {
      // Invalid refresh token/session.
      //
      // Destroy the session so a potentially compromised
      // refresh session cannot continue being used.

      await destroySession(sessionId);

      clearAuthCookies(res);

      return res.status(401).json({
        success: false,
        message: "Refresh token is no longer valid",
        code: "REFRESH_TOKEN_INVALID",
      });
    }

    // =====================================================
    // 4. FIND USER
    // =====================================================

    const user = await UserModel.findById(rotated.userId);

    if (!user) {
      await destroySession(sessionId);

      clearAuthCookies(res);

      return res.status(401).json({
        success: false,
        message: "User account no longer exists",
        code: "USER_NOT_FOUND",
      });
    }

    // =====================================================
    // 5. CHECK EMAIL VERIFICATION
    // =====================================================

    if (user.isEmailVerified !== true) {
      await destroySession(sessionId);

      clearAuthCookies(res);

      return res.status(403).json({
        success: false,
        message: "Email verification is required",
        code: "EMAIL_NOT_VERIFIED",
      });
    }

    // =====================================================
    // 6. GENERATE NEW ACCESS TOKEN
    // =====================================================

    const accessToken = generateToken(user, sessionId);

    // =====================================================
    // 7. UPDATE AUTH COOKIES
    // =====================================================

    setAuthCookies(res, accessToken, rotated.refreshToken, sessionId);

    // =====================================================
    // 8. SUCCESS
    // =====================================================

    return res.status(200).json({
      success: true,
      message: "Access token refreshed successfully",
      expiresAt: rotated.expiresAt,
    });
  } catch (error) {
    console.error("Refresh Token Error:", error);

    clearAuthCookies(res);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
      code: "REFRESH_TOKEN_ERROR",
    });
  }
}

module.exports = {
  RefreshTokenController,
};
