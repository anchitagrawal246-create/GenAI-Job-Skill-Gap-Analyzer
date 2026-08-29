
// ============================================================
// INTERVIEW LIFECYCLE CONTROLLER
// ============================================================
//
// Handles:
// - Create interview
// - Get interviews
// - Get interview by ID
// - Start interview
// - Pause interview
// - Resume interview
// - Complete interview
// - Cancel interview
// - Get interview progress
//
// Question, answer, evaluation and report logic belongs in
// their respective controller files.
//
// ============================================================

const interviewService = require("../../services/interview/interview.service");

const {
  debug,
  debugError,
  getUserId,
  getErrorStatus,
} = require("./interview.utils");

// ============================================================
// CREATE INTERVIEW
// POST /api/interviews
// ============================================================

const createInterview = async (req, res) => {
  try {
    const userId = getUserId(req);
    const body = req.body || {};

    debug("CREATE", {
      userId: String(userId),
      body,
    });

    const interview = await interviewService.createInterview(
      userId,
      body
    );

    return res.status(201).json({
      success: true,
      message: "Interview created successfully",
      data: interview,
    });
  } catch (error) {
    debugError("CREATE failed", error);

    return res.status(getErrorStatus(error)).json({
      success: false,
      message:
        error?.message || "Failed to create interview",
    });
  }
};

// ============================================================
// GET USER INTERVIEWS
// GET /api/interviews
// ============================================================

const getInterviews = async (req, res) => {
  try {
    const userId = getUserId(req);

    debug("GET ALL INTERVIEWS", {
      userId: String(userId),
    });

    const interviews =
      await interviewService.getUserInterviews(userId);

    return res.status(200).json({
      success: true,
      data: interviews,
    });
  } catch (error) {
    debugError("GET ALL failed", error);

    return res.status(getErrorStatus(error)).json({
      success: false,
      message:
        error?.message || "Failed to fetch interviews",
    });
  }
};

// ============================================================
// GET INTERVIEW BY ID
// GET /api/interviews/:id
// ============================================================

const getInterview = async (req, res) => {
  try {
    const userId = getUserId(req);
    const interviewId = req.params.id;

    const interview =
      await interviewService.getInterviewById(
        userId,
        interviewId
      );

    if (!interview) {
      return res.status(404).json({
        success: false,
        message: "Interview not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: interview,
    });
  } catch (error) {
    debugError("GET INTERVIEW failed", error);

    return res.status(getErrorStatus(error)).json({
      success: false,
      message:
        error?.message || "Failed to fetch interview",
    });
  }
};

// ============================================================
// START INTERVIEW
// POST /api/interviews/:id/start
// ============================================================

const startInterview = async (req, res) => {
  try {
    const userId = getUserId(req);
    const interviewId = req.params.id;

    debug("START", {
      userId: String(userId),
      interviewId: String(interviewId),
    });

    const interview =
      await interviewService.startInterview(
        userId,
        interviewId
      );

    return res.status(200).json({
      success: true,
      message: "Interview started successfully",
      data: interview,
    });
  } catch (error) {
    debugError("START failed", error);

    return res.status(getErrorStatus(error)).json({
      success: false,
      message:
        error?.message || "Failed to start interview",
    });
  }
};

// ============================================================
// RESUME INTERVIEW
// POST /api/interviews/:id/resume
// ============================================================

const resumeInterview = async (req, res) => {
  try {
    const userId = getUserId(req);
    const interviewId = req.params.id;

    debug("RESUME", {
      userId: String(userId),
      interviewId: String(interviewId),
    });

    const result =
      await interviewService.resumeInterview(
        userId,
        interviewId
      );

    return res.status(200).json({
      success: true,
      message: "Interview resumed successfully",
      data: result,
    });
  } catch (error) {
    debugError("RESUME failed", error);

    return res.status(getErrorStatus(error)).json({
      success: false,
      message:
        error?.message || "Failed to resume interview",
    });
  }
};

// ============================================================
// PAUSE INTERVIEW
// POST /api/interviews/:id/pause
// ============================================================

const pauseInterview = async (req, res) => {
  try {
    const userId = getUserId(req);
    const interviewId = req.params.id;

    const reason =
      typeof req.body?.reason === "string" &&
      req.body.reason.trim()
        ? req.body.reason.trim()
        : "paused";

    debug("PAUSE", {
      userId: String(userId),
      interviewId: String(interviewId),
      reason,
    });

    const interview =
      await interviewService.pauseInterview(
        userId,
        interviewId,
        reason
      );

    return res.status(200).json({
      success: true,
      message: "Interview paused successfully",
      data: interview,
    });
  } catch (error) {
    debugError("PAUSE failed", error);

    return res.status(getErrorStatus(error)).json({
      success: false,
      message:
        error?.message || "Failed to pause interview",
    });
  }
};

// ============================================================
// COMPLETE INTERVIEW
// POST /api/interviews/:id/complete
// ============================================================

const completeInterview = async (req, res) => {
  try {
    const userId = getUserId(req);
    const interviewId = req.params.id;

    const result =
      await interviewService.completeInterview(
        userId,
        interviewId
      );

    return res.status(200).json({
      success: true,
      message: "Interview completed successfully",
      data: result,
    });
  } catch (error) {
    debugError("COMPLETE failed", error);

    return res.status(getErrorStatus(error)).json({
      success: false,
      message:
        error?.message || "Failed to complete interview",
    });
  }
};

// ============================================================
// CANCEL INTERVIEW
// POST /api/interviews/:id/cancel
// ============================================================

const cancelInterview = async (req, res) => {
  try {
    const userId = getUserId(req);
    const interviewId = req.params.id;

    const exitReason =
      typeof req.body?.exitReason === "string" &&
      req.body.exitReason.trim()
        ? req.body.exitReason.trim()
        : "user-exit";

    const interview =
      await interviewService.cancelInterview(
        userId,
        interviewId,
        exitReason
      );

    return res.status(200).json({
      success: true,
      message: "Interview cancelled successfully",
      data: interview,
    });
  } catch (error) {
    debugError("CANCEL failed", error);

    return res.status(getErrorStatus(error)).json({
      success: false,
      message:
        error?.message || "Failed to cancel interview",
    });
  }
};

// ============================================================
// GET INTERVIEW PROGRESS
// GET /api/interviews/:id/progress
// ============================================================

const getInterviewProgress = async (req, res) => {
  try {
    const userId = getUserId(req);
    const interviewId = req.params.id;

    const progress =
      await interviewService.getInterviewProgress(
        userId,
        interviewId
      );

    return res.status(200).json({
      success: true,
      data: progress,
    });
  } catch (error) {
    debugError("PROGRESS failed", error);

    return res.status(getErrorStatus(error)).json({
      success: false,
      message:
        error?.message ||
        "Failed to fetch interview progress",
    });
  }
};

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  createInterview,
  getInterviews,
  getInterview,
  startInterview,
  resumeInterview,
  pauseInterview,
  completeInterview,
  cancelInterview,
  getInterviewProgress,
};
