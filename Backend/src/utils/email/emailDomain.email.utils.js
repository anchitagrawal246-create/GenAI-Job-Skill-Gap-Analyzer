// =========================================================
// EMAIL DOMAIN VALIDATION UTILITY
// File:
// utils/email/emailDomain.utils.js
//
// Purpose:
// Checks whether an email domain can resolve to a
// mail server/domain.
//
// IMPORTANT:
// This does NOT verify that the actual mailbox exists.
//
// Example:
//
// test@gmail.com
//
// This checks:
//
// gmail.com
//
// It does NOT check:
//
// test@gmail.com
// =========================================================

// =========================================================
// NODE.JS DNS
// =========================================================

// Built-in Node.js DNS Promise API.
//
// Used to check:
//
// 1. MX records
// 2. A records
// 3. AAAA records

const dns = require("node:dns/promises");

// =========================================================
// EMAIL DOMAIN VALIDATION
// =========================================================

/**
 * Checks whether an email domain is valid.
 *
 * IMPORTANT:
 * This checks the domain only.
 *
 * It does NOT verify that the exact
 * email mailbox exists.
 *
 * @param {string} email
 * @returns {Promise<boolean>}
 */
async function isEmailDomainValid(email) {
  try {
    // =====================================================
    // SPLIT EMAIL
    // =====================================================

    // Example:
    //
    // anchit@gmail.com
    //
    // parts[0] = anchit
    // parts[1] = gmail.com

    const parts = email.split("@");

    // -----------------------------------------------------
    // EMAIL MUST HAVE EXACTLY ONE @
    // -----------------------------------------------------

    if (parts.length !== 2) {
      return false;
    }

    // =====================================================
    // GET DOMAIN
    // =====================================================

    const domain = parts[1].trim().toLowerCase();

    // -----------------------------------------------------
    // DOMAIN CANNOT BE EMPTY
    // -----------------------------------------------------

    if (!domain) {
      return false;
    }

    // =====================================================
    // TRY MX RECORDS FIRST
    // =====================================================

    /**
     * MX = Mail Exchange
     *
     * MX records tell us which mail servers
     * receive email for a domain.
     *
     * Example:
     *
     * gmail.com
     *     ↓
     * MX records
     *     ↓
     * Google mail servers
     */

    try {
      const mxRecords = await dns.resolveMx(domain);

      // ---------------------------------------------------
      // MX RECORDS FOUND
      // ---------------------------------------------------

      if (Array.isArray(mxRecords) && mxRecords.length > 0) {
        return true;
      }
    } catch (mxError) {
      // ---------------------------------------------------
      // MX LOOKUP FAILED
      // ---------------------------------------------------
      // Do NOT immediately return false.
      //
      // Some domains may not expose MX records
      // but can still resolve through A/AAAA records.
      //
      // Therefore continue to fallback lookup.
    }

    // =====================================================
    // FALLBACK: A / AAAA RECORDS
    // =====================================================

    /**
     * A:
     * IPv4 address
     *
     * AAAA:
     * IPv6 address
     */

    try {
      const addresses = await dns.lookup(domain, {
        all: true,
      });

      // ---------------------------------------------------
      // DOMAIN RESOLVES
      // ---------------------------------------------------

      return Array.isArray(addresses) && addresses.length > 0;
    } catch (lookupError) {
      // ---------------------------------------------------
      // DOMAIN COULD NOT BE RESOLVED
      // ---------------------------------------------------

      return false;
    }
  } catch (error) {
    // =====================================================
    // UNEXPECTED ERROR
    // =====================================================

    return false;
  }
}

// =========================================================
// EXPORT
// =========================================================

module.exports = {
  isEmailDomainValid,
};
