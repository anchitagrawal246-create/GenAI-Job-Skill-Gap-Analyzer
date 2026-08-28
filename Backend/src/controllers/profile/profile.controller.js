
const {
  getProfile,
  updateProfile,
} = require("../../services/profile/profile.service");

// =========================================================
// GET PROFILE
// GET /api/profile
// =========================================================

async function getProfileController(req, res) {
  try {
    const userId = req.user.id;

    const profile = await getProfile(userId);

    return res.status(200).json({
      success: true,
      profile,
    });
  } catch (error) {
    console.error("Get Profile Error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message:
        error.message || "Failed to get profile",
      code:
        error.code || "PROFILE_FETCH_FAILED",
    });
  }
}

// =========================================================
// UPDATE PROFILE
// PUT /api/profile
// =========================================================

async function updateProfileController(req, res) {
  try {
    const userId = req.user.id;

    const result = await updateProfile(
      userId,
      req.body || {},
      req.files || {}
    );

    return res.status(200).json({
      success: true,

      message: "Profile updated successfully",

      profile: {
        ...result.profile.toObject(),
        profileCompletion:
          result.profileCompletion,
      },
    });
  } catch (error) {
    console.error("Update Profile Error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,

      message:
        error.message ||
        "Failed to update profile",

      code:
        error.code ||
        "PROFILE_UPDATE_FAILED",
    });
  }
}

// =========================================================
// EXPORT
// =========================================================

module.exports = {
  getProfileController,
  updateProfileController,
};
