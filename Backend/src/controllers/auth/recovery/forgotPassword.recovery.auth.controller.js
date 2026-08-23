// =========================================================
// FORGOT PASSWORD CONTROLLER
// File:
// controllers/auth/recovery/forgotPassword.controller.js
//
// Purpose:
// Finds a user by username and sends a password-reset OTP.
//
// Route:
// POST /api/auth/forgot-password
//
// Access:
// Public
//
// Dependencies:
// UserModel
// OTP utilities
// Recovery service
// Email service
// Email masking utility
// =========================================================

// =========================================================
// USER MODEL
// =========================================================

// Used to find the user by username.
const UserModel = require("../../../model/user.model");

// =========================================================
// OTP UTILITIES
// =========================================================

// generateOTP()
// -> Generates a new 6-digit OTP.
//
// hashOTP()
// -> Hashes the OTP before storing it.
const { generateOTP, hashOTP } = require("../../../utils/otp.utils");

// =========================================================
// RECOVERY SERVICE
// =========================================================

// isResendAllowed()
// -> Checks Redis resend cooldown.
//
// createOTP()
// -> Stores the OTP.
//
// setResendCooldown()
// -> Starts the OTP resend cooldown.
const {
  createOTP,
  isResendAllowed,
  setResendCooldown,
} = require("../../../services/recovery.service");

// =========================================================
// EMAIL SERVICE
// =========================================================

// sendOTPEmail()
// -> Sends the OTP to the user's email.
const { sendOTPEmail } = require("../../../services/email.service");

// =========================================================
// EMAIL UTILITY
// =========================================================

// maskEmail()
// -> Hides part of the user's email.
//
// Example:
// anchit@gmail.com
// -> a****t@gmail.com
const { maskEmail } = require("../../../utils/email/index.email.utils");

// =========================================================
// FORGOT PASSWORD CONTROLLER
// =========================================================

/**
 * @name ForgotPasswordController
 *
 * @route POST /api/auth/forgot-password
 *
 * @description
 * Finds a user using username and sends
 * a password-reset OTP to the registered email.
 *
 * @access Public
 */
async function ForgotPasswordController(req, res) {
  try {
    // -----------------------------------------------------
    // GET USERNAME
    // -----------------------------------------------------

    const { username } = req.body || {};

    // -----------------------------------------------------
    // VALIDATE USERNAME
    // -----------------------------------------------------

    if (!username) {
      return res.status(400).json({
        success: false,
        message: "Username is required",
      });
    }

    // Remove unnecessary spaces.
    const normalizedUsername = username.trim();

    // Check again after trimming.
    if (!normalizedUsername) {
      return res.status(400).json({
        success: false,
        message: "Username is required",
      });
    }

    // -----------------------------------------------------
    // FIND USER
    // -----------------------------------------------------

    const user = await UserModel.findOne({
      username: normalizedUsername,
    });

    // -----------------------------------------------------
    // DO NOT REVEAL USER EXISTENCE
    // -----------------------------------------------------

    // This prevents username enumeration.
    if (!user) {
      return res.status(200).json({
        success: true,
        message: "If the account exists, an OTP has been sent.",
      });
    }

    // -----------------------------------------------------
    // GET USER ID
    // -----------------------------------------------------

    const userId = user._id.toString();

    // -----------------------------------------------------
    // MASK EMAIL
    // -----------------------------------------------------

    const maskedEmail = maskEmail(user.email);

    // -----------------------------------------------------
    // CHECK RESEND COOLDOWN
    // -----------------------------------------------------

    const allowed = await isResendAllowed({
      userId,
      purpose: "FORGOT_PASSWORD",
    });

    // -----------------------------------------------------
    // COOLDOWN ACTIVE
    // -----------------------------------------------------

    if (!allowed) {
      return res.status(429).json({
        success: false,
        message: "Please wait 60 seconds before requesting another OTP",
        remainingSeconds: 60,
        maskedEmail,
      });
    }

    // -----------------------------------------------------
    // GENERATE OTP
    // -----------------------------------------------------

    const otp = generateOTP();

    // -----------------------------------------------------
    // HASH OTP
    // -----------------------------------------------------

    const otpHash = hashOTP(otp);

    // -----------------------------------------------------
    // SAVE OTP
    // -----------------------------------------------------

    await createOTP({
      userId,
      purpose: "FORGOT_PASSWORD",
      email: user.email,
      otpHash,
    });

    // -----------------------------------------------------
    // START RESEND COOLDOWN
    // -----------------------------------------------------

    await setResendCooldown({
      userId,
      purpose: "FORGOT_PASSWORD",
    });

    // -----------------------------------------------------
    // SEND OTP EMAIL
    // -----------------------------------------------------

    await sendOTPEmail({
      email: user.email,
      otp,
      purpose: "FORGOT_PASSWORD",
    });

    // -----------------------------------------------------
    // SUCCESS RESPONSE
    // -----------------------------------------------------

    return res.status(200).json({
      success: true,
      message: "OTP sent to your registered email",
      maskedEmail,
      remainingSeconds: 60,
    });
  } catch (error) {
    // -----------------------------------------------------
    // ERROR
    // -----------------------------------------------------

    console.error("Forgot Password Error:", error);

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
  ForgotPasswordController,
};
