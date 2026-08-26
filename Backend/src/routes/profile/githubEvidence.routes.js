const express = require("express");

const authMiddleware = require("../../middleware/auth.middleware");

const {
  analyzeGithubController,
  getGithubEvidenceController,
} = require("../../controllers/profile/githubEvidence.controller");

const router = express.Router();

// =========================================================
// ANALYZE GITHUB
// POST /api/profile/github/analyze
// =========================================================

router.post("/analyze", authMiddleware, analyzeGithubController);

// =========================================================
// GET GITHUB EVIDENCE
// GET /api/profile/github/evidence
// =========================================================

router.get("/evidence", authMiddleware, getGithubEvidenceController);

// =========================================================
// EXPORT
// =========================================================

module.exports = router;
