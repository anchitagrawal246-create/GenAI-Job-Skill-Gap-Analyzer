const UserModel = require("../../model/user.model");

const { generateOTP, hashOTP } = require("");

const {
  createOTP,
  verifyOTP,
  deleteOTP,
  isResendAllowed,
  setResendCooldown,
} = require("../../services/recovery.service");

const { sendOTPEmail } = require("../../services/email.service");

/**
 * @name ForgotUserIdController
 * @route POST /api/auth/forgot-user-id
 * @description
 * Finds the account using email and sends an OTP
 * to the registered email address.
 * @access Public
 */
async function ForgotUserIdController(req, res) {
  try {
    const { email } = req.body || {};

    // Validate email
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    // Normalize email
    const normalizedEmail = email.trim().toLowerCase();

    // Find user by email
    const user = await UserModel.findOne({
      email: normalizedEmail,
    });

    /**
     * Do not reveal whether the email exists.
     */
    if (!user) {
      return res.status(200).json({
        success: true,
        message: "If the account exists, an OTP has been sent.",
      });
    }

    // MongoDB built-in _id
    const userId = user._id.toString();

    // Check 60-second resend cooldown
    const allowed = await isResendAllowed({
      userId,
      purpose: "FORGOT_USER_ID",
    });

    if (!allowed) {
      return res.status(429).json({
        success: false,
        message: "Please wait 60 seconds before requesting another OTP",
      });
    }

    // Generate new OTP
    const otp = generateOTP();

    // Hash OTP before storing
    const otpHash = hashOTP(otp);

    /**
     * createOTP() overwrites the previous OTP
     * because the Redis key is the same.
     *
     * Therefore:
     * Old OTP -> immediately invalid
     * New OTP -> valid for 5 minutes
     */
    const otpKey = await createOTP({
      userId,
      purpose: "FORGOT_USER_ID",
      email: user.email,
      otpHash,
    });

    // Start 60-second resend cooldown
    await setResendCooldown({
      userId,
      purpose: "FORGOT_USER_ID",
    });

    try {
      // Send OTP email
      await sendOTPEmail({
        email: user.email,
        otp,
        purpose: "FORGOT_USER_ID",
      });
    } catch (emailError) {
      // Remove OTP if email could not be sent
      await deleteOTP(otpKey);

      console.error("Forgot User ID Email Error:", emailError);

      return res.status(500).json({
        success: false,
        message: "Unable to send OTP. Please try again later.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "OTP sent to your registered email",
    });
  } catch (error) {
    console.error("Forgot User ID Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

/**
 * @name VerifyUserIdController
 * @route POST /api/auth/verify-user-id
 * @description
 * Verifies the OTP and returns the user's username.
 * @access Public
 */
async function VerifyUserIdController(req, res) {
  try {
    const { email, otp } = req.body || {};

    // Validate fields
    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required",
      });
    }

    // Normalize email
    const normalizedEmail = email.trim().toLowerCase();

    // Find user
    const user = await UserModel.findOne({
      email: normalizedEmail,
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
    const otpHash = hashOTP(otp.toString().trim());

    // Verify OTP
    const result = await verifyOTP({
      userId,
      purpose: "FORGOT_USER_ID",
      otpHash,
    });

    // OTP verification failed
    if (!result.success) {
      if (result.reason === "EXPIRED") {
        return res.status(400).json({
          success: false,
          message: "OTP expired. Please request a new OTP",
        });
      }

      if (result.reason === "MAX_ATTEMPTS") {
        return res.status(429).json({
          success: false,
          message: "Too many incorrect attempts. Request a new OTP",
        });
      }

      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    /**
     * OTP is valid.
     *
     * Delete it immediately so it cannot
     * be used again.
     */
    await deleteOTP(result.key);

    // Return username
    return res.status(200).json({
      success: true,
      message: "OTP verified successfully",
      username: user.username,
    });
  } catch (error) {
    console.error("Verify User ID Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

module.exports = {
  ForgotUserIdController,
  VerifyUserIdController,
};
