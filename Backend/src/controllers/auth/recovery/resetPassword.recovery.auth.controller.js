// =========================================================
// RESET PASSWORD CONTROLLER
// File:
// controllers/auth/recovery/resetPassword.controller.js
//
// Purpose:
// Resets the user's password using a temporary
// password-reset token.
//
// Route:
// POST /api/auth/reset-password
//
// Access:
// Public
// =========================================================

// =========================================================
// USER MODEL
// =========================================================

// Used to find the user associated with the reset token.
const UserModel = require("../../../model/user.model");

// =========================================================
// BCRYPT
// =========================================================

// Used to securely hash the new password.
const bcrypt = require("bcryptjs");

// =========================================================
// RECOVERY SERVICE
// =========================================================

// getPasswordResetUser()
// -> Gets user information stored against reset token.
//
// deletePasswordResetToken()
// -> Deletes the reset token after use.
const {
  getPasswordResetUser,
  deletePasswordResetToken,
} = require("../../../services/recovery.service");

// =========================================================
// RESET PASSWORD CONTROLLER
// =========================================================

/**
 * @name ResetPasswordController
 *
 * @route POST /api/auth/reset-password
 *
 * @description
 * Resets password using a temporary reset token.
 *
 * @access Public
 */
async function ResetPasswordController(req, res) {
  try {
    // -----------------------------------------------------
    // GET REQUEST DATA
    // -----------------------------------------------------

    const { resetToken, newPassword, confirmPassword } = req.body || {};

    // -----------------------------------------------------
    // VALIDATE REQUIRED FIELDS
    // -----------------------------------------------------

    if (!resetToken || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    // -----------------------------------------------------
    // CHECK PASSWORD MATCH
    // -----------------------------------------------------

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match",
      });
    }

    // -----------------------------------------------------
    // CHECK PASSWORD LENGTH
    // -----------------------------------------------------

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters",
      });
    }

    // -----------------------------------------------------
    // GET RESET DATA
    // -----------------------------------------------------

    const resetData = await getPasswordResetUser(resetToken);

    // -----------------------------------------------------
    // INVALID / EXPIRED TOKEN
    // -----------------------------------------------------

    if (!resetData) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset token",
      });
    }

    // -----------------------------------------------------
    // FIND USER
    // -----------------------------------------------------

    const user = await UserModel.findById(resetData.userId);

    // -----------------------------------------------------
    // USER DOES NOT EXIST
    // -----------------------------------------------------

    if (!user) {
      // Remove invalid reset token.
      await deletePasswordResetToken(resetData.key);

      return res.status(400).json({
        success: false,
        message: "Invalid password reset request",
      });
    }

    // -----------------------------------------------------
    // HASH NEW PASSWORD
    // -----------------------------------------------------

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // -----------------------------------------------------
    // UPDATE USER PASSWORD
    // -----------------------------------------------------

    user.password = hashedPassword;

    await user.save();

    // -----------------------------------------------------
    // DELETE RESET TOKEN
    // -----------------------------------------------------

    // Token is single-use.
    await deletePasswordResetToken(resetData.key);

    // -----------------------------------------------------
    // SUCCESS RESPONSE
    // -----------------------------------------------------

    return res.status(200).json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (error) {
    // -----------------------------------------------------
    // ERROR
    // -----------------------------------------------------

    console.error("Reset Password Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

// =========================================================
// EXPORT
// =========================================================

module.exports = {
  ResetPasswordController,
};
