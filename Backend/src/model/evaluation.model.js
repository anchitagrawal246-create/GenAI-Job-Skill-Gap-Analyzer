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
    },

    // ==========================================================
    // STRENGTHS
    // ==========================================================

    strengths: {
      type: [String],
      default: [],
    },

    // ==========================================================
    // WEAKNESSES
    // ==========================================================

    weaknesses: {
      type: [String],
      default: [],
    },

    // ==========================================================
    // MISTAKES
    // ==========================================================

    mistakes: {
      type: [String],
      default: [],
    },

    // ==========================================================
    // CORRECTIONS
    // ==========================================================

    corrections: {
      type: [String],
      default: [],
    },

    // ==========================================================
    // SUGGESTIONS
    // ==========================================================

    suggestions: {
      type: [String],
      default: [],
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
    // AI PROVIDER
    // ==========================================================

    evaluatedBy: {
      type: String,
      enum: ["groq", "gemini", "deepseek", "ollama", "openai", "manual"],
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

// ============================================================
// PREVENT DUPLICATE EVALUATIONS
// ============================================================
//
// One answer can only have one evaluation.
//
// ============================================================

evaluationSchema.index(
  {
    interview: 1,
    question: 1,
    answer: 1,
  },
  {
    unique: true,
  },
);

// ============================================================
// INTERVIEW EVALUATION LOOKUP
// ============================================================
//
// Useful for:
//
// Evaluation.find({ interview: interviewId })
//
// ============================================================

evaluationSchema.index({
  interview: 1,
  createdAt: 1,
});

// ============================================================
// EXPORT
// ============================================================

module.exports = mongoose.model("Evaluation", evaluationSchema);
