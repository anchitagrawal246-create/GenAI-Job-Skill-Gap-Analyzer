const ProfileModel = require("../../model/profile.model");

const GITHUB_API = "https://api.github.com";
const GITHUB_API_VERSION = "2022-11-28"; // real documented version
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || null; // optional but strongly recommended

const MAX_REPOSITORIES_TO_ANALYZE = 30;
const LANGUAGE_FETCH_CONCURRENCY = 5; // avoid GitHub abuse-detection throttling

// =========================================================
// CUSTOM ERROR
// =========================================================

function createGithubError(message, statusCode, code) {
  const error = new Error(message);

  error.statusCode = statusCode;
  error.code = code;

  return error;
}

// =========================================================
// GITHUB REQUEST
// =========================================================

async function githubRequest(endpoint) {
  let response;

  const headers = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": GITHUB_API_VERSION,
    "User-Agent": "AI-Interview-Platform",
  };

  if (GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${GITHUB_TOKEN}`;
  }

  try {
    response = await fetch(`${GITHUB_API}${endpoint}`, {
      method: "GET",
      headers,
    });
  } catch (error) {
    throw createGithubError(
      "Unable to connect to GitHub",
      502,
      "GITHUB_CONNECTION_ERROR",
    );
  }

  // =======================================================
  // HANDLE GITHUB ERRORS
  // =======================================================

  if (!response.ok) {
    if (response.status === 404) {
      throw createGithubError(
        "GitHub user or repository not found",
        404,
        "GITHUB_NOT_FOUND",
      );
    }

    if (response.status === 403) {
      const remaining = response.headers.get("x-ratelimit-remaining");

      if (remaining === "0") {
        const resetHeader = response.headers.get("x-ratelimit-reset");

        const resetMessage = resetHeader
          ? ` Resets at ${new Date(Number(resetHeader) * 1000).toISOString()}.`
          : "";

        throw createGithubError(
          `GitHub API rate limit exceeded.${resetMessage}${
            GITHUB_TOKEN
              ? ""
              : " Add a GITHUB_TOKEN env var to raise this limit."
          }`,
          429,
          "GITHUB_RATE_LIMIT",
        );
      }

      throw createGithubError(
        "GitHub API request was forbidden",
        502,
        "GITHUB_FORBIDDEN",
      );
    }

    if (response.status === 429) {
      throw createGithubError(
        "GitHub API secondary rate limit exceeded. Try again shortly.",
        429,
        "GITHUB_RATE_LIMIT",
      );
    }

    throw createGithubError(
      `GitHub API request failed with status ${response.status}`,
      502,
      "GITHUB_API_ERROR",
    );
  }

  // =======================================================
  // PARSE RESPONSE
  // =======================================================

  try {
    return await response.json();
  } catch (error) {
    throw createGithubError(
      "Invalid response received from GitHub",
      502,
      "GITHUB_INVALID_RESPONSE",
    );
  }
}

// =========================================================
// EXTRACT GITHUB USERNAME
// =========================================================

function extractGithubUsername(githubUrl) {
  if (!githubUrl || typeof githubUrl !== "string") {
    throw createGithubError(
      "GitHub URL is required",
      400,
      "GITHUB_URL_REQUIRED",
    );
  }

  let url;

  try {
    url = new URL(githubUrl.trim());
  } catch (error) {
    throw createGithubError("Invalid GitHub URL", 400, "INVALID_GITHUB_URL");
  }

  const hostname = url.hostname.toLowerCase();

  if (hostname !== "github.com" && hostname !== "www.github.com") {
    throw createGithubError(
      "URL must be a valid github.com profile URL",
      400,
      "INVALID_GITHUB_URL",
    );
  }

  const parts = url.pathname.split("/").filter(Boolean);

  if (parts.length !== 1) {
    throw createGithubError(
      "GitHub URL must point to a user profile",
      400,
      "INVALID_GITHUB_PROFILE_URL",
    );
  }

  return parts[0];
}

// =========================================================
// FETCH GITHUB USER
// =========================================================

async function getGithubUser(username) {
  return githubRequest(`/users/${encodeURIComponent(username)}`);
}

// =========================================================
// FETCH REPOSITORIES
// =========================================================

async function getGithubRepositories(username) {
  return githubRequest(
    `/users/${encodeURIComponent(
      username,
    )}/repos?type=owner&sort=updated&direction=desc&per_page=100`,
  );
}

// =========================================================
// FETCH REPOSITORY LANGUAGES
// =========================================================

async function getRepositoryLanguages(owner, repo) {
  return githubRequest(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/languages`,
  );
}

// =========================================================
// NORMALIZE SKILL NAME
// =========================================================

function normalizeSkillName(name) {
  if (!name || typeof name !== "string") {
    return "";
  }

  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

// =========================================================
// BUILD LANGUAGE EVIDENCE
// =========================================================

function buildLanguageEvidence(repositoryLanguageData) {
  const evidenceMap = new Map();

  for (const repository of repositoryLanguageData) {
    if (
      !repository ||
      !repository.languages ||
      typeof repository.languages !== "object" ||
      Array.isArray(repository.languages)
    ) {
      continue;
    }

    for (const language of Object.keys(repository.languages)) {
      if (!language) {
        continue;
      }

      const normalizedLanguage = normalizeSkillName(language);

      if (!normalizedLanguage) {
        continue;
      }

      if (!evidenceMap.has(normalizedLanguage)) {
        evidenceMap.set(normalizedLanguage, {
          name: language,
          repositories: [],
        });
      }

      const evidence = evidenceMap.get(normalizedLanguage);

      if (repository.name && !evidence.repositories.includes(repository.name)) {
        evidence.repositories.push(repository.name);
      }
    }
  }

  return evidenceMap;
}

// =========================================================
// CALCULATE EVIDENCE STRENGTH
// =========================================================

function calculateEvidenceStrength(repositoryCount) {
  if (repositoryCount >= 3) {
    return "strong";
  }

  if (repositoryCount >= 2) {
    return "moderate";
  }

  if (repositoryCount >= 1) {
    return "limited";
  }

  return "none";
}

// =========================================================
// MERGE GITHUB SKILLS WITH MANUAL SKILLS
// =========================================================

function mergeTechnicalSkills(profile, languageMap) {
  const manualSkills = Array.isArray(profile.technicalSkills)
    ? profile.technicalSkills
    : [];

  const validManualSkills = manualSkills.filter(
    (skill) => skill && typeof skill.name === "string" && skill.name.trim(),
  );

  const manualSkillMap = new Map();

  for (const skill of validManualSkills) {
    const normalizedName = normalizeSkillName(skill.name);

    if (!normalizedName) {
      continue;
    }

    if (!manualSkillMap.has(normalizedName)) {
      manualSkillMap.set(normalizedName, {
        name: skill.name.trim(),
      });
    }
  }

  const mergedSkills = [];

  for (const skill of manualSkillMap.values()) {
    mergedSkills.push({
      name: skill.name,
    });
  }

  for (const [, githubSkill] of languageMap.entries()) {
    const normalizedGithubSkill = normalizeSkillName(githubSkill.name);

    if (!normalizedGithubSkill) {
      continue;
    }

    if (!manualSkillMap.has(normalizedGithubSkill)) {
      mergedSkills.push({
        name: githubSkill.name,
      });
    }
  }

  return mergedSkills;
}

// =========================================================
// BUILD COMPLETE EVIDENCE REPORT
// =========================================================

function buildCompleteSkillEvidence(profile, languageMap) {
  const evidence = [];

  for (const [, githubSkill] of languageMap.entries()) {
    evidence.push({
      name: githubSkill.name,

      evidenceStrength: calculateEvidenceStrength(
        githubSkill.repositories.length,
      ),

      repositories: githubSkill.repositories,
    });
  }

  const manualSkills = Array.isArray(profile.technicalSkills)
    ? profile.technicalSkills
    : [];

  for (const skill of manualSkills) {
    if (!skill || typeof skill.name !== "string" || !skill.name.trim()) {
      continue;
    }

    const normalizedManualSkill = normalizeSkillName(skill.name);

    const githubEvidence = languageMap.get(normalizedManualSkill);

    if (githubEvidence) {
      continue;
    }

    evidence.push({
      name: skill.name.trim(),
      evidenceStrength: "none",
      repositories: [],
    });
  }

  const strengthWeight = {
    strong: 3,
    moderate: 2,
    limited: 1,
    none: 0,
  };

  return evidence.sort(
    (a, b) =>
      strengthWeight[b.evidenceStrength] - strengthWeight[a.evidenceStrength],
  );
}

// =========================================================
// ANALYZE SINGLE REPOSITORY
// =========================================================

async function analyzeRepository(username, repository) {
  if (!repository || !repository.name) {
    return null;
  }

  try {
    const languages = await getRepositoryLanguages(username, repository.name);

    return {
      name: repository.name,
      languages,
    };
  } catch (error) {
    console.error(
      `Failed to analyze repository ${repository.name}:`,
      error.message,
    );

    return null;
  }
}

// =========================================================
// BATCHED CONCURRENCY RUNNER
// =========================================================
//
// Fetching all repo languages at once risks GitHub's
// secondary (abuse-detection) rate limit, separate from
// the primary hourly quota. Run in small batches instead.
//

async function runInBatches(items, batchSize, worker) {
  const results = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);

    const batchResults = await Promise.allSettled(
      batch.map((item) => worker(item)),
    );

    results.push(...batchResults);
  }

  return results;
}

// =========================================================
// ANALYZE GITHUB
// =========================================================

async function analyzeGithubEvidence(userId) {
  const profile = await ProfileModel.findOne({
    userId,
  });

  if (!profile) {
    throw createGithubError("Profile not found", 404, "PROFILE_NOT_FOUND");
  }

  if (
    !profile.github ||
    typeof profile.github !== "string" ||
    !profile.github.trim()
  ) {
    throw createGithubError(
      "GitHub profile is not added to your profile",
      400,
      "GITHUB_PROFILE_REQUIRED",
    );
  }

  const username = extractGithubUsername(profile.github);

  await getGithubUser(username);

  const repositories = await getGithubRepositories(username);

  if (!Array.isArray(repositories)) {
    throw createGithubError(
      "Invalid repository data received from GitHub",
      502,
      "GITHUB_REPOSITORY_DATA_INVALID",
    );
  }

  const ownRepositories = repositories.filter(
    (repository) => repository && repository.fork !== true,
  );

  const repositoriesToAnalyze = ownRepositories.slice(
    0,
    MAX_REPOSITORIES_TO_ANALYZE,
  );

  // =======================================================
  // FETCH REPOSITORY LANGUAGES (BATCHED)
  // =======================================================

  const results = await runInBatches(
    repositoriesToAnalyze,
    LANGUAGE_FETCH_CONCURRENCY,
    (repository) => analyzeRepository(username, repository),
  );

  const repositoryLanguageData = [];

  for (const result of results) {
    if (result.status === "fulfilled" && result.value) {
      repositoryLanguageData.push(result.value);
    }
  }

  const languageMap = buildLanguageEvidence(repositoryLanguageData);

  const languages = Array.from(languageMap.values()).map((item) => item.name);

  const mergedTechnicalSkills = mergeTechnicalSkills(profile, languageMap);

  const skills = buildCompleteSkillEvidence(
    {
      ...profile.toObject(),

      technicalSkills: mergedTechnicalSkills,
    },
    languageMap,
  );

  profile.technicalSkills = mergedTechnicalSkills;

  profile.githubEvidence = {
    analyzed: true,

    username,

    repositoriesAnalyzed: repositoryLanguageData.length,

    languages,

    skills,

    analyzedAt: new Date(),
  };

  await profile.save();

  return profile.githubEvidence;
}

// =========================================================
// GET EXISTING GITHUB EVIDENCE
// =========================================================

async function getGithubEvidence(userId) {
  const profile = await ProfileModel.findOne({
    userId,
  });

  if (!profile) {
    throw createGithubError("Profile not found", 404, "PROFILE_NOT_FOUND");
  }

  return (
    profile.githubEvidence || {
      analyzed: false,
      username: null,
      repositoriesAnalyzed: 0,
      languages: [],
      skills: [],
      analyzedAt: null,
    }
  );
}

// =========================================================
// EXPORT
// =========================================================

module.exports = {
  analyzeGithubEvidence,
  getGithubEvidence,
  extractGithubUsername,
  normalizeSkillName,
};
