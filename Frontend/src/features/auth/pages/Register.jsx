import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { FcGoogle } from "react-icons/fc";
import { useTheme } from "../../../context/theme.context";
import {
  FiArrowRight,
  FiCheck,
  FiCpu,
  FiEye,
  FiEyeOff,
  FiLock,
  FiMail,
  FiMoon,
  FiSun,
  FiShield,
  FiUser,
  FiZap,
  FiX,
  FiHome,
} from "react-icons/fi";

const API_URL = "http://localhost:3000/api/auth";

const Register = () => {
  const navigate = useNavigate();

  const { darkMode, toggleTheme } = useTheme();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [emailTouched, setEmailTouched] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // =====================================================
  // EMAIL VALIDATION
  // =====================================================

  const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
  };

  const emailIsValid = form.email.length > 0 && isValidEmail(form.email.trim());

  const emailIsInvalid =
    emailTouched && form.email.length > 0 && !isValidEmail(form.email.trim());

  // =====================================================
  // HANDLE CHANGE
  // =====================================================

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (error) {
      setError("");
    }

    if (success) {
      setSuccess("");
    }

    // Start email validation immediately when typing
    if (name === "email") {
      setEmailTouched(true);
    }
  };

  // =====================================================
  // PASSWORD MATCHING
  // =====================================================

  const passwordsMatch =
    form.password.length > 0 &&
    form.confirmPassword.length > 0 &&
    form.password === form.confirmPassword;

  const passwordsDoNotMatch =
    form.confirmPassword.length > 0 && form.password !== form.confirmPassword;

  // =====================================================
  // PASSWORD STRENGTH
  // =====================================================

  const passwordChecks = {
    length: form.password.length >= 8,
    uppercase: /[A-Z]/.test(form.password),
    lowercase: /[a-z]/.test(form.password),
    number: /[0-9]/.test(form.password),
    special: /[^A-Za-z0-9]/.test(form.password),
  };

  const passwordStrength = Object.values(passwordChecks).filter(Boolean).length;

  const isStrongPassword = passwordStrength >= 4;

  // =====================================================
  // SUBMIT
  // =====================================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    // Username validation
    if (!form.username.trim()) {
      setError("Username is required.");
      return;
    }

    if (form.username.trim().length < 3) {
      setError("Username must contain at least 3 characters.");
      return;
    }

    // Email validation
    if (!form.email.trim()) {
      setEmailTouched(true);
      setError("Email is required.");
      return;
    }

    if (!isValidEmail(form.email.trim())) {
      setEmailTouched(true);
      setError("Please enter a valid email address.");
      return;
    }

    // Password validation
    if (!form.password) {
      setError("Password is required.");
      return;
    }

    // Confirm password validation
    if (!form.confirmPassword) {
      setError("Please confirm your password.");
      return;
    }

    // Password matching
    if (!passwordsMatch) {
      setError("Passwords must match.");
      return;
    }

    // Password strength
    if (!isStrongPassword) {
      setError(
        "Password must contain at least 8 characters, uppercase, lowercase, number and special character.",
      );
      return;
    }

    try {
      setLoading(true);

      const registerData = {
        username: form.username.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
      };

      console.log("Sending registration data:", {
        username: registerData.username,
        email: registerData.email,
      });

      const response = await axios.post(`${API_URL}/register`, registerData, {
        withCredentials: true,
        headers: {
          "Content-Type": "application/json",
        },
      });

      console.log("Registration response:", response.data);

      setSuccess(response.data?.message || "Account created successfully!");

      setForm({
        username: "",
        email: "",
        password: "",
        confirmPassword: "",
      });

      setEmailTouched(false);

      // Go to login using React Router
      setTimeout(() => {
        navigate("/login");
      }, 1500);
    } catch (err) {
      console.error("Registration error:", err);

      if (err.response) {
        setError(
          err.response.data?.message ||
            err.response.data?.error ||
            "Registration failed.",
        );
      } else if (err.request) {
        setError(
          "Cannot connect to server. Make sure your backend is running.",
        );
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // GOOGLE
  // =====================================================

  const handleGoogle = () => {
    console.log("Google registration");
  };

  // =====================================================
  // NAVIGATION
  // =====================================================

  const handleHome = () => {
    navigate("/");
  };

  const handleLogin = () => {
    navigate("/login");
  };

  // =====================================================
  // BUTTON DISABLED
  // =====================================================

  const isButtonDisabled =
    loading ||
    (form.password.length > 0 &&
      form.confirmPassword.length > 0 &&
      (!passwordsMatch || !isStrongPassword));

  // =====================================================
  // UI
  // =====================================================

  return (
    <main
      className={`min-h-screen w-full overflow-hidden transition-colors duration-500 ${
        darkMode ? "bg-[#08070b] text-[#f4f0df]" : "bg-[#eee9dc] text-[#17131f]"
      }`}
    >
      {/* =====================================================
          BACKGROUND
      ===================================================== */}

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          className={`absolute -left-52 -top-52 h-[500px] w-[500px] rounded-full blur-[150px] ${
            darkMode ? "bg-purple-700/15" : "bg-purple-400/15"
          }`}
        />

        <div
          className={`absolute -right-52 top-1/3 h-[500px] w-[500px] rounded-full blur-[150px] ${
            darkMode ? "bg-indigo-700/10" : "bg-indigo-400/10"
          }`}
        />

        <div
          className={`absolute bottom-[-200px] left-1/3 h-[450px] w-[450px] rounded-full blur-[150px] ${
            darkMode ? "bg-fuchsia-700/10" : "bg-fuchsia-400/10"
          }`}
        />

        <div
          className={`absolute inset-0 ${
            darkMode ? "opacity-[0.035]" : "opacity-[0.045]"
          }`}
          style={{
            backgroundImage: `
              linear-gradient(#8b5cf6 1px, transparent 1px),
              linear-gradient(90deg, #8b5cf6 1px, transparent 1px)
            `,
            backgroundSize: "55px 55px",
          }}
        />
      </div>

      {/* =====================================================
          HEADER
      ===================================================== */}

      <header
        className={`relative z-30 mx-auto flex h-16 max-w-[1600px] items-center justify-between border-b px-5 sm:px-8 lg:px-14 xl:px-20 ${
          darkMode ? "border-purple-500/10" : "border-purple-900/10"
        }`}
      >
        {/* LOGO / SITE NAME */}

        <button
          type="button"
          onClick={handleHome}
          className="group flex items-center gap-3"
          aria-label="Go to home page"
        >
          <div className="flex h-9 w-9 items-center justify-center border-2 border-purple-500 bg-purple-600 shadow-[3px_3px_0px_#312e81] transition-transform group-hover:-translate-y-0.5">
            <FiCpu size={17} />
          </div>

          <div className="text-left">
            <p className="font-mono text-xs font-black tracking-[0.18em]">
              AI INTERVIEW
            </p>

            <p
              className={`font-mono text-[8px] tracking-[0.25em] ${
                darkMode ? "text-white/30" : "text-black/40"
              }`}
            >
              CANDIDATE PORTAL
            </p>
          </div>
        </button>

        {/* RIGHT HEADER */}

        <div className="flex items-center gap-2">
          {/* HOME BUTTON */}

          <button
            type="button"
            onClick={handleHome}
            className={`flex h-9 items-center gap-2 border-2 px-3 font-mono text-[8px] font-bold uppercase tracking-wider transition-all ${
              darkMode
                ? "border-[#302c38] bg-[#15131a] text-white/70 hover:border-purple-500 hover:bg-purple-500/10 hover:text-white"
                : "border-black/15 bg-white/70 text-black/60 hover:border-purple-500 hover:text-purple-700"
            }`}
          >
            <FiHome size={13} />
            Home
          </button>

          {/* THEME */}

          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className={`flex h-9 w-9 items-center justify-center border-2 transition-all duration-300 ${
              darkMode
                ? "border-[#302c38] bg-[#15131a] text-yellow-300 hover:border-purple-500 hover:bg-purple-500/10"
                : "border-black/15 bg-white/70 text-purple-700 hover:border-purple-500"
            }`}
          >
            {darkMode ? <FiSun size={16} /> : <FiMoon size={16} />}
          </button>
        </div>
      </header>

      {/* =====================================================
          MAIN
      ===================================================== */}

      <div
        className="
          relative
          z-10
          mx-auto
          grid
          min-h-[calc(100vh-4rem)]
          max-w-[1600px]
          grid-cols-1
          items-center
          gap-6
          px-5
          py-6
          sm:px-8
          lg:grid-cols-[1.1fr_0.9fr]
          lg:gap-8
          lg:px-14
          lg:py-5
          xl:grid-cols-[1.15fr_0.85fr]
          xl:gap-12
          xl:px-20
        "
      >
        {/* =====================================================
            LEFT SIDE
        ===================================================== */}

        <section className="hidden min-h-0 lg:flex">
          <div className="w-full max-w-3xl">
            {/* STATUS */}

            <div className="mb-4">
              <div
                className={`inline-flex items-center gap-2 border px-3 py-1.5 font-mono text-[8px] tracking-[0.2em] ${
                  darkMode
                    ? "border-purple-500/25 bg-purple-500/5 text-purple-300"
                    : "border-purple-500/25 bg-purple-500/10 text-purple-700"
                }`}
              >
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-400" />
                CREATE YOUR PROFILE
              </div>
            </div>

            {/* HEADING */}

            <h1 className="font-mono text-5xl font-black uppercase leading-[0.9] tracking-tight xl:text-6xl">
              Start your
              <br />
              <span className="text-purple-500">journey.</span>
            </h1>

            {/* DESCRIPTION */}

            <p
              className={`mt-4 max-w-xl font-mono text-xs leading-5 xl:text-sm ${
                darkMode ? "text-white/40" : "text-black/55"
              }`}
            >
              Create your candidate profile and unlock intelligent interview
              preparation, personalized practice sessions, progress tracking,
              and career-focused insights.
            </p>

            {/* COMMAND */}

            <div
              className={`mt-5 max-w-xl border-2 px-4 py-3 font-mono ${
                darkMode
                  ? "border-[#292630] bg-[#0d0c11]"
                  : "border-black/10 bg-white/60"
              }`}
            >
              <p
                className={`text-[10px] ${
                  darkMode ? "text-white/30" : "text-black/40"
                }`}
              >
                ~/candidate
              </p>

              <p className="mt-1.5 text-xs">
                <span className="text-purple-400">$</span>{" "}
                <span className="text-purple-400">initialize</span>{" "}
                <span className="text-green-400">--profile</span>
              </p>

              <p className="mt-1.5 text-[10px] text-green-400">
                ✓ Candidate workspace ready
              </p>
            </div>

            {/* FEATURES */}

            <div className="mt-5 grid max-w-2xl grid-cols-3 gap-3">
              <FeatureCard
                icon={<FiZap size={17} />}
                title="AI PRACTICE"
                description="Practice intelligent interview questions."
                iconClass="text-purple-400"
                darkMode={darkMode}
              />

              <FeatureCard
                icon={<FiCheck size={17} />}
                title="TRACK PROGRESS"
                description="Monitor your preparation journey."
                iconClass="text-green-400"
                darkMode={darkMode}
              />

              <FeatureCard
                icon={<FiShield size={17} />}
                title="SECURE"
                description="Keep your candidate profile protected."
                iconClass="text-blue-400"
                darkMode={darkMode}
              />
            </div>
          </div>
        </section>

        {/* =====================================================
            RIGHT SIDE
        ===================================================== */}

        <section className="flex min-h-0 w-full items-center justify-center">
          <div className="w-full max-w-[450px]">
            {/* CARD */}

            <div
              className={`border-2 transition-colors duration-500 ${
                darkMode
                  ? "border-[#2b2735] bg-[#111014] shadow-[6px_6px_0px_#5b21b6]"
                  : "border-black/15 bg-[#f8f5ec] shadow-[6px_6px_0px_#6d28d9]"
              }`}
            >
              {/* CARD HEADER */}

              <div
                className={`flex items-center justify-between border-b-2 px-5 py-2 ${
                  darkMode
                    ? "border-[#2b2735] bg-[#17151c]"
                    : "border-black/10 bg-[#e9e4d8]"
                }`}
              >
                <span className="font-mono text-[8px] tracking-[0.2em] text-purple-400">
                  REGISTER
                </span>

                <span
                  className={`font-mono text-[7px] tracking-widest ${
                    darkMode ? "text-white/25" : "text-black/30"
                  }`}
                >
                  NEW ACCOUNT
                </span>
              </div>

              {/* CARD BODY */}

              <div className="px-5 py-3">
                {/* TITLE */}

                <div className="mb-3">
                  <div className="mb-2 flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center border-2 border-purple-500 bg-purple-600 shadow-[3px_3px_0px_#312e81]">
                      <span className="font-mono text-[10px] font-black">
                        AI
                      </span>
                    </div>

                    <div>
                      <p className="font-mono text-[8px] font-bold uppercase tracking-[0.2em] text-purple-400">
                        Candidate Registration
                      </p>

                      <p
                        className={`font-mono text-[6px] ${
                          darkMode ? "text-white/25" : "text-black/35"
                        }`}
                      >
                        CREATE YOUR ACCOUNT
                      </p>
                    </div>
                  </div>

                  <h2 className="font-mono text-xl font-black uppercase">
                    Create <span className="text-purple-500">profile.</span>
                  </h2>

                  <p
                    className={`mt-0.5 font-mono text-[8px] leading-3 ${
                      darkMode ? "text-white/35" : "text-black/45"
                    }`}
                  >
                    Create your candidate account to start preparing.
                  </p>
                </div>

                {/* GOOGLE */}

                <button
                  type="button"
                  onClick={handleGoogle}
                  className={`flex h-8 w-full items-center justify-center gap-3 border-2 font-mono text-[8px] font-bold uppercase tracking-wide transition ${
                    darkMode
                      ? "border-[#302c38] bg-[#18161d] hover:border-purple-500 hover:bg-purple-500/10"
                      : "border-black/15 bg-white hover:border-purple-500 hover:bg-purple-500/5"
                  }`}
                >
                  <FcGoogle size={14} />
                  Continue with Google
                </button>

                {/* DIVIDER */}

                <div className="my-2 flex items-center gap-3">
                  <div className="h-[1px] flex-1 bg-purple-500/20" />

                  <span className="font-mono text-[6px] text-purple-400/50">
                    OR
                  </span>

                  <div className="h-[1px] flex-1 bg-purple-500/20" />
                </div>

                {/* FORM */}

                <form onSubmit={handleSubmit} className="space-y-2">
                  {/* USERNAME */}

                  <InputField
                    label="Username"
                    name="username"
                    value={form.username}
                    onChange={handleChange}
                    type="text"
                    placeholder="candidate_username"
                    icon={<FiUser size={13} />}
                    darkMode={darkMode}
                    autoComplete="username"
                  />

                  {/* EMAIL */}

                  <div>
                    <InputField
                      label="Email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      onBlur={() => setEmailTouched(true)}
                      type="email"
                      placeholder="candidate@email.com"
                      icon={<FiMail size={13} />}
                      darkMode={darkMode}
                      autoComplete="email"
                      isValid={emailIsValid}
                      isInvalid={emailIsInvalid}
                    />

                    {/* REAL-TIME EMAIL STATUS */}

                    {emailIsValid && (
                      <div className="mt-0.5 flex items-center gap-1 font-mono text-[6px] font-bold text-green-400">
                        <FiCheck size={8} />
                        VALID EMAIL
                      </div>
                    )}

                    {emailIsInvalid && (
                      <div className="mt-0.5 flex items-center gap-1 font-mono text-[6px] font-bold text-red-400">
                        <FiX size={8} />
                        ENTER A VALID EMAIL ADDRESS
                      </div>
                    )}
                  </div>

                  {/* PASSWORD */}

                  <div>
                    <label className="mb-0.5 block font-mono text-[7px] font-bold uppercase tracking-widest opacity-60">
                      Password
                    </label>

                    <div
                      className={`flex h-8 border-2 transition focus-within:border-purple-500 ${
                        darkMode
                          ? "border-[#302c38] bg-[#0b0a0e]"
                          : "border-black/15 bg-white"
                      }`}
                    >
                      <div className="flex w-8 shrink-0 items-center justify-center border-r-2 border-inherit text-purple-400">
                        <FiLock size={13} />
                      </div>

                      <input
                        name="password"
                        value={form.password}
                        onChange={handleChange}
                        type={showPassword ? "text" : "password"}
                        placeholder="Create password"
                        required
                        autoComplete="new-password"
                        className={`min-w-0 flex-1 bg-transparent px-2.5 font-mono text-[9px] outline-none ${
                          darkMode
                            ? "text-white placeholder:text-white/20"
                            : "text-black placeholder:text-black/25"
                        }`}
                      />

                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className={`flex w-8 shrink-0 items-center justify-center border-l-2 border-inherit ${
                          darkMode ? "text-white/30" : "text-black/30"
                        }`}
                      >
                        {showPassword ? (
                          <FiEyeOff size={13} />
                        ) : (
                          <FiEye size={13} />
                        )}
                      </button>
                    </div>

                    {/* PASSWORD STRENGTH */}

                    {form.password.length > 0 && (
                      <div className="mt-1">
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((level) => (
                            <div
                              key={level}
                              className={`h-[3px] flex-1 ${
                                passwordStrength >= level
                                  ? "bg-purple-500"
                                  : darkMode
                                    ? "bg-white/10"
                                    : "bg-black/10"
                              }`}
                            />
                          ))}
                        </div>

                        <div className="mt-1 grid grid-cols-3 gap-x-2">
                          <PasswordRequirement
                            valid={passwordChecks.length}
                            text="8+ CHARS"
                            darkMode={darkMode}
                          />

                          <PasswordRequirement
                            valid={passwordChecks.uppercase}
                            text="UPPERCASE"
                            darkMode={darkMode}
                          />

                          <PasswordRequirement
                            valid={passwordChecks.lowercase}
                            text="LOWERCASE"
                            darkMode={darkMode}
                          />

                          <PasswordRequirement
                            valid={passwordChecks.number}
                            text="NUMBER"
                            darkMode={darkMode}
                          />

                          <PasswordRequirement
                            valid={passwordChecks.special}
                            text="SPECIAL"
                            darkMode={darkMode}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* CONFIRM PASSWORD */}

                  <div>
                    <label className="mb-0.5 block font-mono text-[7px] font-bold uppercase tracking-widest opacity-60">
                      Confirm Password
                    </label>

                    <div
                      className={`flex h-8 border-2 transition ${
                        passwordsDoNotMatch
                          ? "border-red-500"
                          : passwordsMatch
                            ? "border-green-500"
                            : darkMode
                              ? "border-[#302c38]"
                              : "border-black/15"
                      } ${darkMode ? "bg-[#0b0a0e]" : "bg-white"}`}
                    >
                      <div
                        className={`flex w-8 shrink-0 items-center justify-center border-r-2 border-inherit ${
                          passwordsDoNotMatch
                            ? "text-red-400"
                            : passwordsMatch
                              ? "text-green-400"
                              : "text-purple-400"
                        }`}
                      >
                        <FiLock size={13} />
                      </div>

                      <input
                        name="confirmPassword"
                        value={form.confirmPassword}
                        onChange={handleChange}
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Confirm password"
                        required
                        autoComplete="new-password"
                        className={`min-w-0 flex-1 bg-transparent px-2.5 font-mono text-[9px] outline-none ${
                          darkMode
                            ? "text-white placeholder:text-white/20"
                            : "text-black placeholder:text-black/25"
                        }`}
                      />

                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((prev) => !prev)}
                        className={`flex w-8 shrink-0 items-center justify-center border-l-2 border-inherit ${
                          darkMode ? "text-white/30" : "text-black/30"
                        }`}
                      >
                        {showConfirmPassword ? (
                          <FiEyeOff size={13} />
                        ) : (
                          <FiEye size={13} />
                        )}
                      </button>
                    </div>

                    {/* REAL-TIME PASSWORD MATCH */}

                    {passwordsMatch && (
                      <div className="mt-0.5 flex items-center gap-1 font-mono text-[6px] font-bold text-green-400">
                        <FiCheck size={8} />
                        PASSWORDS MATCH
                      </div>
                    )}

                    {passwordsDoNotMatch && (
                      <div className="mt-0.5 flex items-center gap-1 font-mono text-[6px] font-bold text-red-400">
                        <FiX size={8} />
                        PASSWORDS DO NOT MATCH
                      </div>
                    )}
                  </div>

                  {/* TERMS */}

                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      required
                      className="h-3 w-3 accent-purple-600"
                    />

                    <span
                      className={`font-mono text-[6px] uppercase ${
                        darkMode ? "text-white/30" : "text-black/45"
                      }`}
                    >
                      I agree to the terms and privacy policy
                    </span>
                  </label>

                  {/* ERROR */}

                  {error && (
                    <div className="border border-red-500/30 bg-red-500/5 px-2 py-1.5">
                      <p className="font-mono text-[6px] font-bold uppercase text-red-400">
                        {error}
                      </p>
                    </div>
                  )}

                  {/* SUCCESS */}

                  {success && (
                    <div className="border border-green-500/30 bg-green-500/5 px-2 py-1.5">
                      <p className="font-mono text-[6px] font-bold uppercase text-green-400">
                        ✓ {success}
                      </p>
                    </div>
                  )}

                  {/* SUBMIT */}

                  <button
                    type="submit"
                    disabled={isButtonDisabled}
                    className={`group flex h-9 w-full items-center justify-center gap-3 border-2 border-purple-400 bg-purple-600 font-mono text-[8px] font-black uppercase tracking-widest text-white shadow-[3px_3px_0px_#312e81] transition-all ${
                      isButtonDisabled
                        ? "cursor-not-allowed opacity-50"
                        : "hover:bg-purple-500 hover:shadow-[1px_1px_0px_#312e81]"
                    }`}
                  >
                    {loading ? (
                      <>
                        <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        Creating Account...
                      </>
                    ) : (
                      <>
                        Create Account
                        <FiArrowRight
                          size={13}
                          className="transition-transform group-hover:translate-x-1"
                        />
                      </>
                    )}
                  </button>
                </form>

                {/* LOGIN */}

                <div
                  className={`mt-2 border-t-2 pt-2 text-center ${
                    darkMode ? "border-[#25222c]" : "border-black/10"
                  }`}
                >
                  <p
                    className={`font-mono text-[7px] uppercase ${
                      darkMode ? "text-white/50" : "text-black/55"
                    }`}
                  >
                    Already have an account?
                  </p>

                  <button
                    type="button"
                    onClick={handleLogin}
                    className="group mt-0.5 inline-flex items-center gap-2 font-mono text-[9px] font-black uppercase tracking-wider text-purple-500 hover:text-purple-400"
                  >
                    Sign In
                    <FiArrowRight
                      size={11}
                      className="transition-transform group-hover:translate-x-1"
                    />
                  </button>
                </div>

                {/* FOOTER */}

                <div
                  className={`mt-2 border-t pt-1.5 text-center font-mono text-[5px] uppercase tracking-widest ${
                    darkMode
                      ? "border-[#25222c] text-white/20"
                      : "border-black/10 text-black/30"
                  }`}
                >
                  SECURE CANDIDATE REGISTRATION
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
};

// =====================================================
// INPUT FIELD
// =====================================================

const InputField = ({
  label,
  name,
  value,
  onChange,
  onBlur,
  type,
  placeholder,
  icon,
  darkMode,
  autoComplete,
  isValid = false,
  isInvalid = false,
}) => {
  return (
    <div>
      <label className="mb-0.5 block font-mono text-[7px] font-bold uppercase tracking-widest opacity-60">
        {label}
      </label>

      <div
        className={`flex h-8 border-2 transition focus-within:border-purple-500 ${
          isInvalid
            ? "border-red-500"
            : isValid
              ? "border-green-500"
              : darkMode
                ? "border-[#302c38] bg-[#0b0a0e]"
                : "border-black/15 bg-white"
        }`}
      >
        <div
          className={`flex w-8 shrink-0 items-center justify-center border-r-2 border-inherit ${
            isInvalid
              ? "text-red-400"
              : isValid
                ? "text-green-400"
                : "text-purple-400"
          }`}
        >
          {icon}
        </div>

        <input
          name={name}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          type={type}
          placeholder={placeholder}
          required
          autoComplete={autoComplete}
          className={`min-w-0 flex-1 bg-transparent px-2.5 font-mono text-[9px] outline-none ${
            darkMode
              ? "text-white placeholder:text-white/20"
              : "text-black placeholder:text-black/25"
          }`}
        />

        {isValid && (
          <div className="flex w-7 shrink-0 items-center justify-center text-green-400">
            <FiCheck size={12} />
          </div>
        )}

        {isInvalid && (
          <div className="flex w-7 shrink-0 items-center justify-center text-red-400">
            <FiX size={12} />
          </div>
        )}
      </div>
    </div>
  );
};

// =====================================================
// PASSWORD REQUIREMENT
// =====================================================

const PasswordRequirement = ({ valid, text, darkMode }) => {
  return (
    <div
      className={`flex items-center gap-1 font-mono text-[5px] ${
        valid ? "text-green-400" : darkMode ? "text-white/25" : "text-black/35"
      }`}
    >
      {valid ? <FiCheck size={7} /> : <FiX size={7} />}

      {text}
    </div>
  );
};

// =====================================================
// FEATURE CARD
// =====================================================

const FeatureCard = ({ icon, title, description, iconClass, darkMode }) => {
  return (
    <div
      className={`border-2 p-3 transition-all duration-300 hover:-translate-y-1 ${
        darkMode
          ? "border-[#292630] bg-[#111014]"
          : "border-black/10 bg-white/50"
      }`}
    >
      <div className={`mb-2 ${iconClass}`}>{icon}</div>

      <p className="font-mono text-[9px] font-bold">{title}</p>

      <p
        className={`mt-1 font-mono text-[7px] leading-3 ${
          darkMode ? "text-white/30" : "text-black/40"
        }`}
      >
        {description}
      </p>
    </div>
  );
};

export default Register;
