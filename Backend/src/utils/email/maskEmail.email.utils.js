// =========================================================
// EMAIL MASKING UTILITY
// File:
// utils/email/maskEmail.utils.js
//
// Purpose:
// Masks an email address before sending it to the frontend.
//
// Example:
//
// anchit@gmail.com
// -> a****t@gmail.com
//
// abc@gmail.com
// -> a*c@gmail.com
//
// ab@gmail.com
// -> a*@gmail.com
//
// a@gmail.com
// -> *@gmail.com
// =========================================================

// =========================================================
// MASK EMAIL
// =========================================================

/**
 * Masks an email address.
 *
 * @param {string} email
 * @returns {string}
 */
function maskEmail(email) {
  // -------------------------------------------------------
  // VALIDATE INPUT
  // -------------------------------------------------------

  // Make sure email exists
  // and is a string.
  if (!email || typeof email !== "string") {
    return "";
  }

  // -------------------------------------------------------
  // SPLIT EMAIL
  // -------------------------------------------------------

  // Example:
  //
  // anchit@gmail.com
  //
  // localPart = anchit
  // domain    = gmail.com

  const [localPart, domain] = email.split("@");

  // -------------------------------------------------------
  // VALIDATE EMAIL STRUCTURE
  // -------------------------------------------------------

  // Email must contain:
  //
  // localPart
  // +
  // domain

  if (!localPart || !domain) {
    return "";
  }

  // -------------------------------------------------------
  // ONE CHARACTER
  // -------------------------------------------------------

  // Example:
  //
  // a@gmail.com
  //
  // Result:
  // *@gmail.com

  if (localPart.length === 1) {
    return `*@${domain}`;
  }

  // -------------------------------------------------------
  // TWO CHARACTERS
  // -------------------------------------------------------

  // Example:
  //
  // ab@gmail.com
  //
  // Result:
  // a*@gmail.com

  if (localPart.length === 2) {
    return `${localPart[0]}*@${domain}`;
  }

  // -------------------------------------------------------
  // THREE CHARACTERS
  // -------------------------------------------------------

  // Example:
  //
  // abc@gmail.com
  //
  // Result:
  // a*c@gmail.com

  if (localPart.length === 3) {
    return `${localPart[0]}*${localPart[localPart.length - 1]}@${domain}`;
  }

  // -------------------------------------------------------
  // FOUR OR MORE CHARACTERS
  // -------------------------------------------------------

  // Keep first character.
  const firstCharacter = localPart[0];

  // Keep last character.
  const lastCharacter = localPart[localPart.length - 1];

  // Mask the middle characters.
  //
  // Minimum 3 stars.
  const maskedMiddle = "*".repeat(Math.max(localPart.length - 2, 3));

  // -------------------------------------------------------
  // RETURN MASKED EMAIL
  // -------------------------------------------------------

  return `${firstCharacter}${maskedMiddle}${lastCharacter}@${domain}`;
}

// =========================================================
// EXPORT
// =========================================================

module.exports = {
  maskEmail,
};
