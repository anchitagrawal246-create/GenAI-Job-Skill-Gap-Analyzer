
const express = require("express");

const authMiddleware = require("../../middleware/auth.middleware");
const profileUpload = require("../../middleware/profileUpload.middleware");

const {
  getProfileController,
  updateProfileController,
} = require("../../controllers/profile/profile.controller");

const router = express.Router();

// =========================================================
// GET PROFILE
// GET /api/profile
// =========================================================

router.get(
  "/",
  authMiddleware,
  getProfileController
);

// =========================================================
// UPDATE PROFILE
// PUT /api/profile
// =========================================================

router.put(
  "/",
  authMiddleware,

  profileUpload.fields([
    {
      name: "profilePicture",
      maxCount: 1,
    },
    {
      name: "resume",
      maxCount: 1,
    },
  ]),

  updateProfileController
);

module.exports = router;
