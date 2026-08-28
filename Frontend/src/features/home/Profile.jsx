
import { useEffect, useRef, useState } from "react";
import {
  FiArrowLeft,
  FiCamera,
  FiGithub,
  FiLinkedin,
  FiCode,
  FiFileText,
  FiSave,
  FiUser,
  FiMail,
  FiExternalLink,
  FiUpload,
  FiPlus,
  FiX,
  FiBriefcase,
  FiCheckCircle,
  FiShield,
  FiLink,
  FiStar,
  FiChevronRight,
} from "react-icons/fi";
import { useNavigate } from "react-router-dom";

import { getMyProfile, updateProfile } from "../../api/profile.api";

const Profile = () => {
  const navigate = useNavigate();

  const fileInputRef = useRef(null);
  const resumeInputRef = useRef(null);

  const [profile, setProfile] = useState(null);

  const [form, setForm] = useState({
    name: "",
    targetRole: "",
    github: "",
    linkedin: "",
    leetcode: "",
    technicalSkills: [],
    socialSkills: [],
  });

  const [profileImage, setProfileImage] = useState(null);
  const [resumeFile, setResumeFile] = useState(null);
  const [preview, setPreview] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");

  const [technicalSkillInput, setTechnicalSkillInput] = useState("");
  const [socialSkillInput, setSocialSkillInput] = useState("");

  // ============================================================
  // LOAD PROFILE
  // ============================================================

  useEffect(() => {
    loadProfile();

    return () => {
      setPreview((current) => {
        if (current?.startsWith("blob:")) {
          URL.revokeObjectURL(current);
        }
        return current;
      });
    };
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      setMessage("");

      const response = await getMyProfile();

      const data =
        response?.profile ||
        response?.data?.profile ||
        response?.data ||
        response;

      setProfile(data);

      const technicalSkills = Array.isArray(data?.technicalSkills)
        ? data.technicalSkills
        : [];

      const socialSkills = Array.isArray(data?.socialSkills)
        ? data.socialSkills
        : [];

      const role =
        data?.targetRole?.trim() ||
        data?.role?.trim() ||
        "";

      setForm({
        name: data?.name || "",
        targetRole: role,
        github: data?.github || "",
        linkedin: data?.linkedin || "",
        leetcode: data?.leetcode || "",
        technicalSkills,
        socialSkills,
      });

      setPreview(data?.profilePicture || "");
    } catch (error) {
      console.error("Profile loading failed:", error);

      showMessage(
        error?.response?.data?.message ||
          "Unable to load your profile.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // MESSAGE
  // ============================================================

  const showMessage = (text, type = "info") => {
    setMessage(text);
    setMessageType(type);
  };

  // ============================================================
  // NORMALIZE
  // ============================================================

  const normalizeSkillName = (skill) => {
    if (!skill) return "";

    if (typeof skill === "string") {
      return skill.trim();
    }

    return (
      skill?.name ||
      skill?.skill ||
      skill?.title ||
      ""
    ).trim();
  };

  // ============================================================
  // GITHUB SKILLS
  // ============================================================

  const getGithubSkills = () => {
    const evidence = profile?.githubEvidence;

    if (!evidence) return [];

    const skills = Array.isArray(evidence?.skills)
      ? evidence.skills
      : [];

    const languages = Array.isArray(evidence?.languages)
      ? evidence.languages
      : [];

    const unique = new Map();

    [...skills, ...languages].forEach((skill) => {
      const name = normalizeSkillName(skill);

      if (!name) return;

      const key = name.toLowerCase();

      if (!unique.has(key)) {
        unique.set(key, name);
      }
    });

    return Array.from(unique.values());
  };

  // ============================================================
  // MERGED TECHNICAL SKILLS
  // ============================================================

  const getMergedTechnicalSkills = () => {
    const manualSkills = Array.isArray(form.technicalSkills)
      ? form.technicalSkills
      : [];

    const githubSkills = getGithubSkills();

    const merged = new Map();

    manualSkills.forEach((skill) => {
      const name = normalizeSkillName(skill);

      if (!name) return;

      merged.set(name.toLowerCase(), {
        name,
        level:
          typeof skill === "object"
            ? skill?.level
            : undefined,
        githubDetected: false,
      });
    });

    githubSkills.forEach((name) => {
      const key = name.toLowerCase();

      if (merged.has(key)) {
        const old = merged.get(key);

        merged.set(key, {
          ...old,
          name,
          githubDetected: true,
        });
      } else {
        merged.set(key, {
          name,
          githubDetected: true,
        });
      }
    });

    return Array.from(merged.values());
  };

  // ============================================================
  // IMAGE
  // ============================================================

  const handleImageChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showMessage("Please select a valid image file.", "error");
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showMessage(
        "Profile picture must be smaller than 5MB.",
        "error"
      );
      event.target.value = "";
      return;
    }

    if (preview?.startsWith("blob:")) {
      URL.revokeObjectURL(preview);
    }

    const imageUrl = URL.createObjectURL(file);

    setProfileImage(file);
    setPreview(imageUrl);

    showMessage("", "info");

    event.target.value = "";
  };

  // ============================================================
  // RESUME
  // ============================================================

  const handleResumeChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (file.type !== "application/pdf") {
      showMessage(
        "Please select a PDF resume.",
        "error"
      );
      event.target.value = "";
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      showMessage(
        "Resume must be smaller than 10MB.",
        "error"
      );
      event.target.value = "";
      return;
    }

    setResumeFile(file);
    showMessage("", "info");

    event.target.value = "";
  };

  // ============================================================
  // FORM
  // ============================================================

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // ============================================================
  // TECHNICAL SKILL
  // ============================================================

  const addTechnicalSkill = () => {
    const skillName = technicalSkillInput.trim();

    if (!skillName) return;

    const githubSkills = getGithubSkills();

    if (
      githubSkills.some(
        (skill) =>
          skill.toLowerCase() ===
          skillName.toLowerCase()
      )
    ) {
      showMessage(
        `"${skillName}" is already detected from GitHub.`,
        "info"
      );

      setTechnicalSkillInput("");
      return;
    }

    const exists = form.technicalSkills.some(
      (skill) =>
        normalizeSkillName(skill).toLowerCase() ===
        skillName.toLowerCase()
    );

    if (exists) {
      showMessage(
        "This technical skill is already added.",
        "info"
      );
      return;
    }

    setForm((previous) => ({
      ...previous,
      technicalSkills: [
        ...previous.technicalSkills,
        { name: skillName },
      ],
    }));

    setTechnicalSkillInput("");
    showMessage("", "info");
  };

  // ============================================================
  // SOCIAL SKILL
  // ============================================================

  const addSocialSkill = () => {
    const skillName = socialSkillInput.trim();

    if (!skillName) return;

    const exists = form.socialSkills.some(
      (skill) =>
        normalizeSkillName(skill).toLowerCase() ===
        skillName.toLowerCase()
    );

    if (exists) {
      showMessage(
        "This social skill is already added.",
        "info"
      );
      return;
    }

    setForm((previous) => ({
      ...previous,
      socialSkills: [
        ...previous.socialSkills,
        { name: skillName },
      ],
    }));

    setSocialSkillInput("");
    showMessage("", "info");
  };

  // ============================================================
  // REMOVE
  // ============================================================

  const removeTechnicalSkill = (nameToRemove) => {
    const githubSkills = getGithubSkills();

    if (
      githubSkills.some(
        (skill) =>
          skill.toLowerCase() ===
          nameToRemove.toLowerCase()
      )
    ) {
      showMessage(
        `"${nameToRemove}" is detected from GitHub and cannot be removed.`,
        "info"
      );
      return;
    }

    setForm((previous) => ({
      ...previous,
      technicalSkills:
        previous.technicalSkills.filter(
          (skill) =>
            normalizeSkillName(skill).toLowerCase() !==
            nameToRemove.toLowerCase()
        ),
    }));
  };

  const removeSocialSkill = (index) => {
    setForm((previous) => ({
      ...previous,
      socialSkills:
        previous.socialSkills.filter(
          (_, skillIndex) => skillIndex !== index
        ),
    }));
  };

  // ============================================================
  // ENTER
  // ============================================================

  const handleTechnicalSkillKeyDown = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addTechnicalSkill();
    }
  };

  const handleSocialSkillKeyDown = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addSocialSkill();
    }
  };

  // ============================================================
  // SAVE
  // ============================================================

  const handleSave = async () => {
    try {
      setSaving(true);
      showMessage("", "info");

      const formData = new FormData();

      formData.append("name", form.name || "");

      formData.append(
        "targetRole",
        form.targetRole?.trim() || ""
      );

      formData.append("github", form.github || "");
      formData.append("linkedin", form.linkedin || "");
      formData.append("leetcode", form.leetcode || "");

      const technicalSkills = Array.isArray(
        form.technicalSkills
      )
        ? form.technicalSkills
            .map((skill) => ({
              name: normalizeSkillName(skill),
            }))
            .filter((skill) => skill.name)
        : [];

      formData.append(
        "technicalSkills",
        JSON.stringify(technicalSkills)
      );

      const socialSkills = Array.isArray(
        form.socialSkills
      )
        ? form.socialSkills
            .map((skill) => ({
              name: normalizeSkillName(skill),
            }))
            .filter((skill) => skill.name)
        : [];

      formData.append(
        "socialSkills",
        JSON.stringify(socialSkills)
      );

      if (profileImage) {
        formData.append(
          "profilePicture",
          profileImage
        );
      }

      if (resumeFile) {
        formData.append("resume", resumeFile);
      }

      const response = await updateProfile(formData);

      console.log("PROFILE UPDATED:", response);

      showMessage(
        "Profile updated successfully.",
        "success"
      );

      setProfileImage(null);
      setResumeFile(null);

      await loadProfile();
    } catch (error) {
      console.error("Profile update failed:", error);

      showMessage(
        error?.response?.data?.message ||
          "Failed to update profile.",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  // ============================================================
  // DATA
  // ============================================================

  const username = profile?.username || "";
  const email = profile?.email || "";

  const displayName =
    form.name ||
    profile?.name ||
    username ||
    "User";

  const profileCompletion =
    Number(profile?.profileCompletion) || 0;

  const mergedTechnicalSkills =
    getMergedTechnicalSkills();

  const githubSkills =
    getGithubSkills();

  const githubAnalyzed =
    profile?.githubEvidence?.analyzed === true;

  const githubRepositories =
    profile?.githubEvidence?.repositoriesAnalyzed || 0;

  // ============================================================
  // LOADING
  // ============================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050507] text-white">
        <div className="flex min-h-screen items-center justify-center">
          <div className="flex flex-col items-center">
            <div className="relative mb-5 h-12 w-12">
              <div className="absolute inset-0 rounded-full border border-violet-500/20" />
              <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-violet-500" />
            </div>

            <p className="text-sm font-medium text-slate-400">
              Loading your profile
            </p>

            <p className="mt-1 text-[11px] text-slate-700">
              Preparing your career workspace...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#050507] text-white">
      {/* ========================================================
          AMBIENT BACKGROUND
      ======================================================== */}

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full bg-violet-700/10 blur-[150px]" />

        <div className="absolute right-[-180px] top-[25%] h-[500px] w-[500px] rounded-full bg-fuchsia-700/[0.07] blur-[150px]" />

        <div className="absolute bottom-[-200px] left-[35%] h-[450px] w-[450px] rounded-full bg-indigo-700/[0.07] blur-[150px]" />

        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.5) 1px,transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
      </div>

      {/* ========================================================
          HEADER
      ======================================================== */}

      <header className="sticky top-0 z-50 border-b border-white/[0.07] bg-[#050507]/80 backdrop-blur-2xl">
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5 sm:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className="group flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.025] text-slate-500 transition-all duration-300 hover:border-violet-500/30 hover:bg-violet-500/[0.07] hover:text-white"
            >
              <FiArrowLeft
                size={17}
                className="transition-transform duration-300 group-hover:-translate-x-0.5"
              />
            </button>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-violet-400">
                  Career OS
                </span>

                <span className="h-1 w-1 rounded-full bg-slate-700" />

                <span className="text-[9px] uppercase tracking-wider text-slate-700">
                  Profile
                </span>
              </div>

              <h1 className="mt-0.5 text-sm font-bold text-white">
                Your professional identity
              </h1>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="group flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-black shadow-xl shadow-white/[0.04] transition-all duration-300 hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FiSave size={14} />

            <span className="hidden sm:inline">
              {saving ? "Saving..." : "Save changes"}
            </span>

            <span className="sm:hidden">{saving ? "..." : "Save"}</span>
          </button>
        </div>
      </header>

      {/* ========================================================
          MAIN
      ======================================================== */}

      <main className="relative mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-10">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
          {/* ====================================================
              LEFT
          ==================================================== */}

          <div className="min-w-0 space-y-6">
            {/* ==================================================
                HERO
            ================================================== */}

            <section className="relative overflow-hidden rounded-[30px] border border-white/[0.08] bg-white/[0.025] shadow-2xl shadow-black/20">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-500/60 to-transparent" />

              <div className="absolute right-[-120px] top-[-160px] h-[380px] w-[380px] rounded-full bg-violet-600/[0.09] blur-[100px]" />

              <div className="relative p-6 sm:p-8">
                <div className="flex flex-col gap-7 sm:flex-row sm:items-center">
                  {/* IMAGE */}

                  <div className="relative mx-auto shrink-0 sm:mx-0">
                    <div className="absolute -inset-2 rounded-[32px] bg-gradient-to-br from-violet-500/20 to-fuchsia-500/10 blur-xl" />

                    {preview ? (
                      <img
                        src={preview}
                        alt={displayName}
                        className="relative h-32 w-32 rounded-[28px] border border-white/10 object-cover shadow-2xl sm:h-36 sm:w-36"
                        onError={(event) => {
                          event.currentTarget.style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="relative flex h-32 w-32 items-center justify-center rounded-[28px] border border-violet-400/20 bg-gradient-to-br from-violet-600/20 to-fuchsia-600/10 text-5xl font-black text-violet-200 sm:h-36 sm:w-36">
                        {displayName?.charAt(0)?.toUpperCase() || "U"}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute -bottom-2 -right-2 flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-[#111118] text-violet-300 shadow-2xl transition-all duration-300 hover:border-violet-400/30 hover:bg-violet-500/10 hover:text-white"
                      title="Change profile picture"
                    >
                      <FiCamera size={16} />
                    </button>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageChange}
                    />
                  </div>

                  {/* DETAILS */}

                  <div className="min-w-0 flex-1 text-center sm:text-left">
                    <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                      {form.targetRole && (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/20 bg-violet-500/[0.08] px-3 py-1.5 text-[10px] font-semibold text-violet-300">
                          <FiBriefcase size={11} />
                          {form.targetRole}
                        </span>
                      )}

                      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/15 bg-emerald-500/[0.05] px-3 py-1.5 text-[10px] font-semibold text-emerald-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-lg shadow-emerald-500/50" />
                        Active
                      </span>
                    </div>

                    <h2 className="mt-4 break-words text-3xl font-black tracking-[-0.04em] text-white sm:text-4xl">
                      {displayName}
                    </h2>

                    <p className="mt-2 text-xs text-slate-600">
                      @{username || "username"} ·{" "}
                      {email || "email not available"}
                    </p>

                    <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-slate-500 sm:mx-0">
                      Build a stronger professional profile so your AI career
                      engine can better understand your experience, skills and
                      developer presence.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* ==================================================
                ACCOUNT
            ================================================== */}

            <ProfileCard
              icon={FiShield}
              eyebrow="IDENTITY"
              title="Account information"
              description="Managed by your authentication account."
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <ModernInput
                  icon={FiUser}
                  label="Username"
                  value={username}
                  disabled
                />

                <ModernInput
                  icon={FiMail}
                  label="Email"
                  value={email}
                  disabled
                />
              </div>
            </ProfileCard>

            {/* ==================================================
                PERSONAL
            ================================================== */}

            <ProfileCard
              icon={FiUser}
              eyebrow="PERSONAL"
              title="Personal information"
              description="Information used to personalize your AI career experience."
            >
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <ModernInput
                  icon={FiUser}
                  label="Full name"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Your full name"
                />

                <div>
                  <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.16em] text-slate-600">
                    Target role
                  </label>

                  <div className="min-h-[49px] rounded-xl border border-white/[0.08] bg-black/20 transition-all duration-300 focus-within:border-violet-500/30 focus-within:bg-violet-500/[0.02]">
                    {form.targetRole ? (
                      <div className="flex min-h-[49px] items-center px-3">
                        <span className="inline-flex items-center gap-2 rounded-lg border border-violet-500/15 bg-violet-500/[0.07] px-3 py-2 text-xs font-medium text-violet-300">
                          <FiBriefcase size={13} />

                          {form.targetRole}

                          <button
                            type="button"
                            onClick={() =>
                              setForm((previous) => ({
                                ...previous,
                                targetRole: "",
                              }))
                            }
                            className="ml-1 text-slate-600 transition hover:text-red-400"
                          >
                            <FiX size={13} />
                          </button>
                        </span>
                      </div>
                    ) : (
                      <input
                        type="text"
                        value=""
                        onChange={(event) =>
                          setForm((previous) => ({
                            ...previous,
                            targetRole: event.target.value,
                          }))
                        }
                        placeholder="e.g. Full Stack Developer"
                        className="w-full bg-transparent px-4 py-3 text-sm text-white outline-none placeholder:text-slate-700"
                      />
                    )}
                  </div>

                  <p className="mt-2 text-[10px] text-slate-700">
                    Only one target role can be selected.
                  </p>
                </div>
              </div>
            </ProfileCard>

            {/* ==================================================
                DEVELOPER PRESENCE
            ================================================== */}

            <ProfileCard
              icon={FiLink}
              eyebrow="DEVELOPER GRAPH"
              title="Developer presence"
              description="Connect public profiles to give the AI more evidence about your work."
            >
              <div className="space-y-4">
                <ModernSocialInput
                  icon={FiGithub}
                  label="GitHub"
                  name="github"
                  value={form.github}
                  onChange={handleChange}
                  placeholder="https://github.com/username"
                />

                <ModernSocialInput
                  icon={FiLinkedin}
                  label="LinkedIn"
                  name="linkedin"
                  value={form.linkedin}
                  onChange={handleChange}
                  placeholder="https://linkedin.com/in/username"
                />

                <ModernSocialInput
                  icon={FiCode}
                  label="LeetCode"
                  name="leetcode"
                  value={form.leetcode}
                  onChange={handleChange}
                  placeholder="https://leetcode.com/username"
                />
              </div>
            </ProfileCard>

            {/* ==================================================
                SKILLS
            ================================================== */}

            <ProfileCard
              icon={FiCode}
              eyebrow="CAPABILITIES"
              title="Skills"
              description="Your manually provided skills are combined with evidence detected from GitHub."
            >
              {/* TECHNICAL */}

              <div>
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      Technical skills
                    </h3>

                    <p className="mt-1 text-[11px] text-slate-600">
                      Manual + GitHub evidence
                    </p>
                  </div>

                  {githubAnalyzed && (
                    <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-emerald-500/15 bg-emerald-500/[0.05] px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-wider text-emerald-400">
                      <FiCheckCircle size={11} />
                      GitHub analyzed
                    </span>
                  )}
                </div>

                <div className="mt-4 flex gap-2">
                  <input
                    type="text"
                    value={technicalSkillInput}
                    onChange={(event) =>
                      setTechnicalSkillInput(event.target.value)
                    }
                    onKeyDown={handleTechnicalSkillKeyDown}
                    placeholder="Add technical skill..."
                    className="min-w-0 flex-1 rounded-xl border border-white/[0.08] bg-black/20 px-4 py-3 text-sm text-white outline-none transition-all duration-300 placeholder:text-slate-700 focus:border-violet-500/30 focus:bg-violet-500/[0.02]"
                  />

                  <button
                    type="button"
                    onClick={addTechnicalSkill}
                    className="flex shrink-0 items-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-xs font-bold transition-all duration-300 hover:bg-violet-500 hover:shadow-lg hover:shadow-violet-900/20"
                  >
                    <FiPlus size={15} />
                    <span className="hidden sm:inline">Add</span>
                  </button>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  {mergedTechnicalSkills.length > 0 ? (
                    mergedTechnicalSkills.map((skill, index) => (
                      <TechnicalSkillTag
                        key={`${skill.name}-${index}`}
                        name={skill.name}
                        level={skill.level}
                        githubDetected={skill.githubDetected}
                        onRemove={() => removeTechnicalSkill(skill.name)}
                      />
                    ))
                  ) : (
                    <EmptyState text="No technical skills yet." />
                  )}
                </div>

                {githubAnalyzed && (
                  <div className="mt-5 flex items-center gap-3 rounded-xl border border-emerald-500/10 bg-emerald-500/[0.025] p-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                      <FiGithub size={16} />
                    </div>

                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-emerald-300">
                        GitHub evidence found
                      </p>

                      <p className="mt-1 text-[10px] leading-5 text-slate-600">
                        {githubSkills.length} skill
                        {githubSkills.length !== 1 ? "s" : ""} detected across{" "}
                        {githubRepositories} analyzed
                        {githubRepositories !== 1
                          ? " repositories"
                          : " repository"}
                        .
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* DIVIDER */}

              <div className="my-8 h-px bg-white/[0.05]" />

              {/* SOCIAL */}

              <div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Social skills
                  </h3>

                  <p className="mt-1 text-[11px] text-slate-600">
                    Communication and workplace strengths you want the AI to
                    consider.
                  </p>
                </div>

                <div className="mt-4 flex gap-2">
                  <input
                    type="text"
                    value={socialSkillInput}
                    onChange={(event) =>
                      setSocialSkillInput(event.target.value)
                    }
                    onKeyDown={handleSocialSkillKeyDown}
                    placeholder="Add social skill..."
                    className="min-w-0 flex-1 rounded-xl border border-white/[0.08] bg-black/20 px-4 py-3 text-sm text-white outline-none transition-all duration-300 placeholder:text-slate-700 focus:border-violet-500/30"
                  />

                  <button
                    type="button"
                    onClick={addSocialSkill}
                    className="flex shrink-0 items-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-xs font-bold transition-all duration-300 hover:bg-violet-500"
                  >
                    <FiPlus size={15} />
                    <span className="hidden sm:inline">Add</span>
                  </button>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  {form.socialSkills.length > 0 ? (
                    form.socialSkills.map((skill, index) => {
                      const name = normalizeSkillName(skill);

                      if (!name) return null;

                      return (
                        <SkillTag
                          key={`${name}-${index}`}
                          name={name}
                          level={skill?.level}
                          onRemove={() => removeSocialSkill(index)}
                        />
                      );
                    })
                  ) : (
                    <EmptyState text="No social skills yet." />
                  )}
                </div>
              </div>
            </ProfileCard>

            {/* ==================================================
                RESUME
            ================================================== */}

            <ProfileCard
              icon={FiFileText}
              eyebrow="DOCUMENT"
              title="Resume"
              description="Your resume gives the AI additional evidence about your experience."
            >
              <div className="group relative overflow-hidden rounded-2xl border border-dashed border-white/[0.1] bg-black/20 p-7 text-center transition-all duration-300 hover:border-violet-500/20 hover:bg-violet-500/[0.015]">
                <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-violet-500/20 to-transparent opacity-0 transition group-hover:opacity-100" />

                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-violet-500/15 bg-violet-500/[0.06] text-violet-400 transition-transform duration-300 group-hover:scale-105">
                  <FiFileText size={23} />
                </div>

                <p className="mt-4 text-sm font-bold text-white">
                  {resumeFile
                    ? resumeFile.name
                    : profile?.resume
                      ? "Resume uploaded"
                      : "No resume uploaded"}
                </p>

                <p className="mt-1 text-[10px] text-slate-700">
                  PDF · Maximum 10MB
                </p>

                <button
                  type="button"
                  onClick={() => resumeInputRef.current?.click()}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.025] px-4 py-2.5 text-xs font-semibold text-slate-400 transition-all duration-300 hover:border-violet-500/20 hover:bg-violet-500/[0.06] hover:text-white"
                >
                  <FiUpload size={14} />

                  {profile?.resume ? "Replace resume" : "Upload resume"}
                </button>

                <input
                  ref={resumeInputRef}
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={handleResumeChange}
                />

                {resumeFile && (
                  <p className="mt-3 text-[10px] font-medium text-emerald-400">
                    New resume selected · Save to upload
                  </p>
                )}

                {profile?.resume && (
                  <a
                    href={profile.resume}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex items-center gap-1.5 text-[10px] font-semibold text-violet-400 transition hover:text-violet-300"
                  >
                    View current resume
                    <FiExternalLink size={11} />
                  </a>
                )}
              </div>
            </ProfileCard>

            {/* MESSAGE */}

            {message && (
              <div
                className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-xs ${
                  messageType === "error"
                    ? "border-red-500/15 bg-red-500/[0.04] text-red-300"
                    : messageType === "success"
                      ? "border-emerald-500/15 bg-emerald-500/[0.04] text-emerald-300"
                      : "border-violet-500/15 bg-violet-500/[0.04] text-violet-300"
                }`}
              >
                {messageType === "success" ? (
                  <FiCheckCircle size={14} />
                ) : (
                  <FiStar size={14} />
                )}

                {message}
              </div>
            )}

            {/* BOTTOM SAVE */}

            <div className="flex justify-end border-t border-white/[0.05] pb-10 pt-6">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="group flex items-center gap-2 rounded-xl bg-violet-600 px-6 py-3 text-xs font-bold shadow-xl shadow-violet-950/20 transition-all duration-300 hover:bg-violet-500 hover:shadow-violet-900/30 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FiSave size={14} />

                {saving ? "Saving profile..." : "Save profile"}

                {!saving && (
                  <FiChevronRight
                    size={14}
                    className="transition-transform group-hover:translate-x-0.5"
                  />
                )}
              </button>
            </div>
          </div>

          {/* ====================================================
              RIGHT SIDEBAR
          ==================================================== */}

          <aside className="space-y-5 lg:sticky lg:top-[96px] lg:self-start">
            {/* COMPLETION */}

            <div className="relative overflow-hidden rounded-[24px] border border-white/[0.08] bg-white/[0.025] p-5">
              <div className="absolute right-[-60px] top-[-60px] h-40 w-40 rounded-full bg-violet-600/10 blur-[60px]" />

              <div className="relative">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-violet-400">
                      Profile health
                    </p>

                    <h3 className="mt-1 text-sm font-bold text-white">
                      Completion
                    </h3>
                  </div>

                  <span className="text-2xl font-black tracking-tight text-violet-300">
                    {profileCompletion}%
                  </span>
                </div>

                <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-violet-600 via-fuchsia-500 to-violet-400 transition-all duration-700"
                    style={{
                      width: `${Math.min(profileCompletion, 100)}%`,
                    }}
                  />
                </div>

                <p className="mt-3 text-[10px] leading-5 text-slate-600">
                  Complete more of your profile to give the AI stronger career
                  context.
                </p>
              </div>
            </div>

            {/* AI CARD */}

            <div className="relative overflow-hidden rounded-[24px] border border-violet-500/15 bg-gradient-to-br from-violet-500/[0.08] to-fuchsia-500/[0.025] p-5">
              <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-violet-500/10 blur-[50px]" />

              <div className="relative">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-violet-400/20 bg-violet-500/10 text-violet-300">
                  <FiStar size={16} />
                </div>

                <h3 className="mt-4 text-sm font-bold text-white">
                  AI career intelligence
                </h3>

                <p className="mt-2 text-[10px] leading-5 text-slate-600">
                  Your profile can become evidence for adaptive interviews,
                  skill analysis, resume intelligence and career
                  recommendations.
                </p>

                <div className="mt-4 space-y-2">
                  <MiniStatus
                    label="Identity"
                    active={Boolean(username && email)}
                  />

                  <MiniStatus
                    label="Target role"
                    active={Boolean(form.targetRole)}
                  />

                  <MiniStatus
                    label="Technical skills"
                    active={mergedTechnicalSkills.length > 0}
                  />

                  <MiniStatus
                    label="Developer evidence"
                    active={
                      githubAnalyzed ||
                      Boolean(form.github || form.linkedin || form.leetcode)
                    }
                  />

                  <MiniStatus
                    label="Resume"
                    active={Boolean(resumeFile || profile?.resume)}
                  />
                </div>
              </div>
            </div>

            {/* PRIVACY */}

            <div className="rounded-[24px] border border-white/[0.07] bg-white/[0.02] p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.04] text-slate-500">
                  <FiShield size={15} />
                </div>

                <div>
                  <h3 className="text-xs font-bold text-slate-300">
                    Your identity stays yours
                  </h3>

                  <p className="mt-1 text-[10px] leading-5 text-slate-700">
                    Username and email are controlled by your authentication
                    account and cannot be edited here.
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
};

// ============================================================
// PROFILE CARD
// ============================================================

const ProfileCard = ({
  icon: Icon,
  eyebrow,
  title,
  description,
  children,
}) => {
  return (
    <section className="relative overflow-hidden rounded-[26px] border border-white/[0.08] bg-white/[0.025] p-5 shadow-xl shadow-black/10 sm:p-6">

      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

      <div className="flex items-start gap-3">

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-violet-500/15 bg-violet-500/[0.06] text-violet-400">
          <Icon size={17} />
        </div>

        <div className="min-w-0">

          <p className="text-[9px] font-bold tracking-[0.22em] text-violet-400">
            {eyebrow}
          </p>

          <h2 className="mt-1 text-sm font-bold text-white">
            {title}
          </h2>

          <p className="mt-1 max-w-2xl text-[11px] leading-5 text-slate-600">
            {description}
          </p>
        </div>
      </div>

      <div className="mt-6">
        {children}
      </div>
    </section>
  );
};

// ============================================================
// INPUT
// ============================================================

const ModernInput = ({
  icon: Icon,
  label,
  name,
  value,
  onChange,
  placeholder,
  disabled = false,
}) => {
  return (
    <div>

      <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.16em] text-slate-600">
        {label}
      </label>

      <div
        className={`group flex items-center rounded-xl border bg-black/20 transition-all duration-300 ${
          disabled
            ? "border-white/[0.06] opacity-60"
            : "border-white/[0.08] focus-within:border-violet-500/30 focus-within:bg-violet-500/[0.02]"
        }`}
      >

        <Icon
          size={15}
          className="ml-4 shrink-0 text-slate-700 transition group-focus-within:text-violet-400"
        />

        <input
          type="text"
          name={name}
          value={value || ""}
          onChange={onChange}
          disabled={disabled}
          placeholder={placeholder}
          className="w-full bg-transparent px-3 py-3 text-sm text-white outline-none placeholder:text-slate-700 disabled:cursor-not-allowed"
        />
      </div>
    </div>
  );
};

// ============================================================
// SOCIAL INPUT
// ============================================================

const ModernSocialInput = ({
  icon: Icon,
  label,
  name,
  value,
  onChange,
  placeholder,
}) => {
  return (
    <div>

      <label className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-600">
        <Icon size={13} />
        {label}
      </label>

      <div className="group flex items-center rounded-xl border border-white/[0.08] bg-black/20 transition-all duration-300 focus-within:border-violet-500/30 focus-within:bg-violet-500/[0.02]">

        <div className="ml-4 flex h-7 w-7 items-center justify-center rounded-lg bg-white/[0.03] text-slate-700 transition group-focus-within:text-violet-400">
          <FiExternalLink size={13} />
        </div>

        <input
          type="url"
          name={name}
          value={value || ""}
          onChange={onChange}
          placeholder={placeholder}
          className="w-full bg-transparent px-3 py-3 text-sm text-white outline-none placeholder:text-slate-700"
        />
      </div>
    </div>
  );
};

// ============================================================
// TECHNICAL TAG
// ============================================================

const TechnicalSkillTag = ({
  name,
  level,
  githubDetected,
  onRemove,
}) => {
  return (
    <span
      className={`group inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-[11px] transition-all duration-300 ${
        githubDetected
          ? "border-emerald-500/15 bg-emerald-500/[0.05] text-emerald-300 hover:border-emerald-500/25"
          : "border-violet-500/15 bg-violet-500/[0.05] text-violet-300 hover:border-violet-500/25"
      }`}
    >

      <span
        className={`flex h-5 w-5 items-center justify-center rounded-md ${
          githubDetected
            ? "bg-emerald-500/10"
            : "bg-violet-500/10"
        }`}
      >
        {githubDetected ? (
          <FiGithub size={11} />
        ) : (
          <FiCode size={11} />
        )}
      </span>

      <span className="font-semibold">
        {name}
      </span>

      {level && (
        <span className="text-slate-600">
          · {level}
        </span>
      )}

      {githubDetected ? (
        <span className="ml-1 flex items-center gap-1 text-[8px] font-bold uppercase tracking-wider text-emerald-500">
          <FiShield size={9} />
          Verified
        </span>
      ) : (
        <button
          type="button"
          onClick={onRemove}
          className="ml-1 rounded-md p-0.5 text-slate-700 transition hover:bg-red-500/10 hover:text-red-400"
          title={`Remove ${name}`}
        >
          <FiX size={12} />
        </button>
      )}
    </span>
  );
};

// ============================================================
// SOCIAL TAG
// ============================================================

const SkillTag = ({
  name,
  level,
  onRemove,
}) => {
  return (
    <span className="inline-flex items-center gap-2 rounded-xl border border-violet-500/15 bg-violet-500/[0.05] px-3 py-2 text-[11px] text-violet-300">

      <span className="font-semibold">
        {name}
      </span>

      {level && (
        <span className="text-slate-600">
          · {level}
        </span>
      )}

      <button
        type="button"
        onClick={onRemove}
        className="ml-1 rounded-md p-0.5 text-slate-700 transition hover:bg-red-500/10 hover:text-red-400"
      >
        <FiX size={12} />
      </button>
    </span>
  );
};

// ============================================================
// EMPTY
// ============================================================

const EmptyState = ({ text }) => {
  return (
    <div className="w-full rounded-xl border border-dashed border-white/[0.08] bg-black/10 px-4 py-4 text-center text-[10px] text-slate-700">
      {text}
    </div>
  );
};

// ============================================================
// SIDEBAR STATUS
// ============================================================

const MiniStatus = ({ label, active }) => {
  return (
    <div className="flex items-center justify-between rounded-lg border border-white/[0.04] bg-black/10 px-3 py-2">

      <span className="text-[10px] text-slate-600">
        {label}
      </span>

      <span
        className={`flex h-4 w-4 items-center justify-center rounded-full ${
          active
            ? "bg-emerald-500/10 text-emerald-400"
            : "bg-white/[0.03] text-slate-700"
        }`}
      >
        {active ? (
          <FiCheckCircle size={10} />
        ) : (
          <span className="h-1 w-1 rounded-full bg-current" />
        )}
      </span>
    </div>
  );
};

export { Profile };
export default Profile;
