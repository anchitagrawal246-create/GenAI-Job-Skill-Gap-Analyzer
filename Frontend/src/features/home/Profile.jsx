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
    github: "",
    linkedin: "",
    leetcode: "",
    technicalSkills: [],
    socialSkills: [],
  });

  const [profileImage, setProfileImage] = useState(null);
  const [resumeFile, setResumeFile] = useState(null);

  // Can contain:
  // 1. temporary blob URL
  // 2. permanent ImageKit URL
  const [preview, setPreview] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  // Skill input states
  const [technicalSkillInput, setTechnicalSkillInput] = useState("");
  const [socialSkillInput, setSocialSkillInput] = useState("");

  // ============================================================
  // LOAD PROFILE
  // ============================================================

  useEffect(() => {
    loadProfile();

    return () => {
      // Cleanup temporary blob URL
      setPreview((currentPreview) => {
        if (currentPreview?.startsWith("blob:")) {
          URL.revokeObjectURL(currentPreview);
        }

        return currentPreview;
      });
    };
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      setMessage("");

      const response = await getMyProfile();

      console.log("PROFILE API RESPONSE:", response);

      const data =
        response?.profile ||
        response?.data?.profile ||
        response?.data ||
        response;

      console.log("PROFILE DATA:", data);
      console.log("SAVED IMAGEKIT URL:", data?.profilePicture);
      console.log("SAVED RESUME:", data?.resume);

      setProfile(data);

      // ========================================================
      // FORM DATA
      // ========================================================

      setForm({
        name: data?.name || "",
        github: data?.github || "",
        linkedin: data?.linkedin || "",
        leetcode: data?.leetcode || "",

        technicalSkills: Array.isArray(data?.technicalSkills)
          ? data.technicalSkills
          : [],

        socialSkills: Array.isArray(data?.socialSkills)
          ? data.socialSkills
          : [],
      });

      // ========================================================
      // PROFILE PICTURE
      // ========================================================

      if (data?.profilePicture) {
        setPreview(data.profilePicture);
      } else {
        setPreview("");
      }
    } catch (error) {
      console.error("Profile loading failed:", error);

      setMessage(
        error?.response?.data?.message || "Unable to load your profile.",
      );
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // PROFILE IMAGE
  // ============================================================

  const handleImageChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    // Validate image
    if (!file.type.startsWith("image/")) {
      setMessage("Please select a valid image file.");
      event.target.value = "";
      return;
    }

    // 5 MB limit
    if (file.size > 5 * 1024 * 1024) {
      setMessage("Profile picture must be smaller than 5MB.");
      event.target.value = "";
      return;
    }

    // Remove previous temporary preview
    if (preview?.startsWith("blob:")) {
      URL.revokeObjectURL(preview);
    }

    // Save file for upload
    setProfileImage(file);

    // Create temporary preview
    const imageUrl = URL.createObjectURL(file);
    setPreview(imageUrl);

    setMessage("");

    // Allow selecting same file again
    event.target.value = "";
  };

  // ============================================================
  // RESUME
  // ============================================================

  const handleResumeChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    // PDF only
    if (file.type !== "application/pdf") {
      setMessage("Please select a PDF resume.");
      event.target.value = "";
      return;
    }

    // 10 MB limit
    if (file.size > 10 * 1024 * 1024) {
      setMessage("Resume must be smaller than 10MB.");
      event.target.value = "";
      return;
    }

    // Store new resume temporarily
    setResumeFile(file);

    setMessage("");

    // Allow selecting same file again
    event.target.value = "";
  };

  // ============================================================
  // FORM CHANGE
  // ============================================================

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // ============================================================
  // ADD TECHNICAL SKILL
  // ============================================================

  const addTechnicalSkill = () => {
    const skillName = technicalSkillInput.trim();

    if (!skillName) {
      return;
    }

    const exists = form.technicalSkills.some((skill) => {
      const name = typeof skill === "string" ? skill : skill?.name;

      return name?.trim().toLowerCase() === skillName.toLowerCase();
    });

    if (exists) {
      setMessage("This technical skill is already added.");
      return;
    }

    setForm((previous) => ({
      ...previous,

      technicalSkills: [
        ...previous.technicalSkills,
        {
          name: skillName,
        },
      ],
    }));

    setTechnicalSkillInput("");
    setMessage("");
  };

  // ============================================================
  // ADD SOCIAL SKILL
  // ============================================================

  const addSocialSkill = () => {
    const skillName = socialSkillInput.trim();

    if (!skillName) {
      return;
    }

    const exists = form.socialSkills.some((skill) => {
      const name = typeof skill === "string" ? skill : skill?.name;

      return name?.trim().toLowerCase() === skillName.toLowerCase();
    });

    if (exists) {
      setMessage("This social skill is already added.");
      return;
    }

    setForm((previous) => ({
      ...previous,

      socialSkills: [
        ...previous.socialSkills,
        {
          name: skillName,
        },
      ],
    }));

    setSocialSkillInput("");
    setMessage("");
  };

  // ============================================================
  // REMOVE TECHNICAL SKILL
  // ============================================================

  const removeTechnicalSkill = (indexToRemove) => {
    setForm((previous) => ({
      ...previous,

      technicalSkills: previous.technicalSkills.filter(
        (_, index) => index !== indexToRemove,
      ),
    }));
  };

  // ============================================================
  // REMOVE SOCIAL SKILL
  // ============================================================

  const removeSocialSkill = (indexToRemove) => {
    setForm((previous) => ({
      ...previous,

      socialSkills: previous.socialSkills.filter(
        (_, index) => index !== indexToRemove,
      ),
    }));
  };

  // ============================================================
  // ENTER KEY FOR TECHNICAL SKILL
  // ============================================================

  const handleTechnicalSkillKeyDown = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addTechnicalSkill();
    }
  };

  // ============================================================
  // ENTER KEY FOR SOCIAL SKILL
  // ============================================================

  const handleSocialSkillKeyDown = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addSocialSkill();
    }
  };

  // ============================================================
  // SAVE PROFILE
  // ============================================================

  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage("");

      const formData = new FormData();

      // ========================================================
      // BASIC INFORMATION
      // ========================================================

      formData.append("name", form.name || "");

      // ========================================================
      // SOCIAL LINKS
      // ========================================================

      formData.append("github", form.github || "");

      formData.append("linkedin", form.linkedin || "");

      formData.append("leetcode", form.leetcode || "");

      // ========================================================
      // TECHNICAL SKILLS
      // ========================================================

      const technicalSkills = Array.isArray(form.technicalSkills)
        ? form.technicalSkills
            .map((skill) => ({
              name:
                typeof skill === "string" ? skill.trim() : skill?.name?.trim(),
            }))
            .filter((skill) => skill.name)
        : [];

      formData.append("technicalSkills", JSON.stringify(technicalSkills));

      // ========================================================
      // SOCIAL SKILLS
      // ========================================================

      const socialSkills = Array.isArray(form.socialSkills)
        ? form.socialSkills
            .map((skill) => ({
              name:
                typeof skill === "string" ? skill.trim() : skill?.name?.trim(),
            }))
            .filter((skill) => skill.name)
        : [];

      formData.append("socialSkills", JSON.stringify(socialSkills));

      // ========================================================
      // PROFILE PICTURE
      // ========================================================

      // IMPORTANT:
      // Only append if user selected a NEW image.
      //
      // If no new image is selected, backend keeps old image.

      if (profileImage) {
        formData.append("profilePicture", profileImage);
      }

      // ========================================================
      // RESUME
      // ========================================================

      // IMPORTANT:
      // Only append if user selected a NEW resume.
      //
      // If no new resume is selected, backend keeps old resume.

      if (resumeFile) {
        formData.append("resume", resumeFile);
      }

      // ========================================================
      // DEBUG
      // ========================================================

      console.log("PROFILE FORM DATA:");

      for (const [key, value] of formData.entries()) {
        console.log(
          key,
          value instanceof File
            ? {
                name: value.name,
                type: value.type,
                size: value.size,
              }
            : value,
        );
      }

      // ========================================================
      // API CALL
      // ========================================================

      const response = await updateProfile(formData);

      console.log("PROFILE UPDATED:", response);

      setMessage("Profile updated successfully.");

      // Clear newly selected files
      setProfileImage(null);
      setResumeFile(null);

      // Reload saved data from backend
      await loadProfile();
    } catch (error) {
      console.error("Profile update failed:", error);

      console.error("Backend response:", error?.response?.data);

      setMessage(error?.response?.data?.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  // ============================================================
  // PROFILE DATA
  // ============================================================

  const username = profile?.username || "username";

  const email = profile?.email || "";

  const displayName =
    form.name || profile?.name || profile?.fullName || username || "Developer";

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="min-h-screen bg-[#05050a] text-white">
      {/* ======================================================
          BACKGROUND
      ====================================================== */}

      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        <div className="absolute left-[20%] top-[-200px] h-[500px] w-[500px] rounded-full bg-violet-600/20 blur-[130px]" />

        <div className="absolute right-[-100px] top-[30%] h-[400px] w-[400px] rounded-full bg-fuchsia-600/10 blur-[120px]" />
      </div>

      {/* ======================================================
          HEADER
      ====================================================== */}

      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#05050a]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-5 sm:px-8">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-slate-400 transition hover:bg-white/[0.05] hover:text-white"
            >
              <FiArrowLeft size={18} />
            </button>

            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-violet-400">
                Career OS
              </p>

              <h1 className="mt-1 text-lg font-bold">Profile</h1>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loading}
            className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FiSave size={15} />

            {saving ? "Saving..." : "Save changes"}
          </button>
        </div>
      </header>

      {/* ======================================================
          CONTENT
      ====================================================== */}

      <main className="mx-auto max-w-6xl p-5 sm:p-8">
        {loading ? (
          <div className="flex min-h-[500px] items-center justify-center">
            <div className="text-sm text-slate-500">Loading profile...</div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* ==================================================
                PROFILE HERO
            ================================================== */}

            <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.025] p-6 sm:p-8">
              <div className="absolute right-[-100px] top-[-100px] h-72 w-72 rounded-full bg-violet-600/10 blur-[100px]" />

              <div className="relative flex flex-col gap-7 sm:flex-row sm:items-center">
                {/* PROFILE IMAGE */}

                <div className="relative mx-auto sm:mx-0">
                  {preview ? (
                    <img
                      src={preview}
                      alt={displayName}
                      className="h-32 w-32 rounded-3xl border border-violet-400/30 object-cover shadow-2xl shadow-violet-900/20"
                      onError={(event) => {
                        console.error("Profile image failed to load:", preview);

                        event.currentTarget.style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="flex h-32 w-32 items-center justify-center rounded-3xl border border-violet-400/20 bg-gradient-to-br from-violet-600/30 to-fuchsia-600/20 text-4xl font-black text-violet-200">
                      {displayName?.charAt(0)?.toUpperCase() || "U"}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute -bottom-2 -right-2 flex h-10 w-10 items-center justify-center rounded-xl border border-violet-400/30 bg-[#101018] text-violet-300 shadow-lg transition hover:bg-violet-500/20"
                  >
                    <FiCamera size={17} />
                  </button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageChange}
                  />
                </div>

                {/* BASIC INFORMATION */}

                <div className="text-center sm:text-left">
                  <p className="text-xs uppercase tracking-[0.2em] text-violet-400">
                    Developer Profile
                  </p>

                  <h2 className="mt-2 text-3xl font-black">{displayName}</h2>

                  <p className="mt-1 text-sm text-slate-500">@{username}</p>

                  <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
                    <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-slate-400">
                      <FiUser className="mr-1 inline" />
                      Developer
                    </span>

                    <span className="rounded-full border border-emerald-500/20 bg-emerald-500/5 px-3 py-1 text-xs text-emerald-400">
                      Profile active
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* ==================================================
                ACCOUNT INFORMATION
            ================================================== */}

            <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-6">
              <SectionTitle
                icon={FiUser}
                title="Account information"
                description="Your identity information from authentication."
              />

              <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
                <Input label="Username" value={username} disabled />

                <Input label="Email" value={email} disabled />
              </div>

              <p className="mt-4 text-xs text-slate-600">
                Username and email cannot be changed from the profile page.
              </p>
            </section>

            {/* ==================================================
                PERSONAL INFORMATION
            ================================================== */}

            <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-6">
              <SectionTitle
                icon={FiUser}
                title="Personal information"
                description="Tell the AI interviewer more about you."
              />

              <div className="mt-6 space-y-5">
                <Input
                  label="Full name"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Enter your full name"
                />
              </div>
            </section>

            {/* ==================================================
                DEVELOPER PRESENCE
            ================================================== */}

            <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-6">
              <SectionTitle
                icon={FiExternalLink}
                title="Developer presence"
                description="Connect your public developer profiles."
              />

              <div className="mt-6 space-y-5">
                <SocialInput
                  icon={FiGithub}
                  label="GitHub"
                  name="github"
                  value={form.github}
                  onChange={handleChange}
                  placeholder="https://github.com/username"
                />

                <SocialInput
                  icon={FiLinkedin}
                  label="LinkedIn"
                  name="linkedin"
                  value={form.linkedin}
                  onChange={handleChange}
                  placeholder="https://linkedin.com/in/username"
                />

                <SocialInput
                  icon={FiCode}
                  label="LeetCode"
                  name="leetcode"
                  value={form.leetcode}
                  onChange={handleChange}
                  placeholder="https://leetcode.com/username"
                />
              </div>
            </section>

            {/* ==================================================
                SKILLS
            ================================================== */}

            <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-6">
              <SectionTitle
                icon={FiCode}
                title="Skills"
                description="Add skills you want the AI interviewer to assess."
              />

              <div className="mt-6 space-y-8">
                {/* ==================================================
                    TECHNICAL SKILLS
                ================================================== */}

                <div>
                  <p className="mb-3 text-xs font-medium text-slate-400">
                    Technical skills
                  </p>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={technicalSkillInput}
                      onChange={(event) =>
                        setTechnicalSkillInput(event.target.value)
                      }
                      onKeyDown={handleTechnicalSkillKeyDown}
                      placeholder="e.g. React, Node.js, MongoDB"
                      className="flex-1 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-700 focus:border-violet-500/50"
                    />

                    <button
                      type="button"
                      onClick={addTechnicalSkill}
                      className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold transition hover:bg-violet-500"
                    >
                      <FiPlus size={16} />
                      Add
                    </button>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {form.technicalSkills.length > 0 ? (
                      form.technicalSkills.map((skill, index) => {
                        const name =
                          typeof skill === "string" ? skill : skill?.name;

                        if (!name) {
                          return null;
                        }

                        return (
                          <SkillTag
                            key={`${name}-${index}`}
                            name={name}
                            level={skill?.level}
                            onRemove={() => removeTechnicalSkill(index)}
                          />
                        );
                      })
                    ) : (
                      <p className="text-xs text-slate-600">
                        No technical skills added yet.
                      </p>
                    )}
                  </div>
                </div>

                {/* ==================================================
                    SOCIAL SKILLS
                ================================================== */}

                <div>
                  <p className="mb-3 text-xs font-medium text-slate-400">
                    Social skills
                  </p>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={socialSkillInput}
                      onChange={(event) =>
                        setSocialSkillInput(event.target.value)
                      }
                      onKeyDown={handleSocialSkillKeyDown}
                      placeholder="e.g. Communication, Leadership"
                      className="flex-1 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-700 focus:border-violet-500/50"
                    />

                    <button
                      type="button"
                      onClick={addSocialSkill}
                      className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold transition hover:bg-violet-500"
                    >
                      <FiPlus size={16} />
                      Add
                    </button>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {form.socialSkills.length > 0 ? (
                      form.socialSkills.map((skill, index) => {
                        const name =
                          typeof skill === "string" ? skill : skill?.name;

                        if (!name) {
                          return null;
                        }

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
                      <p className="text-xs text-slate-600">
                        No social skills added yet.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* ==================================================
                RESUME
            ================================================== */}

            <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-6">
              <SectionTitle
                icon={FiFileText}
                title="Resume"
                description="Your resume will help the AI personalize interviews."
              />

              <div className="mt-6 rounded-xl border border-dashed border-white/10 bg-black/20 p-8 text-center">
                <FiFileText className="mx-auto text-slate-600" size={30} />

                <p className="mt-3 text-sm font-medium">
                  {resumeFile
                    ? resumeFile.name
                    : profile?.resume
                      ? "Resume uploaded"
                      : "Resume upload"}
                </p>

                <p className="mt-1 text-xs text-slate-600">
                  PDF files are recommended. Maximum size: 10MB.
                </p>

                <button
                  type="button"
                  onClick={() => resumeInputRef.current?.click()}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-xs text-slate-400 transition hover:bg-white/5 hover:text-white"
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

                {/* New resume selected */}
                {resumeFile && (
                  <p className="mt-3 text-xs text-emerald-400">
                    New resume selected. Click "Save profile" to upload it.
                  </p>
                )}

                {/* Existing saved resume */}
                {profile?.resume && (
                  <a
                    href={profile.resume}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 block text-xs text-violet-400 hover:text-violet-300"
                  >
                    View current resume
                  </a>
                )}
              </div>
            </section>

            {/* ==================================================
                MESSAGE
            ================================================== */}

            {message && (
              <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 px-4 py-3 text-sm text-violet-300">
                {message}
              </div>
            )}

            {/* ==================================================
                SAVE
            ================================================== */}

            <div className="flex justify-end pb-10">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 rounded-xl bg-violet-600 px-6 py-3 text-sm font-bold transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FiSave size={16} />

                {saving ? "Saving..." : "Save profile"}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

// ============================================================
// SECTION TITLE
// ============================================================

const SectionTitle = ({ icon: Icon, title, description }) => {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-violet-500/20 bg-violet-500/10 text-violet-400">
        <Icon size={18} />
      </div>

      <div>
        <h2 className="text-sm font-bold">{title}</h2>

        <p className="mt-1 text-xs text-slate-600">{description}</p>
      </div>
    </div>
  );
};

// ============================================================
// INPUT
// ============================================================

const Input = ({
  label,
  name,
  value,
  onChange,
  placeholder,
  disabled = false,
}) => {
  return (
    <div>
      <label className="mb-2 block text-xs font-medium text-slate-400">
        {label}
      </label>

      <div
        className={`flex items-center rounded-xl border border-white/10 bg-black/20 ${
          disabled ? "opacity-60" : ""
        }`}
      >
        {label === "Email" && (
          <FiMail className="ml-4 shrink-0 text-slate-600" size={15} />
        )}

        <input
          type="text"
          name={name}
          value={value || ""}
          onChange={onChange}
          disabled={disabled}
          placeholder={placeholder}
          className="w-full bg-transparent px-4 py-3 text-sm text-white outline-none placeholder:text-slate-700 disabled:cursor-not-allowed"
        />
      </div>
    </div>
  );
};

// ============================================================
// SOCIAL INPUT
// ============================================================

const SocialInput = ({
  icon: Icon,
  label,
  name,
  value,
  onChange,
  placeholder,
}) => {
  return (
    <div>
      <label className="mb-2 flex items-center gap-2 text-xs font-medium text-slate-400">
        <Icon size={14} />

        {label}
      </label>

      <input
        type="url"
        name={name}
        value={value || ""}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-700 focus:border-violet-500/50"
      />
    </div>
  );
};

// ============================================================
// SKILL TAG
// ============================================================

const SkillTag = ({ name, level, onRemove }) => {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/5 px-3 py-1.5 text-xs text-violet-300">
      <span>{name}</span>

      {/* Show existing level if backend already has one */}
      {level && <span className="text-slate-500">• {level}</span>}

      <button
        type="button"
        onClick={onRemove}
        className="ml-1 rounded-full text-slate-500 transition hover:text-red-400"
        title={`Remove ${name}`}
      >
        <FiX size={13} />
      </button>
    </span>
  );
};

// ============================================================
// EXPORTS
// ============================================================

export { Profile };

export default Profile;
