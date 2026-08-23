// =========================================================
// RECOVERY SERVICE
// =========================================================
//
// This file is the central export hub.
//
// Controllers should continue importing from:
//
// ../../services/recovery.service
//
// The actual logic is separated into:
//
// recovery/
// ├── recovery.config.js
// ├── recovery.keys.js
// ├── otp.service.js
// ├── cooldown.service.js
// └── reset-token.service.js
//
// =========================================================


// =========================================================
// OTP SERVICES
// =========================================================

const {
  createOTP,
  getOTP,
  verifyOTP,
  deleteOTP,
} = require("./recovery/otp.service");


// =========================================================
// COOLDOWN SERVICES
// =========================================================

const {
  isResendAllowed,
  setResendCooldown,
  getResendCooldown,
} = require("./recovery/cooldown.service");


// =========================================================
// PASSWORD RESET TOKEN SERVICES
// =========================================================

const {
  createPasswordResetToken,
  getPasswordResetUser,
  deletePasswordResetToken,
} = require("./recovery/reset-token.service");


// =========================================================
// EXPORT EVERYTHING
// =========================================================
//
// IMPORTANT:
//
// Keep these exports exactly the same.
//
// This means existing controllers do NOT need
// their import statements changed.
// =========================================================

module.exports = {
  // OTP
  createOTP,
  getOTP,
  verifyOTP,
  deleteOTP,

  // Resend cooldown
  isResendAllowed,
  setResendCooldown,
  getResendCooldown,

  // Password reset
  createPasswordResetToken,
  getPasswordResetUser,
  deletePasswordResetToken,
};