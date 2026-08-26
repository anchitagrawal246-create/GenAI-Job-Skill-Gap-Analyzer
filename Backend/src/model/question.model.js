
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
      max: 100,
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
          return Array.isArray(topics) && topics.length <= 10;
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

// Useful when checking pending / answered questions.
questionSchema.index({
  interview: 1,
  status: 1,
});

// ============================================================
// NORMALIZE EXPECTED TOPICS
// ============================================================
//
// IMPORTANT:
// Do NOT use next() here.
// ============================================================

questionSchema.pre("validate", function () {
  // Normalize expected topics.
  if (Array.isArray(this.expectedTopics)) {
    this.expectedTopics = this.expectedTopics
      .filter(
        (topic) =>
          typeof topic === "string" && topic.trim().length > 0
      )
      .map((topic) => topic.trim())
      .slice(0, 10);
  }

  // Safety check.
  if (this.questionNumber > 100) {
    throw new Error(
      "An interview cannot contain more than 100 questions"
    );
  }
});

// ============================================================
// EXPORT
// ============================================================

module.exports = mongoose.model("Question", questionSchema);
