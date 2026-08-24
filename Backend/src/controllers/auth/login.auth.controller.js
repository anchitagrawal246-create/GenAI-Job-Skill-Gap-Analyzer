const bcrypt = require("bcryptjs");

const UserModel = require("../../model/user.model");

const { createSession } = require("../../services/session.service");

const { generateToken } = require("../../utils/jwt.utils");

const { setAuthCookies } = require("../../utils/cookie.utils");

/**
 * Login user.
 *
 * Route:
 * POST /api/auth/login
 *
 * Flow:
 *
 * Email + Password
 *       ↓
 * Find user
 *       ↓
 * Compare password
 *       ↓
 * Check email verification
 *       ↓
 * Create Redis session
 *       ↓
 * Create JWT with:
 *   - user ID
 *   - username
 *   - session ID
 *   - unique jti
 *       ↓
 * Set cookies
 */
async function LoginUserController(req, res) {
  try {
    // =====================================================
    // 1. GET LOGIN DATA
    // =====================================================

    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide email and password",
      });
    }

    // =====================================================
    // 2. NORMALIZE EMAIL
    // =====================================================

    const normalizedEmail = email.toString().trim().toLowerCase();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address",
      });
    }

    // =====================================================
    // 3. FIND USER
    // =====================================================

    const user = await UserModel.findOne({
      email: normalizedEmail,
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Email is wrong",
      });
    }

    // =====================================================
    // 4. COMPARE PASSWORD
    // =====================================================

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        message: "Password is wrong",
      });
    }

    // =====================================================
    // 5. CHECK EMAIL VERIFICATION
    // =====================================================

    if (user.isEmailVerified !== true) {
      return res.status(403).json({
        success: false,
        message: "Please verify your email first",
      });
    }

    // =====================================================
    // 6. REQUEST INFORMATION
    // =====================================================

    const userAgent = req.get("user-agent") || "";

    const ip = req.ip || req.socket?.remoteAddress || "";

    // =====================================================
    // 7. CREATE REDIS SESSION
    // =====================================================

    const session = await createSession({
      userId: user._id.toString(),
      userAgent,
      ip,
    });

    // =====================================================
    // 8. CREATE ACCESS TOKEN
    // =====================================================

    const accessToken = generateToken(user, session.sessionId);

    // =====================================================
    // 9. SET AUTH COOKIES
    // =====================================================

    setAuthCookies(res, accessToken, session.refreshToken, session.sessionId);

    // =====================================================
    // 10. RESPONSE
    // =====================================================

    return res.status(200).json({
      success: true,
      message: "User logged in successfully",

      user: {
        id: user._id,
        username: user.username,
        email: user.email,
      },

      session: {
        expiresAt: session.expiresAt,
      },
    });
  } catch (error) {
    console.error("Login Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

module.exports = {
  LoginUserController,
};
