// =========================================================
// REGISTRATION VALIDATION UTILITIES
// =========================================================
//
// File:
// utils/registration/registration.validation.utils.js
//
// Purpose:
//
// Contains small validation/helper functions specifically
// related to registration verification.
//
// Responsibilities:
//
// 1. Normalize email
// 2. Normalize OTP
// 3. Validate OTP format
// 4. Escape username before MongoDB regex
//
// IMPORTANT:
//
// This file should NOT:
//
// - Access MongoDB
// - Access Redis
// - Generate JWT
// - Set cookies
// - Send HTTP responses
//
// If registration business logic becomes too large,
// move that logic to:
// services/registration.service.js
//
// =========================================================

// =========================================================
// NORMALIZE EMAIL
// =========================================================
//
// Converts email into a consistent format.
//
// Example:
//
// "  Anchit@Gmail.COM "
//
// becomes:
//
// "anchit@gmail.com"
//

function normalizeEmail(email) {
  return email.toString().trim().toLowerCase();
}

// =========================================================
// NORMALIZE OTP
// =========================================================
//
// Removes unnecessary spaces from OTP.
//
// Example:
//
// " 123456 "
//
// becomes:
//
// "123456"
//

function normalizeOTP(otp) {
  return otp.toString().trim();
}

// =========================================================
// VALIDATE OTP FORMAT
// =========================================================
//
// Registration OTP must contain exactly 6 digits.
//
// Valid:
//
// 123456
//
// Invalid:
//
// 12345
// 1234567
// abc123
// 12 3456
//

function isValidOTP(otp) {
  return /^\d{6}$/.test(otp);
}

// =========================================================
// ESCAPE REGEX
// =========================================================
//
// Username is later used inside a MongoDB regular expression.
//
// Special regex characters must be escaped.
//
// Example:
//
// anchit.user
//
// becomes:
//
// anchit\.user
//
// This prevents "." from behaving as a regex wildcard.
//
// =========================================================

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// =========================================================
// EXPORT
// =========================================================

module.exports = {
  normalizeEmail,
  normalizeOTP,
  isValidOTP,
  escapeRegex,
};

