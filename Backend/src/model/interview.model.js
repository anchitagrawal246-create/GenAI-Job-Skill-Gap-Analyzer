const mongoose = require("mongoose");

// ============================================================
// INTERVIEW SCHEMA
// ============================================================

const interviewSchema = new mongoose.Schema(
  {
    // ==========================================================
    // USER
    // ==========================================================

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // ==========================================================
    // INTERVIEW TITLE
    // ==========================================================

    title: {
      type: String,
      trim: true,
      maxlength: 150,
      default: "AI Interview",
    },

    // ==========================================================
    // TARGET ROLE
    // ==========================================================

    role: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    // ==========================================================
    // AI ESTIMATED EXPERIENCE LEVEL
    // ==========================================================

    // This is determined from demonstrated performance.
    // It is NOT provided by the candidate.

    estimatedExperienceLevel: {
      type: String,
      enum: ["fresher", "junior", "mid", "senior"],
      default: null,
    },

    // ==========================================================
    // AI EXPERIENCE CONFIDENCE
    // ==========================================================

    experienceConfidence: {
      type: Number,
      min: 0,
      max: 100,
      default: null,
    },

    // ==========================================================
    // INTERVIEW TYPE
    // ==========================================================

    interviewType: {
      type: String,
      enum: ["technical", "behavioral", "mixed", "coding", "system-design"],
      required: true,
      trim: true,
    },

    // ==========================================================
    // DIFFICULTY MODE
    // ==========================================================

    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard", "adaptive"],
      default: "adaptive",
      trim: true,
    },

    // ==========================================================
    // CURRENT AI DIFFICULTY
    // ==========================================================

    // Actual difficulty being used for the next/latest question.

    currentDifficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "medium",
    },

    // ==========================================================
    // TECHNOLOGIES / SKILLS
    // ==========================================================

    technologies: {
      type: [String],
      default: [],
      validate: {
        validator: function (technologies) {
          return Array.isArray(technologies) && technologies.length <= 30;
        },
        message: "Maximum 30 technologies are allowed",
      },
    },

    // ==========================================================
    // QUESTIONS GENERATED
    // ==========================================================

    totalQuestions: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },

    // ==========================================================
    // QUESTIONS COMPLETED
    // ==========================================================

    completedQuestions: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },

    // ==========================================================
    // INTERVIEW STATUS
    // ==========================================================

    status: {
      type: String,
      enum: ["created", "in-progress", "completed", "cancelled"],
      default: "created",
      index: true,
    },

    // ==========================================================
    // EXIT REASON
    // ==========================================================

    exitReason: {
      type: String,
      enum: [
        "user-exit",
        "page-closed",
        "maximum-reached",
        "completed",
        "system-error",
        null,
      ],
      default: null,
    },

    // ==========================================================
    // START TIME
    // ==========================================================

    startedAt: {
      type: Date,
      default: null,
    },

    // ==========================================================
    // COMPLETION TIME
    // ==========================================================

    completedAt: {
      type: Date,
      default: null,
    },

    // ==========================================================
    // FINAL SCORE
    // ==========================================================

    overallScore: {
      type: Number,
      min: 0,
      max: 100,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

// ============================================================
// INDEXES
// ============================================================

// User's latest interviews
interviewSchema.index({
  user: 1,
  createdAt: -1,
});

// Find active interviews
interviewSchema.index({
  user: 1,
  status: 1,
});

// ============================================================
// DOCUMENT VALIDATION / NORMALIZATION
// ============================================================

interviewSchema.pre("validate", function () {
  // ----------------------------------------------------------
  // SAFE QUESTION COUNTS
  // ----------------------------------------------------------

  if (
    typeof this.completedQuestions !== "number" ||
    !Number.isFinite(this.completedQuestions)
  ) {
    this.completedQuestions = 0;
  }

  if (
    typeof this.totalQuestions !== "number" ||
    !Number.isFinite(this.totalQuestions)
  ) {
    this.totalQuestions = 0;
  }

  // ----------------------------------------------------------
  // PREVENT NEGATIVE VALUES
  // ----------------------------------------------------------

  if (this.completedQuestions < 0) {
    this.completedQuestions = 0;
  }

  if (this.totalQuestions < 0) {
    this.totalQuestions = 0;
  }

  // ----------------------------------------------------------
  // HARD MAXIMUM = 100
  // ----------------------------------------------------------

  if (this.totalQuestions > 100) {
    this.totalQuestions = 100;
  }

  if (this.completedQuestions > 100) {
    this.completedQuestions = 100;
  }

  // ----------------------------------------------------------
  // COMPLETED QUESTIONS CANNOT EXCEED GENERATED QUESTIONS
  // ----------------------------------------------------------

  if (this.completedQuestions > this.totalQuestions) {
    this.completedQuestions = this.totalQuestions;
  }

  // ----------------------------------------------------------
  // STARTED INTERVIEW MUST HAVE startedAt
  // ----------------------------------------------------------

  if (this.status === "in-progress" && !this.startedAt) {
    this.startedAt = new Date();
  }

  // ----------------------------------------------------------
  // COMPLETED INTERVIEW MUST HAVE completedAt
  // ----------------------------------------------------------

  if (this.status === "completed" && !this.completedAt) {
    this.completedAt = new Date();
  }

  // ----------------------------------------------------------
  // COMPLETED INTERVIEW
  // ----------------------------------------------------------

  if (this.status === "completed") {
    this.exitReason = "completed";
  }

  // ----------------------------------------------------------
  // CANCELLED INTERVIEW
  // ----------------------------------------------------------

  if (this.status === "cancelled" && !this.exitReason) {
    this.exitReason = "user-exit";
  }
});

// ============================================================
// EXPORT
// ============================================================

module.exports = mongoose.model("Interview", interviewSchema);
