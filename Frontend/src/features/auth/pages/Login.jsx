import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FcGoogle } from "react-icons/fc";
import { useTheme } from "../../../context/theme.context";

import {
  FiEye,
  FiEyeOff,
  FiMail,
  FiLock,
  FiArrowRight,
  FiCpu,
  FiSun,
  FiMoon,
  FiShield,
  FiZap,
  FiCheck,
  FiAlertCircle,
  FiHome,
} from "react-icons/fi";

import { loginUser } from "../../../api/auth.api";

const Login = () => {
  const navigate = useNavigate();
  const { darkMode, toggleTheme } = useTheme();

  const [showPassword, setShowPassword] = useState(false);

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ==============================
  // HANDLE INPUT CHANGE
  // ==============================
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
  };

  // ==============================
  // GO HOME
  // ==============================
  const handleHome = () => {
    navigate("/");
  };

  // ==============================
  // LOGIN
  // ==============================
  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    // Basic validation
    if (!form.email.trim()) {
      setError("Email is required.");
      return;
    }

    if (!form.password) {
      setError("Password is required.");
      return;
    }

    try {
      setLoading(true);

      const data = await loginUser({
        email: form.email.trim(),
        password: form.password,
      });

      console.log("Login response:", data);

      /*
       * Depending on your backend response,
       * token may be:
       *
       * data.token
       * data.accessToken
       * data.data.token
       * data.data.accessToken
       */

      const token =
        data?.token ||
        data?.accessToken ||
        data?.data?.token ||
        data?.data?.accessToken;

      if (token) {
        if (rememberMe) {
          localStorage.setItem("token", token);

          // Remove old session token if present
          sessionStorage.removeItem("token");
        } else {
          sessionStorage.setItem("token", token);

          // Remove old persistent token if present
          localStorage.removeItem("token");
        }
      }

      setSuccess(data?.message || "Login successful.");

      // Small delay so success message can be seen
      setTimeout(() => {
        navigate("/dashboard");
      }, 700);
    } catch (err) {
      console.error("Login error:", err);

      const backendMessage =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message;

      setError(
        backendMessage || "Unable to login. Please check your credentials.",
      );
    } finally {
      setLoading(false);
    }
  };

  // ==============================
  // GOOGLE LOGIN
  // ==============================
  const handleGoogle = () => {
    console.log("Google login");

    /*
     * Add your Google OAuth endpoint here later.
     *
     * Example:
     *
     * window.location.href =
     *   "http://localhost:3000/api/auth/google";
     */
  };

  // ==============================
  // FORGOT PASSWORD
  // ==============================
  const handleForgotPassword = () => {
    navigate("/forgot-password");
  };

  // ==============================
  // REGISTER
  // ==============================
  const handleRegister = () => {
    navigate("/register");
  };

  return (
    <main
      className={`min-h-screen w-full transition-colors duration-500 ${
        darkMode ? "bg-[#08070b] text-[#f4f0df]" : "bg-[#eee9dc] text-[#17131f]"
      }`}
    >
      {/* =========================================
          BACKGROUND
      ========================================== */}

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        {/* Purple glow */}
        <div
          className={`absolute -left-52 -top-52 h-[500px] w-[500px] rounded-full blur-[150px] ${
            darkMode ? "bg-purple-700/15" : "bg-purple-400/15"
          }`}
        />

        {/* Indigo glow */}
        <div
          className={`absolute -right-52 top-1/3 h-[500px] w-[500px] rounded-full blur-[150px] ${
            darkMode ? "bg-indigo-700/10" : "bg-indigo-400/10"
          }`}
        />

        {/* Bottom glow */}
        <div
          className={`absolute bottom-[-200px] left-1/3 h-[450px] w-[450px] rounded-full blur-[150px] ${
            darkMode ? "bg-fuchsia-700/10" : "bg-fuchsia-400/10"
          }`}
        />

        {/* Retro grid */}
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

      {/* =========================================
          HEADER
      ========================================== */}

      <header
        className={`relative z-30 mx-auto flex h-16 shrink-0 max-w-[1600px] items-center justify-between border-b px-6 sm:px-10 lg:px-14 xl:px-20 ${
          darkMode ? "border-purple-500/10" : "border-purple-900/10"
        }`}
      >
        {/* =========================================
            CLICKABLE LOGO + SITE NAME
        ========================================== */}

        <button
          type="button"
          onClick={handleHome}
          aria-label="Go to home page"
          className="group flex items-center gap-3 text-left"
        >
          {/* Logo */}
          <div className="flex h-9 w-9 items-center justify-center border-2 border-purple-500 bg-purple-600 shadow-[3px_3px_0px_#312e81] transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-[4px_4px_0px_#312e81]">
            <FiCpu size={17} />
          </div>

          {/* Site Name */}
          <div>
            <p className="font-mono text-xs font-black tracking-[0.18em] transition-colors group-hover:text-purple-400">
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

        {/* =========================================
            HEADER ACTIONS
        ========================================== */}

        <div className="flex items-center gap-2">
          {/* HOME BUTTON */}
          <button
            type="button"
            onClick={handleHome}
            title="Go to home"
            aria-label="Go to home"
            className={`flex h-9 items-center gap-2 border px-3 font-mono text-[8px] font-bold uppercase tracking-wider transition-all duration-300 ${
              darkMode
                ? "border-[#302c38] bg-[#15131a] text-white/70 hover:border-purple-500 hover:bg-purple-500/10 hover:text-purple-300"
                : "border-black/15 bg-white/70 text-black/60 hover:border-purple-500 hover:bg-purple-500/5 hover:text-purple-700"
            }`}
          >
            <FiHome size={14} />
            <span className="hidden sm:inline">Home</span>
          </button>

          {/* THEME BUTTON */}
          <button
            type="button"
            onClick={toggleTheme}
            title="Toggle theme"
            aria-label="Toggle theme"
            className={`flex h-9 w-9 items-center justify-center border transition-all duration-300 ${
              darkMode
                ? "border-[#302c38] bg-[#15131a] text-yellow-300 hover:border-purple-500 hover:bg-purple-500/10"
                : "border-black/15 bg-white/70 text-purple-700 hover:border-purple-500"
            }`}
          >
            {darkMode ? <FiSun size={16} /> : <FiMoon size={16} />}
          </button>
        </div>
      </header>

      {/* =========================================
          MAIN
      ========================================== */}

      <div
        className="
          relative
          z-10
          mx-auto
          grid
          min-h-[calc(100vh-4rem)]
          max-w-[1600px]
          grid-cols-1
          gap-6
          px-6
          py-5
          sm:px-10
          lg:grid-cols-[1.1fr_0.9fr]
          lg:gap-8
          lg:px-14
          lg:py-6
          xl:grid-cols-[1.15fr_0.85fr]
          xl:gap-12
          xl:px-20
        "
      >
        {/* =========================================
            LEFT SIDE
        ========================================== */}

        <section className="hidden min-h-0 items-center lg:flex">
          <div className="w-full max-w-3xl">
            {/* Status */}
            <div className="mb-4">
              <div
                className={`inline-flex items-center gap-2 border px-3 py-1.5 font-mono text-[8px] tracking-[0.2em] ${
                  darkMode
                    ? "border-purple-500/25 bg-purple-500/5 text-purple-300"
                    : "border-purple-500/25 bg-purple-500/10 text-purple-700"
                }`}
              >
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-400" />
                READY TO CONTINUE
              </div>
            </div>

            {/* Heading */}
            <h1 className="max-w-3xl font-mono text-4xl font-black uppercase leading-[0.9] tracking-tight sm:text-5xl lg:text-6xl xl:text-7xl">
              Welcome
              <br />
              <span className="text-purple-500">back.</span>
            </h1>

            {/* Description */}
            <p
              className={`mt-4 max-w-xl font-mono text-xs leading-5 sm:text-sm ${
                darkMode ? "text-white/40" : "text-black/55"
              }`}
            >
              Continue your interview preparation, review your progress,
              practice new scenarios, and keep moving toward your next
              opportunity.
            </p>

            {/* Command block */}
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
                <span className="text-purple-400">resume</span>{" "}
                <span className="text-green-400">--preparation</span>
              </p>

              <p className="mt-1.5 text-[10px] text-green-400">
                ✓ Your preparation workspace is ready
              </p>
            </div>

            {/* Features */}
            <div className="mt-5 grid max-w-2xl grid-cols-3 gap-3">
              {/* Feature 1 */}
              <div
                className={`border-2 p-3 transition-all duration-300 hover:-translate-y-1 ${
                  darkMode
                    ? "border-[#292630] bg-[#111014]"
                    : "border-black/10 bg-white/50"
                }`}
              >
                <FiZap className="mb-2 text-purple-400" size={17} />

                <p className="font-mono text-[9px] font-bold">AI PRACTICE</p>

                <p
                  className={`mt-1 font-mono text-[8px] leading-4 ${
                    darkMode ? "text-white/30" : "text-black/40"
                  }`}
                >
                  Practice intelligent interview questions.
                </p>
              </div>

              {/* Feature 2 */}
              <div
                className={`border-2 p-3 transition-all duration-300 hover:-translate-y-1 ${
                  darkMode
                    ? "border-[#292630] bg-[#111014]"
                    : "border-black/10 bg-white/50"
                }`}
              >
                <FiCheck className="mb-2 text-green-400" size={17} />

                <p className="font-mono text-[9px] font-bold">YOUR PROGRESS</p>

                <p
                  className={`mt-1 font-mono text-[8px] leading-4 ${
                    darkMode ? "text-white/30" : "text-black/40"
                  }`}
                >
                  Pick up exactly where you left off.
                </p>
              </div>

              {/* Feature 3 */}
              <div
                className={`border-2 p-3 transition-all duration-300 hover:-translate-y-1 ${
                  darkMode
                    ? "border-[#292630] bg-[#111014]"
                    : "border-black/10 bg-white/50"
                }`}
              >
                <FiShield className="mb-2 text-blue-400" size={17} />

                <p className="font-mono text-[9px] font-bold">SECURE</p>

                <p
                  className={`mt-1 font-mono text-[8px] leading-4 ${
                    darkMode ? "text-white/30" : "text-black/40"
                  }`}
                >
                  Your candidate profile stays protected.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================
            RIGHT SIDE - LOGIN CARD
        ========================================== */}

        <section className="flex min-h-0 items-center justify-center">
          <div className="w-full max-w-[430px]">
            <div
              className={`max-h-[calc(100vh-7rem)] overflow-hidden border-2 transition-colors duration-500 ${
                darkMode
                  ? "border-[#2b2735] bg-[#111014] shadow-[6px_6px_0px_#5b21b6]"
                  : "border-black/15 bg-[#f8f5ec] shadow-[6px_6px_0px_#6d28d9]"
              }`}
            >
              {/* Card header */}
              <div
                className={`flex items-center justify-between border-b-2 px-5 py-2.5 ${
                  darkMode
                    ? "border-[#2b2735] bg-[#17151c]"
                    : "border-black/10 bg-[#e9e4d8]"
                }`}
              >
                <span className="font-mono text-[8px] tracking-[0.2em] text-purple-400">
                  LOGIN
                </span>

                <span
                  className={`font-mono text-[7px] tracking-widest ${
                    darkMode ? "text-white/25" : "text-black/30"
                  }`}
                >
                  EXISTING ACCOUNT
                </span>
              </div>

              {/* Card body */}
              <div className="p-5 sm:p-6">
                {/* Header */}
                <div className="mb-4">
                  <div className="mb-2.5 flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center border-2 border-purple-500 bg-purple-600 shadow-[3px_3px_0px_#312e81]">
                      <span className="font-mono text-[10px] font-black">
                        AI
                      </span>
                    </div>

                    <div>
                      <p className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-purple-400">
                        Candidate Access
                      </p>

                      <p
                        className={`font-mono text-[7px] ${
                          darkMode ? "text-white/25" : "text-black/35"
                        }`}
                      >
                        SIGN IN TO CONTINUE
                      </p>
                    </div>
                  </div>

                  <h2 className="font-mono text-xl font-black uppercase">
                    Welcome <span className="text-purple-500">back.</span>
                  </h2>

                  <p
                    className={`mt-1 font-mono text-[9px] leading-4 ${
                      darkMode ? "text-white/35" : "text-black/45"
                    }`}
                  >
                    Enter your credentials to access your candidate profile.
                  </p>
                </div>

                {/* Error */}
                {error && (
                  <div
                    className={`mb-3 flex items-center gap-2 border-2 px-3 py-2 font-mono text-[9px] ${
                      darkMode
                        ? "border-red-500/40 bg-red-500/10 text-red-300"
                        : "border-red-500/30 bg-red-50 text-red-600"
                    }`}
                  >
                    <FiAlertCircle size={14} />
                    <span>{error}</span>
                  </div>
                )}

                {/* Success */}
                {success && (
                  <div
                    className={`mb-3 border-2 px-3 py-2 font-mono text-[9px] ${
                      darkMode
                        ? "border-green-500/40 bg-green-500/10 text-green-300"
                        : "border-green-500/30 bg-green-50 text-green-600"
                    }`}
                  >
                    ✓ {success}
                  </div>
                )}

                {/* Google */}
                <button
                  type="button"
                  onClick={handleGoogle}
                  disabled={loading}
                  className={`flex h-9 w-full items-center justify-center gap-3 border-2 font-mono text-[9px] font-bold uppercase tracking-wide transition disabled:cursor-not-allowed disabled:opacity-50 ${
                    darkMode
                      ? "border-[#302c38] bg-[#18161d] hover:border-purple-500 hover:bg-purple-500/10"
                      : "border-black/15 bg-white hover:border-purple-500 hover:bg-purple-500/5"
                  }`}
                >
                  <FcGoogle size={15} />
                  Continue with Google
                </button>

                {/* Divider */}
                <div className="my-3 flex items-center gap-3">
                  <div className="h-[1px] flex-1 bg-purple-500/20" />

                  <span className="font-mono text-[8px] text-purple-400/50">
                    OR
                  </span>

                  <div className="h-[1px] flex-1 bg-purple-500/20" />
                </div>

                {/* FORM */}
                <form onSubmit={handleSubmit} className="space-y-3">
                  {/* EMAIL */}
                  <div>
                    <label className="mb-1 block font-mono text-[8px] font-bold uppercase tracking-widest opacity-60">
                      Email
                    </label>

                    <div
                      className={`flex h-9 border-2 transition focus-within:border-purple-500 ${
                        darkMode
                          ? "border-[#302c38] bg-[#0b0a0e]"
                          : "border-black/15 bg-white"
                      }`}
                    >
                      <div className="flex w-9 shrink-0 items-center justify-center border-r-2 border-inherit text-purple-400">
                        <FiMail size={14} />
                      </div>

                      <input
                        name="email"
                        value={form.email}
                        onChange={handleChange}
                        type="email"
                        placeholder="candidate@email.com"
                        required
                        autoComplete="email"
                        disabled={loading}
                        className={`min-w-0 flex-1 bg-transparent px-3 font-mono text-xs outline-none disabled:cursor-not-allowed ${
                          darkMode
                            ? "text-white placeholder:text-white/20"
                            : "text-black placeholder:text-black/25"
                        }`}
                      />
                    </div>
                  </div>

                  {/* PASSWORD */}
                  <div>
                    <div className="mb-1 flex items-center justify-between">
                      <label className="block font-mono text-[8px] font-bold uppercase tracking-widest opacity-60">
                        Password
                      </label>

                      <button
                        type="button"
                        onClick={handleForgotPassword}
                        className="font-mono text-[8px] font-bold uppercase tracking-wider text-purple-500 transition hover:text-purple-400"
                      >
                        Forgot password?
                      </button>
                    </div>

                    <div
                      className={`flex h-9 border-2 transition focus-within:border-purple-500 ${
                        darkMode
                          ? "border-[#302c38] bg-[#0b0a0e]"
                          : "border-black/15 bg-white"
                      }`}
                    >
                      <div className="flex w-9 shrink-0 items-center justify-center border-r-2 border-inherit text-purple-400">
                        <FiLock size={14} />
                      </div>

                      <input
                        name="password"
                        value={form.password}
                        onChange={handleChange}
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter password"
                        required
                        autoComplete="current-password"
                        disabled={loading}
                        className={`min-w-0 flex-1 bg-transparent px-3 font-mono text-xs outline-none disabled:cursor-not-allowed ${
                          darkMode
                            ? "text-white placeholder:text-white/20"
                            : "text-black placeholder:text-black/25"
                        }`}
                      />

                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        aria-label={
                          showPassword ? "Hide password" : "Show password"
                        }
                        className={`flex w-9 shrink-0 items-center justify-center border-l-2 border-inherit transition hover:text-purple-400 ${
                          darkMode ? "text-white/30" : "text-black/30"
                        }`}
                      >
                        {showPassword ? (
                          <FiEyeOff size={14} />
                        ) : (
                          <FiEye size={14} />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* REMEMBER ME */}
                  <label className="flex cursor-pointer items-center gap-2 pt-0.5">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      disabled={loading}
                      className="h-3.5 w-3.5 accent-purple-600"
                    />

                    <span
                      className={`font-mono text-[8px] uppercase tracking-wide ${
                        darkMode ? "text-white/30" : "text-black/45"
                      }`}
                    >
                      Remember me
                    </span>
                  </label>

                  {/* SUBMIT */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="group flex min-h-10 w-full items-center justify-center gap-3 border-2 border-purple-400 bg-purple-600 py-2 font-mono text-[10px] font-black uppercase tracking-widest text-white shadow-[3px_3px_0px_#312e81] transition-all hover:bg-purple-500 hover:shadow-[2px_2px_0px_#312e81] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? "Signing in..." : "Sign In"}

                    {!loading && (
                      <FiArrowRight
                        size={15}
                        className="transition-transform group-hover:translate-x-1"
                      />
                    )}
                  </button>
                </form>

                {/* REGISTER */}
                <div
                  className={`mt-4 border-t-2 pt-3 text-center ${
                    darkMode ? "border-[#25222c]" : "border-black/10"
                  }`}
                >
                  <p
                    className={`font-mono text-[9px] font-semibold uppercase tracking-wide ${
                      darkMode ? "text-white/50" : "text-black/55"
                    }`}
                  >
                    Don't have an account?
                  </p>

                  <button
                    type="button"
                    onClick={handleRegister}
                    className="group mt-1.5 inline-flex items-center gap-2 font-mono text-xs font-black uppercase tracking-wider text-purple-500 transition hover:text-purple-400"
                  >
                    Create profile
                    <FiArrowRight
                      size={14}
                      className="transition-transform group-hover:translate-x-1"
                    />
                  </button>
                </div>

                {/* FOOTER */}
                <div
                  className={`mt-3 border-t pt-2 text-center font-mono text-[7px] uppercase tracking-widest ${
                    darkMode
                      ? "border-[#25222c] text-white/20"
                      : "border-black/10 text-black/30"
                  }`}
                >
                  SECURE CANDIDATE ACCESS
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
};

export default Login;
