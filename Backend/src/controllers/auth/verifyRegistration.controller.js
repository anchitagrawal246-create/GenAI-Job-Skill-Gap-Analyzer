// =========================================================
// VERIFY REGISTRATION CONTROLLER
// =========================================================
//
// File:
// controllers/verifyRegistration.controller.js
//
// Purpose:
//
// This controller is intentionally small.
//
// It is responsible ONLY for:
//
// 1. Receiving HTTP request
// 2. Checking required request fields
// 3. Calling registration service
// 4. Converting service result into HTTP response
//
// It should NOT:
//
// - Access MongoDB directly
// - Access Redis directly
// - Verify OTP directly
// - Generate JWT directly
// - Contain registration business logic
//
// Business logic belongs to:
//
// services/registration.service.js
//
// Validation helpers belong to:
//
// utils/registration/registration.validation.utils.js
//
// =========================================================

const {
  verifyRegistration,
  setAuthCookie,
} = require("../../services/registration.service");

// =========================================================
// VERIFY REGISTRATION CONTROLLER
// =========================================================
//
// Route:
//
// POST /api/auth/verify-registration
//
// Access:
//
// Public
//
// =========================================================

async function VerifyRegistrationController(req, res) {
  try {
    // =======================================================
    // 1. GET REQUEST DATA
    // =======================================================

    const { email, otp } = req.body || {};

    // =======================================================
    // 2. VALIDATE REQUIRED INPUT
    // =======================================================

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required",
      });
    }

    // =======================================================
    // 3. CALL REGISTRATION SERVICE
    // =======================================================

    const result = await verifyRegistration({
      email,
      otp,
    });

    // =======================================================
    // 4. INVALID OTP FORMAT
    // =======================================================

    if (!result.success && result.reason === "INVALID_OTP_FORMAT") {
      return res.status(400).json({
        success: false,
        message: "OTP must be a 6-digit number",
      });
    }

    // =======================================================
    // 5. OTP EXPIRED
    // =======================================================

    if (!result.success && result.reason === "EXPIRED") {
      return res.status(400).json({
        success: false,
        message: "OTP expired or not found. Please request a new OTP.",
      });
    }

    // =======================================================
    // 6. MAXIMUM OTP ATTEMPTS
    // =======================================================

    if (!result.success && result.reason === "MAX_ATTEMPTS") {
      return res.status(429).json({
        success: false,
        message: "Maximum OTP attempts exceeded. Please request a new OTP.",
      });
    }

    // =======================================================
    // 7. INVALID OTP
    // =======================================================

    if (!result.success && result.reason === "INVALID") {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
        attemptsRemaining: result.attemptsRemaining,
      });
    }

    // =======================================================
    // 8. UNKNOWN OTP FAILURE
    // =======================================================

    if (!result.success && result.reason === "OTP_VERIFICATION_FAILED") {
      return res.status(400).json({
        success: false,
        message: "OTP verification failed",
      });
    }

    // =======================================================
    // 9. REGISTRATION SESSION EXPIRED
    // =======================================================

    if (!result.success && result.reason === "REGISTRATION_SESSION_EXPIRED") {
      return res.status(400).json({
        success: false,
        message: "Registration session expired. Please register again.",
      });
    }

    // =======================================================
    // 10. INVALID REGISTRATION SESSION
    // =======================================================

    if (!result.success && result.reason === "INVALID_REGISTRATION_SESSION") {
      return res.status(400).json({
        success: false,
        message: "Invalid registration session. Please register again.",
      });
    }

    // =======================================================
    // 11. INCOMPLETE REGISTRATION DATA
    // =======================================================

    if (!result.success && result.reason === "INCOMPLETE_REGISTRATION_DATA") {
      return res.status(400).json({
        success: false,
        message: "Registration data is incomplete. Please register again.",
      });
    }

    // =======================================================
    // 12. USERNAME ALREADY EXISTS
    // =======================================================

    if (!result.success && result.reason === "USERNAME_EXISTS") {
      return res.status(400).json({
        success: false,
        message: "Username already exists",
      });
    }

    // =======================================================
    // 13. EMAIL ALREADY EXISTS
    // =======================================================

    if (!result.success && result.reason === "EMAIL_EXISTS") {
      return res.status(400).json({
        success: false,
        message: "Email already exists",
      });
    }

    // =======================================================
    // 14. USER ALREADY EXISTS
    // =======================================================

    if (!result.success && result.reason === "USER_EXISTS") {
      return res.status(400).json({
        success: false,
        message: "User already exists",
      });
    }

    // =======================================================
    // 15. JWT CONFIGURATION ERROR
    // =======================================================

    if (!result.success && result.reason === "JWT_CONFIGURATION_MISSING") {
      return res.status(500).json({
        success: false,
        message: "JWT configuration is missing",
      });
    }

    // =======================================================
    // 16. UNKNOWN SERVICE FAILURE
    // =======================================================

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: "Registration failed",
      });
    }

    // =======================================================
    // 17. SET AUTH COOKIE
    // =======================================================

    setAuthCookie(res, result.token);

    // =======================================================
    // 18. SUCCESS RESPONSE
    // =======================================================

    return res.status(201).json({
      success: true,

      message: "Email verified and user registered successfully",

      user: {
        id: result.user._id,
        username: result.user.username,
        email: result.user.email,
        isEmailVerified: result.user.isEmailVerified,
      },
    });
  } catch (error) {
    // =======================================================
    // ERROR HANDLING
    // =======================================================

    console.error("Verify Registration Error:", error);

    // =======================================================
    // MONGODB DUPLICATE KEY ERROR
    // =======================================================

    if (error.code === 11000) {
      // Duplicate email.

      if (error.keyPattern?.email) {
        return res.status(400).json({
          success: false,
          message: "Email already exists",
        });
      }

      // Duplicate username.

      if (error.keyPattern?.username) {
        return res.status(400).json({
          success: false,
          message: "Username already exists",
        });
      }
    }

    // =======================================================
    // INTERNAL SERVER ERROR
    // =======================================================

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
