
const mongoose = require("mongoose");

// ============================================================
// QUESTION SCHEMA
// ============================================================

const questionSchema = new mongoose.Schema(
  {
    // ==========================================================
    // INTERVIEW REFERENCE
    // ==========================================================

    interview: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Interview",
      required: true,
      index: true,
    },

    // ==========================================================
    // QUESTION NUMBER
    // ==========================================================

    questionNumber: {
      type: Number,
      required: true,
      min: 1,
    },

    // ==========================================================
    // QUESTION TEXT
    // ==========================================================

    question: {
      type: String,
      required: true,
      trim: true,
      minlength: 5,
      maxlength: 2000,
    },

    // ==========================================================
    // QUESTION CATEGORY
    // ==========================================================

    category: {
      type: String,
      enum: [
        "technical",
        "behavioral",
        "coding",
        "system-design",
        "general",
      ],
      default: "technical",
      trim: true,
    },

    // ==========================================================
    // QUESTION DIFFICULTY
    // ==========================================================

    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "medium",
      trim: true,
    },

    // ==========================================================
    // EXPECTED TOPICS
    // ==========================================================

    expectedTopics: {
      type: [String],
      default: [],
      validate: {
        validator: function (topics) {
          return topics.length <= 10;
        },
        message: "A maximum of 10 expected topics is allowed",
      },
    },

    // ==========================================================
    // QUESTION STATUS
    // ==========================================================

    status: {
      type: String,
      enum: ["pending", "answered", "skipped"],
      default: "pending",
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// ============================================================
// INDEXES
// ============================================================

// Every question number must be unique inside an interview.

questionSchema.index(
  {
    interview: 1,
    questionNumber: 1,
  },
  {
    unique: true,
  }
);

// Useful when checking pending/answered questions.

questionSchema.index({
  interview: 1,
  status: 1,
});

// ============================================================
// NORMALIZE EXPECTED TOPICS
// ============================================================

questionSchema.pre("validate", function () {
  if (Array.isArray(this.expectedTopics)) {
    this.expectedTopics = this.expectedTopics
      .filter(
        (topic) =>
          typeof topic === "string" &&
          topic.trim().length > 0
      )
      .map((topic) => topic.trim())
      .slice(0, 10);
  }
});

// ============================================================
// EXPORT
// ============================================================

module.exports = mongoose.model("Question", questionSchema);
