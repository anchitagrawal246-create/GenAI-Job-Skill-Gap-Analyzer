const mongoose = require("mongoose");

// ============================================================
// CONSTANTS
// ============================================================

const MAX_QUESTIONS = 100;

const QUESTION_CATEGORIES = [
  "technical",
  "behavioral",
  "coding",
  "debugging",
  "system-design",
  "scenario",
  "dsa",
  "general",
];

const QUESTION_DIFFICULTIES = [
  "very-easy",
  "easy",
  "medium",
  "hard",
  "very-hard",
];

const QUESTION_STATUSES = ["pending", "answered", "skipped"];

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
      max: MAX_QUESTIONS,
    },

    // ==========================================================
    // QUESTION TEXT
    // ==========================================================

    question: {
      type: String,
      required: true,
      trim: true,
      minlength: 5,
      maxlength: 5000,
    },

    // ==========================================================
    // QUESTION CATEGORY
    // ==========================================================

    category: {
      type: String,
      enum: QUESTION_CATEGORIES,
      default: "technical",
      trim: true,
      index: true,
    },

    // ==========================================================
    // QUESTION DIFFICULTY
    // ==========================================================

    difficulty: {
      type: String,
      enum: QUESTION_DIFFICULTIES,
      default: "medium",
      trim: true,
      index: true,
    },

    // ==========================================================
    // PRIMARY SKILL / TECHNOLOGY
    // ==========================================================

    skill: {
      type: String,
      trim: true,
      maxlength: 100,
      default: null,
      index: true,
    },

    // ==========================================================
    // EXPECTED TOPICS
    // ==========================================================

    expectedTopics: {
      type: [String],
      default: [],
      validate: {
        validator: function (topics) {
          return Array.isArray(topics) && topics.length <= 20;
        },
        message: "A maximum of 20 expected topics is allowed",
      },
    },

    // ==========================================================
    // QUESTION STATUS
    // ==========================================================

    // pending
    //   Question has not been answered or skipped.
    //
    // answered
    //   Candidate has submitted an answer.
    //
    // skipped
    //   Candidate skipped the question but can answer it later.
    //
    // IMPORTANT:
    // skipped DOES NOT mean permanently skipped.
    // A skipped question can later become answered.

    status: {
      type: String,
      enum: QUESTION_STATUSES,
      default: "pending",
      index: true,
    },

    // ==========================================================
    // ANSWERED INFORMATION
    // ==========================================================

    answeredAt: {
      type: Date,
      default: null,
    },

    // ==========================================================
    // SKIPPED INFORMATION
    // ==========================================================

    skippedAt: {
      type: Date,
      default: null,
    },

    skipReason: {
      type: String,
      trim: true,
      maxlength: 500,
      default: null,
    },

    // ==========================================================
    // EXPECTED / IDEAL ANSWER
    // ==========================================================

    // Generated when the question is created.
    //
    // IMPORTANT:
    // This must remain unchanged during re-evaluation.

    idealAnswer: {
      type: String,
      trim: true,
      maxlength: 15000,
      default: null,
    },

    // ==========================================================
    // EXPLANATION
    // ==========================================================

    explanation: {
      type: String,
      trim: true,
      maxlength: 15000,
      default: null,
    },

    // ==========================================================
    // CORRECT / OPTIMAL SOLUTION
    // ==========================================================

    solution: {
      type: String,
      maxlength: 30000,
      default: null,
    },

    // ==========================================================
    // COMPLEXITY
    // ==========================================================

    complexity: {
      time: {
        type: String,
        trim: true,
        maxlength: 500,
        default: null,
      },

      space: {
        type: String,
        trim: true,
        maxlength: 500,
        default: null,
      },
    },

    // ==========================================================
    // CODING QUESTION DATA
    // ==========================================================

    coding: {
      language: {
        type: String,
        trim: true,
        maxlength: 50,
        default: null,
      },

      functionName: {
        type: String,
        trim: true,
        maxlength: 150,
        default: null,
      },

      functionSignature: {
        type: String,
        maxlength: 1000,
        default: null,
      },

      starterCode: {
        type: String,
        maxlength: 30000,
        default: null,
      },

      inputFormat: {
        type: String,
        maxlength: 5000,
        default: null,
      },

      outputFormat: {
        type: String,
        maxlength: 5000,
        default: null,
      },

      examples: {
        type: [
          {
            input: {
              type: String,
              default: "",
              maxlength: 5000,
            },

            output: {
              type: String,
              default: "",
              maxlength: 5000,
            },

            explanation: {
              type: String,
              default: "",
              maxlength: 5000,
            },
          },
        ],
        default: [],
      },

      constraints: {
        type: [String],
        default: [],
      },

      // ========================================================
      // TEST CASES
      // ========================================================

      testCases: {
        type: [
          {
            input: {
              type: mongoose.Schema.Types.Mixed,
              default: null,
            },

            expectedOutput: {
              type: mongoose.Schema.Types.Mixed,
              default: null,
            },

            hidden: {
              type: Boolean,
              default: true,
            },
          },
        ],
        default: [],
      },
    },

    // ==========================================================
    // DEBUGGING QUESTION DATA
    // ==========================================================

    debugging: {
      language: {
        type: String,
        trim: true,
        maxlength: 50,
        default: null,
      },

      buggyCode: {
        type: String,
        maxlength: 30000,
        default: null,
      },

      bugDescription: {
        type: String,
        maxlength: 5000,
        default: null,
      },

      expectedBehavior: {
        type: String,
        maxlength: 5000,
        default: null,
      },

      knownBugTypes: {
        type: [String],
        default: [],
      },

      testCases: {
        type: [
          {
            input: {
              type: mongoose.Schema.Types.Mixed,
              default: null,
            },

            expectedOutput: {
              type: mongoose.Schema.Types.Mixed,
              default: null,
            },

            hidden: {
              type: Boolean,
              default: true,
            },
          },
        ],
        default: [],
      },
    },

    // ==========================================================
    // FOLLOW-UP QUESTION
    // ==========================================================

    isFollowUp: {
      type: Boolean,
      default: false,
      index: true,
    },

    // ==========================================================
    // FOLLOW-UP REFERENCE
    // ==========================================================

    followUpToQuestion: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Question",
      default: null,
      index: true,
    },

    // ==========================================================
    // AI GENERATION METADATA
    // ==========================================================

    generation: {
      provider: {
        type: String,
        default: null,
        maxlength: 50,
      },

      model: {
        type: String,
        default: null,
        maxlength: 150,
      },

      promptVersion: {
        type: String,
        default: null,
        maxlength: 100,
      },

      generatedAt: {
        type: Date,
        default: Date.now,
      },
    },

    // ==========================================================
    // ADAPTIVE INTERVIEW METADATA
    // ==========================================================

    adaptive: {
      generatedBecause: {
        type: String,
        enum: [
          "initial-question",
          "correct-answer",
          "incorrect-answer",
          "partial-answer",
          "strong-performance",
          "weak-performance",
          "skill-gap",
          "difficulty-increase",
          "difficulty-decrease",
          "skill-focus",
          "follow-up",
          "manual",
          null,
        ],
        default: null,
      },

      previousDifficulty: {
        type: String,
        enum: ["very-easy", "easy", "medium", "hard", "very-hard", null],
        default: null,
      },

      targetDifficulty: {
        type: String,
        enum: ["very-easy", "easy", "medium", "hard", "very-hard", null],
        default: null,
      },

      basedOnQuestionNumber: {
        type: Number,
        min: 1,
        max: MAX_QUESTIONS,
        default: null,
      },

      basedOnScore: {
        type: Number,
        min: 0,
        max: 100,
        default: null,
      },

      targetSkill: {
        type: String,
        trim: true,
        maxlength: 100,
        default: null,
      },
    },

    // ==========================================================
    // QUESTION SNAPSHOT VERSION
    // ==========================================================

    // The exact question shown to the candidate.
    //
    // Re-evaluation must NOT regenerate or modify this question.

    snapshotVersion: {
      type: Number,
      required: true,
      default: 1,
      min: 1,
    },
  },

  {
    timestamps: true,
  },
);

// ============================================================
// INDEXES
// ============================================================

// One question number per interview.

questionSchema.index(
  {
    interview: 1,
    questionNumber: 1,
  },
  {
    unique: true,
  },
);

// Find questions by status.

questionSchema.index({
  interview: 1,
  status: 1,
});

// Find questions by skill.

questionSchema.index({
  interview: 1,
  skill: 1,
});

// Find questions by category.

questionSchema.index({
  interview: 1,
  category: 1,
});

// Adaptive/follow-up lookup.

questionSchema.index({
  interview: 1,
  isFollowUp: 1,
});

// Latest question ordering.

questionSchema.index({
  interview: 1,
  questionNumber: -1,
});

// ============================================================
// HELPERS
// ============================================================

const normalizeStringArray = (value, max = 20) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return [
    ...new Set(
      value
        .filter((item) => typeof item === "string" && item.trim().length > 0)
        .map((item) => item.trim()),
    ),
  ].slice(0, max);
};

// ============================================================
// VALIDATION / NORMALIZATION
// ============================================================

questionSchema.pre("validate", function () {
  // ==========================================================
  // QUESTION NUMBER
  // ==========================================================

  if (
    !Number.isInteger(this.questionNumber) ||
    this.questionNumber < 1 ||
    this.questionNumber > MAX_QUESTIONS
  ) {
    return next(
      new Error(`Question number must be between 1 and ${MAX_QUESTIONS}`),
    );
  }

  // ==========================================================
  // EXPECTED TOPICS
  // ==========================================================

  this.expectedTopics = normalizeStringArray(this.expectedTopics, 20);

  // ==========================================================
  // SKILL
  // ==========================================================

  if (typeof this.skill === "string") {
    this.skill = this.skill.trim();

    if (!this.skill.length) {
      this.skill = null;
    }
  }

  // ==========================================================
  // ADAPTIVE TARGET SKILL
  // ==========================================================

  if (this.adaptive && typeof this.adaptive.targetSkill === "string") {
    this.adaptive.targetSkill = this.adaptive.targetSkill.trim() || null;
  }

  // ==========================================================
  // CODING QUESTION
  // ==========================================================

  if (this.category === "coding" || this.category === "dsa") {
    if (!this.coding) {
      this.coding = {};
    }

    if (Array.isArray(this.coding.constraints)) {
      this.coding.constraints = normalizeStringArray(
        this.coding.constraints,
        30,
      );
    }
  }

  // ==========================================================
  // DEBUGGING QUESTION
  // ==========================================================

  if (this.category === "debugging") {
    if (!this.debugging) {
      this.debugging = {};
    }

    if (Array.isArray(this.debugging.knownBugTypes)) {
      this.debugging.knownBugTypes = normalizeStringArray(
        this.debugging.knownBugTypes,
        20,
      );
    }
  }

  // ==========================================================
  // STATUS MANAGEMENT
  // ==========================================================

  // ----------------------------------------------------------
  // PENDING
  // ----------------------------------------------------------

  if (this.status === "pending") {
    this.answeredAt = null;
    this.skippedAt = null;
    this.skipReason = null;
  }

  // ----------------------------------------------------------
  // ANSWERED
  // ----------------------------------------------------------

  // IMPORTANT:
  //
  // A skipped question can later become answered.
  //
  // Example:
  //
  // skipped
  //    ↓
  // candidate comes back later
  //    ↓
  // answered
  //
  // When that happens, remove the old skip information.

  if (this.status === "answered") {
    if (!this.answeredAt) {
      this.answeredAt = new Date();
    }

    this.skippedAt = null;
    this.skipReason = null;
  }

  // ----------------------------------------------------------
  // SKIPPED
  // ----------------------------------------------------------

  if (this.status === "skipped") {
    if (!this.skippedAt) {
      this.skippedAt = new Date();
    }

    this.answeredAt = null;
  }

  // ==========================================================
  // FOLLOW-UP VALIDATION
  // ==========================================================

  if (!this.isFollowUp) {
    this.followUpToQuestion = null;
  }

  if (this.isFollowUp && !this.followUpToQuestion) {
    return next(
      new Error("A follow-up question must reference the previous question"),
    );
  }

  // ==========================================================
  // SNAPSHOT VERSION
  // ==========================================================

  if (!Number.isInteger(this.snapshotVersion) || this.snapshotVersion < 1) {
    this.snapshotVersion = 1;
  }


});

// ============================================================
// EXPORT
// ============================================================

module.exports = mongoose.model("Question", questionSchema);
