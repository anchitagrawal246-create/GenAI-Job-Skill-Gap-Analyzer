// =========================================================
// EMAIL UTILITIES INDEX
// File:
// utils/email/index.js
//
// Purpose:
// Central export file for all email utilities.
//
// Instead of importing every utility separately:
//
// const { maskEmail } = require(...);
// const { isEmailDomainValid } = require(...);
//
// We can import both from this one file.
// =========================================================

const { maskEmail } = require("./maskEmail.email.utils");

const { isEmailDomainValid } = require("./emailDomain.email.utils");

// =========================================================
// EXPORT
// =========================================================

module.exports = {
  maskEmail,
  isEmailDomainValid,
};
