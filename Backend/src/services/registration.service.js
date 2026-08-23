// =========================================================
// REGISTRATION SERVICE
// =========================================================
//
// File:
// services/registration.service.js
//
// Purpose:
//
// Contains the actual business logic for verifying a
// registration OTP and creating the user.
//
// The controller should NOT directly perform all of this.
//
// Controller:
//     receives HTTP request
//            ↓
// Service:
//     performs registration logic
//            ↓
// Controller:
//     sends HTTP response
//
// Responsibilities:
//
// 1. Verify registration OTP
// 2. Read registration data from Redis
// 3. Validate registration data
// 4. Check username/email
// 5. Create MongoDB user
// 6. Delete temporary Redis data
// 7. Generate JWT
// 8. Set authentication cookie
//
// Does NOT:
//
// - Define routes
// - Send HTTP status responses
//
// =========================================================

// =========================================================
// USER MODEL
// =========================================================
//
// Used to create and search users in MongoDB.
//
// File:
// src/model/user.model.js
//

const UserModel = require("../model/user.model");

// =========================================================
// JWT
// =========================================================
//
// Used to generate the authentication token.
//
// NOTE:
//
// We are keeping the existing JWT behavior here for now.
//
// Later, if you want to centralize JWT generation into
// utils/jwt.utils.js, we will first inspect your current
// jwt.utils.js before changing it.
//
// =========================================================

const jwt = require("jsonwebtoken");

// =========================================================
// REDIS
// =========================================================
//
// Used to retrieve and delete temporary registration data.
//
// Example Redis key:
//
// register:data:test@gmail.com
//

const { redisClient } = require("../config/redis");

// =========================================================
// OTP UTILITY
// =========================================================
//
// Used to hash the OTP entered by the user.
//

const { hashOTP } = require("../utils/otp.utils");

// =========================================================
// RECOVERY SERVICE
// =========================================================
//
// verifyOTP()
//     → verifies the OTP
//
// deleteOTP()
//     → deletes the OTP after it has been consumed
//

const { verifyOTP, deleteOTP } = require("./recovery.service");

// =========================================================
// REGISTRATION VALIDATION UTILITIES
// =========================================================

const {
  normalizeEmail,
  normalizeOTP,
  isValidOTP,
  escapeRegex,
} = require("../utils/registration/registration.validation.utils");

// =========================================================
// GENERATE JWT TOKEN
// =========================================================
//
// Creates the authentication JWT after successful
// registration.
//
// Payload:
//
// {
//   id,
//   username
// }
//
// Token lifetime:
//
// 1 day
//
// =========================================================

function generateToken(user) {
  // Make sure JWT secret exists.

  if (!process.env.JWT_SECRET_KEY) {
    throw new Error("JWT_SECRET_KEY is missing from .env");
  }

  // Generate JWT.

  return jwt.sign(
    {
      id: user._id.toString(),
      username: user.username,
    },
    process.env.JWT_SECRET_KEY,
    {
      expiresIn: "1d",
    },
  );
}

// =========================================================
// SET AUTHENTICATION COOKIE
// =========================================================
//
// Stores the JWT inside an HTTP-only cookie.
//
// HTTP-only means browser JavaScript cannot directly
// access the cookie.
//
// =========================================================

function setAuthCookie(res, token) {
  const isProduction = process.env.NODE_ENV === "production";

  res.cookie("token", token, {
    httpOnly: true,

    // HTTPS in production.
    secure: isProduction,

    // Local development:
    // lax
    //
    // Production cross-site:
    // none
    sameSite: isProduction ? "none" : "lax",

    // Cookie expires after 1 day.
    maxAge: 24 * 60 * 60 * 1000,
  });
}

// =========================================================
// VERIFY REGISTRATION
// =========================================================
//
// This is the main registration business logic.
//
// Input:
//
// {
//   email,
//   otp
// }
//
// Returns:
//
// {
//   success: true,
//   user
// }
//
// OR
//
// {
//   success: false,
//   reason: "..."
// }
//
// =========================================================

async function verifyRegistration({ email, otp }) {
  // =======================================================
  // 1. NORMALIZE VALUES
  // =======================================================

  const normalizedEmail = normalizeEmail(email);

  const cleanOTP = normalizeOTP(otp);

  // =======================================================
  // 2. VALIDATE OTP FORMAT
  // =======================================================

  if (!isValidOTP(cleanOTP)) {
    return {
      success: false,
      reason: "INVALID_OTP_FORMAT",
    };
  }

  // =======================================================
  // 3. REGISTRATION ID
  // =======================================================

  // Email is used as the temporary Redis user ID.

  const registrationId = normalizedEmail;

  // =======================================================
  // 4. REGISTRATION DATA KEY
  // =======================================================

  const registrationDataKey = `register:data:${normalizedEmail}`;

  // =======================================================
  // 5. HASH SUBMITTED OTP
  // =======================================================

  const submittedOTPHash = hashOTP(cleanOTP);

  // =======================================================
  // 6. VERIFY OTP
  // =======================================================

  const otpResult = await verifyOTP({
    userId: registrationId,
    purpose: "REGISTER",
    otpHash: submittedOTPHash,
  });

  // =======================================================
  // 7. OTP EXPIRED
  // =======================================================

  if (!otpResult.success && otpResult.reason === "EXPIRED") {
    return {
      success: false,
      reason: "EXPIRED",
    };
  }

  // =======================================================
  // 8. MAXIMUM OTP ATTEMPTS
  // =======================================================

  if (!otpResult.success && otpResult.reason === "MAX_ATTEMPTS") {
    return {
      success: false,
      reason: "MAX_ATTEMPTS",
    };
  }

  // =======================================================
  // 9. INVALID OTP
  // =======================================================

  if (!otpResult.success && otpResult.reason === "INVALID") {
    return {
      success: false,
      reason: "INVALID",
      attemptsRemaining: otpResult.attemptsRemaining,
    };
  }

  // =======================================================
  // 10. UNKNOWN OTP FAILURE
  // =======================================================

  if (!otpResult.success) {
    return {
      success: false,
      reason: "OTP_VERIFICATION_FAILED",
    };
  }

  // =======================================================
  // 11. GET REGISTRATION DATA FROM REDIS
  // =======================================================

  const registrationData = await redisClient.get(registrationDataKey);

  // =======================================================
  // 12. REGISTRATION SESSION EXPIRED
  // =======================================================

  if (!registrationData) {
    // Delete OTP if a key was returned.

    if (otpResult.key) {
      await deleteOTP(otpResult.key);
    }

    return {
      success: false,
      reason: "REGISTRATION_SESSION_EXPIRED",
    };
  }

  // =======================================================
  // 13. PARSE REGISTRATION DATA
  // =======================================================

  let parsedData;

  try {
    parsedData = JSON.parse(registrationData);
  } catch (parseError) {
    console.error("Registration Data Parse Error:", parseError);

    // Delete OTP.

    if (otpResult.key) {
      await deleteOTP(otpResult.key);
    }

    // Delete corrupted Redis data.

    await redisClient.del(registrationDataKey);

    return {
      success: false,
      reason: "INVALID_REGISTRATION_SESSION",
    };
  }

  // =======================================================
  // 14. GET USER DATA
  // =======================================================

  const username = parsedData.username?.toString().trim();

  const password = parsedData.password;

  // =======================================================
  // 15. VALIDATE REGISTRATION DATA
  // =======================================================

  if (!username || !password) {
    // Delete OTP.

    if (otpResult.key) {
      await deleteOTP(otpResult.key);
    }

    // Delete registration data.

    await redisClient.del(registrationDataKey);

    return {
      success: false,
      reason: "INCOMPLETE_REGISTRATION_DATA",
    };
  }

  // =======================================================
  // 16. CHECK USER AGAIN
  // =======================================================
  //
  // Another user could have registered the same username
  // or email while this OTP was waiting.
  //
  // Therefore MongoDB must be checked again.
  //

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

  // =======================================================
  // 17. HANDLE EXISTING USER
  // =======================================================

  if (existingUser) {
    // Delete consumed OTP.

    if (otpResult.key) {
      await deleteOTP(otpResult.key);
    }

    // Delete temporary registration data.

    await redisClient.del(registrationDataKey);

    // -------------------------------------------------------
    // Username conflict
    // -------------------------------------------------------

    if (
      existingUser.username &&
      existingUser.username.toLowerCase() === username.toLowerCase()
    ) {
      return {
        success: false,
        reason: "USERNAME_EXISTS",
      };
    }

    // -------------------------------------------------------
    // Email conflict
    // -------------------------------------------------------

    if (
      existingUser.email &&
      existingUser.email.toLowerCase() === normalizedEmail
    ) {
      return {
        success: false,
        reason: "EMAIL_EXISTS",
      };
    }

    // -------------------------------------------------------
    // Generic conflict
    // -------------------------------------------------------

    return {
      success: false,
      reason: "USER_EXISTS",
    };
  }

  // =======================================================
  // 18. CHECK JWT SECRET
  // =======================================================

  if (!process.env.JWT_SECRET_KEY) {
    console.error("JWT_SECRET_KEY is missing from .env");

    return {
      success: false,
      reason: "JWT_CONFIGURATION_MISSING",
    };
  }

  // =======================================================
  // 19. CREATE USER
  // =======================================================
  //
  // IMPORTANT:
  //
  // The password should already be hashed by the
  // registration controller before it is stored in Redis.
  //
  // DO NOT bcrypt.hash() it again here.
  //

  const user = await UserModel.create({
    username,
    email: normalizedEmail,
    password,
    isEmailVerified: true,
  });

  console.log("User created successfully:", user._id.toString());

  // =======================================================
  // 20. DELETE TEMPORARY REDIS DATA
  // =======================================================

  // Delete OTP.

  if (otpResult.key) {
    await deleteOTP(otpResult.key);
  }

  // Delete registration data.

  await redisClient.del(registrationDataKey);

  console.log("Temporary registration data deleted.");

  // =======================================================
  // 21. GENERATE JWT
  // =======================================================

  const token = generateToken(user);

  // =======================================================
  // 22. RETURN SERVICE RESULT
  // =======================================================
  //
  // IMPORTANT:
  //
  // The service does not send res.status().
  //
  // The controller is responsible for the HTTP response.
  //

  return {
    success: true,
    user,
    token,
  };
}

// =========================================================
// EXPORT
// =========================================================

module.exports = {
  verifyRegistration,
  setAuthCookie,
};
