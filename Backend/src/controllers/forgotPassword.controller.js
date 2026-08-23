const UserModel = require("../model/user.model");
const bcrypt = require("bcryptjs");

const { generateOTP, hashOTP } = require("../utils/otp.utils");

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

// =====================================================
// MASK EMAIL
// =====================================================

/**
 * Mask email address.
 *
 * Example:
 * anchit@gmail.com
 * -> a*****t@gmail.com
 *
 * abc@gmail.com
 * -> a*c@gmail.com
 *
 * a@gmail.com
 * -> *@gmail.com
 */
const maskEmail = (email) => {
  if (!email || typeof email !== "string") {
    return "";
  }

  const [localPart, domain] = email.split("@");

  if (!localPart || !domain) {
    return "";
  }

  if (localPart.length === 1) {
    return `*@${domain}`;
  }

  if (localPart.length === 2) {
    return `${localPart[0]}*@${domain}`;
  }

  if (localPart.length === 3) {
    return `${localPart[0]}*${localPart[localPart.length - 1]}@${domain}`;
  }

  const firstCharacter = localPart[0];
  const lastCharacter = localPart[localPart.length - 1];

  const maskedMiddle = "*".repeat(Math.max(localPart.length - 2, 3));

  return `${firstCharacter}${maskedMiddle}${lastCharacter}@${domain}`;
};

// =====================================================
// FORGOT PASSWORD
// =====================================================

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

    // --------------------------------------------------
    // VALIDATE USERNAME
    // --------------------------------------------------

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

    // --------------------------------------------------
    // FIND USER
    // --------------------------------------------------

    const user = await UserModel.findOne({
      username: normalizedUsername,
    });

    // --------------------------------------------------
    // DO NOT REVEAL USER EXISTENCE
    // --------------------------------------------------

    if (!user) {
      return res.status(200).json({
        success: true,
        message: "If the account exists, an OTP has been sent.",
      });
    }

    // --------------------------------------------------
    // USER ID
    // --------------------------------------------------

    const userId = user._id.toString();

    // --------------------------------------------------
    // MASK EMAIL
    // --------------------------------------------------

    const maskedEmail = maskEmail(user.email);

    // --------------------------------------------------
    // CHECK RESEND COOLDOWN
    // --------------------------------------------------

    const allowed = await isResendAllowed({
      userId,
      purpose: "FORGOT_PASSWORD",
    });

    if (!allowed) {
      return res.status(429).json({
        success: false,
        message: "Please wait 60 seconds before requesting another OTP",
        remainingSeconds: 60,
        maskedEmail,
      });
    }

    // --------------------------------------------------
    // GENERATE OTP
    // --------------------------------------------------

    const otp = generateOTP();

    // --------------------------------------------------
    // HASH OTP
    // --------------------------------------------------

    const otpHash = hashOTP(otp);

    // --------------------------------------------------
    // SAVE OTP
    // --------------------------------------------------

    await createOTP({
      userId,
      purpose: "FORGOT_PASSWORD",
      email: user.email,
      otpHash,
    });

    // --------------------------------------------------
    // START RESEND COOLDOWN
    // --------------------------------------------------

    await setResendCooldown({
      userId,
      purpose: "FORGOT_PASSWORD",
    });

    // --------------------------------------------------
    // SEND EMAIL
    // --------------------------------------------------

    await sendOTPEmail({
      email: user.email,
      otp,
      purpose: "FORGOT_PASSWORD",
    });

    // --------------------------------------------------
    // RESPONSE
    // --------------------------------------------------

    return res.status(200).json({
      success: true,
      message: "OTP sent to your registered email",
      maskedEmail,
      remainingSeconds: 60,
    });
  } catch (error) {
    console.error("Forgot Password Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

// =====================================================
// RESEND FORGOT PASSWORD OTP
// =====================================================

/**
 * @name ResendForgotPasswordOTPController
 * @route POST /api/auth/resend-forgot-password-otp
 * @description
 * Generates and sends a new password-reset OTP.
 * Previous OTP becomes invalid immediately.
 * @access Public
 */
async function ResendForgotPasswordOTPController(req, res) {
  try {
    const { username } = req.body || {};

    // --------------------------------------------------
    // VALIDATE USERNAME
    // --------------------------------------------------

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

    // --------------------------------------------------
    // FIND USER
    // --------------------------------------------------

    const user = await UserModel.findOne({
      username: normalizedUsername,
    });

    // --------------------------------------------------
    // DO NOT REVEAL USER EXISTENCE
    // --------------------------------------------------

    if (!user) {
      return res.status(200).json({
        success: true,
        message: "If the account exists, a new OTP has been sent.",
      });
    }

    // --------------------------------------------------
    // USER ID
    // --------------------------------------------------

    const userId = user._id.toString();

    // --------------------------------------------------
    // MASK EMAIL
    // --------------------------------------------------

    const maskedEmail = maskEmail(user.email);

    // --------------------------------------------------
    // CHECK COOLDOWN
    // --------------------------------------------------

    const allowed = await isResendAllowed({
      userId,
      purpose: "FORGOT_PASSWORD",
    });

    if (!allowed) {
      return res.status(429).json({
        success: false,
        message: "Please wait 60 seconds before requesting another OTP",
        remainingSeconds: 60,
        maskedEmail,
      });
    }

    // --------------------------------------------------
    // GENERATE NEW OTP
    // --------------------------------------------------

    const otp = generateOTP();

    // --------------------------------------------------
    // HASH NEW OTP
    // --------------------------------------------------

    const otpHash = hashOTP(otp);

    // --------------------------------------------------
    // SAVE NEW OTP
    // --------------------------------------------------

    await createOTP({
      userId,
      purpose: "FORGOT_PASSWORD",
      email: user.email,
      otpHash,
    });

    // --------------------------------------------------
    // RESET COOLDOWN
    // --------------------------------------------------

    await setResendCooldown({
      userId,
      purpose: "FORGOT_PASSWORD",
    });

    // --------------------------------------------------
    // SEND NEW OTP
    // --------------------------------------------------

    await sendOTPEmail({
      email: user.email,
      otp,
      purpose: "FORGOT_PASSWORD",
    });

    // --------------------------------------------------
    // RESPONSE
    // --------------------------------------------------

    return res.status(200).json({
      success: true,
      message: "A new OTP has been sent to your registered email",
      maskedEmail,
      remainingSeconds: 60,
    });
  } catch (error) {
    console.error("Resend Forgot Password OTP Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

// =====================================================
// VERIFY PASSWORD OTP
// =====================================================

/**
 * @name VerifyPasswordOTPController
 * @route POST /api/auth/verify-password-otp
 * @description
 * Verifies password-reset OTP using username.
 * @access Public
 */
async function VerifyPasswordOTPController(req, res) {
  try {
    const { username, otp } = req.body || {};

    // --------------------------------------------------
    // VALIDATE
    // --------------------------------------------------

    if (!username || !otp) {
      return res.status(400).json({
        success: false,
        message: "Username and OTP are required",
      });
    }

    const normalizedUsername = username.trim();
    const normalizedOTP = otp.toString().trim();

    // --------------------------------------------------
    // VALIDATE OTP FORMAT
    // --------------------------------------------------

    if (!/^\d{6}$/.test(normalizedOTP)) {
      return res.status(400).json({
        success: false,
        message: "OTP must be a 6-digit number",
      });
    }

    // --------------------------------------------------
    // FIND USER
    // --------------------------------------------------

    const user = await UserModel.findOne({
      username: normalizedUsername,
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    const userId = user._id.toString();

    // --------------------------------------------------
    // HASH SUBMITTED OTP
    // --------------------------------------------------

    const otpHash = hashOTP(normalizedOTP);

    // --------------------------------------------------
    // VERIFY OTP
    // --------------------------------------------------

    const result = await verifyOTP({
      userId,
      purpose: "FORGOT_PASSWORD",
      otpHash,
    });

    if (!result.success) {
      // EXPIRED
      if (result.reason === "EXPIRED") {
        return res.status(400).json({
          success: false,
          message: "OTP expired. Please request a new OTP",
        });
      }

      // MAX ATTEMPTS
      if (result.reason === "MAX_ATTEMPTS") {
        return res.status(429).json({
          success: false,
          message: "Too many incorrect attempts. Request a new OTP",
        });
      }

      // INVALID
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    // --------------------------------------------------
    // DELETE OTP
    // --------------------------------------------------

    await deleteOTP(result.key);

    // --------------------------------------------------
    // CREATE RESET TOKEN
    // --------------------------------------------------

    const resetToken = await createPasswordResetToken({
      userId,
    });

    // --------------------------------------------------
    // MASK EMAIL
    // --------------------------------------------------

    const maskedEmail = maskEmail(user.email);

    // --------------------------------------------------
    // RESPONSE
    // --------------------------------------------------

    return res.status(200).json({
      success: true,
      message: "OTP verified successfully",
      resetToken,
      maskedEmail,
    });
  } catch (error) {
    console.error("Verify Password OTP Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

// =====================================================
// RESET PASSWORD
// =====================================================

/**
 * @name ResetPasswordController
 * @route POST /api/auth/reset-password
 * @description
 * Resets password using temporary reset token.
 * @access Public
 */
async function ResetPasswordController(req, res) {
  try {
    const { resetToken, newPassword, confirmPassword } = req.body || {};

    // --------------------------------------------------
    // VALIDATE FIELDS
    // --------------------------------------------------

    if (!resetToken || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    // --------------------------------------------------
    // PASSWORD MATCH
    // --------------------------------------------------

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match",
      });
    }

    // --------------------------------------------------
    // PASSWORD LENGTH
    // --------------------------------------------------

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters",
      });
    }

    // --------------------------------------------------
    // GET RESET DATA
    // --------------------------------------------------

    const resetData = await getPasswordResetUser(resetToken);

    if (!resetData) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset token",
      });
    }

    // --------------------------------------------------
    // FIND USER
    // --------------------------------------------------

    const user = await UserModel.findById(resetData.userId);

    if (!user) {
      await deletePasswordResetToken(resetData.key);

      return res.status(400).json({
        success: false,
        message: "Invalid password reset request",
      });
    }

    // --------------------------------------------------
    // HASH PASSWORD
    // --------------------------------------------------

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    user.password = hashedPassword;

    await user.save();

    // --------------------------------------------------
    // DELETE RESET TOKEN
    // --------------------------------------------------

    await deletePasswordResetToken(resetData.key);

    // --------------------------------------------------
    // RESPONSE
    // --------------------------------------------------

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

// =====================================================
// EXPORT
// =====================================================

module.exports = {
  ForgotPasswordController,
  ResendForgotPasswordOTPController,
  VerifyPasswordOTPController,
  ResetPasswordController,
};
