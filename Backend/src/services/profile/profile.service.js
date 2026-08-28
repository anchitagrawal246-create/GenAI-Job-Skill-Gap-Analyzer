
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

function parseSkills(skills, type) {
  // Already an array
  if (Array.isArray(skills)) {
    return skills;
  }

  // Missing / intentionally empty
  if (skills === undefined || skills === null || skills === "") {
    return [];
  }

  // Multipart/form-data sends JSON arrays as strings
  if (typeof skills === "string") {
    try {
      const parsed = JSON.parse(skills);

      if (!Array.isArray(parsed)) {
        throw createProfileError(
          `${type} skills must be an array`,
          400,
          type === "technical"
            ? "INVALID_TECHNICAL_SKILLS"
            : "INVALID_SOCIAL_SKILLS"
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
          : "INVALID_SOCIAL_SKILLS"
      );
    }
  }

  throw createProfileError(
    `${type} skills must be an array`,
    400,
    type === "technical"
      ? "INVALID_TECHNICAL_SKILLS"
      : "INVALID_SOCIAL_SKILLS"
  );
}

// =========================================================
// NORMALIZE SKILLS
// =========================================================

function normalizeSkills(skills) {
  return skills.map((skill) => ({
    name: skill.name.trim(),
  }));
}

// =========================================================
// MERGE EXISTING AI ASSESSMENT
// =========================================================

function mergeSkillsWithExistingAssessment(
  newSkills,
  existingSkills = []
) {
  return newSkills.map((newSkill) => {
    const normalizedName = newSkill.name.trim().toLowerCase();

    const existingSkill = existingSkills.find(
      (skill) =>
        skill.name &&
        skill.name.trim().toLowerCase() === normalizedName
    );

    // Existing skill:
    // preserve AI-generated level + assessment
    if (existingSkill) {
      return {
        name: newSkill.name,

        level:
          existingSkill.level !== undefined
            ? existingSkill.level
            : null,

        assessment:
          existingSkill.assessment || {},
      };
    }

    // New skill:
    // AI assessment will happen later
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
          : "DUPLICATE_SOCIAL_SKILL"
      );
    }

    seen.add(normalizedName);
  }
}

// =========================================================
// VALIDATE SKILLS
// =========================================================

function validateSkills(skills, type) {
  if (!Array.isArray(skills)) {
    throw createProfileError(
      `${type} skills must be an array`,
      400,
      type === "technical"
        ? "INVALID_TECHNICAL_SKILLS"
        : "INVALID_SOCIAL_SKILLS"
    );
  }

  if (skills.length === 0) {
    return;
  }

  for (const skill of skills) {
    // Must be object
    if (
      !skill ||
      typeof skill !== "object" ||
      Array.isArray(skill)
    ) {
      throw createProfileError(
        `Each ${type} skill must be an object`,
        400,
        type === "technical"
          ? "INVALID_TECHNICAL_SKILL"
          : "INVALID_SOCIAL_SKILL"
      );
    }

    // Name required
    if (
      !skill.name ||
      typeof skill.name !== "string" ||
      !skill.name.trim()
    ) {
      throw createProfileError(
        `Each ${type} skill must have a name`,
        400,
        type === "technical"
          ? "TECHNICAL_SKILL_NAME_REQUIRED"
          : "SOCIAL_SKILL_NAME_REQUIRED"
      );
    }

    // User cannot provide level
    if (
      Object.prototype.hasOwnProperty.call(skill, "level")
    ) {
      throw createProfileError(
        "Skill level must not be provided. Skill level is determined by AI assessment.",
        400,
        "SKILL_LEVEL_NOT_ALLOWED"
      );
    }

    // User cannot provide assessment
    if (
      Object.prototype.hasOwnProperty.call(skill, "assessment")
    ) {
      throw createProfileError(
        "Skill assessment must not be provided. Skill assessment is generated by the system.",
        400,
        "SKILL_ASSESSMENT_NOT_ALLOWED"
      );
    }
  }

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
  const user = await UserModel.findById(userId)
    .select("username email");

  if (!user) {
    throw createProfileError(
      "User not found",
      404,
      "USER_NOT_FOUND"
    );
  }

  const profile = await ProfileModel.findOne({ userId });

  // =======================================================
  // PROFILE DOES NOT EXIST
  // =======================================================

  if (!profile) {
    return {
      profileExists: false,

      name: "",

      username: user.username,

      email: user.email,

      role: "",

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

  const profileCompletion =
    calculateProfileCompletion(profile);

  return {
    profileExists: true,

    name: profile.name || "",

    username: user.username,

    email: user.email,

    role: profile.role || "",

    profilePicture: profile.profilePicture || null,

    profilePictureFileId:
      profile.profilePictureFileId || null,

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

  const existingProfile = await ProfileModel.findOne({
    userId,
  });

  // =======================================================
  // DETERMINE PROVIDED FIELDS
  // =======================================================

  const hasName = Object.prototype.hasOwnProperty.call(
    data,
    "name"
  );

  const hasRole = Object.prototype.hasOwnProperty.call(
    data,
    "role"
  );

  const hasTechnicalSkills =
    Object.prototype.hasOwnProperty.call(
      data,
      "technicalSkills"
    );

  const hasSocialSkills =
    Object.prototype.hasOwnProperty.call(
      data,
      "socialSkills"
    );

  const hasLinkedin =
    Object.prototype.hasOwnProperty.call(
      data,
      "linkedin"
    );

  const hasGithub =
    Object.prototype.hasOwnProperty.call(
      data,
      "github"
    );

  const hasLeetcode =
    Object.prototype.hasOwnProperty.call(
      data,
      "leetcode"
    );

  // =======================================================
  // PARSE + VALIDATE SKILLS
  // =======================================================

  let normalizedTechnicalSkills;
  let normalizedSocialSkills;

  // -------------------------------------------------------
  // TECHNICAL SKILLS
  // -------------------------------------------------------

  if (hasTechnicalSkills) {
    const technicalSkills = parseSkills(
      data.technicalSkills,
      "technical"
    );

    validateSkills(
      technicalSkills,
      "technical"
    );

    normalizedTechnicalSkills =
      mergeSkillsWithExistingAssessment(
        normalizeSkills(technicalSkills),
        existingProfile?.technicalSkills || []
      );
  }

  // -------------------------------------------------------
  // SOCIAL SKILLS
  // -------------------------------------------------------

  if (hasSocialSkills) {
    const socialSkills = parseSkills(
      data.socialSkills,
      "social"
    );

    validateSkills(
      socialSkills,
      "social"
    );

    normalizedSocialSkills =
      mergeSkillsWithExistingAssessment(
        normalizeSkills(socialSkills),
        existingProfile?.socialSkills || []
      );
  }

  // =======================================================
  // GET UPLOADED FILES
  // =======================================================

  const profilePictureFile =
    files?.profilePicture?.[0] || null;

  const resumeFile =
    files?.resume?.[0] || null;

  // =======================================================
  // NEW UPLOADS
  // =======================================================

  let newProfilePicture = null;
  let newResume = null;

  try {
    // =====================================================
    // PROFILE PICTURE
    // =====================================================

    if (profilePictureFile) {
      newProfilePicture =
        await uploadProfilePicture(
          profilePictureFile,
          userId
        );
    }

    // =====================================================
    // RESUME
    // =====================================================

    if (resumeFile) {
      newResume = await uploadResume(
        resumeFile,
        userId
      );
    }

    // =====================================================
    // PROFILE PICTURE DATA
    // =====================================================

    const profilePictureUrl = newProfilePicture
      ? newProfilePicture.url
      : existingProfile?.profilePicture || null;

    const profilePictureFileId = newProfilePicture
      ? newProfilePicture.fileId
      : existingProfile?.profilePictureFileId || null;

    // =====================================================
    // RESUME DATA
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
      updateFields.name =
        typeof data.name === "string"
          ? data.name.trim()
          : "";
    }

    // =====================================================
    // ROLE
    // =====================================================

    if (hasRole) {
      updateFields.role =
        typeof data.role === "string"
          ? data.role.trim()
          : "";
    }

    // =====================================================
    // TECHNICAL SKILLS
    // =====================================================

    if (hasTechnicalSkills) {
      updateFields.technicalSkills =
        normalizedTechnicalSkills;
    }

    // =====================================================
    // SOCIAL SKILLS
    // =====================================================

    if (hasSocialSkills) {
      updateFields.socialSkills =
        normalizedSocialSkills;
    }

    // =====================================================
    // LINKEDIN
    // =====================================================

    if (hasLinkedin) {
      updateFields.linkedin =
        normalizeOptionalString(data.linkedin);
    }

    // =====================================================
    // GITHUB
    // =====================================================

    if (hasGithub) {
      updateFields.github =
        normalizeOptionalString(data.github);
    }

    // =====================================================
    // LEETCODE
    // =====================================================

    if (hasLeetcode) {
      updateFields.leetcode =
        normalizeOptionalString(data.leetcode);
    }

    // =====================================================
    // FILES
    // =====================================================

    updateFields.profilePicture =
      profilePictureUrl;

    updateFields.profilePictureFileId =
      profilePictureFileId;

    updateFields.resume =
      resumeUrl;

    updateFields.resumeFileId =
      resumeFileId;

    // =====================================================
    // CREATE / UPDATE PROFILE
    // =====================================================

    const profile =
      await ProfileModel.findOneAndUpdate(
        { userId },

        {
          $set: updateFields,
        },

        {
          new: true,
          upsert: true,
          runValidators: true,
          setDefaultsOnInsert: true,
        }
      );

    // =====================================================
    // DELETE OLD FILES
    // =====================================================

    // Important:
    // Database has already been successfully updated.
    // Therefore failure while deleting an old file should
    // NOT delete the newly uploaded file.

    if (
      newProfilePicture &&
      existingProfile?.profilePictureFileId &&
      existingProfile.profilePictureFileId !==
        newProfilePicture.fileId
    ) {
      try {
        await deleteFile(
          existingProfile.profilePictureFileId
        );
      } catch (deleteError) {
        console.error(
          "Failed to delete old profile picture:",
          deleteError
        );
      }
    }

    if (
      newResume &&
      existingProfile?.resumeFileId &&
      existingProfile.resumeFileId !== newResume.fileId
    ) {
      try {
        await deleteFile(
          existingProfile.resumeFileId
        );
      } catch (deleteError) {
        console.error(
          "Failed to delete old resume:",
          deleteError
        );
      }
    }

    // =====================================================
    // PROFILE COMPLETION
    // =====================================================

    const profileCompletion =
      calculateProfileCompletion(profile);

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
    // CLEAN ONLY NEWLY UPLOADED FILES
    // =====================================================

    if (newProfilePicture?.fileId) {
      try {
        await deleteFile(
          newProfilePicture.fileId
        );
      } catch (cleanupError) {
        console.error(
          "Failed to cleanup new profile picture:",
          cleanupError
        );
      }
    }

    if (newResume?.fileId) {
      try {
        await deleteFile(
          newResume.fileId
        );
      } catch (cleanupError) {
        console.error(
          "Failed to cleanup new resume:",
          cleanupError
        );
      }
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
