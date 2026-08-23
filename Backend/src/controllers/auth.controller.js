const UserModel = require("../model/user.model");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// Built into Node.js — DO NOT npm install dns.promises
const dns = require("node:dns/promises");

const { redisClient } = require("../config/redis");

const { generateOTP, hashOTP } = require("../utils/otp.utils");

const { sendOTPEmail } = require("../services/email.service");

const {
  createOTP,
  isResendAllowed,
  setResendCooldown,
  getResendCooldown,
} = require("../services/recovery.service");

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

/**
 * Check whether an email domain has a valid mail server.
 *
 * IMPORTANT:
 * This checks the DOMAIN, not whether the exact mailbox exists.
 *
 * @param {string} email
 * @returns {Promise<boolean>}
 */
async function isEmailDomainValid(email) {
  try {
    const parts = email.split("@");

    if (parts.length !== 2) {
      return false;
    }

    const domain = parts[1].trim().toLowerCase();

    if (!domain) {
      return false;
    }

    // Try MX records first.
    try {
      const mxRecords = await dns.resolveMx(domain);

      if (Array.isArray(mxRecords) && mxRecords.length > 0) {
        return true;
      }
    } catch (mxError) {
      // Continue with A/AAAA lookup.
    }

    // Some valid domains may not have MX records.
    try {
      const addresses = await dns.lookup(domain, {
        all: true,
      });

      return Array.isArray(addresses) && addresses.length > 0;
    } catch (lookupError) {
      return false;
    }
  } catch (error) {
    return false;
  }
}

// =========================================================
// CHECK EMAIL
// =========================================================

/**
 * @name CheckEmailController
 * @route GET /api/auth/check-email
 * @description
 * Realtime checks whether an email is valid and available.
 *
 * This endpoint is intended for frontend realtime validation.
 *
 * @access Public
 */
async function CheckEmailController(req, res) {
  try {
    // =====================================================
    // 1. GET EMAIL
    // =====================================================

    const { email } = req.query || {};

    // =====================================================
    // 2. EMAIL REQUIRED
    // =====================================================

    if (!email) {
      return res.status(400).json({
        success: false,
        available: false,
        valid: false,
        exists: false,
        message: "Email is required",
      });
    }

    // =====================================================
    // 3. NORMALIZE EMAIL
    // =====================================================

    const normalizedEmail = email.toString().trim().toLowerCase();

    // =====================================================
    // 4. EMAIL FORMAT
    // =====================================================

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(normalizedEmail)) {
      return res.status(200).json({
        success: true,
        available: false,
        valid: false,
        exists: false,
        message: "Invalid email format",
      });
    }

    // =====================================================
    // 5. CHECK DATABASE
    // =====================================================

    const existingUser = await UserModel.findOne({
      email: normalizedEmail,
    }).select("_id");

    // =====================================================
    // 6. EMAIL ALREADY EXISTS
    // =====================================================

    if (existingUser) {
      return res.status(200).json({
        success: true,
        available: false,
        valid: true,
        exists: true,
        message: "Email already exists",
      });
    }

    // =====================================================
    // 7. EMAIL AVAILABLE
    // =====================================================

    return res.status(200).json({
      success: true,
      available: true,
      valid: true,
      exists: false,
      message: "Email is available",
    });
  } catch (error) {
    console.error("Check Email Error:", error);

    return res.status(500).json({
      success: false,
      available: false,
      valid: false,
      exists: false,
      message: "Internal server error",
    });
  }
}

// =========================================================
// REGISTER
// =========================================================

/**
 * @name RegisterUserController
 * @route POST /api/auth/register
 * @description
 * Temporarily stores registration information in Redis,
 * creates an OTP and sends the OTP to the user's email.
 *
 * MongoDB user is created only after OTP verification.
 *
 * @access Public
 */
async function RegisterUserController(req, res) {
  try {
    // =====================================================
    // 1. GET REQUEST DATA
    // =====================================================

    const { username, email, password } = req.body || {};

    // =====================================================
    // 2. VALIDATE REQUIRED FIELDS
    // =====================================================

    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide username, email and password",
      });
    }

    // =====================================================
    // 3. NORMALIZE VALUES
    // =====================================================

    const normalizedUsername = username.toString().trim();

    const normalizedEmail = email.toString().trim().toLowerCase();

    // =====================================================
    // 4. VALIDATE USERNAME
    // =====================================================

    if (normalizedUsername.length < 3) {
      return res.status(400).json({
        success: false,
        message: "Username must be at least 3 characters",
      });
    }

    // =====================================================
    // 5. VALIDATE EMAIL FORMAT
    // =====================================================

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address",
      });
    }

    // =====================================================
    // 6. VALIDATE EMAIL DOMAIN
    // =====================================================

    const emailDomainValid = await isEmailDomainValid(normalizedEmail);

    if (!emailDomainValid) {
      return res.status(400).json({
        success: false,
        message: "This email domain does not have a valid mail server",
      });
    }

    // =====================================================
    // 7. VALIDATE PASSWORD
    // =====================================================

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    // =====================================================
    // 8. CHECK EXISTING USER
    // =====================================================

    const existingUser = await UserModel.findOne({
      $or: [
        {
          username: {
            $regex: `^${escapeRegex(normalizedUsername)}$`,
            $options: "i",
          },
        },
        {
          email: normalizedEmail,
        },
      ],
    });

    if (existingUser) {
      // Username already exists
      if (
        existingUser.username &&
        existingUser.username.toLowerCase() === normalizedUsername.toLowerCase()
      ) {
        return res.status(400).json({
          success: false,
          message: "Username already exists",
        });
      }

      // Email already exists
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
    // 9. REGISTRATION ID
    // =====================================================

    const registrationId = normalizedEmail;

    // =====================================================
    // 10. CHECK RESEND COOLDOWN
    // =====================================================

    const resendAllowed = await isResendAllowed({
      userId: registrationId,
      purpose: "REGISTER",
    });

    if (!resendAllowed) {
      const remainingSeconds = await getResendCooldown({
        userId: registrationId,
        purpose: "REGISTER",
      });

      return res.status(429).json({
        success: false,
        message: `Please wait ${remainingSeconds} seconds before requesting another OTP`,
        remainingSeconds,
      });
    }

    // =====================================================
    // 11. HASH PASSWORD
    // =====================================================

    const hashedPassword = await bcrypt.hash(password, 10);

    // =====================================================
    // 12. GENERATE OTP
    // =====================================================

    const otp = generateOTP();

    const hashedOTP = hashOTP(otp);

    // =====================================================
    // 13. REGISTRATION DATA KEY
    // =====================================================

    const registrationDataKey = `register:data:${normalizedEmail}`;

    // =====================================================
    // 14. REGISTRATION DATA
    // =====================================================

    const registrationData = JSON.stringify({
      username: normalizedUsername,
      email: normalizedEmail,
      password: hashedPassword,
    });

    // =====================================================
    // 15. REMOVE OLD REGISTRATION DATA
    // =====================================================

    await redisClient.del(registrationDataKey);

    // =====================================================
    // 16. STORE REGISTRATION DATA
    // =====================================================

    await redisClient.set(registrationDataKey, registrationData, {
      EX: 10 * 60,
    });

    // =====================================================
    // 17. CREATE OTP
    // =====================================================

    const otpKey = await createOTP({
      userId: registrationId,
      purpose: "REGISTER",
      email: normalizedEmail,
      otpHash: hashedOTP,
    });

    console.log("Registration OTP created for:", normalizedEmail);

    console.log("OTP Redis key:", otpKey);

    // =====================================================
    // 18. SEND OTP EMAIL
    // =====================================================

    try {
      await sendOTPEmail({
        email: normalizedEmail,
        otp,
        purpose: "EMAIL_VERIFICATION",
      });
    } catch (emailError) {
      console.error("Registration OTP Email Error:", emailError);

      // Clean temporary registration data
      await redisClient.del(registrationDataKey);

      // Clean OTP data
      await redisClient.del(otpKey);

      return res.status(500).json({
        success: false,
        message: "Failed to send OTP email",
      });
    }

    // =====================================================
    // 19. START RESEND COOLDOWN
    // =====================================================

    await setResendCooldown({
      userId: registrationId,
      purpose: "REGISTER",
    });

    // =====================================================
    // 20. SUCCESS
    // =====================================================

    return res.status(200).json({
      success: true,
      message: "OTP sent successfully. Please verify your email.",
      email: normalizedEmail,
      resendAfter: 60,
    });
  } catch (error) {
    console.error("Register Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

// =========================================================
// LOGIN
// =========================================================

/**
 * @name LoginUserController
 * @route POST /api/auth/login
 * @description Authenticates a user using email and password.
 * @access Public
 */
async function LoginUserController(req, res) {
  try {
    // =====================================================
    // 1. GET REQUEST DATA
    // =====================================================

    const { email, password } = req.body || {};

    // =====================================================
    // 2. VALIDATE REQUIRED FIELDS
    // =====================================================

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide email and password",
      });
    }

    // =====================================================
    // 3. NORMALIZE EMAIL
    // =====================================================

    const normalizedEmail = email.toString().trim().toLowerCase();

    // =====================================================
    // 4. VALIDATE EMAIL FORMAT
    // =====================================================

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address",
      });
    }

    // =====================================================
    // 5. FIND USER
    // =====================================================

    const user = await UserModel.findOne({
      email: normalizedEmail,
    });

    // =====================================================
    // 6. EMAIL CHECK
    // =====================================================

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Email is wrong",
      });
    }

    // =====================================================
    // 7. PASSWORD CHECK
    // =====================================================

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        message: "Password is wrong",
      });
    }

    // =====================================================
    // 8. EMAIL VERIFICATION CHECK
    // =====================================================

    if (user.isEmailVerified !== true) {
      return res.status(403).json({
        success: false,
        message: "Please verify your email first",
      });
    }

    // =====================================================
    // 9. GENERATE JWT
    // =====================================================

    const token = generateToken(user);

    // =====================================================
    // 10. SET AUTH COOKIE
    // =====================================================

    setAuthCookie(res, token);

    // =====================================================
    // 11. SUCCESS
    // =====================================================

    return res.status(200).json({
      success: true,
      message: "User logged in successfully",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
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

// =========================================================
// LOGOUT
// =========================================================

/**
 * @name LogoutUserController
 * @route POST /api/auth/logout
 * @description Logs out the current user by blacklisting JWT.
 * @access Private
 */
async function LogoutUserController(req, res) {
  try {
    // =====================================================
    // 1. GET TOKEN
    // =====================================================

    const token = req.cookies?.token;

    // =====================================================
    // 2. NO TOKEN
    // =====================================================

    if (!token) {
      return res.status(200).json({
        success: true,
        message: "User already logged out",
      });
    }

    // =====================================================
    // 3. BLACKLIST TOKEN
    // =====================================================

    await redisClient.set(`blacklist:${token}`, "true", {
      EX: 24 * 60 * 60,
    });

    // =====================================================
    // 4. CLEAR COOKIE
    // =====================================================

    const isProduction = process.env.NODE_ENV === "production";

    res.clearCookie("token", {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
    });

    // =====================================================
    // 5. SUCCESS
    // =====================================================

    return res.status(200).json({
      success: true,
      message: "User logged out successfully",
    });
  } catch (error) {
    console.error("Logout Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

// =========================================================
// GET ME
// =========================================================

/**
 * @name GetMeUserController
 * @route GET /api/auth/getme
 * @description Returns the currently authenticated user.
 * @access Private
 */
async function GetMeUserController(req, res) {
  try {
    // =====================================================
    // 1. CHECK AUTH USER
    // =====================================================

    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    // =====================================================
    // 2. FIND USER
    // =====================================================

    const user = await UserModel.findById(req.user.id).select("-password");

    // =====================================================
    // 3. USER NOT FOUND
    // =====================================================

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // =====================================================
    // 4. SUCCESS
    // =====================================================

    return res.status(200).json({
      success: true,
      message: "User fetched successfully",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        isEmailVerified: user.isEmailVerified,
      },
    });
  } catch (error) {
    console.error("GetMe Error:", error);

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
  RegisterUserController,
  LoginUserController,
  LogoutUserController,
  GetMeUserController,
  CheckEmailController,
  generateToken,
  setAuthCookie,
  isEmailDomainValid,
};
