// =========================================================
// VERIFY PASSWORD OTP CONTROLLER
// File:
// controllers/auth/recovery/verifyPasswordOTP.controller.js
//
// Purpose:
// Verifies the OTP entered by the user.
//
// If the OTP is correct:
// 1. OTP is deleted.
// 2. Temporary password reset token is created.
// 3. Token is returned to frontend.
//
// Route:
// POST /api/auth/verify-password-otp
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

// hashOTP()
// -> Hashes the OTP entered by the user.
const { hashOTP } = require("../../../utils/otp.utils");

// =========================================================
// RECOVERY SERVICE
// =========================================================

// verifyOTP()
// -> Checks OTP.
//
// deleteOTP()
// -> Deletes verified OTP.
//
// createPasswordResetToken()
// -> Creates temporary reset token.
const {
  verifyOTP,
  deleteOTP,
  createPasswordResetToken,
} = require("../../../services/recovery.service");

// =========================================================
// EMAIL UTILITY
// =========================================================

// maskEmail()
// -> Hides user's email.
const { maskEmail } = require("../../../utils/email/index.email.utils");

// =========================================================
// VERIFY PASSWORD OTP CONTROLLER
// =========================================================

/**
 * @name VerifyPasswordOTPController
 *
 * @route POST /api/auth/verify-password-otp
 *
 * @description
 * Verifies password-reset OTP using username.
 *
 * @access Public
 */
async function VerifyPasswordOTPController(req, res) {
  try {
    // -----------------------------------------------------
    // GET INPUT
    // -----------------------------------------------------

    const { username, otp } = req.body || {};

    // -----------------------------------------------------
    // VALIDATE REQUIRED FIELDS
    // -----------------------------------------------------

    if (!username || !otp) {
      return res.status(400).json({
        success: false,
        message: "Username and OTP are required",
      });
    }

    // -----------------------------------------------------
    // NORMALIZE INPUT
    // -----------------------------------------------------

    const normalizedUsername = username.trim();

    const normalizedOTP = otp.toString().trim();

    // -----------------------------------------------------
    // VALIDATE USERNAME
    // -----------------------------------------------------

    if (!normalizedUsername) {
      return res.status(400).json({
        success: false,
        message: "Username is required",
      });
    }

    // -----------------------------------------------------
    // VALIDATE OTP FORMAT
    // -----------------------------------------------------

    if (!/^\d{6}$/.test(normalizedOTP)) {
      return res.status(400).json({
        success: false,
        message: "OTP must be a 6-digit number",
      });
    }

    // -----------------------------------------------------
    // FIND USER
    // -----------------------------------------------------

    const user = await UserModel.findOne({
      username: normalizedUsername,
    });

    // -----------------------------------------------------
    // INVALID USER
    // -----------------------------------------------------

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    // -----------------------------------------------------
    // GET USER ID
    // -----------------------------------------------------

    const userId = user._id.toString();

    // -----------------------------------------------------
    // HASH SUBMITTED OTP
    // -----------------------------------------------------

    const otpHash = hashOTP(normalizedOTP);

    // -----------------------------------------------------
    // VERIFY OTP
    // -----------------------------------------------------

    const result = await verifyOTP({
      userId,
      purpose: "FORGOT_PASSWORD",
      otpHash,
    });

    // -----------------------------------------------------
    // OTP VERIFICATION FAILED
    // -----------------------------------------------------

    if (!result.success) {
      // -----------------------------------------------
      // OTP EXPIRED
      // -----------------------------------------------

      if (result.reason === "EXPIRED") {
        return res.status(400).json({
          success: false,
          message: "OTP expired. Please request a new OTP",
        });
      }

      // -----------------------------------------------
      // MAXIMUM ATTEMPTS
      // -----------------------------------------------

      if (result.reason === "MAX_ATTEMPTS") {
        return res.status(429).json({
          success: false,
          message: "Too many incorrect attempts. Request a new OTP",
        });
      }

      // -----------------------------------------------
      // INVALID OTP
      // -----------------------------------------------

      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    // -----------------------------------------------------
    // DELETE VERIFIED OTP
    // -----------------------------------------------------

    await deleteOTP(result.key);

    // -----------------------------------------------------
    // CREATE PASSWORD RESET TOKEN
    // -----------------------------------------------------

    const resetToken = await createPasswordResetToken({
      userId,
    });

    // -----------------------------------------------------
    // MASK EMAIL
    // -----------------------------------------------------

    const maskedEmail = maskEmail(user.email);

    // -----------------------------------------------------
    // SUCCESS RESPONSE
    // -----------------------------------------------------

    return res.status(200).json({
      success: true,
      message: "OTP verified successfully",
      resetToken,
      maskedEmail,
    });
  } catch (error) {
    // -----------------------------------------------------
    // ERROR
    // -----------------------------------------------------

    console.error("Verify Password OTP Error:", error);

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
  VerifyPasswordOTPController,
};
