const bcrypt = require("bcryptjs");

const UserModel = require("../../model/user.model");
const { redisClient } = require("../../config/redis");

const { generateOTP, hashOTP } = require("../../utils/otp.utils");

const { sendOTPEmail } = require("../../services/email.service");

const {
  createOTP,
  isResendAllowed,
  setResendCooldown,
  getResendCooldown,
} = require("../../services/recovery.service");

const { isEmailDomainValid } = require("../../utils/email/index.email.utils");

/**
 * Escape regex special characters.
 */
function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Register user.
 *
 * Route:
 * POST /api/auth/register
 *
 * Flow:
 *
 * Frontend
 *    ↓
 * Register controller
 *    ↓
 * Validate input
 *    ↓
 * Check email domain
 *    ↓
 * Check existing user
 *    ↓
 * Hash password
 *    ↓
 * Generate OTP
 *    ↓
 * Save temporary registration in Redis
 *    ↓
 * Save OTP in Redis
 *    ↓
 * Send OTP email
 */
async function RegisterUserController(req, res) {
  try {
    const { username, email, password } = req.body || {};

    // Required fields.
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide username, email and password",
      });
    }

    // Normalize values.
    const normalizedUsername = username.toString().trim();

    const normalizedEmail = email.toString().trim().toLowerCase();

    // Username validation.
    if (normalizedUsername.length < 3) {
      return res.status(400).json({
        success: false,
        message: "Username must be at least 3 characters",
      });
    }

    // Email validation.
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address",
      });
    }

    // Email domain validation.
    const emailDomainValid = await isEmailDomainValid(normalizedEmail);

    if (!emailDomainValid) {
      return res.status(400).json({
        success: false,
        message: "This email domain does not have a valid mail server",
      });
    }

    // Password validation.
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    // Check whether username/email already exists.
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
      if (
        existingUser.username &&
        existingUser.username.toLowerCase() === normalizedUsername.toLowerCase()
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

    // Registration ID.
    const registrationId = normalizedEmail;

    // Check OTP resend cooldown.
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

    // Hash password BEFORE putting it in Redis.
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate OTP.
    const otp = generateOTP();
    const hashedOTP = hashOTP(otp);

    // Temporary registration data.
    const registrationDataKey = `register:data:${normalizedEmail}`;

    const registrationData = JSON.stringify({
      username: normalizedUsername,
      email: normalizedEmail,
      password: hashedPassword,
    });

    // Remove old registration data.
    await redisClient.del(registrationDataKey);

    // Save temporary registration data.
    await redisClient.set(registrationDataKey, registrationData, {
      EX: 10 * 60,
    });

    // Create OTP.
    const otpKey = await createOTP({
      userId: registrationId,
      purpose: "REGISTER",
      email: normalizedEmail,
      otpHash: hashedOTP,
    });

    console.log("Registration OTP created for:", normalizedEmail);

    // Send OTP email.
    try {
      await sendOTPEmail({
        email: normalizedEmail,
        otp,
        purpose: "EMAIL_VERIFICATION",
      });
    } catch (emailError) {
      console.error("Registration OTP Email Error:", emailError);

      await redisClient.del(registrationDataKey);

      await redisClient.del(otpKey);

      return res.status(500).json({
        success: false,
        message: "Failed to send OTP email",
      });
    }

    // Start resend cooldown.
    await setResendCooldown({
      userId: registrationId,
      purpose: "REGISTER",
    });

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

module.exports = {
  RegisterUserController,
};

