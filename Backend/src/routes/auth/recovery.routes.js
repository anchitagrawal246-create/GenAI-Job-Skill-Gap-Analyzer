const { Router } = require("express");

// =========================================================
// AUTHENTICATION RECOVERY ROUTES
// =========================================================
//
// File:
// routes/auth/recovery.routes.js
//
// Purpose:
// Handles account recovery operations.
//
// Supported recovery systems:
//
// 1. Forgot User ID
// 2. Forgot Password
// 3. Verify Password OTP
// 4. Reset Password
//
// =========================================================
//
// FORGOT USER ID WORKFLOW
//
// User
//   ↓
// Enter registered email
//   ↓
// POST /forgot-user-id
//   ↓
// ForgotUserIdController
//   ↓
// MongoDB: find user
//   ↓
// Generate OTP
//   ↓
// Hash OTP
//   ↓
// Redis: store OTP
//   ↓
// Redis: start resend cooldown
//   ↓
// Email Service
//   ↓
// OTP Email
//
// Then:
//
// User enters OTP
//   ↓
// POST /verify-user-id
//   ↓
// VerifyUserIdController
//   ↓
// Hash submitted OTP
//   ↓
// Redis: verify OTP
//   ↓
// Delete OTP
//   ↓
// Return username
//
// =========================================================
//
// FORGOT PASSWORD WORKFLOW
//
// User
//   ↓
// Enter username
//   ↓
// POST /forgot-password
//   ↓
// ForgotPasswordController
//   ↓
// Find user
//   ↓
// Get registered email
//   ↓
// Generate OTP
//   ↓
// Store OTP in Redis
//   ↓
// Send OTP email
//
// Then:
//
// User enters OTP
//   ↓
// POST /verify-password-otp
//   ↓
// VerifyPasswordOTPController
//   ↓
// Verify Redis OTP
//   ↓
// Create reset authorization
//
// Then:
//
// New password
//   ↓
// POST /reset-password
//   ↓
// ResetPasswordController
//   ↓
// Validate reset authorization
//   ↓
// Hash new password
//   ↓
// Update MongoDB
//   ↓
// Password reset completed
//
// =========================================================

// =========================================================
// FORGOT USER ID CONTROLLER
// =========================================================

const {
  ForgotUserIdController,
  VerifyUserIdController,
} = require("../../controllers/auth/recovery/forgotUserId.controller");

// =========================================================
// FORGOT PASSWORD CONTROLLER
// =========================================================

const {
  ForgotPasswordController,
} = require("../../controllers/auth/recovery/forgotPassword.recovery.auth.controller");

// =========================================================
// VERIFY PASSWORD OTP CONTROLLER
// =========================================================

const {
  VerifyPasswordOTPController,
} = require("../../controllers/auth/recovery/verifyPasswordOTP.recovery.auth.controller");

// =========================================================
// RESET PASSWORD CONTROLLER
// =========================================================

const {
  ResetPasswordController,
} = require("../../controllers/auth/recovery/resetPassword.recovery.auth.controller");

// =========================================================
// CREATE ROUTER
// =========================================================

const router = Router();

// =========================================================
// FORGOT USER ID
// =========================================================
//
// POST /api/auth/forgot-user-id
//
// Request:
//
// {
//   "email": "test@gmail.com"
// }
//
// =========================================================

router.post("/forgot-user-id", ForgotUserIdController);

// =========================================================
// VERIFY USER ID OTP
// =========================================================
//
// POST /api/auth/verify-user-id
//
// Request:
//
// {
//   "email": "test@gmail.com",
//   "otp": "123456"
// }
//
// Response:
//
// {
//   "success": true,
//   "username": "anchit"
// }
//
// =========================================================

router.post("/verify-user-id", VerifyUserIdController);

// =========================================================
// FORGOT PASSWORD
// =========================================================
//
// POST /api/auth/forgot-password
//
// Request:
//
// {
//   "username": "anchit"
// }
//
// IMPORTANT:
//
// The current controller searches by username,
// then sends OTP to the user's registered email.
//
// =========================================================

router.post("/forgot-password", ForgotPasswordController);

// =========================================================
// VERIFY PASSWORD OTP
// =========================================================
//
// POST /api/auth/verify-password-otp
//
// =========================================================

router.post("/verify-password-otp", VerifyPasswordOTPController);

// =========================================================
// RESET PASSWORD
// =========================================================
//
// POST /api/auth/reset-password
//
// =========================================================

router.post("/reset-password", ResetPasswordController);

// =========================================================
// EXPORT
// =========================================================

module.exports = router;
