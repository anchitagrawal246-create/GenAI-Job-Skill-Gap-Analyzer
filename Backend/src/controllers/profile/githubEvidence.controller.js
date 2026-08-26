const {
  analyzeGithubEvidence,
  getGithubEvidence,
} = require("../../services/profile/githubEvidence.service");

// =========================================================
// ANALYZE GITHUB
// POST /api/profile/github/analyze
// =========================================================

async function analyzeGithubController(req, res) {
  try {
    const userId = req.user.id;

    const githubEvidence = await analyzeGithubEvidence(userId);

    return res.status(200).json({
      success: true,
      message: "GitHub evidence analyzed successfully",
      githubEvidence,
    });
  } catch (error) {
    console.error("GitHub Evidence Error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to analyze GitHub evidence",
      code: error.code || "GITHUB_EVIDENCE_ANALYSIS_FAILED",
    });
  }
}

// =========================================================
// GET GITHUB EVIDENCE
// GET /api/profile/github/evidence
// =========================================================

async function getGithubEvidenceController(req, res) {
  try {
    const userId = req.user.id;

    const githubEvidence = await getGithubEvidence(userId);

    return res.status(200).json({
      success: true,
      githubEvidence,
    });
  } catch (error) {
    console.error("Get GitHub Evidence Error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to get GitHub evidence",
      code: error.code || "GITHUB_EVIDENCE_FETCH_FAILED",
    });
  }
}

module.exports = {
  analyzeGithubController,
  getGithubEvidenceController,
};
