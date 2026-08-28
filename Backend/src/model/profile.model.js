const mongoose = require("mongoose");

// =========================================================
// SKILL ASSESSMENT SOURCE SCHEMA
// =========================================================
//
// Stores how much evidence came from each source.
//
// The user does NOT provide these values.
// They are calculated by backend services.
//

const SkillAssessmentSourceSchema = new mongoose.Schema(
  {
    resume: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    github: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    leetcode: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    linkedin: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    interview: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
  },
  {
    _id: false,
  },
);

// =========================================================
// SKILL EVIDENCE SCHEMA
// =========================================================
//
// Stores whether a particular source actually contributed
// evidence for this skill.
//
// Example:
//
// Python
//
// resume: true
// github: true
// leetcode: false
// linkedin: false
// interview: true
//

const SkillEvidenceSchema = new mongoose.Schema(
  {
    resume: {
      type: Boolean,
      default: false,
    },

    github: {
      type: Boolean,
      default: false,
    },

    leetcode: {
      type: Boolean,
      default: false,
    },

    linkedin: {
      type: Boolean,
      default: false,
    },

    interview: {
      type: Boolean,
      default: false,
    },
  },
  {
    _id: false,
  },
);

// =========================================================
// SKILL ASSESSMENT SCHEMA
// =========================================================
//
// The user NEVER sends:
//
// {
//   name: "Python",
//   level: "beginner"
// }
//
// The backend calculates the level.
//
// level remains null until enough evidence is available.
//

const SkillAssessmentSchema = new mongoose.Schema(
  {
    // -------------------------------------------------------
    // FINAL CALCULATED SCORE
    // -------------------------------------------------------

    score: {
      type: Number,
      default: null,
      min: 0,
      max: 100,
    },

    // -------------------------------------------------------
    // AI / RULE BASED CONFIDENCE
    // -------------------------------------------------------

    confidence: {
      type: Number,
      default: null,
      min: 0,
      max: 1,
    },

    // -------------------------------------------------------
    // SCORE FROM EACH SOURCE
    // -------------------------------------------------------

    sources: {
      type: SkillAssessmentSourceSchema,
      default: () => ({}),
    },

    // -------------------------------------------------------
    // WHICH SOURCES PROVIDED EVIDENCE
    // -------------------------------------------------------

    evidence: {
      type: SkillEvidenceSchema,
      default: () => ({}),
    },

    // -------------------------------------------------------
    // LAST TIME THIS SKILL WAS ASSESSED
    // -------------------------------------------------------

    lastEvaluatedAt: {
      type: Date,
      default: null,
    },
  },
  {
    _id: false,
  },
);

// =========================================================
// SKILL SCHEMA
// =========================================================
//
// The user supplies ONLY the skill name.
//
// Example:
//
// {
//   name: "Python"
// }
//
// The backend later determines:
//
// level: "intermediate"
//

const SkillSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    // -------------------------------------------------------
    // AI DETERMINED LEVEL
    // -------------------------------------------------------
    //
    // null = not assessed yet
    //
    // The frontend should never send this value.
    //

    level: {
      type: String,
      enum: ["beginner", "intermediate", "advanced", null],
      default: null,
    },

    // -------------------------------------------------------
    // ASSESSMENT INFORMATION
    // -------------------------------------------------------

    assessment: {
      type: SkillAssessmentSchema,
      default: () => ({}),
    },
  },
  {
    _id: false,
  },
);

// =========================================================
// GITHUB EVIDENCE SCHEMA
// =========================================================

const GithubEvidenceSchema = new mongoose.Schema(
  {
    analyzed: {
      type: Boolean,
      default: false,
    },

    username: {
      type: String,
      default: null,
    },

    repositoriesAnalyzed: {
      type: Number,
      default: 0,
    },

    languages: {
      type: [String],
      default: [],
    },

    skills: {
      type: [
        {
          name: {
            type: String,
            required: true,
            trim: true,
          },

          evidenceStrength: {
            type: String,
            enum: ["strong", "moderate", "limited", "none"],
            required: true,
          },

          repositories: {
            type: [String],
            default: [],
          },
        },
      ],
      default: [],
    },

    analyzedAt: {
      type: Date,
      default: null,
    },
  },
  {
    _id: false,
  },
);

// =========================================================
// PROFILE SCHEMA
// =========================================================

const ProfileSchema = new mongoose.Schema(
  {
    // =======================================================
    // USER
    // =======================================================

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
      unique: true,
      index: true,
    },

    // =======================================================
    // BASIC PROFILE
    // =======================================================

    name: {
      type: String,
      trim: true,
      maxlength: 100,
      default: "",
    },

    // =======================================================
    // ROLE
    // =======================================================
    //
    // User's professional / target role.
    //
    // Examples:
    //
    // Full Stack Developer
    // Backend Developer
    // Frontend Developer
    // Software Engineer
    // Data Analyst
    // AI/ML Engineer
    //
    // This belongs to PROFILE, not USER.
    //

    role: {
      type: String,
      trim: true,
      maxlength: 100,
      default: "",
    },

    // =======================================================
    // PROFILE PICTURE
    // =======================================================

    profilePicture: {
      type: String,
      default: null,
    },

    profilePictureFileId: {
      type: String,
      default: null,
    },

    // =======================================================
    // TECHNICAL SKILLS
    // =======================================================
    //
    // User provides only skill names.
    //
    // Example:
    //
    // [
    //   { name: "Python" },
    //   { name: "JavaScript" }
    // ]
    //
    // Backend later determines their levels.
    //

    technicalSkills: {
      type: [SkillSchema],
      default: [],
    },

    // =======================================================
    // SOCIAL SKILLS
    // =======================================================
    //
    // User provides only skill names.
    //
    // Example:
    //
    // [
    //   { name: "Communication" },
    //   { name: "Leadership" }
    // ]
    //

    socialSkills: {
      type: [SkillSchema],
      default: [],
    },

    // =======================================================
    // SOCIAL LINKS
    // =======================================================

    linkedin: {
      type: String,
      trim: true,
      default: "",
    },

    github: {
      type: String,
      trim: true,
      default: "",
    },

    leetcode: {
      type: String,
      trim: true,
      default: "",
    },

    // =======================================================
    // RESUME
    // =======================================================

    resume: {
      type: String,
      default: null,
    },

    resumeFileId: {
      type: String,
      default: null,
    },

    // =======================================================
    // GITHUB EVIDENCE
    // =======================================================

    githubEvidence: {
      type: GithubEvidenceSchema,
      default: () => ({}),
    },
  },
  {
    timestamps: true,
  },
);

// =========================================================
// MODEL
// =========================================================

const ProfileModel = mongoose.model("profiles", ProfileSchema);

module.exports = ProfileModel;
