const mongoose = require("mongoose");

// ============================================================
// CONSTANTS
// ============================================================

const MAX_QUESTIONS = 100;

const DIFFICULTIES = [
  "auto",
  "very-easy",
  "easy",
  "medium",
  "hard",
  "very-hard",
];

const CURRENT_DIFFICULTIES = [
  "very-easy",
  "easy",
  "medium",
  "hard",
  "very-hard",
];

const INTERVIEW_TYPES = [
  "technical",
  "behavioral",
  "mixed",
  "coding",
  "debugging",
  "system-design",
  "technical-coding",
  "technical-debugging",
];

const CANDIDATE_LEVELS = ["beginner", "knight", "conqueror"];

const EXPERIENCE_LEVELS = ["fresher", "junior", "mid", "senior"];

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
    // INTERVIEW TYPE
    // ==========================================================

    interviewType: {
      type: String,
      enum: INTERVIEW_TYPES,
      required: true,
      default: "technical",
      trim: true,
      index: true,
    },

    // ==========================================================
    // DIFFICULTY SELECTED BY CANDIDATE
    // ==========================================================
    //
    // Candidate chooses:
    //
    // auto
    // very-easy
    // easy
    // medium
    // hard
    // very-hard
    //
    // Candidate difficulty != candidate level.
    //
    // ==========================================================

    difficulty: {
      type: String,
      enum: DIFFICULTIES,
      default: "auto",
      trim: true,
      index: true,
    },

    // ==========================================================
    // CURRENT AI DIFFICULTY
    // ==========================================================
    //
    // The actual difficulty being used for the current/next
    // question.
    //
    // ==========================================================

    currentDifficulty: {
      type: String,
      enum: CURRENT_DIFFICULTIES,
      default: "medium",
      trim: true,
    },

    // ==========================================================
    // SKILL MODE
    // ==========================================================
    //
    // all
    // specific
    //
    // ==========================================================

    skillMode: {
      type: String,
      enum: ["all", "specific"],
      default: "all",
      trim: true,
      index: true,
    },

    // ==========================================================
    // SELECTED / RESOLVED TECHNOLOGIES
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
    // TARGET NUMBER OF QUESTIONS
    // ==========================================================
    //
    // User selects 1–100.
    //
    // Example:
    // 20 means the interview has 20 question slots.
    //
    // A skipped question still consumes one slot.
    //
    // ==========================================================

    totalQuestions: {
      type: Number,
      required: true,
      min: 1,
      max: MAX_QUESTIONS,
      default: 10,
    },

    // ==========================================================
    // CURRENT QUESTION NUMBER
    // ==========================================================

    currentQuestionNumber: {
      type: Number,
      min: 0,
      max: MAX_QUESTIONS,
      default: 0,
    },

    // ==========================================================
    // GENERATED QUESTIONS
    // ==========================================================
    //
    // Number of question documents actually generated.
    //
    // ==========================================================

    generatedQuestions: {
      type: Number,
      min: 0,
      max: MAX_QUESTIONS,
      default: 0,
    },

    // ==========================================================
    // ANSWERED QUESTIONS
    // ==========================================================

    answeredQuestions: {
      type: Number,
      min: 0,
      max: MAX_QUESTIONS,
      default: 0,
    },

    // ==========================================================
    // SKIPPED QUESTIONS
    // ==========================================================

    skippedQuestions: {
      type: Number,
      min: 0,
      max: MAX_QUESTIONS,
      default: 0,
    },

    // ==========================================================
    // COMPLETED QUESTION SLOTS
    // ==========================================================
    //
    // answeredQuestions + skippedQuestions
    //
    // ==========================================================

    completedQuestions: {
      type: Number,
      min: 0,
      max: MAX_QUESTIONS,
      default: 0,
    },

    // ==========================================================
    // INTERVIEW STATUS
    // ==========================================================

    status: {
      type: String,
      enum: ["created", "in-progress", "paused", "completed", "cancelled"],
      default: "created",
      index: true,
    },

    // ==========================================================
    // EXIT / PAUSE REASON
    // ==========================================================

    exitReason: {
      type: String,
      enum: [
        "user-exit",
        "page-closed",
        "paused",
        "maximum-reached",
        "completed",
        "system-error",
        null,
      ],
      default: null,
    },

    // ==========================================================
    // LIFECYCLE TIMESTAMPS
    // ==========================================================

    startedAt: {
      type: Date,
      default: null,
    },

    lastActivityAt: {
      type: Date,
      default: null,
    },

    pausedAt: {
      type: Date,
      default: null,
    },

    cancelledAt: {
      type: Date,
      default: null,
    },

    completedAt: {
      type: Date,
      default: null,
    },

    // ==========================================================
    // AI CANDIDATE LEVEL
    // ==========================================================
    //
    // This is automatically determined by the system.
    //
    // Candidate cannot select this value.
    //
    // ==========================================================

    estimatedCandidateLevel: {
      type: String,
      enum: [...CANDIDATE_LEVELS, null],
      default: null,
      index: true,
    },

    // ==========================================================
    // CANDIDATE LEVEL CONFIDENCE
    // ==========================================================

    candidateLevelConfidence: {
      type: Number,
      min: 0,
      max: 100,
      default: null,
    },

    // ==========================================================
    // CANDIDATE LEVEL SCORE
    // ==========================================================
    //
    // Internal normalized score used by the level engine.
    //
    // ==========================================================

    candidateLevelScore: {
      type: Number,
      min: 0,
      max: 100,
      default: null,
    },

    // ==========================================================
    // CANDIDATE LEVEL HISTORY
    // ==========================================================
    //
    // Never overwrite historical level transitions.
    //
    // ==========================================================

    candidateLevelHistory: [
      {
        level: {
          type: String,
          enum: CANDIDATE_LEVELS,
          required: true,
        },

        score: {
          type: Number,
          min: 0,
          max: 100,
          default: null,
        },

        confidence: {
          type: Number,
          min: 0,
          max: 100,
          default: null,
        },

        reason: {
          type: String,
          enum: [
            "initial-assessment",
            "interview-progress",
            "interview-completion",
            "question-re-evaluation",
            "full-re-evaluation",
            "evidence-update",
            "manual-recalculation",
          ],
          required: true,
        },

        evaluatedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // ==========================================================
    // EXPERIENCE LEVEL
    // ==========================================================
    //
    // Kept separate from demonstrated candidate level.
    //
    // ==========================================================

    estimatedExperienceLevel: {
      type: String,
      enum: [...EXPERIENCE_LEVELS, null],
      default: null,
    },

    experienceConfidence: {
      type: Number,
      min: 0,
      max: 100,
      default: null,
    },

    // ==========================================================
    // OVERALL INTERVIEW SCORE
    // ==========================================================

    overallScore: {
      type: Number,
      min: 0,
      max: 100,
      default: null,
      index: true,
    },

    // ==========================================================
    // ORIGINAL INTERVIEW SCORE
    // ==========================================================
    //
    // First completed evaluation result.
    //
    // NEVER overwrite this during re-evaluation.
    //
    // ==========================================================

    originalScore: {
      type: Number,
      min: 0,
      max: 100,
      default: null,
    },

    // ==========================================================
    // CURRENT INTERVIEW SCORE
    // ==========================================================
    //
    // Latest score calculated from the current/latest
    // question evaluations.
    //
    // ==========================================================

    currentScore: {
      type: Number,
      min: 0,
      max: 100,
      default: null,
      index: true,
    },

    // ==========================================================
    // SCORE VERSION
    // ==========================================================

    scoreVersion: {
      type: Number,
      min: 0,
      default: 0,
    },

    // ==========================================================
    // INTERVIEW SCORE HISTORY
    // ==========================================================

    scoreHistory: [
      {
        version: {
          type: Number,
          required: true,
          min: 1,
        },

        score: {
          type: Number,
          required: true,
          min: 0,
          max: 100,
        },

        reason: {
          type: String,
          enum: [
            "initial-evaluation",
            "question-re-evaluation",
            "full-re-evaluation",
            "manual-recalculation",
            "final-calculation",
          ],
          required: true,
        },

        changedQuestionId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Question",
          default: null,
        },

        calculatedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // ==========================================================
    // TECHNICAL SKILL SCORES
    // ==========================================================
    //
    // Each technology maintains:
    //
    // original score
    // current score
    // score history
    // question statistics
    //
    // ==========================================================

    technologyScores: [
      {
        technology: {
          type: String,
          required: true,
          trim: true,
          maxlength: 100,
        },

        originalScore: {
          type: Number,
          min: 0,
          max: 100,
          default: null,
        },

        currentScore: {
          type: Number,
          min: 0,
          max: 100,
          default: null,
        },

        scoreVersion: {
          type: Number,
          min: 0,
          default: 0,
        },

        questionsAsked: {
          type: Number,
          min: 0,
          max: MAX_QUESTIONS,
          default: 0,
        },

        questionsAnswered: {
          type: Number,
          min: 0,
          max: MAX_QUESTIONS,
          default: 0,
        },

        questionsSkipped: {
          type: Number,
          min: 0,
          max: MAX_QUESTIONS,
          default: 0,
        },

        strengths: {
          type: [String],
          default: [],
        },

        weaknesses: {
          type: [String],
          default: [],
        },

        scoreHistory: [
          {
            version: {
              type: Number,
              required: true,
              min: 1,
            },

            score: {
              type: Number,
              required: true,
              min: 0,
              max: 100,
            },

            reason: {
              type: String,
              enum: [
                "initial-evaluation",
                "question-re-evaluation",
                "full-re-evaluation",
                "manual-recalculation",
              ],
              required: true,
            },

            evaluatedAt: {
              type: Date,
              default: Date.now,
            },
          },
        ],
      },
    ],

    // ==========================================================
    // INTERVIEW ANALYSIS
    // ==========================================================

    analysis: {
      strengths: {
        type: [String],
        default: [],
      },

      weaknesses: {
        type: [String],
        default: [],
      },

      recommendations: {
        type: [String],
        default: [],
      },

      strongSkills: {
        type: [String],
        default: [],
      },

      weakSkills: {
        type: [String],
        default: [],
      },

      skillGaps: {
        type: [String],
        default: [],
      },

      technicalSummary: {
        type: String,
        default: null,
        maxlength: 10000,
      },

      codingSummary: {
        type: String,
        default: null,
        maxlength: 10000,
      },

      debuggingSummary: {
        type: String,
        default: null,
        maxlength: 10000,
      },

      behavioralSummary: {
        type: String,
        default: null,
        maxlength: 10000,
      },

      systemDesignSummary: {
        type: String,
        default: null,
        maxlength: 10000,
      },

      generatedAt: {
        type: Date,
        default: null,
      },
    },

    // ==========================================================
    // REPORT STATUS
    // ==========================================================

    reportStatus: {
      type: String,
      enum: ["not-generated", "generating", "generated", "failed"],
      default: "not-generated",
      index: true,
    },

    reportGeneratedAt: {
      type: Date,
      default: null,
    },

    reportVersion: {
      type: Number,
      min: 0,
      default: 0,
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

// User + status
interviewSchema.index({
  user: 1,
  status: 1,
});

// User's active/latest interviews
interviewSchema.index({
  user: 1,
  status: 1,
  updatedAt: -1,
});

// Role-based interview lookup
interviewSchema.index({
  user: 1,
  role: 1,
  createdAt: -1,
});

// Score-based lookup
interviewSchema.index({
  user: 1,
  currentScore: -1,
});

// Candidate-level lookup
interviewSchema.index({
  user: 1,
  estimatedCandidateLevel: 1,
});

// ============================================================
// HELPER: NORMALIZE STRING ARRAYS
// ============================================================

const normalizeStringArray = (value, max = 30) => {
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
// DOCUMENT VALIDATION / NORMALIZATION
// ============================================================

interviewSchema.pre("validate", function () {
  // ==========================================================
  // NORMALIZE TECHNOLOGIES
  // ==========================================================

  this.technologies = normalizeStringArray(this.technologies, 30);

  // ==========================================================
  // NORMALIZE COUNTERS
  // ==========================================================

  const counterFields = [
    "currentQuestionNumber",
    "generatedQuestions",
    "answeredQuestions",
    "skippedQuestions",
    "completedQuestions",
  ];

  for (const field of counterFields) {
    if (typeof this[field] !== "number" || !Number.isFinite(this[field])) {
      this[field] = 0;
    }

    this[field] = Math.max(0, Math.min(MAX_QUESTIONS, Math.floor(this[field])));
  }

  // ==========================================================
  // GENERATED QUESTIONS
  // ==========================================================

  if (this.generatedQuestions > this.totalQuestions) {
    this.generatedQuestions = this.totalQuestions;
  }

  // ==========================================================
  // ANSWERED QUESTIONS
  // ==========================================================

  if (this.answeredQuestions > this.generatedQuestions) {
    this.answeredQuestions = this.generatedQuestions;
  }

  // ==========================================================
  // SKIPPED QUESTIONS
  // ==========================================================

  if (this.skippedQuestions > this.generatedQuestions) {
    this.skippedQuestions = this.generatedQuestions;
  }

  // ==========================================================
  // COMPLETED QUESTION SLOTS
  // ==========================================================
  //
  // One slot is consumed by either:
  //
  // answered OR skipped
  //
  // ==========================================================

  const calculatedCompleted = this.answeredQuestions + this.skippedQuestions;

  this.completedQuestions = Math.min(calculatedCompleted, this.totalQuestions);

  // ==========================================================
  // CURRENT QUESTION
  // ==========================================================

  if (this.currentQuestionNumber > this.totalQuestions) {
    this.currentQuestionNumber = this.totalQuestions;
  }

  // ==========================================================
  // STARTED INTERVIEW
  // ==========================================================

  if (this.status === "in-progress" && !this.startedAt) {
    this.startedAt = new Date();
  }

  // ==========================================================
  // LAST ACTIVITY
  // ==========================================================

  if (this.status === "in-progress") {
    this.lastActivityAt = new Date();
  }

  // ==========================================================
  // PAUSED INTERVIEW
  // ==========================================================

  if (this.status === "paused") {
    if (!this.pausedAt) {
      this.pausedAt = new Date();
    }

    if (!this.exitReason) {
      this.exitReason = "paused";
    }
  }

  // ==========================================================
  // CANCELLED INTERVIEW
  // ==========================================================

  if (this.status === "cancelled") {
    if (!this.cancelledAt) {
      this.cancelledAt = new Date();
    }

    if (!this.exitReason) {
      this.exitReason = "user-exit";
    }
  }

  // ==========================================================
  // COMPLETED INTERVIEW
  // ==========================================================

  if (this.status === "completed") {
    if (!this.completedAt) {
      this.completedAt = new Date();
    }

    this.exitReason =
      this.exitReason === "maximum-reached" ? "maximum-reached" : "completed";
  }

  // ==========================================================
  // SCORE SYNCHRONIZATION
  // ==========================================================
  //
  // currentScore is authoritative.
  // overallScore remains as a compatibility field.
  //
  // ==========================================================

  if (
    typeof this.currentScore === "number" &&
    Number.isFinite(this.currentScore)
  ) {
    this.overallScore = this.currentScore;
  }

  // ==========================================================
  // ORIGINAL SCORE
  // ==========================================================
  //
  // Set only when the first score becomes available.
  //
  // Existing originalScore is NEVER replaced.
  //
  // ==========================================================

  if (
    this.originalScore === null &&
    typeof this.currentScore === "number" &&
    Number.isFinite(this.currentScore)
  ) {
    this.originalScore = this.currentScore;
  }

  // ==========================================================
  // SCORE VERSION
  // ==========================================================

  if (
    typeof this.currentScore === "number" &&
    Number.isFinite(this.currentScore) &&
    this.scoreVersion < 1
  ) {
    this.scoreVersion = 1;
  }

  // ==========================================================
  // CANDIDATE LEVEL CONFIDENCE
  // ==========================================================

  if (
    typeof this.candidateLevelConfidence === "number" &&
    Number.isFinite(this.candidateLevelConfidence)
  ) {
    this.candidateLevelConfidence = Math.max(
      0,
      Math.min(100, this.candidateLevelConfidence),
    );
  }

  // ==========================================================
  // EXPERIENCE CONFIDENCE
  // ==========================================================

  if (
    typeof this.experienceConfidence === "number" &&
    Number.isFinite(this.experienceConfidence)
  ) {
    this.experienceConfidence = Math.max(
      0,
      Math.min(100, this.experienceConfidence),
    );
  }

  // ==========================================================
  // CANDIDATE LEVEL SCORE
  // ==========================================================

  if (
    typeof this.candidateLevelScore === "number" &&
    Number.isFinite(this.candidateLevelScore)
  ) {
    this.candidateLevelScore = Math.max(
      0,
      Math.min(100, this.candidateLevelScore),
    );
  }

  // ==========================================================
  // NORMALIZE ANALYSIS ARRAYS
  // ==========================================================

  if (this.analysis) {
    this.analysis.strengths = normalizeStringArray(this.analysis.strengths, 30);

    this.analysis.weaknesses = normalizeStringArray(
      this.analysis.weaknesses,
      30,
    );

    this.analysis.recommendations = normalizeStringArray(
      this.analysis.recommendations,
      30,
    );

    this.analysis.strongSkills = normalizeStringArray(
      this.analysis.strongSkills,
      30,
    );

    this.analysis.weakSkills = normalizeStringArray(
      this.analysis.weakSkills,
      30,
    );

    this.analysis.skillGaps = normalizeStringArray(this.analysis.skillGaps, 30);
  }

  // ==========================================================
  // REPORT STATUS
  // ==========================================================

  if (this.reportStatus === "generated") {
    if (!this.reportGeneratedAt) {
      this.reportGeneratedAt = new Date();
    }

    if (this.reportVersion < 1) {
      this.reportVersion = 1;
    }
  }


});

// ============================================================
// EXPORT
// ============================================================

module.exports = mongoose.model("Interview", interviewSchema);
