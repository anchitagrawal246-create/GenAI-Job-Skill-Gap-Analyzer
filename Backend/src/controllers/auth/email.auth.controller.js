const UserModel = require("../../model/user.model");

const { isEmailDomainValid } = require("../../utils/email/index.email.utils");

/**
 * =========================================================
 * CHECK EMAIL CONTROLLER
 * =========================================================
 *
 * Route:
 * GET /api/auth/check-email?email=test@gmail.com
 *
 * Purpose:
 * 1. Check whether email is provided
 * 2. Check email format
 * 3. Check whether email domain has valid MX records
 * 4. Check whether email already exists in MongoDB
 *
 * IMPORTANT:
 *
 * "valid: true" means:
 * - Email format is valid
 * - Email domain has valid DNS/MX records
 *
 * It DOES NOT mean the actual mailbox exists.
 *
 * Actual mailbox ownership is verified using OTP.
 *
 * =========================================================
 */

async function CheckEmailController(req, res) {
  try {
    // =====================================================
    // 1. GET EMAIL FROM QUERY
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
    // 4. BASIC EMAIL FORMAT VALIDATION
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
    // 5. CHECK EMAIL DOMAIN
    // =====================================================

    const domainValid = await isEmailDomainValid(normalizedEmail);

    if (!domainValid) {
      return res.status(200).json({
        success: true,
        available: false,
        valid: false,
        exists: false,
        message: "Email domain is invalid",
      });
    }

    // =====================================================
    // 6. CHECK WHETHER EMAIL ALREADY EXISTS
    // =====================================================

    const existingUser = await UserModel.findOne({
      email: normalizedEmail,
    }).select("_id");

    // =====================================================
    // 7. EMAIL ALREADY REGISTERED
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
    // 8. EMAIL IS AVAILABLE
    // =====================================================

    return res.status(200).json({
      success: true,
      available: true,
      valid: true,
      exists: false,
      message: "Email is available",
    });
  } catch (error) {
    // =====================================================
    // ERROR HANDLING
    // =====================================================

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
// EXPORT CONTROLLER
// =========================================================
//
// IMPORTANT:
// register.routes.js uses:
//
// const {
//   CheckEmailController
// } = require(...);
//
// Therefore the name here MUST be exactly:
// CheckEmailController
//
// =========================================================

module.exports = {
  CheckEmailController,
};
