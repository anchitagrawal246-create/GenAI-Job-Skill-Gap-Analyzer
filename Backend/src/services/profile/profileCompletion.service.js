const PROFILE_WEIGHTS = {
  basicInfo: 10,
  technicalSkills: 25,
  socialSkills: 15,
  resume: 20,
  github: 10,
  linkedin: 10,
  leetcode: 5,
  profilePicture: 5,
};

// =========================================================
// CALCULATE PROFILE COMPLETION
// =========================================================

function calculateProfileCompletion(profile) {
  let completion = 0;

  // =======================================================
  // BASIC INFORMATION
  // =======================================================
  // Name is optional.
  // Username and email already come from the authenticated
  // User model, so basic identity is considered complete.

  completion += PROFILE_WEIGHTS.basicInfo;

  // =======================================================
  // TECHNICAL SKILLS
  // =======================================================

  if (
    Array.isArray(profile?.technicalSkills) &&
    profile.technicalSkills.length > 0
  ) {
    completion += PROFILE_WEIGHTS.technicalSkills;
  }

  // =======================================================
  // SOCIAL SKILLS
  // =======================================================

  if (Array.isArray(profile?.socialSkills) && profile.socialSkills.length > 0) {
    completion += PROFILE_WEIGHTS.socialSkills;
  }

  // =======================================================
  // RESUME
  // =======================================================

  if (profile?.resume) {
    completion += PROFILE_WEIGHTS.resume;
  }

  // =======================================================
  // GITHUB
  // =======================================================

  if (profile?.github) {
    completion += PROFILE_WEIGHTS.github;
  }

  // =======================================================
  // LINKEDIN
  // =======================================================

  if (profile?.linkedin) {
    completion += PROFILE_WEIGHTS.linkedin;
  }

  // =======================================================
  // LEETCODE
  // =======================================================

  if (profile?.leetcode) {
    completion += PROFILE_WEIGHTS.leetcode;
  }

  // =======================================================
  // PROFILE PICTURE
  // =======================================================

  if (profile?.profilePicture) {
    completion += PROFILE_WEIGHTS.profilePicture;
  }

  // =======================================================
  // SAFETY
  // =======================================================
  // Completion should always remain between 0 and 100.

  return Math.min(Math.max(completion, 0), 100);
}

// =========================================================
// EXPORT
// =========================================================

module.exports = {
  PROFILE_WEIGHTS,
  calculateProfileCompletion,
};
