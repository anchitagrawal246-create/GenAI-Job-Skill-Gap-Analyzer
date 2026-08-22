
const UserModel = require("../model/user.model");
const bcrypt = require("bcryptjs");

const {
  generateOTP,
  hashOTP,
} = require("../utils/otp.utils");

const {
  createOTP,
  verifyOTP,
  deleteOTP,
  isResendAllowed,
  setResendCooldown,
  createPasswordResetToken,
  getPasswordResetUser,
  deletePasswordResetToken,
} = require("../services/recovery.service");

const { sendOTPEmail } = require("../services/email.service");

/**
 * @name ForgotPasswordController
 * @route POST /api/auth/forgot-password
 * @description
 * Finds a user using username and sends a password-reset OTP
 * to the user's registered email address.
 * @access Public
 */
async function ForgotPasswordController(req, res) {
  try {
    const { username } = req.body || {};

    // Validate username
    if (!username) {
      return res.status(400).json({
        success: false,
        message: "Username is required",
      });
    }

    const normalizedUsername = username.trim();

    if (!normalizedUsername) {
      return res.status(400).json({
        success: false,
        message: "Username is required",
      });
    }

    // Find user
    const user = await UserModel.findOne({
      username: normalizedUsername,
    });

    /*
     * Do not reveal whether the username exists.
     */
    if (!user) {
      return res.status(200).json({
        success: true,
        message: "If the account exists, an OTP has been sent.",
      });
    }

    /*
     * MongoDB automatically generated _id.
     * We use it as the Redis user identifier.
     */
    const userId = user._id.toString();

    // Check 60-second resend cooldown
    const allowed = await isResendAllowed({
      userId,
      purpose: "FORGOT_PASSWORD",
    });

    if (!allowed) {
      return res.status(429).json({
        success: false,
        message: "Please wait 60 seconds before requesting another OTP",
      });
    }

    // Generate new OTP
    const otp = generateOTP();

    // Hash OTP before storing in Redis
    const otpHash = hashOTP(otp);

    /*
     * createOTP() uses the same Redis key for this user.
     *
     * Therefore, if an old OTP exists, this SET operation
     * automatically replaces it with the new OTP.
     *
     * OLD OTP = INVALID
     * NEW OTP = VALID
     */
    await createOTP({
      userId,
      purpose: "FORGOT_PASSWORD",
      email: user.email,
      otpHash,
    });

    // Start 60-second resend cooldown
    await setResendCooldown({
      userId,
      purpose: "FORGOT_PASSWORD",
    });

    // Send OTP
    await sendOTPEmail({
      email: user.email,
      otp,
      purpose: "FORGOT_PASSWORD",
    });

    return res.status(200).json({
      success: true,
      message: "OTP sent to your registered email",
    });
  } catch (error) {
    console.error("Forgot Password Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

/**
 * @name ResendForgotPasswordOTPController
 * @route POST /api/auth/resend-forgot-password-otp
 * @description
 * Generates and sends a new password-reset OTP.
 * The previous OTP becomes invalid immediately.
 * Resend is allowed once every 60 seconds.
 * @access Public
 */
async function ResendForgotPasswordOTPController(req, res) {
  try {
    const { username } = req.body || {};

    // Validate username
    if (!username) {
      return res.status(400).json({
        success: false,
        message: "Username is required",
      });
    }

    const normalizedUsername = username.trim();

    if (!normalizedUsername) {
      return res.status(400).json({
        success: false,
        message: "Username is required",
      });
    }

    // Find user
    const user = await UserModel.findOne({
      username: normalizedUsername,
    });

    /*
     * Do not reveal whether username exists.
     */
    if (!user) {
      return res.status(200).json({
        success: true,
        message: "If the account exists, a new OTP has been sent.",
      });
    }

    // MongoDB built-in _id
    const userId = user._id.toString();

    // Check 60-second cooldown
    const allowed = await isResendAllowed({
      userId,
      purpose: "FORGOT_PASSWORD",
    });

    if (!allowed) {
      return res.status(429).json({
        success: false,
        message: "Please wait 60 seconds before requesting another OTP",
      });
    }

    // Generate NEW OTP
    const otp = generateOTP();

    // Hash NEW OTP
    const otpHash = hashOTP(otp);

    /*
     * IMPORTANT:
     *
     * createOTP() uses the same Redis key:
     *
     * recovery:otp:FORGOT_PASSWORD:<userId>
     *
     * Redis SET replaces the old value.
     *
     * Therefore:
     *
     * OLD OTP -> INVALID
     * NEW OTP -> VALID
     */
    await createOTP({
      userId,
      purpose: "FORGOT_PASSWORD",
      email: user.email,
      otpHash,
    });

    // Restart 60-second cooldown
    await setResendCooldown({
      userId,
      purpose: "FORGOT_PASSWORD",
    });

    // Send NEW OTP
    await sendOTPEmail({
      email: user.email,
      otp,
      purpose: "FORGOT_PASSWORD",
    });

    return res.status(200).json({
      success: true,
      message: "A new OTP has been sent to your registered email",
    });
  } catch (error) {
    console.error("Resend Forgot Password OTP Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

/**
 * @name VerifyPasswordOTPController
 * @route POST /api/auth/verify-password-otp
 * @description
 * Verifies the password-reset OTP using username.
 * @access Public
 */
async function VerifyPasswordOTPController(req, res) {
  try {
    const { username, otp } = req.body || {};

    // Validate fields
    if (!username || !otp) {
      return res.status(400).json({
        success: false,
        message: "Username and OTP are required",
      });
    }

    const normalizedUsername = username.trim();
    const normalizedOTP = otp.toString().trim();

    // Validate OTP format
    if (!/^\d{6}$/.test(normalizedOTP)) {
      return res.status(400).json({
        success: false,
        message: "OTP must be a 6-digit number",
      });
    }

    // Find user
    const user = await UserModel.findOne({
      username: normalizedUsername,
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    // MongoDB built-in _id
    const userId = user._id.toString();

    // Hash submitted OTP
    const otpHash = hashOTP(normalizedOTP);

    // Verify OTP
    const result = await verifyOTP({
      userId,
      purpose: "FORGOT_PASSWORD",
      otpHash,
    });

    if (!result.success) {
      // OTP expired
      if (result.reason === "EXPIRED") {
        return res.status(400).json({
          success: false,
          message: "OTP expired. Please request a new OTP",
        });
      }

      // Maximum attempts reached
      if (result.reason === "MAX_ATTEMPTS") {
        return res.status(429).json({
          success: false,
          message: "Too many incorrect attempts. Request a new OTP",
        });
      }

      // Invalid OTP
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    /*
     * OTP is valid.
     *
     * Delete it immediately so it cannot be reused.
     */
    await deleteOTP(result.key);

    /*
     * Create temporary password reset token.
     *
     * Token expires in 10 minutes.
     */
    const resetToken = await createPasswordResetToken({
      userId,
    });

    return res.status(200).json({
      success: true,
      message: "OTP verified successfully",
      resetToken,
    });
  } catch (error) {
    console.error("Verify Password OTP Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

/**
 * @name ResetPasswordController
 * @route POST /api/auth/reset-password
 * @description
 * Resets the user's password using the temporary reset token.
 * @access Public
 */
async function ResetPasswordController(req, res) {
  try {
    const {
      resetToken,
      newPassword,
      confirmPassword,
    } = req.body || {};

    // Validate fields
    if (!resetToken || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    // Check passwords
    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match",
      });
    }

    // Password length
    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters",
      });
    }

    // Get user ID from Redis reset token
    const resetData = await getPasswordResetUser(resetToken);

    if (!resetData) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset token",
      });
    }

    /*
     * Find user using MongoDB's built-in _id.
     */
    const user = await UserModel.findById(resetData.userId);

    if (!user) {
      await deletePasswordResetToken(resetData.key);

      return res.status(400).json({
        success: false,
        message: "Invalid password reset request",
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    user.password = hashedPassword;

    await user.save();

    /*
     * Reset token can only be used once.
     */
    await deletePasswordResetToken(resetData.key);

    return res.status(200).json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (error) {
    console.error("Reset Password Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

module.exports = {
  ForgotPasswordController,
  ResendForgotPasswordOTPController,
  VerifyPasswordOTPController,
  ResetPasswordController,
};
