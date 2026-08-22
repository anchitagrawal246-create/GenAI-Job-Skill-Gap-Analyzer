import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../../../context/theme.context";

import {
  FiArrowLeft,
  FiArrowRight,
  FiCpu,
  FiMail,
  FiSun,
  FiMoon,
  FiShield,
  FiCheck,
  FiAlertCircle,
  FiHome,
} from "react-icons/fi";

import { forgotPassword } from "../../../api/auth.api";

const ForgotPassword = () => {
  const navigate = useNavigate();
  const { darkMode, toggleTheme } = useTheme();

  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // =====================================================
  // HANDLE CHANGE
  // =====================================================

  const handleChange = (e) => {
    setUsername(e.target.value);

    if (error) {
      setError("");
    }

    if (success) {
      setSuccess("");
    }
  };

  // =====================================================
  // SUBMIT
  // =====================================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    const trimmedUsername = username.trim();

    if (!trimmedUsername) {
      setError("Username is required.");
      return;
    }

    try {
      setLoading(true);

      const data = await forgotPassword({
        username: trimmedUsername,
      });

      console.log("Forgot password response:", data);

      setSuccess(
        data?.message ||
          "If the account exists, an OTP has been sent to your registered email.",
      );

      /*
       * You can navigate to your OTP page here.
       *
       * Example:
       *
       * navigate("/verify-password-otp", {
       *   state: {
       *     username: trimmedUsername,
       *   },
       * });
       *
       * I am leaving it commented so you can first test
       * the API response.
       */
    } catch (err) {
      console.error("Forgot password error:", err);

      const backendMessage =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message;

      setError(
        backendMessage || "Unable to process your request. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // GO HOME
  // =====================================================

  const handleHome = () => {
    navigate("/");
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
        {/* LOGO */}

        <button
          type="button"
          onClick={handleHome}
          title="Go to home"
          aria-label="Go to home"
          className="group flex items-center gap-3 text-left"
        >
          <div
            className="
              flex h-9 w-9 items-center justify-center
              border-2 border-purple-500
              bg-purple-600
              shadow-[3px_3px_0px_#312e81]
              transition-all duration-300
              group-hover:-translate-y-0.5
              group-hover:bg-purple-500
              group-hover:shadow-[2px_2px_0px_#312e81]
            "
          >
            <FiCpu size={17} />
          </div>

          <div>
            <p
              className="
                font-mono text-xs font-black
                tracking-[0.18em]
                transition-colors
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

        {/* HEADER ACTIONS */}

        <div className="flex items-center gap-2">
          {/* HOME */}

          <button
            type="button"
            onClick={handleHome}
            title="Home"
            aria-label="Home"
            className={`flex h-9 items-center gap-2 border px-3 font-mono text-[8px] font-bold uppercase tracking-wider transition-all duration-300 ${
              darkMode
                ? "border-[#302c38] bg-[#15131a] text-white/60 hover:border-purple-500 hover:bg-purple-500/10 hover:text-purple-300"
                : "border-black/15 bg-white/70 text-black/60 hover:border-purple-500 hover:bg-purple-500/5 hover:text-purple-700"
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

      {/* =====================================================
          MAIN
      ===================================================== */}

      <div className="relative z-10 flex min-h-[calc(100vh-4rem)] items-center justify-center px-6 py-8">
        <div className="w-full max-w-[430px]">
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
              className={`flex items-center justify-between border-b-2 px-5 py-2.5 ${
                darkMode
                  ? "border-[#2b2735] bg-[#17151c]"
                  : "border-black/10 bg-[#e9e4d8]"
              }`}
            >
              <span className="font-mono text-[8px] tracking-[0.2em] text-purple-400">
                PASSWORD RECOVERY
              </span>

              <span
                className={`font-mono text-[7px] tracking-widest ${
                  darkMode ? "text-white/25" : "text-black/30"
                }`}
              >
                ACCOUNT ACCESS
              </span>
            </div>

            {/* BODY */}

            <div className="p-5 sm:p-6">
              {/* BACK TO LOGIN */}

              <button
                type="button"
                onClick={() => navigate("/login")}
                className="
                  mb-5 flex items-center gap-2
                  font-mono text-[9px] font-bold
                  uppercase tracking-wider
                  text-purple-500
                  transition
                  hover:text-purple-400
                "
              >
                <FiArrowLeft size={13} />
                Back to login
              </button>

              {/* HEADING */}

              <div className="mb-5">
                <div className="mb-3 flex items-center gap-3">
                  <div
                    className="
                      flex h-9 w-9 items-center justify-center
                      border-2 border-purple-500
                      bg-purple-600
                      shadow-[3px_3px_0px_#312e81]
                    "
                  >
                    <FiShield size={16} />
                  </div>

                  <div>
                    <p className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-purple-400">
                      Account Recovery
                    </p>

                    <p
                      className={`font-mono text-[7px] ${
                        darkMode ? "text-white/25" : "text-black/35"
                      }`}
                    >
                      RESET YOUR PASSWORD
                    </p>
                  </div>
                </div>

                <h1 className="font-mono text-xl font-black uppercase">
                  Forgot <span className="text-purple-500">password?</span>
                </h1>

                <p
                  className={`mt-2 font-mono text-[9px] leading-4 ${
                    darkMode ? "text-white/35" : "text-black/45"
                  }`}
                >
                  Enter your username and we'll send a secure OTP to your
                  registered email address.
                </p>
              </div>

              {/* ERROR */}

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

              {/* SUCCESS */}

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

              {/* FORM */}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* USERNAME */}

                <div>
                  <label className="mb-1.5 block font-mono text-[8px] font-bold uppercase tracking-widest opacity-60">
                    Username
                  </label>

                  <div
                    className={`flex h-10 border-2 transition focus-within:border-purple-500 ${
                      darkMode
                        ? "border-[#302c38] bg-[#0b0a0e]"
                        : "border-black/15 bg-white"
                    }`}
                  >
                    <div className="flex w-10 shrink-0 items-center justify-center border-r-2 border-inherit text-purple-400">
                      <FiMail size={14} />
                    </div>

                    <input
                      name="username"
                      value={username}
                      onChange={handleChange}
                      type="text"
                      placeholder="enter your username"
                      autoComplete="username"
                      disabled={loading}
                      required
                      className={`min-w-0 flex-1 bg-transparent px-3 font-mono text-xs outline-none disabled:cursor-not-allowed ${
                        darkMode
                          ? "text-white placeholder:text-white/20"
                          : "text-black placeholder:text-black/25"
                      }`}
                    />
                  </div>
                </div>

                {/* SUBMIT */}

                <button
                  type="submit"
                  disabled={loading}
                  className="
                    group flex min-h-10 w-full
                    items-center justify-center gap-3
                    border-2 border-purple-400
                    bg-purple-600 py-2
                    font-mono text-[10px]
                    font-black uppercase
                    tracking-widest text-white
                    shadow-[3px_3px_0px_#312e81]
                    transition-all
                    hover:bg-purple-500
                    hover:shadow-[2px_2px_0px_#312e81]
                    active:translate-x-[2px]
                    active:translate-y-[2px]
                    active:shadow-none
                    disabled:cursor-not-allowed
                    disabled:opacity-60
                  "
                >
                  {loading ? (
                    <>
                      <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Processing...
                    </>
                  ) : (
                    <>
                      Send OTP
                      <FiArrowRight
                        size={15}
                        className="transition-transform group-hover:translate-x-1"
                      />
                    </>
                  )}
                </button>
              </form>

              {/* LOGIN FOOTER */}

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
                  className="
                    group mt-1.5 inline-flex
                    items-center gap-2
                    font-mono text-xs
                    font-black uppercase
                    tracking-wider
                    text-purple-500
                    transition
                    hover:text-purple-400
                  "
                >
                  Sign In
                  <FiArrowRight
                    size={14}
                    className="transition-transform group-hover:translate-x-1"
                  />
                </button>
              </div>

              {/* FOOTER */}

              <div
                className={`mt-4 border-t pt-2 text-center font-mono text-[7px] uppercase tracking-widest ${
                  darkMode
                    ? "border-[#25222c] text-white/20"
                    : "border-black/10 text-black/30"
                }`}
              >
                SECURE PASSWORD RECOVERY
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default ForgotPassword;
