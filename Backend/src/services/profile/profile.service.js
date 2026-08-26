const ProfileModel = require("../../model/profile.model");
const UserModel = require("../../model/user.model");

const { calculateProfileCompletion } = require("./profileCompletion.service");

const {
  uploadProfilePicture,
  uploadResume,
  deleteFile,
} = require("./profileStorage.service");

// =========================================================
// CUSTOM ERROR
// =========================================================

function createProfileError(message, statusCode, code) {
  const error = new Error(message);

  error.statusCode = statusCode;
  error.code = code;

  return error;
}

// =========================================================
// PARSE SKILLS
// =========================================================
//
// Multipart/form-data may send arrays as JSON strings.
//
// Accepted:
//
// [
//   { name: "Python" },
//   { name: "JavaScript" }
// ]
//
// Also accepted:
//
// "[{\"name\":\"Python\"}]"
//
// IMPORTANT:
//
// The user is allowed to provide ONLY the skill name.
//
// The following is NOT allowed:
//
// {
//   name: "Python",
//   level: "beginner"
// }
//
// Skill level is determined later by the assessment system.
//

function parseSkills(skills, type) {
  // -------------------------------------------------------
  // Already an array
  // -------------------------------------------------------

  if (Array.isArray(skills)) {
    return skills;
  }

  // -------------------------------------------------------
  // Missing / intentionally empty
  // -------------------------------------------------------

  if (skills === undefined || skills === null || skills === "") {
    return [];
  }

  // -------------------------------------------------------
  // Multipart sends JSON as string
  // -------------------------------------------------------

  if (typeof skills === "string") {
    try {
      const parsed = JSON.parse(skills);

      if (!Array.isArray(parsed)) {
        throw createProfileError(
          `${type} skills must be an array`,
          400,
          type === "technical"
            ? "INVALID_TECHNICAL_SKILLS"
            : "INVALID_SOCIAL_SKILLS",
        );
      }

      return parsed;
    } catch (error) {
      if (error.statusCode) {
        throw error;
      }

      throw createProfileError(
        `Invalid ${type} skills format`,
        400,
        type === "technical"
          ? "INVALID_TECHNICAL_SKILLS"
          : "INVALID_SOCIAL_SKILLS",
      );
    }
  }

  // -------------------------------------------------------
  // Invalid type
  // -------------------------------------------------------

  throw createProfileError(
    `${type} skills must be an array`,
    400,
    type === "technical" ? "INVALID_TECHNICAL_SKILLS" : "INVALID_SOCIAL_SKILLS",
  );
}

// =========================================================
// NORMALIZE SKILLS
// =========================================================
//
// IMPORTANT:
//
// This function intentionally keeps ONLY the name.
//
// We do NOT accept user-provided level.
//
// Existing AI assessment is preserved separately by
// mergeSkillsWithExistingAssessment().
//

function normalizeSkills(skills) {
  return skills.map((skill) => ({
    name: skill.name.trim(),
  }));
}

// =========================================================
// MERGE EXISTING AI ASSESSMENT
// =========================================================
//
// This is extremely important.
//
// Example existing database:
//
// {
//   name: "Python",
//   level: "intermediate",
//   assessment: {
//     score: 72,
//     confidence: 0.88
//   }
// }
//
// User updates profile with:
//
// {
//   name: "Python"
// }
//
// We MUST preserve:
//
// level: "intermediate"
// assessment: {...}
//
// For a completely new skill:
//
// {
//   name: "Java"
// }
//
// it starts as:
//
// {
//   name: "Java",
//   level: null,
//   assessment: {...default}
// }
//
// The assessment system will evaluate it later.
//

function mergeSkillsWithExistingAssessment(newSkills, existingSkills = []) {
  return newSkills.map((newSkill) => {
    const existingSkill = existingSkills.find(
      (skill) =>
        skill.name.trim().toLowerCase() === newSkill.name.trim().toLowerCase(),
    );

    // -----------------------------------------------------
    // Existing skill
    // -----------------------------------------------------
    //
    // Preserve AI-generated level and assessment.
    //

    if (existingSkill) {
      return {
        name: newSkill.name,

        level: existingSkill.level ?? null,

        assessment: existingSkill.assessment ?? {},
      };
    }

    // -----------------------------------------------------
    // New skill
    // -----------------------------------------------------
    //
    // No level until the assessment engine evaluates it.
    //

    return {
      name: newSkill.name,

      level: null,

      assessment: {},
    };
  });
}

// =========================================================
// CHECK DUPLICATE SKILLS
// =========================================================

function validateDuplicateSkills(skills, type) {
  const seen = new Set();

  for (const skill of skills) {
    const normalizedName = skill.name.trim().toLowerCase();

    if (seen.has(normalizedName)) {
      throw createProfileError(
        `Duplicate ${type} skill is not allowed: ${skill.name.trim()}`,
        400,
        type === "technical"
          ? "DUPLICATE_TECHNICAL_SKILL"
          : "DUPLICATE_SOCIAL_SKILL",
      );
    }

    seen.add(normalizedName);
  }
}

// =========================================================
// VALIDATE SKILLS
// =========================================================
//
// Skills are optional.
//
// Valid:
//
// []
//
// [
//   { name: "Python" }
// ]
//
// Invalid:
//
// [
//   { name: "Python", level: "beginner" }
// ]
//

function validateSkills(skills, type) {
  // -------------------------------------------------------
  // Must be array
  // -------------------------------------------------------

  if (!Array.isArray(skills)) {
    throw createProfileError(
      `${type} skills must be an array`,
      400,
      type === "technical"
        ? "INVALID_TECHNICAL_SKILLS"
        : "INVALID_SOCIAL_SKILLS",
    );
  }

  // -------------------------------------------------------
  // Empty array is valid
  // -------------------------------------------------------

  if (skills.length === 0) {
    return;
  }

  // -------------------------------------------------------
  // Validate every skill
  // -------------------------------------------------------

  for (const skill of skills) {
    // -----------------------------------------------------
    // Must be object
    // -----------------------------------------------------

    if (!skill || typeof skill !== "object" || Array.isArray(skill)) {
      throw createProfileError(
        `Each ${type} skill must be an object`,
        400,
        type === "technical"
          ? "INVALID_TECHNICAL_SKILL"
          : "INVALID_SOCIAL_SKILL",
      );
    }

    // -----------------------------------------------------
    // Name required
    // -----------------------------------------------------

    if (!skill.name || typeof skill.name !== "string" || !skill.name.trim()) {
      throw createProfileError(
        `Each ${type} skill must have a name`,
        400,
        type === "technical"
          ? "TECHNICAL_SKILL_NAME_REQUIRED"
          : "SOCIAL_SKILL_NAME_REQUIRED",
      );
    }

    // -----------------------------------------------------
    // LEVEL MUST NOT BE PROVIDED BY USER
    // -----------------------------------------------------
    //
    // This prevents the frontend from saying:
    //
    // Python = advanced
    //
    // The assessment engine is the ONLY component that
    // should determine the level.
    //

    if (Object.prototype.hasOwnProperty.call(skill, "level")) {
      throw createProfileError(
        `${type} skill level must not be provided. Skill level is determined by AI assessment.`,
        400,
        "SKILL_LEVEL_NOT_ALLOWED",
      );
    }

    // -----------------------------------------------------
    // ASSESSMENT MUST NOT BE PROVIDED BY USER
    // -----------------------------------------------------
    //
    // The same principle applies to assessment data.
    //
    // The frontend must not be able to submit:
    //
    // {
    //   name: "Python",
    //   assessment: {
    //     score: 90
    //   }
    // }
    //

    if (Object.prototype.hasOwnProperty.call(skill, "assessment")) {
      throw createProfileError(
        `${type} skill assessment must not be provided. Skill assessment is generated by the system.`,
        400,
        "SKILL_ASSESSMENT_NOT_ALLOWED",
      );
    }
  }

  // -------------------------------------------------------
  // Duplicate validation
  // -------------------------------------------------------

  validateDuplicateSkills(skills, type);
}

// =========================================================
// NORMALIZE OPTIONAL STRING
// =========================================================

function normalizeOptionalString(value) {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== "string") {
    return value;
  }

  return value.trim();
}

// =========================================================
// GET PROFILE
// =========================================================

async function getProfile(userId) {
  const user = await UserModel.findById(userId).select("username email");

  if (!user) {
    throw createProfileError("User not found", 404, "USER_NOT_FOUND");
  }

  const profile = await ProfileModel.findOne({
    userId,
  });

  // =======================================================
  // PROFILE DOES NOT EXIST
  // =======================================================

  if (!profile) {
    return {
      profileExists: false,

      name: "",

      username: user.username,

      email: user.email,

      profilePicture: null,

      profilePictureFileId: null,

      technicalSkills: [],

      socialSkills: [],

      linkedin: "",

      github: "",

      leetcode: "",

      resume: null,

      resumeFileId: null,

      githubEvidence: null,

      profileCompletion: 0,
    };
  }

  // =======================================================
  // EXISTING PROFILE
  // =======================================================

  const profileCompletion = calculateProfileCompletion(profile);

  return {
    profileExists: true,

    name: profile.name || "",

    username: user.username,

    email: user.email,

    profilePicture: profile.profilePicture || null,

    profilePictureFileId: profile.profilePictureFileId || null,

    technicalSkills: profile.technicalSkills || [],

    socialSkills: profile.socialSkills || [],

    linkedin: profile.linkedin || "",

    github: profile.github || "",

    leetcode: profile.leetcode || "",

    resume: profile.resume || null,

    resumeFileId: profile.resumeFileId || null,

    githubEvidence: profile.githubEvidence || null,

    profileCompletion,
  };
}

// =========================================================
// UPDATE PROFILE
// =========================================================

async function updateProfile(userId, data, files = {}) {
  // =======================================================
  // GET EXISTING PROFILE
  // =======================================================

  const existingProfile = await ProfileModel.findOne({ userId });

  // =======================================================
  // DETERMINE WHICH BODY FIELDS WERE PROVIDED
  // =======================================================

  const hasTechnicalSkills = Object.prototype.hasOwnProperty.call(
    data,
    "technicalSkills",
  );

  const hasSocialSkills = Object.prototype.hasOwnProperty.call(
    data,
    "socialSkills",
  );

  const hasName = Object.prototype.hasOwnProperty.call(data, "name");

  const hasLinkedin = Object.prototype.hasOwnProperty.call(data, "linkedin");

  const hasGithub = Object.prototype.hasOwnProperty.call(data, "github");

  const hasLeetcode = Object.prototype.hasOwnProperty.call(data, "leetcode");

  // =======================================================
  // PARSE AND VALIDATE SKILLS
  // =======================================================

  let normalizedTechnicalSkills;
  let normalizedSocialSkills;

  // -------------------------------------------------------
  // TECHNICAL SKILLS
  // -------------------------------------------------------

  if (hasTechnicalSkills) {
    const technicalSkills = parseSkills(data.technicalSkills, "technical");

    validateSkills(technicalSkills, "technical");

    const normalizedSkills = normalizeSkills(technicalSkills);

    normalizedTechnicalSkills = mergeSkillsWithExistingAssessment(
      normalizedSkills,
      existingProfile?.technicalSkills || [],
    );
  }

  // -------------------------------------------------------
  // SOCIAL SKILLS
  // -------------------------------------------------------

  if (hasSocialSkills) {
    const socialSkills = parseSkills(data.socialSkills, "social");

    validateSkills(socialSkills, "social");

    const normalizedSkills = normalizeSkills(socialSkills);

    normalizedSocialSkills = mergeSkillsWithExistingAssessment(
      normalizedSkills,
      existingProfile?.socialSkills || [],
    );
  }

  // =======================================================
  // GET UPLOADED FILES
  // =======================================================

  const profilePictureFile = files?.profilePicture?.[0] || null;

  const resumeFile = files?.resume?.[0] || null;

  // =======================================================
  // NEW IMAGEKIT FILES
  // =======================================================

  let newProfilePicture = null;
  let newResume = null;

  try {
    // =====================================================
    // UPLOAD NEW PROFILE PICTURE
    // =====================================================

    if (profilePictureFile) {
      newProfilePicture = await uploadProfilePicture(
        profilePictureFile,
        userId,
      );
    }

    // =====================================================
    // UPLOAD NEW RESUME
    // =====================================================

    if (resumeFile) {
      newResume = await uploadResume(resumeFile, userId);
    }

    // =====================================================
    // DETERMINE PROFILE PICTURE
    // =====================================================

    const profilePictureUrl = newProfilePicture
      ? newProfilePicture.url
      : existingProfile?.profilePicture || null;

    const profilePictureFileId = newProfilePicture
      ? newProfilePicture.fileId
      : existingProfile?.profilePictureFileId || null;

    // =====================================================
    // DETERMINE RESUME
    // =====================================================

    const resumeUrl = newResume
      ? newResume.url
      : existingProfile?.resume || null;

    const resumeFileId = newResume
      ? newResume.fileId
      : existingProfile?.resumeFileId || null;

    // =====================================================
    // BUILD UPDATE OBJECT
    // =====================================================

    const updateFields = {};

    // =====================================================
    // BASIC PROFILE
    // =====================================================

    if (hasName) {
      updateFields.name = typeof data.name === "string" ? data.name.trim() : "";
    }

    // =====================================================
    // TECHNICAL SKILLS
    // =====================================================

    if (hasTechnicalSkills) {
      updateFields.technicalSkills = normalizedTechnicalSkills;
    }

    // =====================================================
    // SOCIAL SKILLS
    // =====================================================

    if (hasSocialSkills) {
      updateFields.socialSkills = normalizedSocialSkills;
    }

    // =====================================================
    // LINKEDIN
    // =====================================================

    if (hasLinkedin) {
      updateFields.linkedin = normalizeOptionalString(data.linkedin);
    }

    // =====================================================
    // GITHUB
    // =====================================================

    if (hasGithub) {
      updateFields.github = normalizeOptionalString(data.github);
    }

    // =====================================================
    // LEETCODE
    // =====================================================

    if (hasLeetcode) {
      updateFields.leetcode = normalizeOptionalString(data.leetcode);
    }

    // =====================================================
    // FILES
    // =====================================================

    updateFields.profilePicture = profilePictureUrl;

    updateFields.profilePictureFileId = profilePictureFileId;

    updateFields.resume = resumeUrl;

    updateFields.resumeFileId = resumeFileId;

    // =====================================================
    // UPDATE / CREATE PROFILE
    // =====================================================

    const profile = await ProfileModel.findOneAndUpdate(
      { userId },
      {
        $set: updateFields,
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      },
    );

    // =====================================================
    // DELETE OLD PROFILE PICTURE
    // =====================================================

    if (newProfilePicture && existingProfile?.profilePictureFileId) {
      await deleteFile(existingProfile.profilePictureFileId);
    }

    // =====================================================
    // DELETE OLD RESUME
    // =====================================================

    if (newResume && existingProfile?.resumeFileId) {
      await deleteFile(existingProfile.resumeFileId);
    }

    // =====================================================
    // PROFILE COMPLETION
    // =====================================================

    const profileCompletion = calculateProfileCompletion(profile);

    // =====================================================
    // RETURN
    // =====================================================

    return {
      profile,
      profileCompletion,
    };
  } catch (error) {
    // =====================================================
    // DATABASE / PROCESSING FAILED
    // CLEAN NEW FILES
    // =====================================================

    if (newProfilePicture?.fileId) {
      await deleteFile(newProfilePicture.fileId);
    }

    if (newResume?.fileId) {
      await deleteFile(newResume.fileId);
    }

    throw error;
  }
}

// =========================================================
// EXPORT
// =========================================================

module.exports = {
  getProfile,
  updateProfile,
};
