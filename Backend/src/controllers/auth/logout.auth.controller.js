const {
  destroySession,
  destroyAllUserSessions,
} = require("../../services/session.service");

const { clearAuthCookies } = require("../../utils/cookie.utils");

/**
 * Logout current device.
 *
 * Route:
 * POST /api/auth/logout
 *
 * Access:
 * Public
 */
async function LogoutUserController(req, res) {
  try {
    const sessionId = req.cookies?.sessionId;

    // Destroy current Redis session.
    if (sessionId) {
      await destroySession(sessionId);
    }

    // Clear browser cookies.
    clearAuthCookies(res);

    return res.status(200).json({
      success: true,
      message: "User logged out successfully",
    });
  } catch (error) {
    console.error("Logout Error:", error);

    // Even if Redis fails,
    // clear browser cookies.
    clearAuthCookies(res);

    return res.status(500).json({
      success: false,
      message: "Logout completed locally, but server session cleanup failed",
    });
  }
}

/**
 * Logout all devices.
 *
 * Route:
 * POST /api/auth/logout-all
 *
 * Access:
 * Private
 *
 * Requires:
 * req.user
 */
async function LogoutAllDevicesController(req, res) {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const deletedCount = await destroyAllUserSessions(req.user.id);

    clearAuthCookies(res);

    return res.status(200).json({
      success: true,
      message: "All sessions have been logged out",
      sessionsRevoked: deletedCount,
    });
  } catch (error) {
    console.error("Logout All Devices Error:", error);

    clearAuthCookies(res);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

module.exports = {
  LogoutUserController,
  LogoutAllDevicesController,
};
