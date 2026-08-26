
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiHome,
  FiCpu,
  FiBarChart2,
  FiBriefcase,
  FiUser,
  FiSettings,
  FiBell,
  FiArrowRight,
  FiPlay,
  FiClock,
  FiAward,
  FiMenu,
  FiX,
  FiChevronRight,
  FiRefreshCw,
  FiLoader,
  FiAlertCircle,
  FiCheckCircle,
  FiActivity,
} from "react-icons/fi";

import { getMyProfile } from "../../api/profile.api";
import { createInterview, getInterviews } from "../../api/interview.api";

const MAX_QUESTIONS = 100;

// ============================================================
// HELPERS
// ============================================================

const getSkillName = (skill) => {
  if (typeof skill === "string") {
    return skill.trim();
  }

  if (skill && typeof skill === "object") {
    return (
      skill.name ||
      skill.skillName ||
      skill.technology ||
      skill.title ||
      ""
    ).trim();
  }

  return "";
};

const getSkillLevel = (skill) => {
  if (
    skill &&
    typeof skill === "object" &&
    typeof skill.level === "string"
  ) {
    return skill.level;
  }

  return null;
};

const getSkillScore = (skill) => {
  if (
    skill &&
    typeof skill === "object" &&
    skill.score !== undefined &&
    skill.score !== null &&
    Number.isFinite(Number(skill.score))
  ) {
    return Number(skill.score);
  }

  return null;
};

const extractSkillNames = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map(getSkillName)
    .filter(Boolean)
    .map((skill) => skill.trim())
    .filter(Boolean);
};

const normalizeUniqueSkills = (skills) => {
  const seen = new Set();
  const result = [];

  for (const skill of skills) {
    const normalized = skill.toLowerCase();

    if (seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    result.push(skill);
  }

  return result.slice(0, 30);
};

// ============================================================
// DASHBOARD
// ============================================================

const Dashboard = () => {
  const navigate = useNavigate();

  // ==========================================================
  // STATE
  // ==========================================================

  const [profile, setProfile] = useState(null);
  const [interviews, setInterviews] = useState([]);

  const [loading, setLoading] = useState(true);
  const [interviewsLoading, setInterviewsLoading] = useState(true);

  const [startingInterview, setStartingInterview] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);

  const [error, setError] = useState("");
  const [interviewError, setInterviewError] = useState("");

  // ==========================================================
  // LOAD PROFILE
  // ==========================================================

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await getMyProfile();

      console.log("[Dashboard] PROFILE RESPONSE:", response);

      const profileData =
        response?.data?.profile ||
        response?.data?.data?.profile ||
        response?.profile ||
        response?.data?.data ||
        response?.data ||
        response ||
        null;

      console.log("[Dashboard] NORMALIZED PROFILE:", profileData);

      setProfile(profileData);
    } catch (err) {
      console.error("[Dashboard] PROFILE ERROR:", err);

      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error?.message ||
          err?.message ||
          "Unable to load your profile.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // ==========================================================
  // LOAD INTERVIEWS
  // ==========================================================

  const loadInterviews = useCallback(async () => {
    try {
      setInterviewsLoading(true);
      setInterviewError("");

      const response = await getInterviews();

      console.log("[Dashboard] INTERVIEWS RESPONSE:", response);

      const interviewData =
        response?.data?.data ||
        response?.data?.interviews ||
        response?.data ||
        response?.interviews ||
        response ||
        [];

      const normalizedInterviews = Array.isArray(interviewData)
        ? interviewData
        : [];

      console.log(
        "[Dashboard] NORMALIZED INTERVIEWS:",
        normalizedInterviews,
      );

      setInterviews(normalizedInterviews);
    } catch (err) {
      console.error("[Dashboard] INTERVIEWS ERROR:", err);

      setInterviewError(
        err?.response?.data?.message ||
          err?.response?.data?.error?.message ||
          err?.message ||
          "Unable to load interviews.",
      );

      setInterviews([]);
    } finally {
      setInterviewsLoading(false);
    }
  }, []);

  // ==========================================================
  // INITIAL LOAD
  // ==========================================================

  useEffect(() => {
    loadProfile();
    loadInterviews();
  }, [loadProfile, loadInterviews]);

  // ==========================================================
  // PROFILE DATA
  // ==========================================================

  const displayName =
    profile?.name ||
    profile?.fullName ||
    profile?.username ||
    "Developer";

  const username = profile?.username || "username";

  const rawProfileCompletion = Number(
    profile?.profileCompletion ?? 0,
  );

  const profileCompletion = Number.isFinite(
    rawProfileCompletion,
  )
    ? Math.min(
        100,
        Math.max(0, rawProfileCompletion),
      )
    : 0;

  const profileImage =
    profile?.profilePicture ||
    profile?.profilePic ||
    profile?.profileImage ||
    null;

  // ==========================================================
  // PROFILE SKILLS
  // ==========================================================

  const profileSkills = useMemo(() => {
    const sources = [
      profile?.skills,
      profile?.technicalSkills,
      profile?.manualSkills,
      profile?.technicalSkills?.skills,
    ];

    const allSkills = sources.flatMap((source) =>
      extractSkillNames(source),
    );

    return normalizeUniqueSkills(allSkills);
  }, [profile]);

  // ==========================================================
  // INTERVIEW HELPERS
  // ==========================================================

  const getInterviewId = (interview) =>
    interview?._id ||
    interview?.id ||
    null;

  const getInterviewScore = (interview) => {
    const score = Number(interview?.overallScore);

    return Number.isFinite(score)
      ? Math.min(
          100,
          Math.max(0, score),
        )
      : null;
  };

  const getQuestionCount = (interview) => {
    const count = Number(
      interview?.totalQuestions,
    );

    return Number.isFinite(count)
      ? Math.min(
          MAX_QUESTIONS,
          Math.max(0, count),
        )
      : 0;
  };

  const getCompletedQuestionCount = (interview) => {
    const count = Number(
      interview?.completedQuestions,
    );

    return Number.isFinite(count)
      ? Math.min(
          MAX_QUESTIONS,
          Math.max(0, count),
        )
      : 0;
  };

  const getInterviewProgress = (interview) => {
    const total = getQuestionCount(interview);

    if (total <= 0) {
      return 0;
    }

    const completed =
      getCompletedQuestionCount(interview);

    return Math.min(
      100,
      Math.round((completed / total) * 100),
    );
  };

  const getInterviewDate = (interview) =>
    interview?.createdAt ||
    interview?.startedAt ||
    interview?.updatedAt ||
    null;

  const formatInterviewDate = (value) => {
    if (!value) {
      return "Unknown date";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "Unknown date";
    }

    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case "created":
        return "Not started";
      case "in-progress":
        return "In progress";
      case "completed":
        return "Completed";
      case "cancelled":
        return "Cancelled";
      default:
        return status || "Unknown";
    }
  };

  const getStatusClasses = (status) => {
    switch (status) {
      case "completed":
        return "border-emerald-500/20 bg-emerald-500/10 text-emerald-300";

      case "in-progress":
        return "border-violet-500/20 bg-violet-500/10 text-violet-300";

      case "cancelled":
        return "border-red-500/20 bg-red-500/10 text-red-300";

      default:
        return "border-white/10 bg-white/[0.04] text-slate-400";
    }
  };

  // ==========================================================
  // SORT INTERVIEWS
  // ==========================================================

  const sortedInterviews = useMemo(() => {
    return [...interviews].sort((a, b) => {
      const dateA = new Date(
        getInterviewDate(a) || 0,
      ).getTime();

      const dateB = new Date(
        getInterviewDate(b) || 0,
      ).getTime();

      return dateB - dateA;
    });
  }, [interviews]);

  // ==========================================================
  // DASHBOARD STATS
  // ==========================================================

  const dashboardStats = useMemo(() => {
    const totalInterviews = interviews.length;

    const completedInterviews =
      interviews.filter(
        (interview) =>
          interview?.status === "completed",
      );

    const inProgressInterviews =
      interviews.filter(
        (interview) =>
          interview?.status === "in-progress",
      );

    const cancelledInterviews =
      interviews.filter(
        (interview) =>
          interview?.status === "cancelled",
      );

    const createdInterviews =
      interviews.filter(
        (interview) =>
          interview?.status === "created",
      );

    const scores = completedInterviews
      .map(getInterviewScore)
      .filter(
        (score) =>
          score !== null &&
          Number.isFinite(score),
      );

    const averageScore =
      scores.length > 0
        ? Math.round(
            scores.reduce(
              (sum, score) =>
                sum + score,
              0,
            ) / scores.length,
          )
        : null;

    const assessedSkills = new Set();

    completedInterviews.forEach(
      (interview) => {
        if (
          Array.isArray(
            interview?.technologies,
          )
        ) {
          interview.technologies.forEach(
            (technology) => {
              if (
                typeof technology ===
                  "string" &&
                technology.trim()
              ) {
                assessedSkills.add(
                  technology
                    .trim()
                    .toLowerCase(),
                );
              }
            },
          );
        }
      },
    );

    profileSkills.forEach((skill) => {
      assessedSkills.add(
        skill.toLowerCase(),
      );
    });

    return {
      totalInterviews,
      completedInterviews:
        completedInterviews.length,
      inProgressInterviews:
        inProgressInterviews.length,
      cancelledInterviews:
        cancelledInterviews.length,
      createdInterviews:
        createdInterviews.length,
      averageScore,
      skillsAssessed:
        assessedSkills.size,
    };
  }, [interviews, profileSkills]);

  // ==========================================================
  // STATS
  // ==========================================================

  const stats = [
    {
      label: "Interviews",
      value:
        dashboardStats.totalInterviews,
      subtitle: `${dashboardStats.completedInterviews} completed`,
      icon: FiCpu,
    },
    {
      label: "Average Score",
      value:
        dashboardStats.averageScore !== null
          ? `${dashboardStats.averageScore}%`
          : "—",
      subtitle:
        dashboardStats.completedInterviews >
        0
          ? "Across completed interviews"
          : "No evaluated interviews",
      icon: FiAward,
    },
    {
      label: "Skills Assessed",
      value:
        dashboardStats.skillsAssessed,
      subtitle:
        "Based on profile and interviews",
      icon: FiBarChart2,
    },
    {
      label: "In Progress",
      value:
        dashboardStats.inProgressInterviews,
      subtitle:
        dashboardStats.inProgressInterviews >
        0
          ? "Active interview session"
          : "No active session",
      icon: FiActivity,
    },
  ];

  // ==========================================================
  // NAVIGATION
  // ==========================================================

  const handleNavigation = (path) => {
    setMobileMenu(false);
    navigate(path);
  };

  // ==========================================================
  // START INTERVIEW
  // ==========================================================

  const handleStartInterview = async () => {
    if (startingInterview) {
      return;
    }

    try {
      setStartingInterview(true);
      setError("");
      setMobileMenu(false);

      const role =
        profile?.targetRole ||
        profile?.preferredRole ||
        profile?.role ||
        "Software Developer";

      // ------------------------------------------------------
      // DETECT ALL PROFILE TECHNOLOGIES
      // ------------------------------------------------------

      const technologies = normalizeUniqueSkills([
        ...extractSkillNames(
          profile?.skills,
        ),
        ...extractSkillNames(
          profile?.technicalSkills,
        ),
        ...extractSkillNames(
          profile?.manualSkills,
        ),
        ...extractSkillNames(
          profile?.technicalSkills?.skills,
        ),
      ]);

      console.log(
        "[Dashboard] PROFILE OBJECT:",
        profile,
      );

      console.log(
        "[Dashboard] DETECTED PROFILE TECHNOLOGIES:",
        technologies,
      );

      // ------------------------------------------------------
      // CREATE PAYLOAD
      // ------------------------------------------------------

      const payload = {
        title: `${role.trim()} AI Interview`,
        role: role.trim(),
        interviewType: "mixed",
        difficulty: "adaptive",
        technologies,
      };

      console.log(
        "[Dashboard] CREATING INTERVIEW:",
        payload,
      );

      // ------------------------------------------------------
      // CREATE
      // ------------------------------------------------------

      const response =
        await createInterview(payload);

      console.log(
        "[Dashboard] CREATE INTERVIEW RESPONSE:",
        response,
      );

      // ------------------------------------------------------
      // RESPONSE EXTRACTION
      // ------------------------------------------------------

      const interview =
        response?.data?.interview ||
        response?.data?.data?.interview ||
        response?.interview ||
        response?.data?.data ||
        response?.data ||
        null;

      const interviewId =
        interview?._id ||
        interview?.id ||
        response?.data?.interviewId ||
        response?.data?.id ||
        response?.interviewId ||
        null;

      // ------------------------------------------------------
      // VALIDATE
      // ------------------------------------------------------

      if (!interviewId) {
        console.error(
          "[Dashboard] INTERVIEW ID MISSING:",
          response,
        );

        throw new Error(
          "Interview was created, but no interview ID was returned.",
        );
      }

      console.log(
        "[Dashboard] INTERVIEW CREATED:",
        {
          interviewId,
          technologies,
          interview,
        },
      );

      // Refresh dashboard cache
      await loadInterviews();

      // Navigate
      navigate(
        `/interviews/${interviewId}`,
      );
    } catch (err) {
      console.error(
        "[Dashboard] START INTERVIEW ERROR:",
        err,
      );

      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error?.message ||
          err?.message ||
          "Failed to start interview.",
      );
    } finally {
      setStartingInterview(false);
    }
  };

  // ==========================================================
  // RESUME INTERVIEW
  // ==========================================================

  const handleResumeInterview = (
    interviewId,
  ) => {
    if (!interviewId) {
      return;
    }

    navigate(
      `/interviews/${interviewId}`,
    );
  };

  // ==========================================================
  // MAIN RENDER
  // ==========================================================

  return (
    <div className="min-h-screen bg-[#05050a] text-white selection:bg-violet-500/30">
      {/* ======================================================
          BACKGROUND
      ====================================================== */}

      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.25) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.25) 1px, transparent 1px)",
            backgroundSize:
              "40px 40px",
          }}
        />

        <div className="absolute left-[20%] top-[-200px] h-[500px] w-[500px] rounded-full bg-violet-600/20 blur-[130px]" />

        <div className="absolute right-[-100px] top-[30%] h-[400px] w-[400px] rounded-full bg-fuchsia-600/10 blur-[120px]" />
      </div>

      <div className="flex min-h-screen">
        {/* ====================================================
            SIDEBAR
        ==================================================== */}

        <aside className="hidden w-64 shrink-0 border-r border-white/10 bg-[#07070d]/90 backdrop-blur-xl lg:flex lg:flex-col">
          <div className="flex h-20 items-center border-b border-white/10 px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-violet-400/30 bg-violet-500/10 text-violet-300">
                <FiCpu size={20} />
              </div>

              <div>
                <h1 className="text-sm font-bold tracking-wide">
                  AI INTERVIEW
                </h1>

                <p className="text-[10px] uppercase tracking-[0.2em] text-slate-600">
                  Career OS
                </p>
              </div>
            </div>
          </div>

          <nav className="flex-1 space-y-2 px-4 py-6">
            <SidebarItem
              icon={FiHome}
              label="Dashboard"
              active
              onClick={() =>
                handleNavigation(
                  "/dashboard",
                )
              }
            />

            <SidebarItem
              icon={
                startingInterview
                  ? FiLoader
                  : FiCpu
              }
              label={
                startingInterview
                  ? "Starting Interview..."
                  : "AI Interview"
              }
              onClick={
                handleStartInterview
              }
              disabled={
                startingInterview
              }
            />

            <SidebarItem
              icon={FiBarChart2}
              label="Reports"
              onClick={() =>
                handleNavigation("/reports")
              }
            />

            <SidebarItem
              icon={FiBriefcase}
              label="Jobs"
              onClick={() =>
                handleNavigation("/jobs")
              }
            />

            <SidebarItem
              icon={FiUser}
              label="Profile"
              onClick={() =>
                handleNavigation(
                  "/profile",
                )
              }
            />

            <SidebarItem
              icon={FiSettings}
              label="Settings"
              onClick={() =>
                handleNavigation(
                  "/settings",
                )
              }
            />
          </nav>

          <div className="border-t border-white/10 p-4">
            <div className="rounded-xl border border-violet-500/20 bg-violet-500/[0.04] p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-400">
                AI STATUS
              </p>

              <div className="mt-3 flex items-center gap-2">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />

                <span className="text-xs text-slate-400">
                  System operational
                </span>
              </div>
            </div>
          </div>
        </aside>

        {/* ====================================================
            MAIN
        ==================================================== */}

        <main className="min-w-0 flex-1">
          {/* ==================================================
              HEADER
          ================================================== */}

          <header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-white/10 bg-[#05050a]/80 px-5 backdrop-blur-xl sm:px-8">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() =>
                  setMobileMenu(true)
                }
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] lg:hidden"
              >
                <FiMenu />
              </button>

              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-violet-400">
                  Career OS
                </p>

                <h2 className="mt-1 text-lg font-bold">
                  Dashboard
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button
                type="button"
                className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-slate-400 transition hover:text-white"
              >
                <FiBell size={17} />

                <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-violet-400" />
              </button>

              <div className="flex items-center gap-3 border-l border-white/10 pl-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-violet-400/30 bg-gradient-to-br from-violet-600 to-fuchsia-600 text-sm font-bold">
                  {profileImage ? (
                    <img
                      src={profileImage}
                      alt={displayName}
                      className="h-full w-full object-cover"
                      onError={(event) => {
                        event.currentTarget.style.display =
                          "none";
                      }}
                    />
                  ) : (
                    displayName
                      .charAt(0)
                      .toUpperCase()
                  )}
                </div>

                <div className="hidden sm:block">
                  <p className="text-sm font-semibold">
                    {loading
                      ? "Loading..."
                      : displayName}
                  </p>

                  <p className="text-xs text-slate-600">
                    @{username}
                  </p>
                </div>
              </div>
            </div>
          </header>

          {/* ==================================================
              CONTENT
          ================================================== */}

          <div className="mx-auto max-w-[1500px] space-y-7 p-5 sm:p-8">
            {/* ==================================================
                ERRORS
            ================================================== */}

            {error && (
              <div className="flex items-center justify-between rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <FiAlertCircle className="shrink-0 text-red-400" />

                  <p className="text-xs text-red-400">
                    {error}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={loadProfile}
                  className="flex shrink-0 items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-300 transition hover:bg-white/5"
                >
                  <FiRefreshCw size={13} />
                  Retry
                </button>
              </div>
            )}

            {interviewError && (
              <div className="flex items-center justify-between rounded-xl border border-orange-500/20 bg-orange-500/5 px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <FiAlertCircle className="shrink-0 text-orange-400" />

                  <p className="text-xs text-orange-300">
                    {interviewError}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={
                    loadInterviews
                  }
                  className="flex shrink-0 items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-300 transition hover:bg-white/5"
                >
                  <FiRefreshCw size={13} />
                  Retry
                </button>
              </div>
            )}

            {/* ==================================================
                WELCOME
            ================================================== */}

            <section>
              <p className="text-sm text-slate-500">
                Good afternoon{" "}
                <span className="text-violet-400">
                  ✦
                </span>
              </p>

              <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
                Welcome back,{" "}
                <span className="bg-gradient-to-r from-violet-300 to-fuchsia-300 bg-clip-text text-transparent">
                  {loading
                    ? "Developer"
                    : displayName}
                </span>
              </h1>

              <p className="mt-2 text-sm text-slate-500">
                Ready to sharpen your
                interview skills?
              </p>
            </section>

            {/* ==================================================
                PROFILE COMPLETION
            ================================================== */}

            <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025] p-6">
              <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-violet-600/10 blur-3xl" />

              <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold">
                      Profile completion
                    </span>

                    <span className="rounded-full border border-violet-400/20 bg-violet-500/10 px-2 py-0.5 text-[10px] text-violet-300">
                      {profileCompletion}%
                    </span>
                  </div>

                  <p className="mt-2 text-xs text-slate-500">
                    Complete your profile
                    to unlock better AI
                    recommendations.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    handleNavigation(
                      "/profile",
                    )
                  }
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-xs font-medium text-slate-300 transition hover:bg-white/[0.05] hover:text-white"
                >
                  View Profile
                  <FiArrowRight size={14} />
                </button>
              </div>

              <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500 transition-all duration-700"
                  style={{
                    width: `${profileCompletion}%`,
                  }}
                />
              </div>
            </section>

            {/* ==================================================
                STATS
            ================================================== */}

            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {stats.map((stat) => {
                const Icon = stat.icon;

                return (
                  <div
                    key={stat.label}
                    className="group rounded-2xl border border-white/10 bg-white/[0.025] p-5 transition hover:-translate-y-1 hover:border-violet-500/30"
                  >
                    <div className="flex items-start justify-between">
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-600">
                          {stat.label}
                        </p>

                        <p className="mt-3 text-2xl font-black">
                          {stat.value}
                        </p>

                        <p className="mt-1 text-[11px] text-slate-600">
                          {stat.subtitle}
                        </p>
                      </div>

                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-violet-500/20 bg-violet-500/10 text-violet-400">
                        <Icon size={18} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </section>

            {/* ==================================================
                AI HERO
            ================================================== */}

            <section className="relative overflow-hidden rounded-3xl border border-violet-500/20 bg-gradient-to-br from-violet-600/[0.14] via-purple-600/[0.06] to-transparent p-7 sm:p-10">
              <div className="absolute right-[-100px] top-[-100px] h-[350px] w-[350px] rounded-full bg-violet-600/10 blur-[100px]" />

              <div className="relative max-w-2xl">
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-violet-300">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-violet-400" />
                  AI Interview Engine
                </div>

                <h2 className="text-3xl font-black tracking-tight sm:text-5xl">
                  Think faster.
                  <br />
                  <span className="bg-gradient-to-r from-violet-300 to-fuchsia-300 bg-clip-text text-transparent">
                    Answer better.
                  </span>
                </h2>

                <p className="mt-4 max-w-xl text-sm leading-6 text-slate-400">
                  Practice technical and
                  behavioral interviews with
                  an adaptive AI interviewer
                  that analyzes your answers
                  and identifies skill gaps.
                </p>

                <button
                  type="button"
                  onClick={
                    handleStartInterview
                  }
                  disabled={
                    startingInterview
                  }
                  className="mt-7 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-bold shadow-lg shadow-violet-600/20 transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {startingInterview ? (
                    <>
                      <FiLoader className="animate-spin" />
                      Starting Interview...
                    </>
                  ) : (
                    <>
                      <FiPlay size={15} />
                      Start Interview
                    </>
                  )}
                </button>
              </div>
            </section>

            {/* ==================================================
                BOTTOM
            ================================================== */}

            <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              {/* ==================================================
                  RECENT INTERVIEWS
              ================================================== */}

              <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025]">
                <div className="flex items-center justify-between border-b border-white/10 p-5">
                  <div>
                    <h3 className="text-sm font-bold">
                      Recent Interviews
                    </h3>

                    <p className="mt-1 text-xs text-slate-600">
                      Your latest interview
                      sessions
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      handleNavigation(
                        "/reports",
                      )
                    }
                    className="flex items-center gap-1 text-xs text-violet-400 transition hover:text-violet-300"
                  >
                    View all
                    <FiChevronRight
                      size={13}
                    />
                  </button>
                </div>

                <div className="p-5">
                  {interviewsLoading ? (
                    <div className="flex min-h-52 flex-col items-center justify-center">
                      <FiLoader className="animate-spin text-xl text-violet-400" />

                      <p className="mt-3 text-sm text-slate-500">
                        Loading interviews...
                      </p>
                    </div>
                  ) : sortedInterviews.length ===
                    0 ? (
                    <div className="flex min-h-52 flex-col items-center justify-center text-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-slate-600">
                        <FiCpu size={20} />
                      </div>

                      <p className="mt-4 text-sm font-bold">
                        No interviews yet
                      </p>

                      <p className="mt-1 max-w-sm text-xs leading-5 text-slate-600">
                        Start your first AI
                        interview and your
                        results will appear
                        here.
                      </p>

                      <button
                        type="button"
                        onClick={
                          handleStartInterview
                        }
                        disabled={
                          startingInterview
                        }
                        className="mt-4 inline-flex items-center gap-2 rounded-lg border border-violet-500/20 bg-violet-500/10 px-3 py-2 text-xs font-medium text-violet-300 transition hover:bg-violet-500/20 disabled:opacity-50"
                      >
                        {startingInterview ? (
                          <>
                            <FiLoader className="animate-spin" />
                            Starting...
                          </>
                        ) : (
                          <>
                            Start Interview
                            <FiArrowRight
                              size={13}
                            />
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {sortedInterviews
                        .slice(0, 5)
                        .map(
                          (
                            interview,
                          ) => {
                            const interviewId =
                              getInterviewId(
                                interview,
                              );

                            const score =
                              getInterviewScore(
                                interview,
                              );

                            const progress =
                              getInterviewProgress(
                                interview,
                              );

                            return (
                              <button
                                key={
                                  interviewId
                                }
                                type="button"
                                onClick={() =>
                                  handleResumeInterview(
                                    interviewId,
                                  )
                                }
                                className="group w-full rounded-xl border border-white/10 bg-white/[0.02] p-4 text-left transition hover:border-violet-500/30 hover:bg-white/[0.04]"
                              >
                                <div className="flex items-start justify-between gap-4">
                                  <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <p className="truncate text-sm font-semibold text-slate-200">
                                        {interview?.title ||
                                          `${interview?.role || "AI"} Interview`}
                                      </p>

                                      <span
                                        className={`rounded-full border px-2 py-0.5 text-[9px] ${getStatusClasses(
                                          interview?.status,
                                        )}`}
                                      >
                                        {getStatusLabel(
                                          interview?.status,
                                        )}
                                      </span>
                                    </div>

                                    <p className="mt-1 text-xs text-slate-600">
                                      {interview?.role ||
                                        "Software Developer"}
                                      {" • "}
                                      {formatInterviewDate(
                                        getInterviewDate(
                                          interview,
                                        ),
                                      )}
                                    </p>
                                  </div>

                                  <FiChevronRight
                                    className="mt-1 shrink-0 text-slate-600 transition group-hover:text-violet-400"
                                    size={16}
                                  />
                                </div>

                                <div className="mt-4">
                                  <div className="flex items-center justify-between text-[10px]">
                                    <span className="text-slate-600">
                                      Progress
                                    </span>

                                    <span className="text-slate-500">
                                      {getCompletedQuestionCount(
                                        interview,
                                      )}
                                      /
                                      {getQuestionCount(
                                        interview,
                                      )}
                                    </span>
                                  </div>

                                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/5">
                                    <div
                                      className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
                                      style={{
                                        width: `${progress}%`,
                                      }}
                                    />
                                  </div>
                                </div>

                                <div className="mt-4 flex items-center justify-between">
                                  <span className="text-[10px] uppercase tracking-wider text-slate-600">
                                    {interview?.interviewType ||
                                      "mixed"}
                                  </span>

                                  <span className="text-xs font-semibold text-slate-300">
                                    Score:{" "}
                                    {score !==
                                    null
                                      ? `${score}%`
                                      : "—"}
                                  </span>
                                </div>
                              </button>
                            );
                          },
                        )}
                    </div>
                  )}
                </div>
              </div>

              {/* ==================================================
                  SKILL SNAPSHOT
              ================================================== */}

              <div className="rounded-2xl border border-white/10 bg-white/[0.025]">
                <div className="border-b border-white/10 p-5">
                  <h3 className="text-sm font-bold">
                    Skill Snapshot
                  </h3>

                  <p className="mt-1 text-xs text-slate-600">
                    Technologies detected from
                    your profile
                  </p>
                </div>

                <div className="space-y-5 p-5">
                  {profileSkills.length >
                  0 ? (
                    profileSkills
                      .slice(0, 6)
                      .map(
                        (
                          skillName,
                          index,
                        ) => {
                          const originalSkill =
                            [
                              ...(Array.isArray(
                                profile?.skills,
                              )
                                ? profile.skills
                                : []),
                              ...(Array.isArray(
                                profile?.technicalSkills,
                              )
                                ? profile.technicalSkills
                                : []),
                            ].find(
                              (skill) =>
                                getSkillName(
                                  skill,
                                ).toLowerCase() ===
                                skillName.toLowerCase(),
                            );

                          return (
                            <SkillRow
                              key={`${skillName}-${index}`}
                              name={
                                skillName
                              }
                              level={getSkillLevel(
                                originalSkill,
                              )}
                              score={getSkillScore(
                                originalSkill,
                              )}
                            />
                          );
                        },
                      )
                  ) : (
                    <>
                      <SkillRow name="No technical skills detected" />
                    </>
                  )}
                </div>

                <div className="border-t border-white/10 p-5">
                  <button
                    type="button"
                    onClick={() =>
                      handleNavigation(
                        "/profile",
                      )
                    }
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-xs font-medium text-slate-400 transition hover:bg-white/[0.04] hover:text-white"
                  >
                    Manage Skills
                    <FiArrowRight
                      size={13}
                    />
                  </button>
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>

      {/* ========================================================
          MOBILE MENU
      ======================================================== */}

      {mobileMenu && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() =>
              setMobileMenu(false)
            }
          />

          <aside className="relative h-full w-72 border-r border-white/10 bg-[#07070d] p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-violet-400/30 bg-violet-500/10 text-violet-300">
                  <FiCpu size={18} />
                </div>

                <div>
                  <p className="text-sm font-black tracking-wide">
                    AI INTERVIEW
                  </p>

                  <p className="text-[9px] uppercase tracking-[0.2em] text-slate-600">
                    Career OS
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  setMobileMenu(false)
                }
                className="rounded-lg p-2 text-slate-400 transition hover:bg-white/5 hover:text-white"
              >
                <FiX />
              </button>
            </div>

            <nav className="mt-8 space-y-2">
              <SidebarItem
                icon={FiHome}
                label="Dashboard"
                active
                onClick={() =>
                  handleNavigation(
                    "/dashboard",
                  )
                }
              />

              <SidebarItem
                icon={
                  startingInterview
                    ? FiLoader
                    : FiCpu
                }
                label={
                  startingInterview
                    ? "Starting..."
                    : "AI Interview"
                }
                onClick={
                  handleStartInterview
                }
                disabled={
                  startingInterview
                }
              />

              <SidebarItem
                icon={FiBarChart2}
                label="Reports"
                onClick={() =>
                  handleNavigation(
                    "/reports",
                  )
                }
              />

              <SidebarItem
                icon={FiBriefcase}
                label="Jobs"
                onClick={() =>
                  handleNavigation(
                    "/jobs",
                  )
                }
              />

              <SidebarItem
                icon={FiUser}
                label="Profile"
                onClick={() =>
                  handleNavigation(
                    "/profile",
                  )
                }
              />

              <SidebarItem
                icon={FiSettings}
                label="Settings"
                onClick={() =>
                  handleNavigation(
                    "/settings",
                  )
                }
              />
            </nav>
          </aside>
        </div>
      )}
    </div>
  );
};

// ============================================================
// SIDEBAR ITEM
// ============================================================

const SidebarItem = ({
  icon: Icon,
  label,
  active = false,
  onClick,
  disabled = false,
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm transition ${
        active
          ? "border border-violet-500/20 bg-violet-500/10 text-violet-300"
          : "text-slate-500 hover:bg-white/[0.04] hover:text-white"
      } ${
        disabled
          ? "cursor-not-allowed opacity-60"
          : ""
      }`}
    >
      <Icon
        size={18}
        className={
          label.includes("Starting")
            ? "animate-spin"
            : ""
        }
      />

      <span>{label}</span>
    </button>
  );
};

// ============================================================
// SKILL ROW
// ============================================================

const SkillRow = ({
  name,
  level,
  score,
}) => {
  const numericScore =
    score !== undefined &&
    score !== null &&
    Number.isFinite(Number(score))
      ? Math.min(
          100,
          Math.max(0, Number(score)),
        )
      : 0;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="truncate text-sm text-slate-300">
          {name}
        </span>

        <span className="shrink-0 rounded-full border border-white/10 px-2 py-1 text-[10px] text-slate-500">
          {level || "Not assessed"}
        </span>
      </div>

      <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
        <div
          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-700"
          style={{
            width: `${numericScore}%`,
          }}
        />
      </div>
    </div>
  );
};

export default Dashboard;
