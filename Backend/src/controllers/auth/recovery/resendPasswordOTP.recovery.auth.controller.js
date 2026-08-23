// =========================================================
// RESEND PASSWORD OTP CONTROLLER
// File:
// controllers/auth/recovery/resendPasswordOTP.controller.js
//
// Purpose:
// Generates and sends a new password-reset OTP.
//
// Previous OTP becomes invalid because createOTP()
// should replace/update the existing OTP.
//
// Route:
// POST /api/auth/resend-forgot-password-otp
//
// Access:
// Public
// =========================================================

// =========================================================
// USER MODEL
// =========================================================

const UserModel = require("../../../model/user.model");

// =========================================================
// OTP UTILITIES
// =========================================================

const { generateOTP, hashOTP } = require("../../../utils/otp.utils");

// =========================================================
// RECOVERY SERVICE
// =========================================================

const {
  createOTP,
  isResendAllowed,
  setResendCooldown,
} = require("../../../services/recovery.service");

// =========================================================
// EMAIL SERVICE
// =========================================================

const { sendOTPEmail } = require("../../../services/email.service");

// =========================================================
// EMAIL UTILITY
// =========================================================

const { maskEmail } = require("../../../utils/email/index.email.utils");

// =========================================================
// RESEND PASSWORD OTP CONTROLLER
// =========================================================

/**
 * @name ResendForgotPasswordOTPController
 *
 * @route POST /api/auth/resend-forgot-password-otp
 *
 * @description
 * Generates and sends a new password-reset OTP.
 *
 * @access Public
 */
async function ResendForgotPasswordOTPController(req, res) {
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

    // Normalize username.
    const normalizedUsername = username.trim();

    // Check after trimming.
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

    if (!user) {
      return res.status(200).json({
        success: true,
        message: "If the account exists, a new OTP has been sent.",
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
    // CHECK COOLDOWN
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
    // GENERATE NEW OTP
    // -----------------------------------------------------

    const otp = generateOTP();

    // -----------------------------------------------------
    // HASH OTP
    // -----------------------------------------------------

    const otpHash = hashOTP(otp);

    // -----------------------------------------------------
    // SAVE NEW OTP
    // -----------------------------------------------------

    await createOTP({
      userId,
      purpose: "FORGOT_PASSWORD",
      email: user.email,
      otpHash,
    });

    // -----------------------------------------------------
    // RESET COOLDOWN
    // -----------------------------------------------------

    await setResendCooldown({
      userId,
      purpose: "FORGOT_PASSWORD",
    });

    // -----------------------------------------------------
    // SEND NEW OTP
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
      message: "A new OTP has been sent to your registered email",
      maskedEmail,
      remainingSeconds: 60,
    });
  } catch (error) {
    // -----------------------------------------------------
    // ERROR
    // -----------------------------------------------------

    console.error("Resend Forgot Password OTP Error:", error);

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
  ResendForgotPasswordOTPController,
};
