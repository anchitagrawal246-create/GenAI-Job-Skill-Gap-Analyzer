
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
    // EXPERIENCE LEVEL
    // ==========================================================

    experienceLevel: {
      type: String,
      enum: ["fresher", "junior", "mid", "senior"],
      required: true,
      trim: true,
    },

    // ==========================================================
    // INTERVIEW TYPE
    // ==========================================================

    interviewType: {
      type: String,
      enum: [
        "technical",
        "behavioral",
        "mixed",
        "coding",
        "system-design",
      ],
      required: true,
      trim: true,
    },

    // ==========================================================
    // DIFFICULTY
    // ==========================================================

    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "medium",
      trim: true,
    },

    // ==========================================================
    // TECHNOLOGIES
    // ==========================================================

    technologies: {
      type: [String],
      default: [],
      validate: {
        validator: function (technologies) {
          return technologies.length <= 30;
        },
        message: "Maximum 30 technologies are allowed",
      },
    },

    // ==========================================================
    // QUESTION CONFIGURATION
    // ==========================================================

    totalQuestions: {
      type: Number,
      min: 1,
      max: 50,
      default: 10,
    },

    completedQuestions: {
      type: Number,
      min: 0,
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
    // TIMESTAMPS
    // ==========================================================

    startedAt: {
      type: Date,
      default: null,
    },

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
  }
);

// ============================================================
// INDEXES
// ============================================================

// Quickly fetch a user's interviews sorted by creation date.
interviewSchema.index({
  user: 1,
  createdAt: -1,
});

// Quickly find active interviews for a user.
interviewSchema.index({
  user: 1,
  status: 1,
});

// ============================================================
// VALIDATION
// ============================================================

interviewSchema.pre("validate", function () {
  // ----------------------------------------------------------
  // completedQuestions cannot exceed totalQuestions
  // ----------------------------------------------------------

  if (this.completedQuestions > this.totalQuestions) {
    throw new Error(
      "Completed questions cannot exceed total questions"
    );
  }

  // ----------------------------------------------------------
  // Completed interview must have completedAt
  // ----------------------------------------------------------

  if (this.status === "completed" && !this.completedAt) {
    throw new Error(
      "Completed interview must have completedAt"
    );
  }

  // ----------------------------------------------------------
  // In-progress interview must have startedAt
  // ----------------------------------------------------------

  if (this.status === "in-progress" && !this.startedAt) {
    throw new Error(
      "In-progress interview must have startedAt"
    );
  }

  // ----------------------------------------------------------
  // Completed interview must have final score
  // ----------------------------------------------------------

  if (
    this.status === "completed" &&
    this.overallScore === null
  ) {
    throw new Error(
      "Completed interview must have an overall score"
    );
  }
});

// ============================================================
// EXPORT
// ============================================================

module.exports = mongoose.model("Interview", interviewSchema);
