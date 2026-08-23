// =========================================================
// RECOVERY CONFIGURATION
// =========================================================

// OTP remains valid for 5 minutes.
const OTP_EXPIRY = 5 * 60;

// User must wait 60 seconds before requesting another OTP.
const RESEND_COOLDOWN = 60;

// Maximum incorrect OTP attempts.
const MAX_ATTEMPTS = 5;

// Password reset token remains valid for 10 minutes.
const PASSWORD_RESET_EXPIRY = 10 * 60;

module.exports = {
  OTP_EXPIRY,
  RESEND_COOLDOWN,
  MAX_ATTEMPTS,
  PASSWORD_RESET_EXPIRY,
};
