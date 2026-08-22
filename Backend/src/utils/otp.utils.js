const crypto = require("crypto");

/**
 * Generate a cryptographically secure 6-digit OTP.
 */
function generateOTP() {
  return crypto.randomInt(100000, 1000000).toString();
}

/**
 * Hash OTP before storing it in Redis.
 */
function hashOTP(otp) {
  return crypto.createHash("sha256").update(otp).digest("hex");
}

module.exports = {
  generateOTP,
  hashOTP,
};
