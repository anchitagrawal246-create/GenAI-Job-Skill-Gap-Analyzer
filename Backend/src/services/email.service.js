// =========================================================
// EMAIL SERVICE
// =========================================================
//
// CENTRAL EMAIL EXPORT HUB
//
// Controllers should continue importing:
//
// const { sendOTPEmail } =
//   require("../../services/email.service");
//
// Do NOT change controller imports.
//
// Actual implementation is inside:
//
// email/
// ├── email.oauth.js
// ├── email.transporter.js
// ├── email.templates.js
// └── otp-email.service.js
// =========================================================

const { sendOTPEmail } = require("./email/otp-email.service");

// =========================================================
// EXPORT
// =========================================================
//
// Keep this export name exactly the same.
//
// Existing controllers will continue working.
// =========================================================

module.exports = {
  sendOTPEmail,
};
