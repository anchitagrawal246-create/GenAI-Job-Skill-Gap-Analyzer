
// ============================================================
// INTERVIEW CONTROLLER AGGREGATOR
// ============================================================
//
// Routes DO NOT need to change.
//
// This file preserves the old controller API while the actual
// controller logic is separated into smaller files.
//
// ============================================================

const lifecycleController = require("./interview.lifecycle");
const questionController = require("./question.controller");
const answerController = require("./answer.controller");
const evaluationController = require("./evaluation.controller");
const reportController = require("./report.controller");

// ============================================================
// EXPORT ALL CONTROLLERS
// ============================================================

module.exports = {
  // ----------------------------------------------------------
  // INTERVIEW LIFECYCLE
  // ----------------------------------------------------------
  ...lifecycleController,

  // ----------------------------------------------------------
  // QUESTIONS
  // ----------------------------------------------------------
  ...questionController,

  // ----------------------------------------------------------
  // ANSWERS
  // ----------------------------------------------------------
  ...answerController,

  // ----------------------------------------------------------
  // EVALUATION
  // ----------------------------------------------------------
  ...evaluationController,

  // ----------------------------------------------------------
  // REPORTS
  // ----------------------------------------------------------
  ...reportController,
};
