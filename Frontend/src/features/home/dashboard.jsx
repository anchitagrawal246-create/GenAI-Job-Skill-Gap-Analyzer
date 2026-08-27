import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  FiHome,
  FiCpu,
  FiBarChart2,
  FiUser,
  FiSettings,
  FiBell,
  FiArrowRight,
  FiPlay,
  FiClock,
  FiAward,
  FiChevronRight,
  FiPlus,
  FiFileText,
  FiGithub,
  FiLinkedin,
  FiCode,
  FiTarget,
  FiCheckCircle,
  FiXCircle,
  FiRefreshCw,
  FiMenu,
  FiX,
  FiLogOut,
  FiCheck,
  FiZap,
  FiTrendingUp,
  FiLayers,
  FiShield,
} from "react-icons/fi";

import { getInterviews, createInterview } from "../../api/interview.api";

import { getMyProfile } from "../../api/profile.api";

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

// ============================================================
// STORAGE
// ============================================================

const getStoredUser = () => {
  try {
    const raw = localStorage.getItem("user") || sessionStorage.getItem("user");

    if (!raw) {
      return null;
    }

    return JSON.parse(raw);
  } catch (error) {
    console.error("[DASHBOARD] Failed to parse stored user:", error);

    return null;
  }
};

// ============================================================
// STRING HELPERS
// ============================================================

const cleanString = (value) => {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
};

const uniqueStrings = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set();

  return value
    .filter((item) => typeof item === "string" && item.trim().length > 0)
    .map((item) => item.trim())
    .filter((item) => {
      const key = item.toLowerCase();

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    })
    .slice(0, 30);
};

// ============================================================
// PROFILE EXTRACTION
// ============================================================

const getProfileData = (response) => {
  if (!response) {
    return null;
  }

  const data = response?.data ?? response;

  const candidates = [
    data?.profile,
    data?.data?.profile,
    data?.data,
    response?.profile,
    response,
  ];

  return (
    candidates.find(
      (item) => item && typeof item === "object" && !Array.isArray(item),
    ) || null
  );
};

const getProfileRole = (profile, user) => {
  const roleCandidates = [
    profile?.targetRole,
    profile?.preferredRole,
    profile?.jobRole,
    profile?.careerGoal,
    profile?.desiredRole,
    profile?.role,

    profile?.basicInfo?.targetRole,
    profile?.basicInfo?.preferredRole,
    profile?.basicInfo?.jobRole,

    profile?.user?.targetRole,
    profile?.user?.preferredRole,
    profile?.user?.jobRole,
    profile?.user?.role,

    user?.targetRole,
    user?.preferredRole,
    user?.jobRole,
    user?.careerGoal,
    user?.role,
  ];

  const role = roleCandidates.find(
    (value) => typeof value === "string" && value.trim(),
  );

  return role?.trim() || "";
};

const getTechnicalSkills = (profile, user) => {
  const candidates = [
    profile?.technicalSkills,
    profile?.technical?.skills,
    profile?.manualSkills,
    profile?.skills,

    profile?.technicalProfile?.skills,
    profile?.technicalProfile?.technicalSkills,

    profile?.user?.technicalSkills,
    profile?.user?.skills,
    profile?.user?.manualSkills,

    user?.technicalSkills,
    user?.skills,
    user?.manualSkills,
  ];

  for (const candidate of candidates) {
    if (!Array.isArray(candidate)) {
      continue;
    }

    const normalized = uniqueStrings(candidate);

    if (normalized.length > 0) {
      return normalized;
    }
  }

  return [];
};

const getSocialSkills = (profile, user) => {
  const candidates = [
    profile?.socialSkills,
    profile?.softSkills,
    profile?.communicationSkills,
    profile?.social?.skills,

    profile?.user?.socialSkills,

    user?.socialSkills,
    user?.softSkills,
  ];

  for (const candidate of candidates) {
    if (!Array.isArray(candidate)) {
      continue;
    }

    const normalized = uniqueStrings(candidate);

    if (normalized.length > 0) {
      return normalized;
    }
  }

  return [];
};

const getProfileField = (profile, user, keys) => {
  for (const key of keys) {
    const profileValue = profile?.[key];

    if (
      profileValue !== undefined &&
      profileValue !== null &&
      String(profileValue).trim()
    ) {
      return profileValue;
    }

    const userValue = user?.[key];

    if (
      userValue !== undefined &&
      userValue !== null &&
      String(userValue).trim()
    ) {
      return userValue;
    }
  }

  return null;
};

const getProfilePicture = (profile, user) => {
  return (
    getProfileField(profile, user, [
      "profilePicture",
      "profilePic",
      "avatar",
      "avatarUrl",
      "profileImage",
      "profileImageUrl",
    ]) || null
  );
};

const getResume = (profile, user) => {
  return getProfileField(profile, user, [
    "resume",
    "resumeUrl",
    "resumeFile",
    "resumePath",
  ]);
};

const getGithub = (profile, user) => {
  return getProfileField(profile, user, [
    "github",
    "githubUrl",
    "githubProfile",
  ]);
};

const getLinkedIn = (profile, user) => {
  return getProfileField(profile, user, [
    "linkedin",
    "linkedinUrl",
    "linkedIn",
    "linkedInUrl",
  ]);
};

const getLeetCode = (profile, user) => {
  return getProfileField(profile, user, [
    "leetcode",
    "leetcodeUrl",
    "leetCode",
    "leetCodeUrl",
  ]);
};

const getDisplayName = (profile, user) => {
  return (
    getProfileField(profile, user, ["name", "fullName", "displayName"]) ||
    getProfileField(profile?.basicInfo, user, ["name", "fullName"]) ||
    getProfileField(profile?.user, user, ["name", "fullName"]) ||
    "Candidate"
  );
};

const getUsername = (profile, user) => {
  return (
    getProfileField(profile, user, ["username", "userName"]) ||
    getProfileField(profile?.user, user, ["username", "userName"]) ||
    ""
  );
};

const getEmail = (profile, user) => {
  return (
    getProfileField(profile, user, ["email"]) ||
    getProfileField(profile?.user, user, ["email"]) ||
    ""
  );
};

// ============================================================
// INTERVIEW HELPERS
// ============================================================

const getInterviewId = (interview) => {
  return interview?._id || interview?.id || interview?.interviewId || null;
};

const getInterviewTitle = (interview) => {
  return (
    interview?.title ||
    interview?.name ||
    interview?.role ||
    interview?.jobRole ||
    "AI Technical Interview"
  );
};

const getInterviewStatus = (interview) => {
  return (
    interview?.status ||
    interview?.state ||
    interview?.interviewStatus ||
    "created"
  );
};

const getInterviewDate = (interview) => {
  const value =
    interview?.updatedAt || interview?.createdAt || interview?.startedAt;

  if (!value) {
    return "No date";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "No date";
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getStatusLabel = (status) => {
  const normalized = String(status || "").toLowerCase();

  switch (normalized) {
    case "completed":
      return "Completed";

    case "cancelled":
    case "canceled":
      return "Cancelled";

    case "in-progress":
    case "in_progress":
    case "started":
      return "In Progress";

    case "paused":
      return "Paused";

    case "created":
    case "pending":
      return "Not Started";

    default:
      return status || "Unknown";
  }
};

const getStatusClass = (status) => {
  const normalized = String(status || "").toLowerCase();

  if (normalized === "completed") {
    return "status-completed";
  }

  if (normalized === "cancelled" || normalized === "canceled") {
    return "status-cancelled";
  }

  if (
    normalized === "in-progress" ||
    normalized === "in_progress" ||
    normalized === "started"
  ) {
    return "status-progress";
  }

  if (normalized === "paused") {
    return "status-paused";
  }

  return "status-default";
};

const clamp = (value, min, max) => {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return min;
  }

  return Math.min(max, Math.max(min, number));
};

// ============================================================
// PROFILE COMPLETION
// ============================================================

const calculateProfileCompletion = (profile, user) => {
  let score = 0;

  const name = getDisplayName(profile, user);
  const username = getUsername(profile, user);
  const email = getEmail(profile, user);

  const technicalSkills = getTechnicalSkills(profile, user);

  const socialSkills = getSocialSkills(profile, user);

  const resume = getResume(profile, user);
  const github = getGithub(profile, user);
  const linkedin = getLinkedIn(profile, user);
  const leetcode = getLeetCode(profile, user);
  const profilePicture = getProfilePicture(profile, user);

  // Basic profile = 10
  if (cleanString(name) || cleanString(username) || cleanString(email)) {
    score += 10;
  }

  // Technical = 25
  if (technicalSkills.length > 0) {
    score += 25;
  }

  // Social = 15
  if (socialSkills.length > 0) {
    score += 15;
  }

  // Resume = 20
  if (resume) {
    score += 20;
  }

  // GitHub = 10
  if (github) {
    score += 10;
  }

  // LinkedIn = 10
  if (linkedin) {
    score += 10;
  }

  // LeetCode = 5
  if (leetcode) {
    score += 5;
  }

  // Profile picture = 5
  if (profilePicture) {
    score += 5;
  }

  return Math.min(score, 100);
};

// ============================================================
// DASHBOARD
// ============================================================

const Dashboard = () => {
  const navigate = useNavigate();

  const [storedUser, setStoredUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [interviews, setInterviews] = useState([]);

  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);

  const [creatingInterview, setCreatingInterview] = useState(false);

  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState("");

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [activeMenu, setActiveMenu] = useState("dashboard");

  const [showCreateModal, setShowCreateModal] = useState(false);

  const [createForm, setCreateForm] = useState({
    difficulty: "auto",
    questionCount: 10,
    skills: [],
  });

  // ==========================================================
  // INITIAL STORED USER
  // ==========================================================

  useEffect(() => {
    const user = getStoredUser();

    setStoredUser(user);
  }, []);

  // ==========================================================
  // LOAD PROFILE
  // ==========================================================

  const loadProfile = useCallback(async () => {
    try {
      setProfileLoading(true);

      const response = await getMyProfile();

      console.log("[DASHBOARD] PROFILE RESPONSE:", response);

      const profileData = getProfileData(response);

      setProfile(profileData);

      // Keep locally stored basic user information
      // synchronized when backend provides it.
      const returnedUser = profileData?.user || profileData?.userData || null;

      if (returnedUser) {
        setStoredUser((previous) => ({
          ...(previous || {}),
          ...returnedUser,
        }));
      }
    } catch (err) {
      console.error("[DASHBOARD] Failed to load profile:", err);

      // Profile failure should not prevent
      // dashboard interviews from loading.
      setProfile(null);
    } finally {
      setProfileLoading(false);
    }
  }, []);

  // ==========================================================
  // LOAD INTERVIEWS
  // ==========================================================

  const loadInterviews = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) {
        setLoading(true);
      }

      setError("");

      const response = await getInterviews();

      console.log("[DASHBOARD] GET INTERVIEWS RESPONSE:", response);

      const responseData = response?.data;

      let list = [];

      if (Array.isArray(responseData)) {
        list = responseData;
      } else if (Array.isArray(responseData?.data)) {
        list = responseData.data;
      } else if (Array.isArray(responseData?.interviews)) {
        list = responseData.interviews;
      } else if (Array.isArray(responseData?.results)) {
        list = responseData.results;
      }

      setInterviews(list);
    } catch (err) {
      console.error("[DASHBOARD] Failed to load interviews:", err);

      setError(err?.response?.data?.message || "Unable to load interviews.");
    } finally {
      if (showLoader) {
        setLoading(false);
      }
    }
  }, []);

  // ==========================================================
  // INITIAL LOAD
  // ==========================================================

  useEffect(() => {
    const initializeDashboard = async () => {
      await Promise.all([loadProfile(), loadInterviews(true)]);
    };

    initializeDashboard();
  }, [loadProfile, loadInterviews]);

  // ==========================================================
  // REFRESH DASHBOARD
  // ==========================================================

  const handleRefresh = useCallback(async () => {
    if (refreshing) {
      return;
    }

    try {
      setRefreshing(true);
      setError("");

      await Promise.all([loadProfile(), loadInterviews(false)]);
    } finally {
      setRefreshing(false);
    }
  }, [refreshing, loadProfile, loadInterviews]);

  // ==========================================================
  // DERIVED PROFILE
  // ==========================================================

  const profileName = useMemo(
    () => getDisplayName(profile, storedUser),
    [profile, storedUser],
  );

  const username = useMemo(
    () => getUsername(profile, storedUser),
    [profile, storedUser],
  );

  const email = useMemo(
    () => getEmail(profile, storedUser),
    [profile, storedUser],
  );

  const profileRole = useMemo(
    () => getProfileRole(profile, storedUser),
    [profile, storedUser],
  );

  const technicalSkills = useMemo(
    () => getTechnicalSkills(profile, storedUser),
    [profile, storedUser],
  );

  const socialSkills = useMemo(
    () => getSocialSkills(profile, storedUser),
    [profile, storedUser],
  );

  const resume = useMemo(
    () => getResume(profile, storedUser),
    [profile, storedUser],
  );

  const github = useMemo(
    () => getGithub(profile, storedUser),
    [profile, storedUser],
  );

  const linkedin = useMemo(
    () => getLinkedIn(profile, storedUser),
    [profile, storedUser],
  );

  const leetcode = useMemo(
    () => getLeetCode(profile, storedUser),
    [profile, storedUser],
  );

  const profilePicture = useMemo(
    () => getProfilePicture(profile, storedUser),
    [profile, storedUser],
  );

  // ==========================================================
  // PROFILE COMPLETION
  // ==========================================================

  const profileCompletion = useMemo(
    () => calculateProfileCompletion(profile, storedUser),
    [profile, storedUser],
  );

  // ==========================================================
  // INTERVIEW STATUS
  // ==========================================================

  const completedInterviews = useMemo(() => {
    return interviews.filter((interview) => {
      return (
        String(getInterviewStatus(interview)).toLowerCase() === "completed"
      );
    });
  }, [interviews]);

  const activeInterviews = useMemo(() => {
    return interviews.filter((interview) => {
      const status = String(getInterviewStatus(interview)).toLowerCase();

      return (
        status === "in-progress" ||
        status === "in_progress" ||
        status === "started"
      );
    });
  }, [interviews]);

  const pausedInterviews = useMemo(() => {
    return interviews.filter((interview) => {
      return String(getInterviewStatus(interview)).toLowerCase() === "paused";
    });
  }, [interviews]);

  // ==========================================================
  // INTERVIEW CREATION
  // ==========================================================

  const handleCreateInterview = async () => {
    if (creatingInterview) {
      return;
    }

    const role = cleanString(profileRole);

    if (!role) {
      setError(
        "Please add your target role in your profile before starting an interview.",
      );

      navigate("/profile");
      return;
    }

    try {
      setCreatingInterview(true);
      setError("");

      const selectedSkills = uniqueStrings(createForm.skills);

      const totalQuestions = Math.min(
        MAX_QUESTIONS,
        Math.max(1, Math.round(Number(createForm.questionCount) || 10)),
      );

      const difficulty = DIFFICULTIES.includes(createForm.difficulty)
        ? createForm.difficulty
        : "auto";

      const skillMode = selectedSkills.length > 0 ? "specific" : "all";

      const payload = {
        title: `${role} AI Interview`,
        role,
        interviewType: "mixed",
        difficulty,
        skillMode,
        technologies: selectedSkills,
        totalQuestions,
      };

      console.log("==================================================");

      console.log("[DASHBOARD] CREATE INTERVIEW PAYLOAD:");

      console.log(payload);

      console.log("==================================================");

      const response = await createInterview(payload);

      console.log("[DASHBOARD] CREATE INTERVIEW RESPONSE:", response);

      const responseData = response?.data;

      const interview =
        responseData?.data || responseData?.interview || responseData;

      const interviewId =
        interview?._id ||
        interview?.id ||
        interview?.interviewId ||
        responseData?.interviewId;

      if (!interviewId) {
        throw new Error(
          "Interview was created but the server did not return an interview ID.",
        );
      }

      setShowCreateModal(false);

      setCreateForm({
        difficulty: "auto",
        questionCount: 10,
        skills: [],
      });

      await loadInterviews(false);

      navigate(`/interviews/${interviewId}`);
    } catch (err) {
      console.error("[DASHBOARD] Create interview failed:", err);

      const message =
        err?.response?.data?.message ||
        err?.response?.data?.error?.message ||
        err?.message ||
        "Unable to create interview.";

      setError(message);
    } finally {
      setCreatingInterview(false);
    }
  };

  // ==========================================================
  // RESUME / OPEN INTERVIEW
  // ==========================================================

  const handleOpenInterview = (interview) => {
    const id = getInterviewId(interview);

    if (!id) {
      setError("Interview ID is missing. Cannot open interview.");
      return;
    }

    navigate(`/interviews/${id}`);
  };

  // ==========================================================
  // NAVIGATION
  // ==========================================================

  const handleNavigation = (menu) => {
    setActiveMenu(menu);
    setSidebarOpen(false);

    switch (menu) {
      case "dashboard":
        navigate("/dashboard");
        break;

      case "interviews":
        setShowCreateModal(true);
        break;

      case "analytics":
        navigate("/dashboard");
        break;

      case "profile":
        navigate("/profile");
        break;

      case "settings":
        navigate("/settings");
        break;

      default:
        break;
    }
  };

  // ==========================================================
  // LOGOUT
  // ==========================================================

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    sessionStorage.removeItem("accessToken");

    localStorage.removeItem("user");
    sessionStorage.removeItem("user");

    navigate("/login");
  };

  // ==========================================================
  // SKILLS
  // ==========================================================

  const toggleSkill = (skill) => {
    setCreateForm((previous) => {
      const exists = previous.skills.includes(skill);

      return {
        ...previous,
        skills: exists
          ? previous.skills.filter((item) => item !== skill)
          : [...previous.skills, skill],
      };
    });
  };

  const toggleAllSkills = () => {
    setCreateForm((previous) => {
      const allSelected =
        technicalSkills.length > 0 &&
        previous.skills.length === technicalSkills.length;

      return {
        ...previous,
        skills: allSelected ? [] : [...technicalSkills],
      };
    });
  };

  // ==========================================================
  // PROFILE CONNECTION STATUS
  // ==========================================================

  const evidenceItems = [
    {
      label: "Resume",
      connected: Boolean(resume),
      icon: FiFileText,
    },
    {
      label: "GitHub",
      connected: Boolean(github),
      icon: FiGithub,
    },
    {
      label: "LinkedIn",
      connected: Boolean(linkedin),
      icon: FiLinkedin,
    },
    {
      label: "LeetCode",
      connected: Boolean(leetcode),
      icon: FiCode,
    },
  ];

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="dashboard-page">
      {/* ======================================================
          MOBILE OVERLAY
      ====================================================== */}

      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ======================================================
          SIDEBAR
      ====================================================== */}

      <aside
        className={`dashboard-sidebar ${sidebarOpen ? "sidebar-open" : ""}`}
      >
        <div className="sidebar-header">
          <button
            type="button"
            className="brand"
            onClick={() => handleNavigation("dashboard")}
          >
            <div className="brand-icon">
              <FiCpu />
            </div>

            <div>
              <strong>AI Interview</strong>
              <span>Adaptive Career Coach</span>
            </div>
          </button>

          <button
            type="button"
            className="mobile-close"
            onClick={() => setSidebarOpen(false)}
          >
            <FiX />
          </button>
        </div>

        <div className="sidebar-profile">
          <div className="sidebar-avatar">
            {profilePicture ? (
              <img src={String(profilePicture)} alt="Profile" />
            ) : (
              <FiUser />
            )}
          </div>

          <div className="sidebar-profile-info">
            <strong>{profileName}</strong>

            <span>{profileRole || "Complete your profile"}</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <button
            type="button"
            className={`nav-item ${activeMenu === "dashboard" ? "active" : ""}`}
            onClick={() => handleNavigation("dashboard")}
          >
            <FiHome />
            <span>Dashboard</span>
          </button>

          <button
            type="button"
            className={`nav-item ${
              activeMenu === "interviews" ? "active" : ""
            }`}
            onClick={() => handleNavigation("interviews")}
          >
            <FiCpu />
            <span>AI Interviews</span>
          </button>

          <button
            type="button"
            className={`nav-item ${activeMenu === "analytics" ? "active" : ""}`}
            onClick={() => handleNavigation("analytics")}
          >
            <FiBarChart2 />
            <span>Analytics</span>
          </button>

          <button
            type="button"
            className={`nav-item ${activeMenu === "profile" ? "active" : ""}`}
            onClick={() => handleNavigation("profile")}
          >
            <FiUser />
            <span>Profile</span>
          </button>

          <button
            type="button"
            className={`nav-item ${activeMenu === "settings" ? "active" : ""}`}
            onClick={() => handleNavigation("settings")}
          >
            <FiSettings />
            <span>Settings</span>
          </button>
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-help">
            <div className="help-icon">
              <FiZap />
            </div>

            <div>
              <strong>AI uses your profile as evidence</strong>

              <p>
                Add skills, resume and developer links for more personalized
                interviews.
              </p>
            </div>
          </div>

          <button
            type="button"
            className="logout-button"
            onClick={handleLogout}
          >
            <FiLogOut />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* ======================================================
          MAIN
      ====================================================== */}

      <main className="dashboard-main">
        {/* ====================================================
            HEADER
        ==================================================== */}

        <header className="dashboard-header">
          <div className="header-left">
            <button
              type="button"
              className="mobile-menu"
              onClick={() => setSidebarOpen(true)}
            >
              <FiMenu />
            </button>

            <div>
              <span className="header-kicker">AI INTERVIEW PLATFORM</span>

              <h1>Dashboard</h1>

              <p>Your adaptive interview workspace.</p>
            </div>
          </div>

          <div className="header-right">
            <button type="button" className="notification-button">
              <FiBell />

              <span className="notification-dot" />
            </button>

            <button
              type="button"
              className="header-profile"
              onClick={() => navigate("/profile")}
            >
              <div className="avatar">
                {profilePicture ? (
                  <img src={String(profilePicture)} alt="Profile" />
                ) : (
                  <FiUser />
                )}
              </div>

              <div className="header-user">
                <strong>{profileName}</strong>

                <span>{email || username || "View profile"}</span>
              </div>

              <FiChevronRight />
            </button>
          </div>
        </header>

        <div className="dashboard-content">
          {/* ==================================================
              ERROR
          ================================================== */}

          {error && (
            <div className="dashboard-error">
              <FiXCircle />

              <span>{error}</span>

              <button type="button" onClick={() => setError("")}>
                <FiX />
              </button>
            </div>
          )}

          {/* ==================================================
              WELCOME
          ================================================== */}

          <section className="welcome-section">
            <div className="welcome-copy">
              <div className="welcome-badge">
                <span />
                AI COACH ONLINE
              </div>

              <h2>
                Welcome back, <span>{profileName}</span>
              </h2>

              <p>
                Your interview questions adapt to your demonstrated ability,
                profile evidence and previous performance.
              </p>

              <div className="role-line">
                <FiTarget />

                <span>Target role:</span>

                <strong>{profileRole || "Add a target role in Profile"}</strong>
              </div>
            </div>

            <div className="welcome-actions">
              <button
                type="button"
                className="primary-button"
                onClick={() => setShowCreateModal(true)}
              >
                <FiPlay />
                Start Interview
              </button>

              <button
                type="button"
                className="ghost-button"
                onClick={() => navigate("/profile")}
              >
                <FiUser />
                View Profile
              </button>
            </div>
          </section>

          {/* ==================================================
              QUICK STATS
          ================================================== */}

          <section className="stats-grid">
            <StatCard
              icon={FiCpu}
              label="Total Interviews"
              value={interviews.length}
            />

            <StatCard
              icon={FiCheckCircle}
              label="Completed"
              value={completedInterviews.length}
            />

            <StatCard
              icon={FiClock}
              label="Active"
              value={activeInterviews.length + pausedInterviews.length}
            />

            <StatCard
              icon={FiAward}
              label="Profile Strength"
              value={`${profileCompletion}%`}
              progress={profileCompletion}
            />
          </section>

          {/* ==================================================
              MAIN GRID
          ================================================== */}

          <section className="dashboard-grid">
            {/* =================================================
                RECENT INTERVIEWS
            ================================================= */}

            <div className="dashboard-card interviews-card">
              <CardHeader
                eyebrow="INTERVIEW HISTORY"
                title="Recent Interviews"
                description="Continue an active session or open a completed interview."
                action={
                  <button
                    type="button"
                    className="outline-small-button"
                    onClick={() => setShowCreateModal(true)}
                  >
                    <FiPlus />
                    New
                  </button>
                }
              />

              {loading ? (
                <div className="loading-state">
                  <FiRefreshCw className="spin" />
                  <span>Loading your interviews...</span>
                </div>
              ) : interviews.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">
                    <FiCpu />
                  </div>

                  <h4>No interviews yet</h4>

                  <p>Start your first adaptive interview.</p>

                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setShowCreateModal(true)}
                  >
                    <FiPlay />
                    Start Interview
                  </button>
                </div>
              ) : (
                <div className="interview-list">
                  {interviews.slice(0, 6).map((interview, index) => {
                    const id = getInterviewId(interview);

                    const status = getInterviewStatus(interview);

                    const normalizedStatus = String(status || "").toLowerCase();

                    const completed = normalizedStatus === "completed";

                    return (
                      <button
                        type="button"
                        className="interview-row"
                        key={id || `interview-${index}`}
                        onClick={() => handleOpenInterview(interview)}
                      >
                        <div className="interview-main">
                          <div className="interview-icon">
                            <FiCpu />
                          </div>

                          <div className="interview-details">
                            <h4>{getInterviewTitle(interview)}</h4>

                            <div className="interview-meta">
                              <span>{getInterviewDate(interview)}</span>

                              <span className="dot-separator">•</span>

                              <span>{interview?.difficulty || "auto"}</span>

                              {interview?.totalQuestions && (
                                <>
                                  <span className="dot-separator">•</span>

                                  <span>
                                    {interview.totalQuestions} questions
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="interview-actions">
                          <span
                            className={`status-badge ${getStatusClass(status)}`}
                          >
                            {getStatusLabel(status)}
                          </span>

                          <span className="row-arrow">
                            {completed ? <FiChevronRight /> : <FiPlay />}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* =================================================
                PROFILE STRENGTH
            ================================================= */}

            <div className="dashboard-card profile-card">
              <CardHeader
                eyebrow="PROFILE EVIDENCE"
                title="Profile Strength"
                description="More verified evidence gives the AI more context."
                action={
                  <button
                    type="button"
                    className="icon-card-action"
                    onClick={() => navigate("/profile")}
                  >
                    <FiArrowRight />
                  </button>
                }
              />

              <div className="profile-overview">
                <div className="profile-circle">
                  <div
                    className="profile-circle-progress"
                    style={{
                      background: `conic-gradient(#39e6a1 ${profileCompletion}%, #202730 ${profileCompletion}% 100%)`,
                    }}
                  >
                    <div className="profile-circle-inner">
                      <strong>{profileCompletion}%</strong>

                      <span>complete</span>
                    </div>
                  </div>
                </div>

                <div className="profile-overview-info">
                  <strong>
                    {profileCompletion >= 80
                      ? "Strong profile"
                      : profileCompletion >= 50
                        ? "Good progress"
                        : "Profile needs evidence"}
                  </strong>

                  <p>
                    Keep your developer evidence connected for better adaptive
                    interviews.
                  </p>
                </div>
              </div>

              <div className="progress-track">
                <div
                  className="progress-value"
                  style={{
                    width: `${profileCompletion}%`,
                  }}
                />
              </div>

              <div className="profile-checklist">
                <ProfileCheck
                  label="Technical skills"
                  complete={technicalSkills.length > 0}
                  value={
                    technicalSkills.length > 0
                      ? `${technicalSkills.length} skills`
                      : "Add skills"
                  }
                />

                <ProfileCheck
                  label="Resume"
                  complete={Boolean(resume)}
                  value={resume ? "Connected" : "Missing"}
                />

                <ProfileCheck
                  label="Developer links"
                  complete={
                    Boolean(github) || Boolean(linkedin) || Boolean(leetcode)
                  }
                  value={
                    [github, linkedin, leetcode].filter(Boolean).length
                      ? "Connected"
                      : "Add links"
                  }
                />
              </div>

              <button
                type="button"
                className="profile-button"
                onClick={() => navigate("/profile")}
              >
                {profileCompletion >= 100
                  ? "Review Profile"
                  : "Complete Profile"}
                <FiArrowRight />
              </button>
            </div>
          </section>

          {/* ==================================================
              TECHNICAL SKILLS
          ================================================== */}

          <section className="dashboard-card skills-card">
            <CardHeader
              eyebrow="FROM YOUR PROFILE"
              title="Technical Skills"
              description={
                technicalSkills.length > 0
                  ? "Only skills currently stored in your profile are shown below."
                  : "No technical skills are stored in your profile yet."
              }
              action={
                <button
                  type="button"
                  className="outline-small-button"
                  onClick={() => navigate("/profile")}
                >
                  Edit Skills
                  <FiArrowRight />
                </button>
              }
            />

            {profileLoading ? (
              <div className="skills-loading">
                <FiRefreshCw className="spin" />
                Loading profile skills...
              </div>
            ) : technicalSkills.length > 0 ? (
              <div className="skills-area">
                {technicalSkills.map((skill) => (
                  <span className="skill-tag" key={skill}>
                    <FiCheck />
                    {skill}
                  </span>
                ))}
              </div>
            ) : (
              <div className="skills-empty">
                <div className="skills-empty-icon">
                  <FiCode />
                </div>

                <div className="skills-empty-copy">
                  <strong>No technical skills added</strong>

                  <p>
                    Add your technical skills to your profile. The interview
                    engine will use these actual skills instead of dummy
                    options.
                  </p>
                </div>

                <button
                  type="button"
                  className="outline-small-button"
                  onClick={() => navigate("/profile")}
                >
                  Add Skills
                  <FiArrowRight />
                </button>
              </div>
            )}
          </section>

          {/* ==================================================
              CAREER SIGNALS
          ================================================== */}

          <section className="section-block">
            <div className="section-heading">
              <div>
                <span className="section-kicker">CAREER INTELLIGENCE</span>

                <h3>Your AI Career Signals</h3>

                <p>
                  These capabilities are built around the evidence already
                  available in your profile.
                </p>
              </div>
            </div>

            <div className="feature-grid">
              <FeatureCard
                icon={FiFileText}
                title="ATS Resume Score"
                description="Analyze resume quality, relevance and ATS readiness."
              />

              <FeatureCard
                icon={FiTarget}
                title="Skill Gap Analyzer"
                description="Compare your demonstrated skills with your target role."
              />

              <FeatureCard
                icon={FiShield}
                title="Evidence Meter"
                description="See how strongly each skill is supported by real evidence."
              />
            </div>
          </section>

          {/* ==================================================
              EVIDENCE SOURCES
          ================================================== */}

          <section className="dashboard-card evidence-card">
            <CardHeader
              eyebrow="CONNECTED DATA"
              title="AI Evidence Sources"
              description="The adaptive engine can use these profile sources when available."
              action={<FiTrendingUp className="card-header-icon" />}
            />

            <div className="evidence-grid">
              {evidenceItems.map(({ label, connected, icon: Icon }) => (
                <div
                  className={`evidence-item ${
                    connected ? "connected" : "not-connected"
                  }`}
                  key={label}
                >
                  <div className="evidence-icon">
                    <Icon />
                  </div>

                  <div>
                    <span>{label}</span>

                    <strong>{connected ? "Connected" : "Not added"}</strong>
                  </div>

                  {connected ? (
                    <FiCheckCircle className="evidence-status-icon" />
                  ) : (
                    <FiXCircle className="evidence-status-icon" />
                  )}
                </div>
              ))}
            </div>

            <div className="evidence-footer">
              <div>
                <span>Profile evidence coverage</span>

                <strong>{profileCompletion}%</strong>
              </div>

              <button type="button" onClick={() => navigate("/profile")}>
                Manage Profile
                <FiArrowRight />
              </button>
            </div>
          </section>

          {/* ==================================================
              FOOTER
          ================================================== */}

          <div className="dashboard-footer">
            <button
              type="button"
              className="refresh-button"
              onClick={handleRefresh}
              disabled={refreshing || loading || profileLoading}
            >
              <FiRefreshCw className={refreshing ? "spin" : ""} />

              {refreshing ? "Refreshing..." : "Refresh Dashboard"}
            </button>
          </div>
        </div>
      </main>

      {/* ======================================================
          CREATE INTERVIEW MODAL
      ====================================================== */}

      {showCreateModal && (
        <div
          className="modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              if (!creatingInterview) {
                setShowCreateModal(false);
              }
            }
          }}
        >
          <div
            className="create-modal"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="modal-top-line" />

            <div className="modal-header">
              <div>
                <div className="modal-kicker">
                  <FiZap />
                  ADAPTIVE INTERVIEW
                </div>

                <h2>Configure your interview</h2>

                <p>
                  The interview will use your profile evidence and demonstrated
                  ability.
                </p>
              </div>

              <button
                type="button"
                className="modal-close"
                onClick={() => {
                  if (!creatingInterview) {
                    setShowCreateModal(false);
                  }
                }}
                disabled={creatingInterview}
              >
                <FiX />
              </button>
            </div>

            {/* =================================================
                ROLE
            ================================================= */}

            <div className="modal-profile-preview">
              <div className="modal-avatar">
                {profilePicture ? (
                  <img src={String(profilePicture)} alt="Profile" />
                ) : (
                  <FiUser />
                )}
              </div>

              <div>
                <span>TARGET ROLE</span>

                <strong>{profileRole || "No target role added"}</strong>

                <p>This role is taken directly from your profile.</p>
              </div>

              <button type="button" onClick={() => navigate("/profile")}>
                Edit
              </button>
            </div>

            {!profileRole && (
              <div className="modal-warning">
                <FiTarget />

                <span>
                  Add a target role in your profile before creating an
                  interview.
                </span>
              </div>
            )}

            {/* =================================================
                DIFFICULTY
            ================================================= */}

            <div className="form-group">
              <div className="form-label-row">
                <label>Difficulty</label>

                <span>
                  {createForm.difficulty === "auto"
                    ? "AI adaptive"
                    : "Fixed difficulty"}
                </span>
              </div>

              <div className="difficulty-grid">
                {DIFFICULTIES.map((difficulty) => {
                  const selected = createForm.difficulty === difficulty;

                  const label =
                    difficulty === "auto"
                      ? "Auto"
                      : difficulty
                          .split("-")
                          .map(
                            (part) =>
                              part.charAt(0).toUpperCase() + part.slice(1),
                          )
                          .join(" ");

                  return (
                    <button
                      type="button"
                      key={difficulty}
                      className={`difficulty-option ${
                        selected ? "selected" : ""
                      }`}
                      onClick={() =>
                        setCreateForm((previous) => ({
                          ...previous,
                          difficulty,
                        }))
                      }
                      disabled={creatingInterview}
                    >
                      <span>{label}</span>

                      {difficulty === "auto" && (
                        <small>Adapts continuously</small>
                      )}

                      {selected && <FiCheck className="option-check" />}
                    </button>
                  );
                })}
              </div>

              <small className="field-hint">
                Auto can increase or decrease question difficulty based on your
                demonstrated performance.
              </small>
            </div>

            {/* =================================================
                QUESTION COUNT
            ================================================= */}

            <div className="form-group">
              <div className="form-label-row">
                <label>Number of Questions</label>

                <span>Max {MAX_QUESTIONS}</span>
              </div>

              <div className="question-count-control">
                <button
                  type="button"
                  disabled={createForm.questionCount <= 1 || creatingInterview}
                  onClick={() =>
                    setCreateForm((previous) => ({
                      ...previous,
                      questionCount: Math.max(
                        1,
                        Number(previous.questionCount) - 1,
                      ),
                    }))
                  }
                >
                  −
                </button>

                <div>
                  <strong>{createForm.questionCount}</strong>

                  <span>questions</span>
                </div>

                <button
                  type="button"
                  disabled={
                    createForm.questionCount >= MAX_QUESTIONS ||
                    creatingInterview
                  }
                  onClick={() =>
                    setCreateForm((previous) => ({
                      ...previous,
                      questionCount: Math.min(
                        MAX_QUESTIONS,
                        Number(previous.questionCount) + 1,
                      ),
                    }))
                  }
                >
                  +
                </button>
              </div>

              <input
                type="range"
                min="1"
                max={MAX_QUESTIONS}
                value={createForm.questionCount}
                onChange={(event) =>
                  setCreateForm((previous) => ({
                    ...previous,
                    questionCount: Number(event.target.value),
                  }))
                }
                disabled={creatingInterview}
              />
            </div>

            {/* =================================================
                PROFILE SKILLS
            ================================================= */}

            <div className="form-group">
              <div className="form-label-row">
                <label>Technical Skills</label>

                {technicalSkills.length > 0 && (
                  <button
                    type="button"
                    className="select-all-button"
                    onClick={toggleAllSkills}
                    disabled={creatingInterview}
                  >
                    {createForm.skills.length === technicalSkills.length
                      ? "Clear all"
                      : "Select all"}
                  </button>
                )}
              </div>

              {technicalSkills.length > 0 ? (
                <>
                  <div className="skill-options">
                    {technicalSkills.map((skill) => {
                      const selected = createForm.skills.includes(skill);

                      return (
                        <button
                          type="button"
                          key={skill}
                          className={`skill-chip ${selected ? "selected" : ""}`}
                          onClick={() => toggleSkill(skill)}
                          disabled={creatingInterview}
                        >
                          {selected && <FiCheck />}

                          {skill}
                        </button>
                      );
                    })}
                  </div>

                  <small className="field-hint">
                    These are loaded directly from your profile. No dummy skills
                    are added.
                  </small>

                  <div className="selected-skill-summary">
                    <FiLayers />

                    <span>
                      {createForm.skills.length === 0
                        ? "Adaptive interview across all profile skills"
                        : `${createForm.skills.length} profile skill${
                            createForm.skills.length === 1 ? "" : "s"
                          } selected`}
                    </span>
                  </div>
                </>
              ) : (
                <div className="no-profile-skills">
                  <FiCode />

                  <div>
                    <strong>No technical skills in profile</strong>

                    <p>
                      Add technical skills in Profile to enable skill-focused
                      interviews.
                    </p>
                  </div>

                  <button type="button" onClick={() => navigate("/profile")}>
                    Add skills
                    <FiArrowRight />
                  </button>
                </div>
              )}
            </div>

            {/* =================================================
                SUMMARY
            ================================================= */}

            <div className="interview-config-summary">
              <div>
                <span>ROLE</span>

                <strong>{profileRole || "Not configured"}</strong>
              </div>

              <div>
                <span>DIFFICULTY</span>

                <strong>{createForm.difficulty}</strong>
              </div>

              <div>
                <span>QUESTIONS</span>

                <strong>{createForm.questionCount}</strong>
              </div>

              <div>
                <span>SKILL MODE</span>

                <strong>
                  {createForm.skills.length > 0 ? "Focused" : "Adaptive"}
                </strong>
              </div>
            </div>

            {/* =================================================
                MODAL ACTIONS
            ================================================= */}

            <div className="modal-actions">
              <button
                type="button"
                className="modal-secondary-button"
                onClick={() => setShowCreateModal(false)}
                disabled={creatingInterview}
              >
                Cancel
              </button>

              <button
                type="button"
                className="modal-primary-button"
                onClick={handleCreateInterview}
                disabled={creatingInterview || !profileRole}
              >
                {creatingInterview ? (
                  <>
                    <FiRefreshCw className="spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <FiPlay />
                    Start Interview
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================
          STYLES
      ====================================================== */}

      <style>{`

        * {
          box-sizing: border-box;
        }

        :root {
          --bg: #0c1014;
          --panel: #11161b;
          --panel-2: #151b21;
          --panel-3: #192128;
          --border: #252d35;
          --border-soft: #1d252d;
          --text: #edf2f7;
          --text-soft: #a7b0ba;
          --text-muted: #6e7984;
          --green: #39e6a1;
          --green-dark: #1fbd7d;
          --green-soft: rgba(57, 230, 161, 0.08);
          --red: #ff7a7a;
          --yellow: #f3c76a;
          --blue: #72a7ff;
        }

        .dashboard-page {
          min-height: 100vh;
          display: flex;
          background:
            radial-gradient(
              circle at 75% 0%,
              rgba(57, 230, 161, 0.045),
              transparent 28%
            ),
            radial-gradient(
              circle at 15% 20%,
              rgba(89, 118, 255, 0.035),
              transparent 25%
            ),
            var(--bg);
          color: var(--text);
          font-family:
            Inter,
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
        }

        /* =====================================================
           SIDEBAR
        ===================================================== */

        .dashboard-sidebar {
          width: 250px;
          min-width: 250px;
          min-height: 100vh;
          position: sticky;
          top: 0;
          height: 100vh;
          display: flex;
          flex-direction: column;
          background: rgba(13, 17, 21, 0.96);
          border-right: 1px solid var(--border-soft);
          z-index: 100;
        }

        .sidebar-header {
          height: 76px;
          padding: 0 18px;
          display: flex;
          align-items: center;
          border-bottom: 1px solid var(--border-soft);
        }

        .brand {
          border: 0;
          background: transparent;
          color: var(--text);
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 10px;
          text-align: left;
          padding: 0;
        }

        .brand-icon {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--green);
          color: #08110d;
          font-size: 17px;
          box-shadow: 0 0 25px rgba(57, 230, 161, 0.12);
        }

        .brand strong {
          display: block;
          font-size: 13px;
          letter-spacing: -0.2px;
        }

        .brand span {
          display: block;
          margin-top: 2px;
          color: var(--text-muted);
          font-size: 8px;
          letter-spacing: 0.6px;
          text-transform: uppercase;
        }

        .mobile-close {
          display: none;
        }

        .sidebar-profile {
          margin: 16px 13px 5px;
          padding: 11px;
          display: flex;
          align-items: center;
          gap: 10px;
          border: 1px solid var(--border-soft);
          border-radius: 11px;
          background: rgba(255,255,255,0.018);
        }

        .sidebar-avatar {
          width: 34px;
          height: 34px;
          border-radius: 9px;
          overflow: hidden;
          background: #1c252c;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #73808c;
          flex-shrink: 0;
        }

        .sidebar-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .sidebar-profile-info {
          min-width: 0;
        }

        .sidebar-profile-info strong {
          display: block;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 10px;
        }

        .sidebar-profile-info span {
          display: block;
          margin-top: 3px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: var(--text-muted);
          font-size: 8px;
        }

        .sidebar-nav {
          padding: 15px 12px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .nav-item {
          width: 100%;
          border: 1px solid transparent;
          background: transparent;
          color: var(--text-muted);
          border-radius: 9px;
          padding: 11px 12px;
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
          text-align: left;
          font-size: 11px;
          font-weight: 600;
          transition: 0.2s ease;
        }

        .nav-item:hover {
          background: rgba(255,255,255,0.025);
          color: var(--text-soft);
        }

        .nav-item.active {
          border-color: rgba(57, 230, 161, 0.12);
          background: rgba(57, 230, 161, 0.07);
          color: var(--green);
        }

        .nav-item svg {
          font-size: 15px;
          flex-shrink: 0;
        }

        .sidebar-bottom {
          margin-top: auto;
          padding: 13px;
        }

        .sidebar-help {
          display: flex;
          gap: 9px;
          padding: 12px;
          border: 1px solid var(--border-soft);
          border-radius: 11px;
          background: rgba(255,255,255,0.015);
          margin-bottom: 10px;
        }

        .help-icon {
          width: 28px;
          height: 28px;
          border-radius: 8px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(57,230,161,0.08);
          color: var(--green);
        }

        .sidebar-help strong {
          display: block;
          font-size: 9px;
          color: #c8d0d8;
        }

        .sidebar-help p {
          margin: 4px 0 0;
          color: #66717c;
          font-size: 8px;
          line-height: 1.55;
        }

        .logout-button {
          width: 100%;
          border: 1px solid transparent;
          background: transparent;
          color: #68737e;
          padding: 10px 12px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 10px;
          font-weight: 600;
          cursor: pointer;
          text-align: left;
        }

        .logout-button:hover {
          color: #a8b1ba;
          background: rgba(255,255,255,0.02);
        }

        /* =====================================================
           MAIN
        ===================================================== */

        .dashboard-main {
          flex: 1;
          min-width: 0;
        }

        .dashboard-header {
          height: 76px;
          position: sticky;
          top: 0;
          z-index: 50;
          border-bottom: 1px solid var(--border-soft);
          background: rgba(12, 16, 20, 0.9);
          backdrop-filter: blur(16px);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 30px;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .header-kicker {
          display: block;
          margin-bottom: 2px;
          color: #56626d;
          font-size: 7px;
          font-weight: 800;
          letter-spacing: 1.5px;
        }

        .header-left h1 {
          margin: 0;
          font-size: 19px;
          letter-spacing: -0.4px;
        }

        .header-left p {
          margin: 3px 0 0;
          color: #626d78;
          font-size: 9px;
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .notification-button {
          width: 34px;
          height: 34px;
          border-radius: 9px;
          border: 1px solid var(--border);
          background: #11161b;
          color: #76818c;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          cursor: pointer;
        }

        .notification-button:hover {
          color: #b6c0c8;
          border-color: #313b45;
        }

        .notification-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: var(--green);
          position: absolute;
          top: 7px;
          right: 7px;
          box-shadow: 0 0 8px rgba(57,230,161,0.7);
        }

        .header-profile {
          border: 0;
          background: transparent;
          color: var(--text);
          display: flex;
          align-items: center;
          gap: 9px;
          cursor: pointer;
          text-align: left;
          padding: 0;
        }

        .avatar {
          width: 34px;
          height: 34px;
          border-radius: 9px;
          overflow: hidden;
          background: #1c252c;
          border: 1px solid var(--border);
          color: #78838e;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .header-user {
          min-width: 100px;
        }

        .header-user strong {
          display: block;
          font-size: 10px;
        }

        .header-user span {
          display: block;
          max-width: 145px;
          margin-top: 2px;
          color: #69747f;
          font-size: 8px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .header-profile > svg {
          color: #57616b;
          font-size: 13px;
        }

        .mobile-menu {
          display: none;
        }

        /* =====================================================
           CONTENT
        ===================================================== */

        .dashboard-content {
          width: min(1420px, 100%);
          margin: 0 auto;
          padding: 26px 30px 40px;
        }

        .dashboard-error {
          border: 1px solid rgba(255, 122, 122, 0.15);
          background: rgba(255, 122, 122, 0.06);
          color: #ff9f9f;
          min-height: 39px;
          border-radius: 9px;
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 9px 12px;
          margin-bottom: 18px;
          font-size: 9px;
        }

        .dashboard-error span {
          flex: 1;
        }

        .dashboard-error button {
          border: 0;
          background: transparent;
          color: inherit;
          cursor: pointer;
        }

        /* =====================================================
           WELCOME
        ===================================================== */

        .welcome-section {
          min-height: 190px;
          border: 1px solid var(--border);
          border-radius: 15px;
          background:
            radial-gradient(
              circle at 85% 20%,
              rgba(57, 230, 161, 0.08),
              transparent 30%
            ),
            linear-gradient(
              135deg,
              rgba(255,255,255,0.025),
              rgba(255,255,255,0.008)
            );
          padding: 26px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 30px;
          overflow: hidden;
          position: relative;
        }

        .welcome-section::after {
          content: "";
          width: 180px;
          height: 180px;
          position: absolute;
          right: -75px;
          top: -75px;
          border: 1px solid rgba(57,230,161,0.08);
          border-radius: 50%;
        }

        .welcome-copy {
          position: relative;
          z-index: 1;
        }

        .welcome-badge {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          color: var(--green);
          font-size: 7px;
          letter-spacing: 1.4px;
          font-weight: 800;
        }

        .welcome-badge span {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: var(--green);
          box-shadow: 0 0 9px rgba(57,230,161,0.8);
        }

        .welcome-section h2 {
          max-width: 680px;
          margin: 10px 0 0;
          font-size: 30px;
          line-height: 1.08;
          letter-spacing: -1px;
        }

        .welcome-section h2 span {
          color: var(--green);
        }

        .welcome-section p {
          max-width: 680px;
          margin: 12px 0 0;
          color: #737e89;
          font-size: 10px;
          line-height: 1.65;
        }

        .role-line {
          margin-top: 16px;
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 7px;
          color: #707b86;
          font-size: 9px;
        }

        .role-line svg {
          color: var(--green);
        }

        .role-line strong {
          color: #bec6cd;
        }

        .welcome-actions {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          gap: 8px;
          min-width: 170px;
        }

        /* =====================================================
           BUTTONS
        ===================================================== */

        .primary-button,
        .ghost-button,
        .secondary-button,
        .profile-button,
        .outline-small-button,
        .modal-primary-button,
        .modal-secondary-button {
          border-radius: 9px;
          min-height: 39px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          cursor: pointer;
          font-size: 9px;
          font-weight: 700;
          transition: 0.2s ease;
        }

        .primary-button {
          border: 1px solid var(--green);
          background: var(--green);
          color: #07100c;
          padding: 0 15px;
          box-shadow: 0 0 25px rgba(57,230,161,0.07);
        }

        .primary-button:hover {
          background: #54edb0;
          transform: translateY(-1px);
        }

        .ghost-button {
          border: 1px solid var(--border);
          background: rgba(255,255,255,0.018);
          color: #9aa4ad;
          padding: 0 15px;
        }

        .ghost-button:hover {
          background: rgba(255,255,255,0.04);
          color: #d4dae0;
        }

        .secondary-button {
          border: 1px solid #2b353e;
          background: #171e24;
          color: #b6c0c9;
          padding: 0 15px;
        }

        .secondary-button:hover {
          border-color: #3a4650;
          background: #1b232a;
        }

        .outline-small-button {
          border: 1px solid var(--border);
          background: transparent;
          color: #9ba5af;
          min-height: 31px;
          padding: 0 10px;
          font-size: 8px;
        }

        .outline-small-button:hover {
          border-color: #3a4650;
          color: #d6dde3;
          background: rgba(255,255,255,0.02);
        }

        .profile-button {
          width: 100%;
          margin-top: 15px;
          border: 1px solid #29343d;
          background: #151c22;
          color: #b9c1c9;
          padding: 0 14px;
        }

        .profile-button:hover {
          border-color: #3c4852;
          background: #1a2229;
        }

        .icon-card-action {
          width: 30px;
          height: 30px;
          border: 1px solid var(--border);
          background: #151b21;
          color: #737f8a;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .icon-card-action:hover {
          color: var(--green);
          border-color: rgba(57,230,161,0.2);
        }

        /* =====================================================
           STATS
        ===================================================== */

        .stats-grid {
          margin: 18px 0;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
        }

        .stat-card {
          min-height: 95px;
          border: 1px solid var(--border);
          background: var(--panel);
          border-radius: 12px;
          padding: 15px;
          display: flex;
          align-items: center;
          gap: 11px;
        }

        .stat-card:hover {
          border-color: #303a43;
        }

        .stat-card-icon {
          width: 37px;
          height: 37px;
          border-radius: 9px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(57,230,161,0.055);
          color: var(--green);
        }

        .stat-card-copy span {
          display: block;
          color: #68737e;
          font-size: 8px;
        }

        .stat-card-copy strong {
          display: block;
          margin-top: 4px;
          color: #e8edf1;
          font-size: 21px;
          letter-spacing: -0.7px;
        }

        .stat-card-progress {
          width: 100%;
          height: 3px;
          border-radius: 5px;
          background: #232b32;
          margin-top: 8px;
          overflow: hidden;
        }

        .stat-card-progress div {
          height: 100%;
          border-radius: inherit;
          background: var(--green);
        }

        /* =====================================================
           CARDS
        ===================================================== */

        .dashboard-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.7fr) minmax(300px, 0.85fr);
          gap: 14px;
        }

        .dashboard-card {
          border: 1px solid var(--border);
          background: var(--panel);
          border-radius: 13px;
          padding: 18px;
        }

        .card-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 18px;
        }

        .card-header-copy {
          min-width: 0;
        }

        .card-eyebrow,
        .section-kicker {
          display: block;
          margin-bottom: 5px;
          color: #5e6974;
          font-size: 7px;
          font-weight: 800;
          letter-spacing: 1.3px;
        }

        .card-header h3 {
          margin: 0;
          color: #e6ebef;
          font-size: 14px;
          letter-spacing: -0.3px;
        }

        .card-header p {
          max-width: 520px;
          margin: 4px 0 0;
          color: #68737e;
          font-size: 8px;
          line-height: 1.55;
        }

        .card-header-icon {
          color: #65717c;
          font-size: 17px;
        }

        /* =====================================================
           INTERVIEWS
        ===================================================== */

        .interview-list {
          display: flex;
          flex-direction: column;
        }

        .interview-row {
          width: 100%;
          border: 0;
          border-top: 1px solid var(--border-soft);
          background: transparent;
          padding: 11px 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          color: inherit;
          cursor: pointer;
          text-align: left;
        }

        .interview-row:hover {
          background: rgba(255,255,255,0.012);
        }

        .interview-main {
          display: flex;
          align-items: center;
          min-width: 0;
          gap: 10px;
        }

        .interview-icon {
          width: 34px;
          height: 34px;
          border-radius: 9px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #171e24;
          border: 1px solid var(--border-soft);
          color: var(--green);
        }

        .interview-details {
          min-width: 0;
        }

        .interview-details h4 {
          max-width: 520px;
          margin: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: #cbd3da;
          font-size: 10px;
          font-weight: 700;
        }

        .interview-meta {
          margin-top: 4px;
          display: flex;
          align-items: center;
          gap: 5px;
          color: #626e79;
          font-size: 7px;
        }

        .dot-separator {
          color: #38424b;
        }

        .interview-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }

        .status-badge {
          border-radius: 20px;
          padding: 5px 8px;
          font-size: 7px;
          font-weight: 700;
          white-space: nowrap;
        }

        .status-completed {
          background: rgba(57,230,161,0.08);
          color: #54dca9;
        }

        .status-progress {
          background: rgba(114,167,255,0.08);
          color: #78abff;
        }

        .status-cancelled {
          background: rgba(255,122,122,0.07);
          color: #ee8a8a;
        }

        .status-paused {
          background: rgba(243,199,106,0.08);
          color: #dbba6e;
        }

        .status-default {
          background: #1b2229;
          color: #79848e;
        }

        .row-arrow {
          width: 27px;
          height: 27px;
          border-radius: 7px;
          border: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #616d77;
          background: #151b21;
        }

        .interview-row:hover .row-arrow {
          color: var(--green);
          border-color: rgba(57,230,161,0.18);
        }

        /* =====================================================
           PROFILE
        ===================================================== */

        .profile-overview {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .profile-circle {
          flex-shrink: 0;
        }

        .profile-circle-progress {
          width: 100px;
          height: 100px;
          padding: 7px;
          border-radius: 50%;
        }

        .profile-circle-inner {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          background: #0d1217;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        .profile-circle-inner strong {
          color: #eaf1f4;
          font-size: 20px;
        }

        .profile-circle-inner span {
          margin-top: 2px;
          color: #69747f;
          font-size: 7px;
        }

        .profile-overview-info strong {
          display: block;
          color: #d6dde3;
          font-size: 10px;
        }

        .profile-overview-info p {
          max-width: 230px;
          margin: 5px 0 0;
          color: #65717c;
          font-size: 8px;
          line-height: 1.55;
        }

        .progress-track {
          height: 4px;
          border-radius: 20px;
          background: #20272e;
          margin-top: 15px;
          overflow: hidden;
        }

        .progress-value {
          height: 100%;
          border-radius: inherit;
          background: var(--green);
          box-shadow: 0 0 10px rgba(57,230,161,0.15);
          transition: width 0.35s ease;
        }

        .profile-checklist {
          margin-top: 14px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .profile-check {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .profile-check-icon {
          width: 22px;
          height: 22px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #182026;
          color: #5f6c76;
        }

        .profile-check.complete .profile-check-icon {
          background: rgba(57,230,161,0.08);
          color: var(--green);
        }

        .profile-check-copy {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex: 1;
        }

        .profile-check-copy span {
          color: #7b8690;
          font-size: 8px;
        }

        .profile-check-copy strong {
          color: #b6c0c8;
          font-size: 8px;
          font-weight: 600;
        }

        /* =====================================================
           SKILLS
        ===================================================== */

        .skills-card {
          grid-column: 1 / -1;
          margin-top: 14px;
        }

        .skills-area {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
        }

        .skill-tag {
          min-height: 29px;
          padding: 0 10px;
          border-radius: 8px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          border: 1px solid rgba(57,230,161,0.1);
          background: rgba(57,230,161,0.055);
          color: #8de5bd;
          font-size: 8px;
          font-weight: 600;
        }

        .skill-tag svg {
          font-size: 9px;
        }

        .skills-loading {
          min-height: 75px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          color: #68737e;
          font-size: 8px;
        }

        .skills-empty {
          min-height: 82px;
          border: 1px dashed #303943;
          border-radius: 10px;
          background: rgba(255,255,255,0.012);
          padding: 12px;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .skills-empty-icon {
          width: 34px;
          height: 34px;
          border-radius: 8px;
          background: #171e24;
          border: 1px solid var(--border);
          color: #69747f;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .skills-empty-copy {
          flex: 1;
          min-width: 0;
        }

        .skills-empty-copy strong {
          display: block;
          color: #aeb7bf;
          font-size: 9px;
        }

        .skills-empty-copy p {
          margin: 3px 0 0;
          color: #626e79;
          font-size: 8px;
          line-height: 1.55;
        }

        /* =====================================================
           SECTION
        ===================================================== */

        .section-block {
          margin-top: 28px;
        }

        .section-heading {
          margin-bottom: 12px;
        }

        .section-heading h3 {
          margin: 0;
          font-size: 16px;
          letter-spacing: -0.35px;
        }

        .section-heading p {
          margin: 4px 0 0;
          color: #68737e;
          font-size: 8px;
        }

        /* =====================================================
           FEATURES
        ===================================================== */

        .feature-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
        }

        .feature-card {
          min-height: 115px;
          border: 1px solid var(--border);
          background: var(--panel);
          border-radius: 12px;
          padding: 15px;
          display: flex;
          align-items: flex-start;
          gap: 10px;
          transition: 0.2s ease;
          cursor: pointer;
        }

        .feature-card:hover {
          border-color: #333e47;
          transform: translateY(-1px);
        }

        .feature-icon {
          width: 35px;
          height: 35px;
          border-radius: 9px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--green);
          background: rgba(57,230,161,0.06);
        }

        .feature-copy {
          flex: 1;
        }

        .feature-copy h4 {
          margin: 0;
          color: #c9d1d8;
          font-size: 10px;
        }

        .feature-copy p {
          margin: 5px 0 0;
          color: #66727d;
          font-size: 8px;
          line-height: 1.55;
        }

        .feature-arrow {
          color: #4d5862;
        }

        /* =====================================================
           EVIDENCE
        ===================================================== */

        .evidence-card {
          margin-top: 14px;
        }

        .evidence-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
        }

        .evidence-item {
          padding: 11px;
          border-radius: 9px;
          border: 1px solid var(--border-soft);
          background: #131a20;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .evidence-item.connected {
          border-color: rgba(57,230,161,0.1);
        }

        .evidence-item.not-connected {
          opacity: 0.75;
        }

        .evidence-icon {
          width: 28px;
          height: 28px;
          border-radius: 7px;
          background: #192128;
          color: #7d8892;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .evidence-item.connected .evidence-icon {
          background: rgba(57,230,161,0.06);
          color: var(--green);
        }

        .evidence-item > div:nth-child(2) {
          flex: 1;
          min-width: 0;
        }

        .evidence-item span {
          display: block;
          color: #68737e;
          font-size: 7px;
        }

        .evidence-item strong {
          display: block;
          margin-top: 3px;
          color: #bac3ca;
          font-size: 8px;
        }

        .evidence-status-icon {
          font-size: 11px;
          color: #4e5a64;
        }

        .evidence-item.connected .evidence-status-icon {
          color: var(--green);
        }

        .evidence-footer {
          border-top: 1px solid var(--border-soft);
          margin-top: 12px;
          padding-top: 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .evidence-footer > div span {
          display: block;
          color: #64707b;
          font-size: 7px;
        }

        .evidence-footer > div strong {
          display: block;
          margin-top: 2px;
          color: #bbc4cc;
          font-size: 11px;
        }

        .evidence-footer button {
          border: 0;
          background: transparent;
          color: #8b969f;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 8px;
          font-weight: 700;
        }

        .evidence-footer button:hover {
          color: var(--green);
        }

        /* =====================================================
           EMPTY / LOADING
        ===================================================== */

        .empty-state {
          min-height: 190px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
        }

        .empty-icon {
          width: 43px;
          height: 43px;
          border-radius: 11px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #171e24;
          color: #65717b;
          margin-bottom: 9px;
        }

        .empty-state h4 {
          margin: 0;
          font-size: 10px;
          color: #bbc4cb;
        }

        .empty-state p {
          margin: 4px 0 12px;
          color: #616c77;
          font-size: 8px;
        }

        .loading-state {
          min-height: 190px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          color: #68737e;
          font-size: 8px;
        }

        /* =====================================================
           FOOTER
        ===================================================== */

        .dashboard-footer {
          display: flex;
          align-items: center;
          justify-content: center;
          margin-top: 20px;
        }

        .refresh-button {
          border: 0;
          background: transparent;
          color: #5f6a75;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 7px;
          font-size: 8px;
        }

        .refresh-button:hover {
          color: #96a1ab;
        }

        /* =====================================================
           MODAL
        ===================================================== */

        .modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 1000;
          padding: 20px;
          background: rgba(2, 5, 8, 0.77);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .create-modal {
          width: min(650px, 100%);
          max-height: 92vh;
          overflow-y: auto;
          position: relative;
          border: 1px solid #2a333b;
          border-radius: 15px;
          background:
            radial-gradient(
              circle at 90% 0%,
              rgba(57,230,161,0.055),
              transparent 26%
            ),
            #11171c;
          box-shadow:
            0 30px 100px rgba(0,0,0,0.48),
            0 0 0 1px rgba(255,255,255,0.01);
          padding: 21px;
        }

        .modal-top-line {
          position: absolute;
          left: 0;
          right: 0;
          top: 0;
          height: 2px;
          border-radius: 15px 15px 0 0;
          background: linear-gradient(
            90deg,
            transparent,
            var(--green),
            transparent
          );
          opacity: 0.75;
        }

        .modal-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 15px;
          margin-bottom: 17px;
        }

        .modal-kicker {
          display: flex;
          align-items: center;
          gap: 6px;
          color: var(--green);
          font-size: 7px;
          letter-spacing: 1.2px;
          font-weight: 800;
        }

        .modal-header h2 {
          margin: 7px 0 0;
          font-size: 20px;
          letter-spacing: -0.5px;
        }

        .modal-header p {
          max-width: 490px;
          margin: 5px 0 0;
          color: #68737e;
          font-size: 8px;
          line-height: 1.5;
        }

        .modal-close {
          width: 31px;
          height: 31px;
          border: 1px solid var(--border);
          background: #161d23;
          color: #74808a;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .modal-close:hover {
          color: #d2d8dd;
          background: #1a2229;
        }

        .modal-profile-preview {
          padding: 12px;
          display: flex;
          align-items: center;
          gap: 10px;
          border: 1px solid var(--border-soft);
          border-radius: 10px;
          background: rgba(255,255,255,0.014);
          margin-bottom: 11px;
        }

        .modal-avatar {
          width: 38px;
          height: 38px;
          overflow: hidden;
          border-radius: 9px;
          background: #1a2228;
          color: #6d7984;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .modal-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .modal-profile-preview > div:nth-child(2) {
          min-width: 0;
          flex: 1;
        }

        .modal-profile-preview span {
          display: block;
          color: #56616c;
          font-size: 6px;
          font-weight: 800;
          letter-spacing: 1px;
        }

        .modal-profile-preview strong {
          display: block;
          margin-top: 3px;
          color: #d1d8de;
          font-size: 10px;
        }

        .modal-profile-preview p {
          margin: 2px 0 0;
          color: #626d78;
          font-size: 7px;
        }

        .modal-profile-preview > button {
          border: 0;
          background: transparent;
          color: var(--green);
          cursor: pointer;
          font-size: 8px;
          font-weight: 700;
        }

        .modal-warning {
          border: 1px solid rgba(243,199,106,0.13);
          border-radius: 8px;
          background: rgba(243,199,106,0.045);
          color: #d5b66f;
          padding: 8px 10px;
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 14px;
          font-size: 8px;
        }

        .form-group {
          margin-top: 16px;
        }

        .form-label-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
        }

        .form-label-row label {
          color: #bbc3ca;
          font-size: 9px;
          font-weight: 800;
        }

        .form-label-row > span {
          color: #5f6b75;
          font-size: 7px;
        }

        .difficulty-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 7px;
        }

        .difficulty-option {
          min-height: 58px;
          position: relative;
          border: 1px solid #29333c;
          background: #151c22;
          color: #87929c;
          border-radius: 9px;
          padding: 10px;
          cursor: pointer;
          text-align: left;
        }

        .difficulty-option:hover {
          border-color: #37434d;
          background: #192128;
        }

        .difficulty-option.selected {
          border-color: rgba(57,230,161,0.32);
          background: rgba(57,230,161,0.07);
          color: #d8efe5;
        }

        .difficulty-option > span {
          display: block;
          font-size: 9px;
          font-weight: 700;
        }

        .difficulty-option small {
          display: block;
          margin-top: 4px;
          color: #59656f;
          font-size: 6px;
          line-height: 1.3;
        }

        .difficulty-option.selected small {
          color: #638b7a;
        }

        .option-check {
          position: absolute;
          top: 8px;
          right: 8px;
          color: var(--green);
          font-size: 10px;
        }

        .field-hint {
          display: block;
          margin-top: 7px;
          color: #5e6974;
          font-size: 7px;
          line-height: 1.5;
        }

        .question-count-control {
          min-height: 68px;
          border: 1px solid var(--border);
          border-radius: 9px;
          background: #141a20;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 24px;
        }

        .question-count-control button {
          width: 33px;
          height: 33px;
          border-radius: 8px;
          border: 1px solid #2b353e;
          background: #181f25;
          color: #adb6be;
          cursor: pointer;
          font-size: 17px;
        }

        .question-count-control button:hover:not(:disabled) {
          background: #1e272f;
          border-color: #3a4650;
        }

        .question-count-control button:disabled {
          opacity: 0.28;
          cursor: not-allowed;
        }

        .question-count-control > div {
          width: 95px;
          text-align: center;
        }

        .question-count-control strong {
          display: block;
          color: #e2e9ee;
          font-size: 22px;
        }

        .question-count-control span {
          display: block;
          margin-top: 1px;
          color: #5f6b75;
          font-size: 7px;
        }

        .form-group input[type="range"] {
          width: 100%;
          margin-top: 10px;
          accent-color: var(--green);
        }

        .skill-options {
          max-height: 155px;
          overflow-y: auto;
          display: flex;
          flex-wrap: wrap;
          align-content: flex-start;
          gap: 6px;
          padding-right: 2px;
        }

        .skill-chip {
          min-height: 29px;
          border: 1px solid #2b353e;
          background: #151c22;
          border-radius: 17px;
          color: #838e98;
          padding: 0 9px;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          cursor: pointer;
          font-size: 7px;
        }

        .skill-chip:hover {
          border-color: #38444e;
          background: #192128;
        }

        .skill-chip.selected {
          color: #a4e8c9;
          background: rgba(57,230,161,0.08);
          border-color: rgba(57,230,161,0.23);
        }

        .select-all-button {
          border: 0;
          background: transparent;
          color: var(--green);
          cursor: pointer;
          font-size: 7px;
          font-weight: 700;
        }

        .selected-skill-summary {
          margin-top: 9px;
          min-height: 29px;
          padding: 0 9px;
          border-radius: 7px;
          background: #151d23;
          border: 1px solid var(--border-soft);
          color: #70808a;
          display: flex;
          align-items: center;
          gap: 7px;
          font-size: 7px;
        }

        .selected-skill-summary svg {
          color: var(--green);
        }

        .no-profile-skills {
          min-height: 68px;
          border: 1px dashed #303a43;
          border-radius: 9px;
          padding: 10px;
          display: flex;
          align-items: center;
          gap: 9px;
          background: rgba(255,255,255,0.01);
        }

        .no-profile-skills > svg {
          color: #697580;
          font-size: 17px;
          flex-shrink: 0;
        }

        .no-profile-skills > div {
          flex: 1;
        }

        .no-profile-skills strong {
          display: block;
          font-size: 8px;
          color: #afb8c0;
        }

        .no-profile-skills p {
          margin: 3px 0 0;
          color: #606b76;
          font-size: 7px;
          line-height: 1.45;
        }

        .no-profile-skills button {
          border: 0;
          background: transparent;
          color: var(--green);
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 7px;
          font-weight: 700;
        }

        .interview-config-summary {
          margin-top: 17px;
          padding: 10px;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 7px;
          border: 1px solid var(--border-soft);
          border-radius: 9px;
          background: #12191f;
        }

        .interview-config-summary div {
          min-width: 0;
        }

        .interview-config-summary span {
          display: block;
          color: #56616c;
          font-size: 6px;
          font-weight: 800;
          letter-spacing: 0.8px;
        }

        .interview-config-summary strong {
          display: block;
          margin-top: 3px;
          color: #bbc4cb;
          font-size: 8px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          margin-top: 18px;
          padding-top: 14px;
          border-top: 1px solid var(--border-soft);
        }

        .modal-secondary-button {
          min-height: 36px;
          padding: 0 14px;
          border: 1px solid var(--border);
          background: #151c22;
          color: #8a959f;
        }

        .modal-primary-button {
          min-height: 36px;
          padding: 0 14px;
          border: 1px solid var(--green);
          background: var(--green);
          color: #08110d;
        }

        .modal-secondary-button:disabled,
        .modal-primary-button:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        /* =====================================================
           SPINNER
        ===================================================== */

        .spin {
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          from {
            transform: rotate(0deg);
          }

          to {
            transform: rotate(360deg);
          }
        }

        /* =====================================================
           RESPONSIVE
        ===================================================== */

        @media (max-width: 1100px) {
          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .dashboard-grid {
            grid-template-columns: 1fr;
          }

          .feature-grid {
            grid-template-columns: 1fr;
          }

          .evidence-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 800px) {
          .dashboard-sidebar {
            position: fixed;
            left: 0;
            top: 0;
            bottom: 0;
            transform: translateX(-100%);
            transition: transform 0.25s ease;
          }

          .dashboard-sidebar.sidebar-open {
            transform: translateX(0);
          }

          .sidebar-overlay {
            position: fixed;
            inset: 0;
            z-index: 90;
            background: rgba(0,0,0,0.6);
          }

          .mobile-close {
            margin-left: auto;
            display: flex;
            width: 30px;
            height: 30px;
            border: 1px solid var(--border);
            border-radius: 8px;
            background: #151c22;
            color: #77838d;
            align-items: center;
            justify-content: center;
            cursor: pointer;
          }

          .mobile-menu {
            display: flex;
            width: 33px;
            height: 33px;
            border-radius: 8px;
            border: 1px solid var(--border);
            background: #11171c;
            color: #77828c;
            align-items: center;
            justify-content: center;
            cursor: pointer;
          }

          .dashboard-header {
            padding: 0 18px;
          }

          .header-user {
            display: none;
          }

          .header-profile > svg {
            display: none;
          }

          .dashboard-content {
            padding: 18px;
          }

          .welcome-section {
            flex-direction: column;
            align-items: flex-start;
          }

          .welcome-actions {
            width: 100%;
            flex-direction: row;
          }

          .welcome-actions > * {
            flex: 1;
          }
        }

        @media (max-width: 650px) {
          .stats-grid {
            grid-template-columns: 1fr 1fr;
          }

          .difficulty-grid {
            grid-template-columns: 1fr 1fr;
          }

          .interview-config-summary {
            grid-template-columns: 1fr 1fr;
          }

          .skills-empty {
            flex-wrap: wrap;
          }
        }

        @media (max-width: 520px) {
          .dashboard-header {
            height: 68px;
          }

          .notification-button {
            display: none;
          }

          .header-kicker,
          .header-left p {
            display: none;
          }

          .header-left h1 {
            font-size: 17px;
          }

          .dashboard-content {
            padding: 14px;
          }

          .welcome-section {
            padding: 19px;
          }

          .welcome-section h2 {
            font-size: 24px;
          }

          .welcome-actions {
            flex-direction: column;
          }

          .stats-grid {
            grid-template-columns: 1fr;
          }

          .evidence-grid {
            grid-template-columns: 1fr;
          }

          .interview-row {
            align-items: flex-start;
          }

          .interview-actions {
            flex-direction: column;
            align-items: flex-end;
          }

          .status-badge {
            font-size: 6px;
          }

          .create-modal {
            padding: 16px;
          }

          .modal-header h2 {
            font-size: 18px;
          }

          .question-count-control {
            gap: 16px;
          }
        }

      `}</style>
    </div>
  );
};

// ============================================================
// STAT CARD
// ============================================================

const StatCard = ({ icon: Icon, label, value, progress }) => {
  return (
    <div className="stat-card">
      <div className="stat-card-icon">
        <Icon />
      </div>

      <div className="stat-card-copy">
        <span>{label}</span>

        <strong>{value}</strong>

        {progress !== undefined && (
          <div className="stat-card-progress">
            <div
              style={{
                width: `${clamp(progress, 0, 100)}%`,
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================
// CARD HEADER
// ============================================================

const CardHeader = ({ eyebrow, title, description, action }) => {
  return (
    <div className="card-header">
      <div className="card-header-copy">
        <span className="card-eyebrow">{eyebrow}</span>

        <h3>{title}</h3>

        {description && <p>{description}</p>}
      </div>

      {action}
    </div>
  );
};

// ============================================================
// PROFILE CHECK
// ============================================================

const ProfileCheck = ({ label, complete, value }) => {
  return (
    <div className={`profile-check ${complete ? "complete" : ""}`}>
      <div className="profile-check-icon">
        {complete ? <FiCheck /> : <FiX />}
      </div>

      <div className="profile-check-copy">
        <span>{label}</span>

        <strong>{value}</strong>
      </div>
    </div>
  );
};

// ============================================================
// FEATURE CARD
// ============================================================

const FeatureCard = ({ icon: Icon, title, description }) => {
  return (
    <div className="feature-card">
      <div className="feature-icon">
        <Icon />
      </div>

      <div className="feature-copy">
        <h4>{title}</h4>

        <p>{description}</p>
      </div>

      <FiChevronRight className="feature-arrow" />
    </div>
  );
};

// ============================================================
// EXPORT
// ============================================================

export default Dashboard;
