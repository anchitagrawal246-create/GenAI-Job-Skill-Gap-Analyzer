const UserModel = require("../model/user.model");
const jwt = require("jsonwebtoken");

const { redisClient } = require("../config/redis");

const { hashOTP } = require("../utils/otp.utils");

const { verifyOTP, deleteOTP } = require("../services/recovery.service");

// =========================================================
// HELPER FUNCTIONS
// =========================================================

/**
 * Escape special characters before using a value
 * inside a MongoDB regular expression.
 *
 * @param {string} value
 * @returns {string}
 */
function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Generate JWT token.
 *
 * @param {Object} user
 * @returns {string}
 */
function generateToken(user) {
  if (!process.env.JWT_SECRET_KEY) {
    throw new Error("JWT_SECRET_KEY is missing from .env");
  }

  return jwt.sign(
    {
      id: user._id,
      username: user.username,
    },
    process.env.JWT_SECRET_KEY,
    {
      expiresIn: "1d",
    },
  );
}

/**
 * Set authentication cookie.
 *
 * @param {Object} res
 * @param {string} token
 */
function setAuthCookie(res, token) {
  const isProduction = process.env.NODE_ENV === "production";

  res.cookie("token", token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge: 24 * 60 * 60 * 1000,
  });
}

// =========================================================
// VERIFY REGISTRATION
// =========================================================

/**
 * @name VerifyRegistrationController
 * @route POST /api/auth/verify-registration
 * @description
 * Verifies registration OTP, creates the MongoDB user,
 * removes temporary Redis data and logs the user in.
 *
 * @access Public
 */
async function VerifyRegistrationController(req, res) {
  try {
    // =====================================================
    // 1. GET REQUEST DATA
    // =====================================================

    const { email, otp } = req.body || {};

    // =====================================================
    // 2. VALIDATE REQUEST
    // =====================================================

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required",
      });
    }

    // =====================================================
    // 3. NORMALIZE VALUES
    // =====================================================

    const normalizedEmail = email.toString().trim().toLowerCase();

    const cleanOTP = otp.toString().trim();

    // =====================================================
    // 4. VALIDATE OTP FORMAT
    // =====================================================

    if (!/^\d{6}$/.test(cleanOTP)) {
      return res.status(400).json({
        success: false,
        message: "OTP must be a 6-digit number",
      });
    }

    // =====================================================
    // 5. REGISTRATION ID
    // =====================================================

    const registrationId = normalizedEmail;

    // =====================================================
    // 6. REGISTRATION DATA KEY
    // =====================================================

    const registrationDataKey = `register:data:${normalizedEmail}`;

    // =====================================================
    // 7. HASH USER OTP
    // =====================================================

    const submittedOTPHash = hashOTP(cleanOTP);

    // =====================================================
    // 8. VERIFY OTP USING RECOVERY SERVICE
    // =====================================================

    const otpResult = await verifyOTP({
      userId: registrationId,
      purpose: "REGISTER",
      otpHash: submittedOTPHash,
    });

    // =====================================================
    // 9. OTP EXPIRED
    // =====================================================

    if (!otpResult.success && otpResult.reason === "EXPIRED") {
      return res.status(400).json({
        success: false,
        message: "OTP expired or not found. Please request a new OTP.",
      });
    }

    // =====================================================
    // 10. MAXIMUM ATTEMPTS
    // =====================================================

    if (!otpResult.success && otpResult.reason === "MAX_ATTEMPTS") {
      return res.status(429).json({
        success: false,
        message: "Maximum OTP attempts exceeded. Please request a new OTP.",
      });
    }

    // =====================================================
    // 11. INVALID OTP
    // =====================================================

    if (!otpResult.success && otpResult.reason === "INVALID") {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
        attemptsRemaining: otpResult.attemptsRemaining,
      });
    }

    // =====================================================
    // 12. UNKNOWN OTP FAILURE
    // =====================================================

    if (!otpResult.success) {
      return res.status(400).json({
        success: false,
        message: "OTP verification failed",
      });
    }

    // =====================================================
    // 13. GET REGISTRATION DATA
    // =====================================================

    const registrationData = await redisClient.get(registrationDataKey);

    // =====================================================
    // 14. REGISTRATION DATA EXPIRED
    // =====================================================

    if (!registrationData) {
      // OTP has already been verified,
      // so prevent it from being reused.
      await deleteOTP(otpResult.key);

      return res.status(400).json({
        success: false,
        message: "Registration session expired. Please register again.",
      });
    }

    // =====================================================
    // 15. PARSE REGISTRATION DATA
    // =====================================================

    let parsedData;

    try {
      parsedData = JSON.parse(registrationData);
    } catch (parseError) {
      console.error("Registration Data Parse Error:", parseError);

      await deleteOTP(otpResult.key);

      await redisClient.del(registrationDataKey);

      return res.status(400).json({
        success: false,
        message: "Invalid registration session. Please register again.",
      });
    }

    // =====================================================
    // 16. GET USER DATA
    // =====================================================

    const username = parsedData.username?.toString().trim();

    const password = parsedData.password;

    // =====================================================
    // 17. VALIDATE REGISTRATION DATA
    // =====================================================

    if (!username || !password) {
      await deleteOTP(otpResult.key);

      await redisClient.del(registrationDataKey);

      return res.status(400).json({
        success: false,
        message: "Registration data is incomplete. Please register again.",
      });
    }

    // =====================================================
    // 18. CHECK EXISTING USER AGAIN
    // =====================================================

    const existingUser = await UserModel.findOne({
      $or: [
        {
          username: {
            $regex: `^${escapeRegex(username)}$`,
            $options: "i",
          },
        },
        {
          email: normalizedEmail,
        },
      ],
    });

    // =====================================================
    // 19. HANDLE EXISTING USER
    // =====================================================

    if (existingUser) {
      // Remove consumed registration data.
      await deleteOTP(otpResult.key);

      await redisClient.del(registrationDataKey);

      if (
        existingUser.username &&
        existingUser.username.toLowerCase() === username.toLowerCase()
      ) {
        return res.status(400).json({
          success: false,
          message: "Username already exists",
        });
      }

      if (
        existingUser.email &&
        existingUser.email.toLowerCase() === normalizedEmail
      ) {
        return res.status(400).json({
          success: false,
          message: "Email already exists",
        });
      }

      return res.status(400).json({
        success: false,
        message: "User already exists",
      });
    }

    // =====================================================
    // 20. CHECK JWT SECRET
    // =====================================================

    if (!process.env.JWT_SECRET_KEY) {
      console.error("JWT_SECRET_KEY is missing from .env");

      return res.status(500).json({
        success: false,
        message: "JWT configuration is missing",
      });
    }

    // =====================================================
    // 21. CREATE USER
    // =====================================================

    /*
     * Password was already hashed during registration.
     *
     * DO NOT bcrypt.hash() again here.
     */

    const user = await UserModel.create({
      username,
      email: normalizedEmail,
      password,
      isEmailVerified: true,
    });

    console.log("User created successfully:", user._id.toString());

    // =====================================================
    // 22. DELETE TEMPORARY REDIS DATA
    // =====================================================

    await deleteOTP(otpResult.key);

    await redisClient.del(registrationDataKey);

    console.log("Temporary registration data deleted.");

    // =====================================================
    // 23. GENERATE JWT
    // =====================================================

    const token = generateToken(user);

    // =====================================================
    // 24. SET AUTH COOKIE
    // =====================================================

    setAuthCookie(res, token);

    // =====================================================
    // 25. SUCCESS
    // =====================================================

    return res.status(201).json({
      success: true,
      message: "Email verified and user registered successfully",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        isEmailVerified: user.isEmailVerified,
      },
    });
  } catch (error) {
    console.error("Verify Registration Error:", error);

    // =====================================================
    // MONGODB DUPLICATE KEY ERROR
    // =====================================================

    if (error.code === 11000) {
      if (error.keyPattern?.email) {
        return res.status(400).json({
          success: false,
          message: "Email already exists",
        });
      }

      if (error.keyPattern?.username) {
        return res.status(400).json({
          success: false,
          message: "Username already exists",
        });
      }
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

// =========================================================
// EXPORT
// =========================================================

module.exports = {
  VerifyRegistrationController,
};
