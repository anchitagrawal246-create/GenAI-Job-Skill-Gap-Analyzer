const mongoose = require("mongoose");

// ============================================================
// EVALUATION SCHEMA
// ============================================================

const evaluationSchema = new mongoose.Schema(
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

    answer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Answer",
      required: true,
      index: true,
    },

    // ==========================================================
    // EVALUATION TYPE
    // ==========================================================

    evaluationType: {
      type: String,
      enum: ["original", "re-evaluation"],
      required: true,
      default: "original",
      index: true,
    },

    // ==========================================================
    // VERSION
    //
    // original      -> v1
    // re-evaluation -> v2, v3, v4...
    // ==========================================================

    version: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
      index: true,
    },

    // ==========================================================
    // PREVIOUS EVALUATION
    // ==========================================================

    previousEvaluation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Evaluation",
      default: null,
      index: true,
    },

    // ==========================================================
    // SCORES
    // ==========================================================

    correctnessScore: {
      type: Number,
      min: 0,
      max: 100,
      required: true,
    },

    technicalScore: {
      type: Number,
      min: 0,
      max: 100,
      required: true,
    },

    communicationScore: {
      type: Number,
      min: 0,
      max: 100,
      required: true,
    },

    problemSolvingScore: {
      type: Number,
      min: 0,
      max: 100,
      required: true,
    },

    overallScore: {
      type: Number,
      min: 0,
      max: 100,
      required: true,
      index: true,
    },

    // ==========================================================
    // SCORE BREAKDOWN
    // ==========================================================

    scoreBreakdown: {
      correctness: {
        type: Number,
        min: 0,
        max: 100,
        default: null,
      },

      technicalKnowledge: {
        type: Number,
        min: 0,
        max: 100,
        default: null,
      },

      communication: {
        type: Number,
        min: 0,
        max: 100,
        default: null,
      },

      problemSolving: {
        type: Number,
        min: 0,
        max: 100,
        default: null,
      },

      depth: {
        type: Number,
        min: 0,
        max: 100,
        default: null,
      },

      relevance: {
        type: Number,
        min: 0,
        max: 100,
        default: null,
      },
    },

    // ==========================================================
    // TECHNOLOGY / SKILL
    // ==========================================================

    technology: {
      type: String,
      trim: true,
      maxlength: 100,
      default: null,
      index: true,
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
        "debugging",
        "system-design",
        "scenario",
        "dsa",
        "general",
      ],
      default: "technical",
      index: true,
    },

    // ==========================================================
    // QUESTION DIFFICULTY
    // ==========================================================

    difficulty: {
      type: String,
      enum: [
        "very-easy",
        "easy",
        "medium",
        "hard",
        "very-hard",
      ],
      default: "medium",
      index: true,
    },

    // ==========================================================
    // STRENGTHS
    // ==========================================================

    strengths: {
      type: [String],
      default: [],

      validate: {
        validator: function (items) {
          return (
            Array.isArray(items) &&
            items.length <= 20
          );
        },

        message: "Maximum 20 strengths are allowed",
      },
    },

    // ==========================================================
    // WEAKNESSES
    // ==========================================================

    weaknesses: {
      type: [String],
      default: [],

      validate: {
        validator: function (items) {
          return (
            Array.isArray(items) &&
            items.length <= 20
          );
        },

        message: "Maximum 20 weaknesses are allowed",
      },
    },

    // ==========================================================
    // MISTAKES
    // ==========================================================

    mistakes: {
      type: [String],
      default: [],

      validate: {
        validator: function (items) {
          return (
            Array.isArray(items) &&
            items.length <= 30
          );
        },

        message: "Maximum 30 mistakes are allowed",
      },
    },

    // ==========================================================
    // CORRECTIONS
    // ==========================================================

    corrections: {
      type: [String],
      default: [],

      validate: {
        validator: function (items) {
          return (
            Array.isArray(items) &&
            items.length <= 30
          );
        },

        message: "Maximum 30 corrections are allowed",
      },
    },

    // ==========================================================
    // SUGGESTIONS
    // ==========================================================

    suggestions: {
      type: [String],
      default: [],

      validate: {
        validator: function (items) {
          return (
            Array.isArray(items) &&
            items.length <= 30
          );
        },

        message: "Maximum 30 suggestions are allowed",
      },
    },

    // ==========================================================
    // STUDY TOPICS
    // ==========================================================

    studyTopics: {
      type: [
        {
          topic: {
            type: String,
            required: true,
            trim: true,
            maxlength: 150,
          },

          priority: {
            type: String,
            enum: ["low", "medium", "high"],
            required: true,
          },
        },
      ],

      default: [],

      validate: {
        validator: function (items) {
          return (
            Array.isArray(items) &&
            items.length <= 30
          );
        },

        message: "Maximum 30 study topics are allowed",
      },
    },

    // ==========================================================
    // OVERALL AI FEEDBACK
    // ==========================================================

    feedback: {
      type: String,
      default: "",
      trim: true,
      maxlength: 5000,
    },

    // ==========================================================
    // AI ESTIMATED PERFORMANCE LEVEL
    // ==========================================================

    estimatedLevel: {
      type: String,
      enum: [
        "beginner",
        "knight",
        "conqueror",
        null,
      ],
      default: null,
      index: true,
    },

    // ==========================================================
    // AI CONFIDENCE
    // ==========================================================

    confidence: {
      type: Number,
      min: 0,
      max: 100,
      default: null,
    },

    // ==========================================================
    // AI PROVIDER
    // ==========================================================

    evaluatedBy: {
      type: String,
      enum: [
        "groq",
        "gemini",
        "deepseek",
        "ollama",
        "openai",
        "manual",
      ],
      required: true,
      index: true,
    },

    // ==========================================================
    // EVALUATION STATUS
    // ==========================================================

    status: {
      type: String,
      enum: [
        "pending",
        "processing",
        "completed",
        "failed",
      ],
      default: "completed",
      index: true,
    },

    // ==========================================================
    // ERROR INFORMATION
    // ==========================================================

    error: {
      code: {
        type: String,
        default: null,
        maxlength: 100,
      },

      message: {
        type: String,
        default: null,
        maxlength: 2000,
      },

      provider: {
        type: String,
        default: null,
        maxlength: 100,
      },

      occurredAt: {
        type: Date,
        default: null,
      },
    },

    // ==========================================================
    // EVALUATION METADATA
    // ==========================================================

    metadata: {
      model: {
        type: String,
        default: null,
        maxlength: 200,
      },

      promptVersion: {
        type: String,
        default: null,
        maxlength: 100,
      },

      processingTimeMs: {
        type: Number,
        min: 0,
        default: null,
      },
    },
  },

  {
    timestamps: true,
  }
);

// ============================================================
// INDEXES
// ============================================================

// ------------------------------------------------------------
// All evaluations belonging to an interview
// ------------------------------------------------------------

evaluationSchema.index({
  interview: 1,
  createdAt: 1,
});

// ------------------------------------------------------------
// Interview + question
// ------------------------------------------------------------

evaluationSchema.index({
  interview: 1,
  question: 1,
});

// ------------------------------------------------------------
// Question evaluation history
// ------------------------------------------------------------

evaluationSchema.index({
  question: 1,
  version: 1,
});

// ------------------------------------------------------------
// Answer evaluation history
// ------------------------------------------------------------

evaluationSchema.index({
  answer: 1,
  createdAt: 1,
});

// ------------------------------------------------------------
// Latest completed evaluation for an answer
// ------------------------------------------------------------

evaluationSchema.index({
  answer: 1,
  status: 1,
  version: -1,
});

// ------------------------------------------------------------
// Technology analysis
// ------------------------------------------------------------

evaluationSchema.index({
  interview: 1,
  technology: 1,
});

// ------------------------------------------------------------
// Category analysis
// ------------------------------------------------------------

evaluationSchema.index({
  interview: 1,
  category: 1,
});

// ------------------------------------------------------------
// Difficulty analysis
// ------------------------------------------------------------

evaluationSchema.index({
  interview: 1,
  difficulty: 1,
});

// ------------------------------------------------------------
// Completed evaluations
// ------------------------------------------------------------

evaluationSchema.index({
  interview: 1,
  status: 1,
});

// ------------------------------------------------------------
// Latest evaluation lookup
// ------------------------------------------------------------

evaluationSchema.index({
  interview: 1,
  question: 1,
  version: -1,
});

// ============================================================
// UNIQUE ORIGINAL EVALUATION
// ============================================================
//
// One answer:
//
// original v1       -> allowed
// original v1 again -> rejected
//
// Re-evaluations:
//
// re-evaluation v2  -> allowed
// re-evaluation v3  -> allowed
// re-evaluation v4  -> allowed
//
// ============================================================

evaluationSchema.index(
  {
    answer: 1,
    evaluationType: 1,
  },
  {
    unique: true,

    partialFilterExpression: {
      evaluationType: "original",
    },
  }
);

// ============================================================
// UNIQUE VERSION PER ANSWER
// ============================================================
//
// answer A + v1 -> allowed
// answer A + v2 -> allowed
// answer A + v3 -> allowed
// answer A + v4 -> allowed
//
// answer A + v2 again -> rejected
//
// ============================================================

evaluationSchema.index(
  {
    answer: 1,
    version: 1,
  },
  {
    unique: true,
  }
);

// ============================================================
// VALIDATION / NORMALIZATION
// ============================================================

evaluationSchema.pre("validate", function () {
  // ==========================================================
  // ORIGINAL EVALUATION
  // ==========================================================

  if (this.evaluationType === "original") {
    this.version = 1;
    this.previousEvaluation = null;
  }

  // ==========================================================
  // RE-EVALUATION
  // ==========================================================

  if (this.evaluationType === "re-evaluation") {
    if (
      !Number.isInteger(this.version) ||
      this.version < 2
    ) {
      this.version = 2;
    }
  }

  // ==========================================================
  // TECHNOLOGY
  // ==========================================================

  if (typeof this.technology === "string") {
    this.technology = this.technology.trim();

    if (!this.technology) {
      this.technology = null;
    }
  }

  // ==========================================================
  // STRING ARRAYS
  // ==========================================================

  const arrayFields = [
    "strengths",
    "weaknesses",
    "mistakes",
    "corrections",
    "suggestions",
  ];

  for (const field of arrayFields) {
    if (Array.isArray(this[field])) {
      this[field] = this[field]
        .filter(
          (item) =>
            typeof item === "string" &&
            item.trim().length > 0
        )
        .map((item) => item.trim());
    }
  }

  // ==========================================================
  // STUDY TOPICS
  // ==========================================================

  if (Array.isArray(this.studyTopics)) {
    this.studyTopics = this.studyTopics
      .filter(
        (item) =>
          item &&
          typeof item.topic === "string" &&
          item.topic.trim() &&
          ["low", "medium", "high"].includes(
            item.priority
          )
      )
      .map((item) => ({
        topic: item.topic
          .trim()
          .slice(0, 150),

        priority: item.priority,
      }))
      .slice(0, 30);
  }

  // ==========================================================
  // SCORE NORMALIZATION
  // ==========================================================

  const scoreFields = [
    "correctnessScore",
    "technicalScore",
    "communicationScore",
    "problemSolvingScore",
    "overallScore",
  ];

  for (const field of scoreFields) {
    if (
      typeof this[field] === "number" &&
      Number.isFinite(this[field])
    ) {
      this[field] =
        Math.round(this[field] * 100) / 100;
    }
  }

  // ==========================================================
  // SCORE BREAKDOWN NORMALIZATION
  // ==========================================================

  const breakdownFields = [
    "correctness",
    "technicalKnowledge",
    "communication",
    "problemSolving",
    "depth",
    "relevance",
  ];

  if (this.scoreBreakdown) {
    for (const field of breakdownFields) {
      if (
        typeof this.scoreBreakdown[field] === "number" &&
        Number.isFinite(
          this.scoreBreakdown[field]
        )
      ) {
        this.scoreBreakdown[field] =
          Math.round(
            this.scoreBreakdown[field] * 100
          ) / 100;
      }
    }
  }

  // ==========================================================
  // CONFIDENCE NORMALIZATION
  // ==========================================================

  if (
    typeof this.confidence === "number" &&
    Number.isFinite(this.confidence)
  ) {
    this.confidence =
      Math.round(this.confidence * 100) / 100;
  }

  // ==========================================================
  // FAILED EVALUATION
  // ==========================================================

  if (this.status === "failed") {
    if (!this.error) {
      this.error = {};
    }

    if (!this.error.occurredAt) {
      this.error.occurredAt = new Date();
    }
  }

  // ==========================================================
  // COMPLETED EVALUATION
  // ==========================================================

  if (this.status === "completed") {
    const existingProvider =
      this.error?.provider || null;

    this.error = {
      code: null,
      message: null,
      provider: existingProvider,
      occurredAt: null,
    };
  }


});

// ============================================================
// EXPORT
// ============================================================

module.exports = mongoose.model(
  "Evaluation",
  evaluationSchema
);
