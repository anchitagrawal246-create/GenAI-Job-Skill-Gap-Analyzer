const mongoose = require("mongoose");

// ============================================================
// CONSTANTS
// ============================================================

const MAX_ANSWER_LENGTH = 50000;
const MAX_SUBMISSIONS = 100;
const MAX_RUNS = 200;

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
    // ANSWER TYPE SNAPSHOT
    // ==========================================================

    answerType: {
      type: String,
      enum: ["text", "coding", "debugging", "mixed"],
      default: "text",
      index: true,
    },

    // ==========================================================
    // ORIGINAL CANDIDATE ANSWER
    // ==========================================================

    // IMPORTANT:
    // This represents the first submitted answer.
    // It should never be overwritten by later submissions.

    originalAnswer: {
      text: {
        type: String,
        trim: true,
        maxlength: MAX_ANSWER_LENGTH,
        default: null,
      },

      code: {
        type: String,
        maxlength: MAX_ANSWER_LENGTH,
        default: null,
      },

      language: {
        type: String,
        trim: true,
        maxlength: 50,
        default: null,
      },

      submittedAt: {
        type: Date,
        default: null,
      },
    },

    // ==========================================================
    // CURRENT / LATEST ANSWER
    // ==========================================================

    currentAnswer: {
      text: {
        type: String,
        trim: true,
        maxlength: MAX_ANSWER_LENGTH,
        default: null,
      },

      code: {
        type: String,
        maxlength: MAX_ANSWER_LENGTH,
        default: null,
      },

      language: {
        type: String,
        trim: true,
        maxlength: 50,
        default: null,
      },

      version: {
        type: Number,
        min: 1,
        max: MAX_SUBMISSIONS,
        default: 1,
      },

      submittedAt: {
        type: Date,
        default: null,
      },
    },

    // ==========================================================
    // BACKWARD-COMPATIBLE ANSWER TEXT
    // ==========================================================

    answerText: {
      type: String,
      trim: true,
      maxlength: MAX_ANSWER_LENGTH,
      default: null,
    },

    // ==========================================================
    // CURRENT CODE
    // ==========================================================

    code: {
      type: String,
      maxlength: MAX_ANSWER_LENGTH,
      default: null,
    },

    // ==========================================================
    // CURRENT LANGUAGE
    // ==========================================================

    language: {
      type: String,
      trim: true,
      maxlength: 50,
      default: null,
    },

    // ==========================================================
    // SUBMISSION VERSION
    // ==========================================================

    submissionVersion: {
      type: Number,
      min: 1,
      max: MAX_SUBMISSIONS,
      default: 1,
    },

    // ==========================================================
    // ANSWER SUBMISSION HISTORY
    // ==========================================================

    // Every submitted answer is preserved.

    answerVersions: [
      {
        version: {
          type: Number,
          required: true,
          min: 1,
          max: MAX_SUBMISSIONS,
        },

        text: {
          type: String,
          trim: true,
          maxlength: MAX_ANSWER_LENGTH,
          default: null,
        },

        code: {
          type: String,
          maxlength: MAX_ANSWER_LENGTH,
          default: null,
        },

        language: {
          type: String,
          trim: true,
          maxlength: 50,
          default: null,
        },

        submissionType: {
          type: String,
          enum: ["initial", "resubmission", "final"],
          default: "resubmission",
        },

        submittedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // ==========================================================
    // CODE EXECUTION / RUN HISTORY
    // ==========================================================

    runHistory: [
      {
        runNumber: {
          type: Number,
          required: true,
          min: 1,
          max: MAX_RUNS,
        },

        code: {
          type: String,
          maxlength: MAX_ANSWER_LENGTH,
          default: null,
        },

        language: {
          type: String,
          trim: true,
          maxlength: 50,
          default: null,
        },

        // ------------------------------------------------------
        // Execution result
        // ------------------------------------------------------

        status: {
          type: String,
          enum: [
            "passed",
            "failed",
            "error",
            "timeout",
            "compile-error",
            "runtime-error",
          ],
          default: "failed",
        },

        output: {
          type: String,
          maxlength: 20000,
          default: null,
        },

        error: {
          type: String,
          maxlength: 10000,
          default: null,
        },

        executionTimeMs: {
          type: Number,
          min: 0,
          default: null,
        },

        memoryUsedKb: {
          type: Number,
          min: 0,
          default: null,
        },

        passedTests: {
          type: Number,
          min: 0,
          default: 0,
        },

        totalTests: {
          type: Number,
          min: 0,
          default: 0,
        },

        tests: [
          {
            testNumber: {
              type: Number,
              min: 1,
            },

            passed: {
              type: Boolean,
              default: false,
            },

            input: {
              type: mongoose.Schema.Types.Mixed,
              default: null,
            },

            expectedOutput: {
              type: mongoose.Schema.Types.Mixed,
              default: null,
            },

            actualOutput: {
              type: mongoose.Schema.Types.Mixed,
              default: null,
            },

            error: {
              type: String,
              maxlength: 5000,
              default: null,
            },
          },
        ],

        executedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // ==========================================================
    // SUBMISSION TIME
    // ==========================================================

    submittedAt: {
      type: Date,
      default: null,
    },

    // ==========================================================
    // LAST ACTIVITY
    // ==========================================================

    lastSubmissionAt: {
      type: Date,
      default: null,
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

    // ==========================================================
    // EVALUATION VERSION
    // ==========================================================

    // Number of latest completed evaluation.
    // 0 = never evaluated.
    // 1 = original evaluation.
    // 2+ = re-evaluation.

    evaluationVersion: {
      type: Number,
      min: 0,
      default: 0,
    },

    // ==========================================================
    // LAST EVALUATED AT
    // ==========================================================

    evaluatedAt: {
      type: Date,
      default: null,
    },

    // ==========================================================
    // EVALUATION ERROR
    // ==========================================================

    evaluationError: {
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
    // DEBUG / EXECUTION METADATA
    // ==========================================================

    debug: {
      lastRunNumber: {
        type: Number,
        min: 0,
        max: MAX_RUNS,
        default: 0,
      },

      lastExecutionStatus: {
        type: String,
        enum: [
          "passed",
          "failed",
          "error",
          "timeout",
          "compile-error",
          "runtime-error",
          null,
        ],
        default: null,
      },

      lastExecutionAt: {
        type: Date,
        default: null,
      },

      lastError: {
        type: String,
        maxlength: 5000,
        default: null,
      },
    },
  },
  {
    timestamps: true,
  },
);

// ============================================================
// INDEXES
// ============================================================

// One Answer document per interview question.
answerSchema.index(
  {
    interview: 1,
    question: 1,
  },
  {
    unique: true,
  },
);

// User's interview answers.
answerSchema.index({
  user: 1,
  interview: 1,
});

// Evaluation queue.
answerSchema.index({
  interview: 1,
  evaluationStatus: 1,
});

// Answer type lookup.
answerSchema.index({
  interview: 1,
  answerType: 1,
});

// Latest submitted answers.
answerSchema.index({
  interview: 1,
  lastSubmissionAt: -1,
});

// ============================================================
// HELPERS
// ============================================================

const cleanText = (value) => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length ? trimmed : null;
};

// ============================================================
// VALIDATION / NORMALIZATION
// ============================================================

answerSchema.pre("validate", function () {
  // ==========================================================
  // NORMALIZE VERSION FIRST
  // ==========================================================

  if (!Number.isInteger(this.submissionVersion) || this.submissionVersion < 1) {
    this.submissionVersion = 1;
  }

  if (this.submissionVersion > MAX_SUBMISSIONS) {
    this.submissionVersion = MAX_SUBMISSIONS;
  }

  // ==========================================================
  // NORMALIZE CURRENT TEXT
  // ==========================================================

  this.answerText = cleanText(this.answerText);

  this.code = cleanText(this.code);

  this.language = cleanText(this.language);

  // ==========================================================
  // NORMALIZE ANSWER TYPE
  // ==========================================================

  if (!this.answerType) {
    if (this.code) {
      this.answerType = "coding";
    } else {
      this.answerType = "text";
    }
  }

  // ==========================================================
  // BUILD CURRENT ANSWER
  // ==========================================================

  if (this.answerText || this.code || this.language) {
    this.currentAnswer = {
      text: this.answerText,
      code: this.code,
      language: this.language,
      version: this.submissionVersion,
      submittedAt: this.lastSubmissionAt || this.submittedAt || new Date(),
    };
  }

  // ==========================================================
  // SET SUBMISSION DATES
  // ==========================================================

  if (this.answerText || this.code || this.language) {
    if (!this.submittedAt) {
      this.submittedAt = new Date();
    }

    if (!this.lastSubmissionAt) {
      this.lastSubmissionAt = this.submittedAt;
    }
  }

  // ==========================================================
  // SET ORIGINAL ANSWER
  // ==========================================================

  // Only populate originalAnswer if it does not already exist.

  const hasOriginalAnswer =
    this.originalAnswer &&
    (this.originalAnswer.text ||
      this.originalAnswer.code ||
      this.originalAnswer.language);

  if (!hasOriginalAnswer && (this.answerText || this.code || this.language)) {
    this.originalAnswer = {
      text: this.answerText,
      code: this.code,
      language: this.language,
      submittedAt: this.submittedAt || new Date(),
    };
  }

  // ==========================================================
  // NORMALIZE ORIGINAL ANSWER
  // ==========================================================

  if (this.originalAnswer) {
    this.originalAnswer.text = cleanText(this.originalAnswer.text);

    this.originalAnswer.code = cleanText(this.originalAnswer.code);

    this.originalAnswer.language = cleanText(this.originalAnswer.language);

    if (
      !this.originalAnswer.submittedAt &&
      (this.originalAnswer.text || this.originalAnswer.code)
    ) {
      this.originalAnswer.submittedAt = this.submittedAt || new Date();
    }
  }

  // ==========================================================
  // NORMALIZE CURRENT ANSWER
  // ==========================================================

  if (this.currentAnswer) {
    this.currentAnswer.text = cleanText(this.currentAnswer.text);

    this.currentAnswer.code = cleanText(this.currentAnswer.code);

    this.currentAnswer.language = cleanText(this.currentAnswer.language);

    if (
      !Number.isInteger(this.currentAnswer.version) ||
      this.currentAnswer.version < 1
    ) {
      this.currentAnswer.version = this.submissionVersion;
    }

    if (this.currentAnswer.version > MAX_SUBMISSIONS) {
      this.currentAnswer.version = MAX_SUBMISSIONS;
    }
  }

  // ==========================================================
  // NORMALIZE SUBMISSION HISTORY
  // ==========================================================

  if (Array.isArray(this.answerVersions)) {
    this.answerVersions = this.answerVersions
      .filter(
        (item) =>
          item &&
          Number.isInteger(item.version) &&
          item.version >= 1 &&
          item.version <= MAX_SUBMISSIONS,
      )
      .map((item) => ({
        ...item,
        text: cleanText(item.text),
        code: cleanText(item.code),
        language: cleanText(item.language),
        submittedAt: item.submittedAt || new Date(),
      }))
      .sort((a, b) => a.version - b.version)
      .slice(0, MAX_SUBMISSIONS);
  }

  // ==========================================================
  // NORMALIZE RUN HISTORY
  // ==========================================================

  if (Array.isArray(this.runHistory)) {
    this.runHistory = this.runHistory
      .filter(
        (run) =>
          run &&
          Number.isInteger(run.runNumber) &&
          run.runNumber >= 1 &&
          run.runNumber <= MAX_RUNS,
      )
      .map((run) => ({
        ...run,
        code: cleanText(run.code),
        language: cleanText(run.language),
        executedAt: run.executedAt || new Date(),
      }))
      .sort((a, b) => a.runNumber - b.runNumber)
      .slice(0, MAX_RUNS);
  }

  // ==========================================================
  // NORMALIZE DEBUG INFORMATION
  // ==========================================================

  if (!this.debug) {
    this.debug = {
      lastRunNumber: 0,
      lastExecutionStatus: null,
      lastExecutionAt: null,
      lastError: null,
    };
  }

  if (
    !Number.isInteger(this.debug.lastRunNumber) ||
    this.debug.lastRunNumber < 0
  ) {
    this.debug.lastRunNumber = 0;
  }

  if (this.debug.lastRunNumber > MAX_RUNS) {
    this.debug.lastRunNumber = MAX_RUNS;
  }

  this.debug.lastError = cleanText(this.debug.lastError);

  // ==========================================================
  // EVALUATION STATUS
  // ==========================================================

  if (this.evaluationStatus === "failed") {
    if (!this.evaluationError || !this.evaluationError.occurredAt) {
      this.evaluationError = {
        code: this.evaluationError?.code || null,

        message: this.evaluationError?.message || null,

        provider: this.evaluationError?.provider || null,

        occurredAt: new Date(),
      };
    }
  }

  // ==========================================================
  // COMPLETED EVALUATION
  // ==========================================================

  if (this.evaluationStatus === "completed") {
    this.evaluationError = {
      code: null,
      message: null,
      provider: null,
      occurredAt: null,
    };
  }

  // ==========================================================
  // EVALUATION VERSION NORMALIZATION
  // ==========================================================

  if (!Number.isInteger(this.evaluationVersion) || this.evaluationVersion < 0) {
    this.evaluationVersion = 0;
  }


});

// ============================================================
// EXPORT
// ============================================================

module.exports = mongoose.model("Answer", answerSchema);
