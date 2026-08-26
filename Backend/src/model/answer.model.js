const mongoose = require("mongoose");

// ============================================================
// ANSWER SCHEMA
// ============================================================

const answerSchema = new mongoose.Schema(
  {
    // ==========================================================
    // REFERENCES
    // ==========================================================

    interview: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Interview",
      required: true,
      index: true,
    },

    question: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Question",
      required: true,
      index: true,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // ==========================================================
    // CANDIDATE ANSWER
    // ==========================================================

    answerText: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 20000,
    },

    // ==========================================================
    // SUBMISSION TIME
    // ==========================================================

    submittedAt: {
      type: Date,
      default: Date.now,
    },

    // ==========================================================
    // AI EVALUATION STATUS
    // ==========================================================

    evaluationStatus: {
      type: String,
      enum: ["pending", "processing", "completed", "failed"],
      default: "pending",
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

// ============================================================
// UNIQUE ANSWER PER QUESTION
// ============================================================
//
// One interview question = one submitted answer.
//
// interview + question = unique
//
// ============================================================

answerSchema.index(
  {
    interview: 1,
    question: 1,
  },
  {
    unique: true,
  },
);

// ============================================================
// USER INTERVIEW LOOKUP
// ============================================================

answerSchema.index({
  user: 1,
  interview: 1,
});

// ============================================================
// EVALUATION QUEUE LOOKUP
// ============================================================

answerSchema.index({
  interview: 1,
  evaluationStatus: 1,
});

// ============================================================
// EXPORT
// ============================================================

module.exports = mongoose.model("Answer", answerSchema);
