const UserModel = require("../../model/user.model");

/**
 * @name CheckUsernameController
 * @route GET /api/auth/check-username
 * @description Checks whether a username is available.
 * @access Public
 */
async function CheckUsernameController(req, res) {
  try {
    const username = req.query.username?.trim();

    // ==========================================
    // VALIDATE USERNAME
    // ==========================================

    if (!username) {
      return res.status(400).json({
        success: false,
        available: false,
        message: "Username is required",
      });
    }

    if (username.length < 3) {
      return res.status(200).json({
        success: true,
        available: false,
        message: "Username must be at least 3 characters",
      });
    }

    // ==========================================
    // CHECK USERNAME
    // Case-insensitive
    // ==========================================

    const existingUser = await UserModel.findOne({
      username: {
        $regex: `^${username.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
        $options: "i",
      },
    }).lean();

    // ==========================================
    // USERNAME EXISTS
    // ==========================================

    if (existingUser) {
      return res.status(200).json({
        success: true,
        available: false,
        message: "Username already exists",
      });
    }

    // ==========================================
    // USERNAME AVAILABLE
    // ==========================================

    return res.status(200).json({
      success: true,
      available: true,
      message: "Username is available",
    });
  } catch (error) {
    console.error("Check Username Error:", error);

    return res.status(500).json({
      success: false,
      available: false,
      message: "Internal server error",
    });
  }
}

module.exports = {
  CheckUsernameController,
};
