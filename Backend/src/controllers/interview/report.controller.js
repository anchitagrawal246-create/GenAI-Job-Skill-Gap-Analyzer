const interviewService = require("../../services/interview/interview.service");

const { debugError, getUserId, getErrorStatus } = require("./interview.utils");

// ============================================================
// GET REPORT
// ============================================================

const getInterviewReport = async (req, res) => {
  try {
    const report = await interviewService.getInterviewReport(
      getUserId(req),
      req.params.id,
    );

    return res.status(200).json({
      success: true,
      data: report,
    });
  } catch (error) {
    debugError("GET REPORT failed", error);

    return res.status(getErrorStatus(error)).json({
      success: false,
      message: error?.message || "Failed to fetch interview report",
    });
  }
};

// ============================================================
// GENERATE / REGENERATE REPORT
// ============================================================

const generateInterviewReport = async (req, res) => {
  try {
    const report = await interviewService.generateInterviewReport(
      getUserId(req),
      req.params.id,
    );

    return res.status(200).json({
      success: true,
      message: "Interview report generated successfully",
      data: report,
    });
  } catch (error) {
    debugError("GENERATE REPORT failed", error);

    return res.status(getErrorStatus(error)).json({
      success: false,
      message: error?.message || "Failed to generate interview report",
    });
  }
};

module.exports = {
  getInterviewReport,
  generateInterviewReport,
};
