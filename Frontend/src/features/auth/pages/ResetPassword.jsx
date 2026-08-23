import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  FiArrowLeft,
  FiArrowRight,
  FiCheck,
  FiCpu,
  FiEye,
  FiEyeOff,
  FiHome,
  FiLock,
  FiMoon,
  FiShield,
  FiSun,
  FiAlertCircle,
  FiX,
} from "react-icons/fi";

import { useTheme } from "../../../context/theme.context";
import { resetPassword } from "../../../api/auth.api";

const ResetPassword = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { darkMode, toggleTheme } = useTheme();

  // =====================================================
  // DATA RECEIVED FROM OTP VERIFICATION
  // =====================================================

  const username = location.state?.username || "";
  const email = location.state?.email || "";
  const resetToken = location.state?.resetToken || "";

  // =====================================================
  // STATE
  // =====================================================

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // =====================================================
  // PASSWORD VALIDATION
  // SAME RULES AS REGISTER
  // =====================================================

  const passwordChecks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };

  const passwordStrength = Object.values(passwordChecks).filter(Boolean).length;

  const isStrongPassword = passwordStrength === 5;

  // =====================================================
  // PASSWORD MATCHING
  // =====================================================

  const passwordsMatch =
    password.length > 0 &&
    confirmPassword.length > 0 &&
    password === confirmPassword;

  const passwordsDoNotMatch =
    confirmPassword.length > 0 && password !== confirmPassword;

  // =====================================================
  // PASSWORD CHANGE
  // =====================================================

  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
    setError("");
    setSuccess("");
  };

  // =====================================================
  // CONFIRM PASSWORD CHANGE
  // =====================================================

  const handleConfirmPasswordChange = (e) => {
    setConfirmPassword(e.target.value);
    setError("");
    setSuccess("");
  };

  // =====================================================
  // SUBMIT
  // =====================================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    // ===================================================
    // PASSWORD REQUIRED
    // ===================================================

    if (!password) {
      setError("Password is required.");
      return;
    }

    // ===================================================
    // PASSWORD STRENGTH
    // ===================================================

    if (!isStrongPassword) {
      setError(
        "Password must contain at least 8 characters, uppercase, lowercase, number and special character.",
      );
      return;
    }

    // ===================================================
    // CONFIRM PASSWORD
    // ===================================================

    if (!confirmPassword) {
      setError("Please confirm your password.");
      return;
    }

    if (!passwordsMatch) {
      setError("Passwords do not match.");
      return;
    }

    // ===================================================
    // RESET TOKEN
    // ===================================================

    if (!resetToken) {
      setError(
        "Password reset session is missing or expired. Please request a new OTP.",
      );
      return;
    }

    try {
      setLoading(true);

      console.log("RESET PASSWORD REQUEST:", {
        resetToken,
        newPassword: password,
        confirmPassword,
      });

      const response = await resetPassword({
        resetToken,
        newPassword: password,
        confirmPassword,
      });

      console.log("Reset password response:", response);

      setSuccess(response?.message || "Password reset successfully.");

      // Clear password fields
      setPassword("");
      setConfirmPassword("");

      // Redirect to login
      setTimeout(() => {
        navigate("/login", {
          replace: true,
        });
      }, 1500);
    } catch (err) {
      console.error("Reset password error:", err);

      const backendMessage =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message;

      setError(backendMessage || "Unable to reset password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // HOME
  // =====================================================

  const handleHome = () => {
    navigate("/");
  };

  // =====================================================
  // STRENGTH BAR CLASS
  // =====================================================

  const getStrengthLabel = () => {
    if (password.length === 0) {
      return "";
    }

    if (passwordStrength <= 2) {
      return "WEAK";
    }

    if (passwordStrength === 3) {
      return "FAIR";
    }

    if (passwordStrength === 4) {
      return "GOOD";
    }

    return "STRONG";
  };

  // =====================================================
  // UI
  // =====================================================

  return (
    <main
      className={`min-h-screen w-full transition-colors duration-500 ${
        darkMode ? "bg-[#08070b] text-[#f4f0df]" : "bg-[#eee9dc] text-[#17131f]"
      }`}
    >
      {/* =====================================================
          BACKGROUND
      ===================================================== */}

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        {/* Purple */}
        <div
          className={`absolute -left-52 -top-52 h-[500px] w-[500px] rounded-full blur-[150px] ${
            darkMode ? "bg-purple-700/15" : "bg-purple-400/15"
          }`}
        />

        {/* Indigo */}
        <div
          className={`absolute -right-52 top-1/3 h-[500px] w-[500px] rounded-full blur-[150px] ${
            darkMode ? "bg-indigo-700/10" : "bg-indigo-400/10"
          }`}
        />

        {/* Fuchsia */}
        <div
          className={`absolute bottom-[-200px] left-1/3 h-[450px] w-[450px] rounded-full blur-[150px] ${
            darkMode ? "bg-fuchsia-700/10" : "bg-fuchsia-400/10"
          }`}
        />

        {/* Grid */}
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
        {/* LOGO */}

        <button
          type="button"
          onClick={handleHome}
          className="group flex items-center gap-3 text-left"
          aria-label="Go to home"
        >
          <div
            className="
              flex h-9 w-9
              items-center justify-center
              border-2 border-purple-500
              bg-purple-600
              shadow-[3px_3px_0px_#312e81]
              transition-all duration-300
              group-hover:-translate-y-0.5
              group-hover:bg-purple-500
            "
          >
            <FiCpu size={17} />
          </div>

          <div>
            <p
              className="
                font-mono text-xs font-black
                tracking-[0.18em]
                group-hover:text-purple-400
              "
            >
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

        {/* ACTIONS */}

        <div className="flex items-center gap-2">
          {/* HOME */}

          <button
            type="button"
            onClick={handleHome}
            title="Home"
            className={`flex h-9 items-center gap-2 border px-3 font-mono text-[8px] font-bold uppercase tracking-wider transition ${
              darkMode
                ? "border-[#302c38] bg-[#15131a] text-white/60 hover:border-purple-500 hover:text-purple-300"
                : "border-black/15 bg-white/70 text-black/60 hover:border-purple-500 hover:text-purple-700"
            }`}
          >
            <FiHome size={14} />
            <span className="hidden sm:inline">Home</span>
          </button>

          {/* THEME */}

          <button
            type="button"
            onClick={toggleTheme}
            title="Toggle theme"
            aria-label="Toggle theme"
            className={`flex h-9 w-9 items-center justify-center border ${
              darkMode
                ? "border-[#302c38] bg-[#15131a] text-yellow-300 hover:border-purple-500"
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

      <div className="relative z-10 flex min-h-[calc(100vh-4rem)] items-center justify-center px-6 py-8">
        <div className="w-full max-w-[450px]">
          {/* CARD */}

          <div
            className={`border-2 ${
              darkMode
                ? "border-[#2b2735] bg-[#111014] shadow-[6px_6px_0px_#5b21b6]"
                : "border-black/15 bg-[#f8f5ec] shadow-[6px_6px_0px_#6d28d9]"
            }`}
          >
            {/* =================================================
                CARD HEADER
            ================================================= */}

            <div
              className={`flex items-center justify-between border-b-2 px-5 py-2.5 ${
                darkMode
                  ? "border-[#2b2735] bg-[#17151c]"
                  : "border-black/10 bg-[#e9e4d8]"
              }`}
            >
              <span className="font-mono text-[8px] tracking-[0.2em] text-purple-400">
                PASSWORD RESET
              </span>

              <span
                className={`font-mono text-[7px] tracking-widest ${
                  darkMode ? "text-white/25" : "text-black/30"
                }`}
              >
                ACCOUNT SECURITY
              </span>
            </div>

            {/* =================================================
                BODY
            ================================================= */}

            <div className="p-5 sm:p-6">
              {/* BACK */}

              <button
                type="button"
                onClick={() => navigate("/login")}
                className="mb-5 flex items-center gap-2 font-mono text-[9px] font-bold uppercase tracking-wider text-purple-500 hover:text-purple-400"
              >
                <FiArrowLeft size={13} />
                Back to login
              </button>

              {/* =================================================
                  HEADING
              ================================================= */}

              <div className="mb-5">
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center border-2 border-purple-500 bg-purple-600 shadow-[3px_3px_0px_#312e81]">
                    <FiShield size={16} />
                  </div>

                  <div>
                    <p className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-purple-400">
                      New Password
                    </p>

                    <p
                      className={`font-mono text-[7px] ${
                        darkMode ? "text-white/25" : "text-black/35"
                      }`}
                    >
                      SECURE YOUR ACCOUNT
                    </p>
                  </div>
                </div>

                <h1 className="font-mono text-xl font-black uppercase">
                  Reset <span className="text-purple-500">password</span>
                </h1>

                <p
                  className={`mt-2 font-mono text-[9px] leading-4 ${
                    darkMode ? "text-white/35" : "text-black/45"
                  }`}
                >
                  Create a new secure password for your account.
                </p>
              </div>

              {/* =================================================
                  ACCOUNT
              ================================================= */}

              {(username || email) && (
                <div
                  className={`mb-4 border-2 px-3 py-2 font-mono text-[8px] ${
                    darkMode
                      ? "border-purple-500/20 bg-purple-500/5 text-purple-300"
                      : "border-purple-500/20 bg-purple-50 text-purple-700"
                  }`}
                >
                  <span className="opacity-50">ACCOUNT: </span>

                  {username || email}
                </div>
              )}

              {/* =================================================
                  ERROR
              ================================================= */}

              {error && (
                <div
                  className={`mb-4 flex items-center gap-2 border-2 px-3 py-2 font-mono text-[9px] ${
                    darkMode
                      ? "border-red-500/40 bg-red-500/10 text-red-300"
                      : "border-red-500/30 bg-red-50 text-red-600"
                  }`}
                >
                  <FiAlertCircle size={14} />

                  <span>{error}</span>
                </div>
              )}

              {/* =================================================
                  SUCCESS
              ================================================= */}

              {success && (
                <div
                  className={`mb-4 flex items-center gap-2 border-2 px-3 py-2 font-mono text-[9px] ${
                    darkMode
                      ? "border-green-500/40 bg-green-500/10 text-green-300"
                      : "border-green-500/30 bg-green-50 text-green-600"
                  }`}
                >
                  <FiCheck size={14} />

                  <span>{success}</span>
                </div>
              )}

              {/* =================================================
                  FORM
              ================================================= */}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* =================================================
                    PASSWORD
                ================================================= */}

                <div>
                  <label className="mb-1.5 block font-mono text-[8px] font-bold uppercase tracking-widest opacity-60">
                    New Password
                  </label>

                  <div
                    className={`flex h-11 border-2 transition focus-within:border-purple-500 ${
                      darkMode
                        ? "border-[#302c38] bg-[#0b0a0e]"
                        : "border-black/15 bg-white"
                    }`}
                  >
                    <div className="flex w-10 shrink-0 items-center justify-center border-r-2 border-inherit text-purple-400">
                      <FiLock size={14} />
                    </div>

                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={handlePasswordChange}
                      placeholder="Enter new password"
                      autoComplete="new-password"
                      disabled={loading}
                      className={`min-w-0 flex-1 bg-transparent px-3 font-mono text-xs outline-none ${
                        darkMode
                          ? "text-white placeholder:text-white/20"
                          : "text-black placeholder:text-black/25"
                      }`}
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      disabled={loading}
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                      className="flex w-10 items-center justify-center text-purple-400"
                    >
                      {showPassword ? (
                        <FiEyeOff size={15} />
                      ) : (
                        <FiEye size={15} />
                      )}
                    </button>
                  </div>

                  {/* PASSWORD STRENGTH */}

                  {password.length > 0 && (
                    <div className="mt-2">
                      {/* Strength bars */}

                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((level) => (
                          <div
                            key={level}
                            className={`h-[4px] flex-1 transition-colors ${
                              passwordStrength >= level
                                ? "bg-purple-500"
                                : darkMode
                                  ? "bg-white/10"
                                  : "bg-black/10"
                            }`}
                          />
                        ))}
                      </div>

                      {/* Strength label */}

                      <div className="mt-1 flex items-center justify-between">
                        <span
                          className={`font-mono text-[6px] font-bold ${
                            isStrongPassword
                              ? "text-green-400"
                              : "text-yellow-400"
                          }`}
                        >
                          PASSWORD STRENGTH
                        </span>

                        <span
                          className={`font-mono text-[6px] font-bold ${
                            isStrongPassword
                              ? "text-green-400"
                              : "text-purple-400"
                          }`}
                        >
                          {getStrengthLabel()}
                        </span>
                      </div>

                      {/* Requirements */}

                      <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
                        <PasswordRequirement
                          valid={passwordChecks.length}
                          text="8+ CHARACTERS"
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

                {/* =================================================
                    CONFIRM PASSWORD
                ================================================= */}

                <div>
                  <label className="mb-1.5 block font-mono text-[8px] font-bold uppercase tracking-widest opacity-60">
                    Confirm Password
                  </label>

                  <div
                    className={`flex h-11 border-2 transition focus-within:border-purple-500 ${
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
                      className={`flex w-10 shrink-0 items-center justify-center border-r-2 border-inherit ${
                        passwordsDoNotMatch
                          ? "text-red-400"
                          : passwordsMatch
                            ? "text-green-400"
                            : "text-purple-400"
                      }`}
                    >
                      <FiLock size={14} />
                    </div>

                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={handleConfirmPasswordChange}
                      placeholder="Confirm new password"
                      autoComplete="new-password"
                      disabled={loading}
                      className={`min-w-0 flex-1 bg-transparent px-3 font-mono text-xs outline-none ${
                        darkMode
                          ? "text-white placeholder:text-white/20"
                          : "text-black placeholder:text-black/25"
                      }`}
                    />

                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      disabled={loading}
                      aria-label={
                        showConfirmPassword ? "Hide password" : "Show password"
                      }
                      className={`flex w-10 items-center justify-center ${
                        passwordsDoNotMatch
                          ? "text-red-400"
                          : passwordsMatch
                            ? "text-green-400"
                            : "text-purple-400"
                      }`}
                    >
                      {showConfirmPassword ? (
                        <FiEyeOff size={15} />
                      ) : (
                        <FiEye size={15} />
                      )}
                    </button>
                  </div>

                  {/* MATCH STATUS */}

                  {confirmPassword.length > 0 && (
                    <p
                      className={`mt-1 flex items-center gap-1 font-mono text-[7px] font-bold ${
                        passwordsMatch ? "text-green-400" : "text-red-400"
                      }`}
                    >
                      {passwordsMatch ? (
                        <>
                          <FiCheck size={8} />
                          PASSWORDS MATCH
                        </>
                      ) : (
                        <>
                          <FiX size={8} />
                          PASSWORDS DO NOT MATCH
                        </>
                      )}
                    </p>
                  )}
                </div>

                {/* =================================================
                    PASSWORD STATUS
                ================================================= */}

                {password.length > 0 && !isStrongPassword && (
                  <div
                    className={`border px-3 py-2 font-mono text-[7px] ${
                      darkMode
                        ? "border-yellow-500/20 bg-yellow-500/5 text-yellow-400"
                        : "border-yellow-500/30 bg-yellow-50 text-yellow-600"
                    }`}
                  >
                    Password must satisfy all five security requirements.
                  </div>
                )}

                {/* =================================================
                    SUBMIT
                ================================================= */}

                <button
                  type="submit"
                  disabled={
                    loading ||
                    !isStrongPassword ||
                    !passwordsMatch ||
                    !resetToken
                  }
                  className={`group flex min-h-11 w-full items-center justify-center gap-3 border-2 border-purple-400 bg-purple-600 py-2 font-mono text-[10px] font-black uppercase tracking-widest text-white shadow-[3px_3px_0px_#312e81] transition ${
                    loading ||
                    !isStrongPassword ||
                    !passwordsMatch ||
                    !resetToken
                      ? "cursor-not-allowed opacity-50"
                      : "hover:bg-purple-500 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                  }`}
                >
                  {loading ? (
                    <>
                      <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Resetting...
                    </>
                  ) : (
                    <>
                      Reset Password
                      <FiArrowRight
                        size={15}
                        className="transition-transform group-hover:translate-x-1"
                      />
                    </>
                  )}
                </button>
              </form>

              {/* =================================================
                  FOOTER
              ================================================= */}

              <div
                className={`mt-5 border-t-2 pt-4 text-center ${
                  darkMode ? "border-[#25222c]" : "border-black/10"
                }`}
              >
                <p
                  className={`font-mono text-[9px] font-semibold uppercase tracking-wide ${
                    darkMode ? "text-white/40" : "text-black/50"
                  }`}
                >
                  Remember your password?
                </p>

                <button
                  type="button"
                  onClick={() => navigate("/login")}
                  className="mt-1.5 inline-flex items-center gap-2 font-mono text-xs font-black uppercase tracking-wider text-purple-500 hover:text-purple-400"
                >
                  Sign In
                  <FiArrowRight size={14} />
                </button>
              </div>

              {/* =================================================
                  SECURITY
              ================================================= */}

              <div
                className={`mt-4 border-t pt-2 text-center font-mono text-[7px] uppercase tracking-widest ${
                  darkMode
                    ? "border-[#25222c] text-white/20"
                    : "border-black/10 text-black/30"
                }`}
              >
                Secure Password Recovery
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

// =====================================================
// PASSWORD REQUIREMENT
// =====================================================

const PasswordRequirement = ({ valid, text, darkMode }) => {
  return (
    <div
      className={`flex items-center gap-1 font-mono text-[6px] font-bold ${
        valid ? "text-green-400" : darkMode ? "text-white/25" : "text-black/35"
      }`}
    >
      {valid ? <FiCheck size={8} /> : <FiX size={8} />}

      {text}
    </div>
  );
};

export default ResetPassword;
