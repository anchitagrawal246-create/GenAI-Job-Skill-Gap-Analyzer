const UserModel = require("../../model/user.model");

const {
  verifySession,
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
 * Then rotates the refresh token.
 */
async function RefreshTokenController(req, res) {
  try {
    const refreshToken = req.cookies?.refreshToken;

    const sessionId = req.cookies?.sessionId;

    // Missing cookies.
    if (!refreshToken || !sessionId) {
      clearAuthCookies(res);

      return res.status(401).json({
        success: false,
        message: "Refresh session is missing or expired",
      });
    }

    // Verify Redis session.
    const session = await verifySession({
      sessionId,
      refreshToken,
    });

    if (!session) {
      clearAuthCookies(res);

      return res.status(401).json({
        success: false,
        message: "Invalid or expired refresh session",
      });
    }

    // Find user.
    const user = await UserModel.findById(session.userId);

    if (!user) {
      await destroySession(sessionId);

      clearAuthCookies(res);

      return res.status(401).json({
        success: false,
        message: "User account no longer exists",
      });
    }

    // Security check.
    if (user.isEmailVerified !== true) {
      await destroySession(sessionId);

      clearAuthCookies(res);

      return res.status(403).json({
        success: false,
        message: "Email verification is required",
      });
    }

    // Rotate refresh token.
    const rotated = await rotateRefreshToken({
      sessionId,
      currentRefreshToken: refreshToken,
    });

    if (!rotated) {
      clearAuthCookies(res);

      return res.status(401).json({
        success: false,
        message: "Refresh token is no longer valid",
      });
    }

    // Create new access token.
    const accessToken = generateToken(user, sessionId);

    // Update cookies.
    setAuthCookies(res, accessToken, rotated.refreshToken, sessionId);

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
    });
  }
}

module.exports = {
  RefreshTokenController,
};
