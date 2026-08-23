import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { FcGoogle } from "react-icons/fc";
import { useTheme } from "../../../context/theme.context";
import OTPModal from "../components/OTPModal";

import {
  FiArrowRight,
  FiCheck,
  FiCpu,
  FiEye,
  FiEyeOff,
  FiHome,
  FiLock,
  FiMail,
  FiMoon,
  FiShield,
  FiSun,
  FiUser,
  FiX,
  FiZap,
} from "react-icons/fi";

const API_URL = "http://localhost:3000/api/auth";

// =====================================================
// EMAIL VALIDATION
// =====================================================

const isValidEmailFormat = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
};

// =====================================================
// REGISTER
// =====================================================

const Register = () => {
  const navigate = useNavigate();
  const { darkMode, toggleTheme } = useTheme();

  // ===================================================
  // OTP
  // ===================================================

  const [showOTPModal, setShowOTPModal] = useState(false);
  const [otpEmail, setOtpEmail] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState("");

  // ===================================================
  // PASSWORD VISIBILITY
  // ===================================================

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // ===================================================
  // FORM
  // ===================================================

  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  // ===================================================
  // TERMS
  // ===================================================

  const [termsAccepted, setTermsAccepted] = useState(false);

  // ===================================================
  // EMAIL
  // ===================================================

  const [emailTouched, setEmailTouched] = useState(false);
  const [emailStatus, setEmailStatus] = useState("idle");
  const [emailMessage, setEmailMessage] = useState("");

  // ===================================================
  // USERNAME
  // ===================================================

  const [usernameStatus, setUsernameStatus] = useState("idle");
  const [usernameMessage, setUsernameMessage] = useState("");

  // ===================================================
  // GENERAL
  // ===================================================

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ===================================================
  // USERNAME REALTIME CHECK
  // ===================================================

  useEffect(() => {
    const username = form.username.trim();

    if (!username) {
      setUsernameStatus("idle");
      setUsernameMessage("");
      return;
    }

    if (username.length < 3) {
      setUsernameStatus("idle");
      setUsernameMessage("USERNAME MUST BE AT LEAST 3 CHARACTERS");
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setUsernameStatus("unavailable");
      setUsernameMessage(
        "USERNAME CAN ONLY CONTAIN LETTERS, NUMBERS AND UNDERSCORE",
      );
      return;
    }

    setUsernameStatus("checking");
    setUsernameMessage("CHECKING USERNAME...");

    const controller = new AbortController();

    const timeoutId = setTimeout(async () => {
      try {
        const response = await axios.get(`${API_URL}/check-username`, {
          params: {
            username,
          },
          signal: controller.signal,
        });

        if (response.data?.available === true) {
          setUsernameStatus("available");
          setUsernameMessage(response.data?.message || "USERNAME AVAILABLE");
        } else {
          setUsernameStatus("unavailable");
          setUsernameMessage(
            response.data?.message || "USERNAME ALREADY EXISTS",
          );
        }
      } catch (err) {
        if (err.name === "CanceledError" || err.code === "ERR_CANCELED") {
          return;
        }

        console.error("Username availability error:", err);

        setUsernameStatus("error");
        setUsernameMessage(
          err.response?.data?.message ||
            err.response?.data?.error ||
            "COULD NOT CHECK USERNAME",
        );
      }
    }, 500);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [form.username]);

  // ===================================================
  // EMAIL REALTIME CHECK
  // ===================================================

  useEffect(() => {
    const email = form.email.trim().toLowerCase();

    if (!email) {
      setEmailStatus("idle");
      setEmailMessage("");
      return;
    }

    if (!isValidEmailFormat(email)) {
      setEmailStatus("invalid");
      setEmailMessage("PLEASE ENTER A VALID EMAIL ADDRESS");
      return;
    }

    setEmailStatus("checking");
    setEmailMessage("VALIDATING EMAIL...");

    const controller = new AbortController();

    const timeoutId = setTimeout(async () => {
      try {
        const response = await axios.get(`${API_URL}/check-email`, {
          params: {
            email,
          },
          signal: controller.signal,
        });

        const valid = response.data?.valid;
        const available = response.data?.available;

        if (valid === true && available === true) {
          setEmailStatus("valid");
          setEmailMessage(response.data?.message || "EMAIL AVAILABLE");
        } else {
          setEmailStatus("invalid");
          setEmailMessage(response.data?.message || "EMAIL IS NOT AVAILABLE");
        }
      } catch (err) {
        if (err.name === "CanceledError" || err.code === "ERR_CANCELED") {
          return;
        }

        console.error("Email validation error:", err);

        setEmailStatus("invalid");
        setEmailMessage(
          err.response?.data?.message ||
            err.response?.data?.error ||
            "COULD NOT VALIDATE EMAIL",
        );
      }
    }, 500);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [form.email]);

  // ===================================================
  // HANDLE INPUT
  // ===================================================

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    setError("");
    setSuccess("");

    if (name === "email") {
      setEmailTouched(true);
    }
  };

  // ===================================================
  // PASSWORD MATCH
  // ===================================================

  const passwordsMatch =
    form.password.length > 0 &&
    form.confirmPassword.length > 0 &&
    form.password === form.confirmPassword;

  const passwordsDoNotMatch =
    form.confirmPassword.length > 0 && form.password !== form.confirmPassword;

  // ===================================================
  // PASSWORD STRENGTH
  // ===================================================

  const passwordChecks = {
    length: form.password.length >= 8,
    uppercase: /[A-Z]/.test(form.password),
    lowercase: /[a-z]/.test(form.password),
    number: /[0-9]/.test(form.password),
    special: /[^A-Za-z0-9]/.test(form.password),
  };

  const passwordStrength = Object.values(passwordChecks).filter(Boolean).length;

  const isStrongPassword = passwordStrength >= 4;

  // ===================================================
  // TERMS CHANGE
  // ===================================================

  const handleTermsChange = (e) => {
    setTermsAccepted(e.target.checked);
    setError("");
  };

  // ===================================================
  // REGISTER
  // ===================================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    const username = form.username.trim();
    const email = form.email.trim().toLowerCase();

    // =================================================
    // TERMS FIRST
    // =================================================

    if (!termsAccepted) {
      setError("Please accept the Terms & Conditions and Privacy Policy.");
      return;
    }

    // =================================================
    // USERNAME
    // =================================================

    if (!username) {
      setError("Username is required.");
      return;
    }

    if (username.length < 3) {
      setError("Username must contain at least 3 characters.");
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setError("Username can only contain letters, numbers and underscore.");
      return;
    }

    if (usernameStatus === "checking") {
      setError("Please wait while we check username availability.");
      return;
    }

    if (usernameStatus !== "available") {
      setError("Please choose an available username.");
      return;
    }

    // =================================================
    // EMAIL
    // =================================================

    if (!email) {
      setEmailTouched(true);
      setEmailStatus("invalid");
      setEmailMessage("EMAIL IS REQUIRED");
      setError("Email is required.");
      return;
    }

    if (!isValidEmailFormat(email)) {
      setEmailTouched(true);
      setEmailStatus("invalid");
      setEmailMessage("PLEASE ENTER A VALID EMAIL ADDRESS");
      setError("Please enter a valid email address.");
      return;
    }

    if (emailStatus === "checking") {
      setError("Please wait while we validate your email.");
      return;
    }

    if (emailStatus !== "valid") {
      setError(emailMessage || "Please enter a valid available email.");
      return;
    }

    // =================================================
    // PASSWORD
    // =================================================

    if (!form.password) {
      setError("Password is required.");
      return;
    }

    if (!form.confirmPassword) {
      setError("Please confirm your password.");
      return;
    }

    if (!passwordsMatch) {
      setError("Passwords must match.");
      return;
    }

    if (!isStrongPassword) {
      setError(
        "Password must contain at least 8 characters, uppercase, lowercase, number and special character.",
      );
      return;
    }

    // =================================================
    // API REQUEST
    // =================================================

    try {
      setLoading(true);

      const registerData = {
        username,
        email,
        password: form.password,
      };

      console.log("REGISTER REQUEST:", {
        username,
        email,
      });

      const response = await axios.post(`${API_URL}/register`, registerData, {
        withCredentials: true,
        headers: {
          "Content-Type": "application/json",
        },
      });

      console.log("REGISTER RESPONSE:", response.data);

      setOtpEmail(email);
      setOtpError("");
      setShowOTPModal(true);

      setSuccess(response.data?.message || "OTP sent successfully!");
    } catch (err) {
      console.error("Registration error:", err);
      console.error("Registration server response:", err.response?.data);

      const serverMessage =
        err.response?.data?.message ||
        err.response?.data?.error ||
        "Registration failed.";

      setError(serverMessage);
    } finally {
      setLoading(false);
    }
  };

  // ===================================================
  // VERIFY OTP
  // ===================================================

  const handleVerifyOTP = async (otp) => {
    try {
      setOtpLoading(true);
      setOtpError("");

      const cleanOTP = String(otp).replace(/\D/g, "").trim();

      if (cleanOTP.length !== 6) {
        setOtpError("Please enter the complete 6-digit OTP.");
        return;
      }

      const email = otpEmail.trim().toLowerCase();

      const response = await axios.post(
        `${API_URL}/verify-registration`,
        {
          email,
          otp: cleanOTP,
          purpose: "REGISTER",
        },
        {
          withCredentials: true,
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      console.log("OTP VERIFICATION RESPONSE:", response.data);

      setOtpError("");
      setShowOTPModal(false);

      navigate("/success", {
        state: {
          type: "register",
          email,
          username: form.username.trim(),
        },
      });
    } catch (err) {
      console.error("OTP verification error:", err);
      console.error("OTP server response:", err.response?.data);

      const message =
        err.response?.data?.message ||
        err.response?.data?.error ||
        "Invalid or expired OTP.";

      setOtpError(message);
    } finally {
      setOtpLoading(false);
    }
  };

  // ===================================================
  // RESEND OTP
  // ===================================================

  const handleResendOTP = async () => {
    try {
      setOtpError("");

      const username = form.username.trim();
      const email = otpEmail.trim().toLowerCase();

      const response = await axios.post(
        `${API_URL}/register`,
        {
          username,
          email,
          password: form.password,
        },
        {
          withCredentials: true,
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      console.log("RESEND OTP RESPONSE:", response.data);

      setSuccess(response.data?.message || "OTP sent successfully!");

      return response.data;
    } catch (err) {
      console.error("Resend OTP error:", err);

      const message =
        err.response?.data?.message ||
        err.response?.data?.error ||
        "Unable to resend OTP.";

      setOtpError(message);

      throw err;
    }
  };

  // ===================================================
  // GOOGLE
  // ===================================================

  const handleGoogle = () => {
    console.log("Google registration");
  };

  // ===================================================
  // NAVIGATION
  // ===================================================

  const handleHome = () => {
    navigate("/");
  };

  const handleLogin = () => {
    navigate("/login");
  };

  // ===================================================
  // BUTTON STATE
  // ===================================================

  const isButtonDisabled =
    loading || usernameStatus === "checking" || emailStatus === "checking";

  // ===================================================
  // UI
  // ===================================================

  return (
    <main
      className={`min-h-screen w-full overflow-hidden transition-all duration-500 ease-in-out ${
        darkMode ? "bg-[#08070b] text-[#f4f0df]" : "bg-[#eee9dc] text-[#17131f]"
      }`}
    >
      {/* BACKGROUND */}

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          className={`absolute -left-52 -top-52 h-[500px] w-[500px] rounded-full blur-[150px] transition-all duration-1000 ${
            darkMode ? "bg-purple-700/15" : "bg-purple-400/15"
          }`}
        />

        <div
          className={`absolute -right-52 top-1/3 h-[500px] w-[500px] rounded-full blur-[150px] transition-all duration-1000 ${
            darkMode ? "bg-indigo-700/10" : "bg-indigo-400/10"
          }`}
        />

        <div
          className={`absolute bottom-[-200px] left-1/3 h-[450px] w-[450px] rounded-full blur-[150px] transition-all duration-1000 ${
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

      {/* HEADER */}

      <header
        className={`relative z-30 mx-auto flex h-16 max-w-[1600px] items-center justify-between border-b px-5 transition-colors duration-500 sm:px-8 lg:px-14 xl:px-20 ${
          darkMode ? "border-purple-500/10" : "border-purple-900/10"
        }`}
      >
        <button
          type="button"
          onClick={handleHome}
          aria-label="Go to home page"
          className="group flex items-center gap-3"
        >
          <div className="flex h-9 w-9 items-center justify-center border-2 border-purple-500 bg-purple-600 shadow-[3px_3px_0px_#312e81] transition-all duration-300 group-hover:-translate-y-0.5 group-hover:shadow-[4px_4px_0px_#312e81]">
            <FiCpu size={17} />
          </div>

          <div className="text-left">
            <p className="font-mono text-xs font-black tracking-[0.18em]">
              AI INTERVIEW
            </p>

            <p
              className={`font-mono text-[8px] tracking-[0.25em] transition-colors ${
                darkMode ? "text-white/30" : "text-black/40"
              }`}
            >
              CANDIDATE PORTAL
            </p>
          </div>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleHome}
            className={`flex h-9 items-center gap-2 border-2 px-3 font-mono text-[8px] font-bold uppercase tracking-wider transition-all duration-300 ${
              darkMode
                ? "border-[#302c38] bg-[#15131a] text-white/70 hover:border-purple-500 hover:bg-purple-500/10 hover:text-white"
                : "border-black/15 bg-white/70 text-black/60 hover:border-purple-500 hover:text-purple-700"
            }`}
          >
            <FiHome size={13} />
            Home
          </button>

          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className={`flex h-9 w-9 items-center justify-center border-2 transition-all duration-300 hover:rotate-12 ${
              darkMode
                ? "border-[#302c38] bg-[#15131a] text-yellow-300 hover:border-purple-500"
                : "border-black/15 bg-white/70 text-purple-700 hover:border-purple-500"
            }`}
          >
            {darkMode ? <FiSun size={16} /> : <FiMoon size={16} />}
          </button>
        </div>
      </header>

      {/* MAIN */}

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
        {/* LEFT */}

        <section className="hidden min-h-0 lg:flex">
          <div className="w-full max-w-3xl">
            <div className="mb-4">
              <div
                className={`inline-flex items-center gap-2 border px-3 py-1.5 font-mono text-[8px] tracking-[0.2em] transition-all duration-500 ${
                  darkMode
                    ? "border-purple-500/25 bg-purple-500/5 text-purple-300"
                    : "border-purple-500/25 bg-purple-500/10 text-purple-700"
                }`}
              >
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-400" />
                CREATE YOUR PROFILE
              </div>
            </div>

            <h1 className="font-mono text-5xl font-black uppercase leading-[0.9] tracking-tight xl:text-6xl">
              Start your
              <br />
              <span className="text-purple-500">journey.</span>
            </h1>

            <p
              className={`mt-4 max-w-xl font-mono text-xs leading-5 transition-colors xl:text-sm ${
                darkMode ? "text-white/40" : "text-black/55"
              }`}
            >
              Create your candidate profile and unlock intelligent interview
              preparation, personalized practice sessions, progress tracking,
              and career-focused insights.
            </p>

            <div
              className={`mt-5 max-w-xl border-2 px-4 py-3 font-mono transition-all duration-500 ${
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

        {/* RIGHT */}

        <section className="flex min-h-0 w-full items-center justify-center">
          <div className="w-full max-w-[450px]">
            <div
              className={`border-2 transition-all duration-500 ${
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

              {/* BODY */}

              <div className="px-5 py-3">
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
                  className={`flex h-8 w-full items-center justify-center gap-3 border-2 font-mono text-[8px] font-bold uppercase tracking-wide transition-all duration-300 ${
                    darkMode
                      ? "border-[#302c38] bg-[#18161d] hover:border-purple-500 hover:bg-purple-500/10"
                      : "border-black/15 bg-white hover:border-purple-500 hover:bg-purple-500/5"
                  }`}
                >
                  <FcGoogle size={14} />
                  Continue with Google
                </button>

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

                  <div>
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
                      isValid={usernameStatus === "available"}
                      isInvalid={
                        usernameStatus === "unavailable" ||
                        usernameStatus === "error"
                      }
                    />

                    {form.username.trim().length > 0 && (
                      <StatusMessage
                        status={usernameStatus}
                        message={usernameMessage}
                      />
                    )}
                  </div>

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
                      isValid={emailTouched && emailStatus === "valid"}
                      isInvalid={emailTouched && emailStatus === "invalid"}
                    />

                    {emailTouched &&
                      form.email.trim().length > 0 &&
                      emailStatus === "checking" && (
                        <StatusMessage
                          status="checking"
                          message={emailMessage || "VALIDATING EMAIL..."}
                        />
                      )}

                    {emailTouched && emailStatus === "valid" && (
                      <StatusMessage
                        status="available"
                        message={emailMessage || "EMAIL ACCEPTED"}
                      />
                    )}

                    {emailTouched && emailStatus === "invalid" && (
                      <StatusMessage
                        status="unavailable"
                        message={emailMessage || "EMAIL REJECTED"}
                      />
                    )}
                  </div>

                  {/* PASSWORD */}

                  <PasswordField
                    label="Password"
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    showPassword={showPassword}
                    setShowPassword={setShowPassword}
                    placeholder="Create password"
                    darkMode={darkMode}
                  />

                  {/* PASSWORD STRENGTH */}

                  {form.password.length > 0 && (
                    <div className="mt-1">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((level) => (
                          <div
                            key={level}
                            className={`h-[3px] flex-1 transition-all duration-300 ${
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

                  {/* CONFIRM PASSWORD */}

                  <div>
                    <PasswordField
                      label="Confirm Password"
                      name="confirmPassword"
                      value={form.confirmPassword}
                      onChange={handleChange}
                      showPassword={showConfirmPassword}
                      setShowPassword={setShowConfirmPassword}
                      placeholder="Confirm password"
                      darkMode={darkMode}
                      isValid={passwordsMatch}
                      isInvalid={passwordsDoNotMatch}
                    />

                    {passwordsMatch && (
                      <StatusMessage
                        status="available"
                        message="PASSWORDS MATCH"
                      />
                    )}

                    {passwordsDoNotMatch && (
                      <StatusMessage
                        status="unavailable"
                        message="PASSWORDS DO NOT MATCH"
                      />
                    )}
                  </div>

                  {/* TERMS AND CONDITIONS */}

                  <label
                    className={`group flex cursor-pointer items-start gap-2 rounded border-2 p-2 transition-all duration-300 ${
                      termsAccepted
                        ? darkMode
                          ? "border-green-500/40 bg-green-500/5"
                          : "border-green-500/40 bg-green-500/5"
                        : darkMode
                          ? "border-transparent hover:border-purple-500/20"
                          : "border-transparent hover:border-purple-500/20"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={termsAccepted}
                      onChange={handleTermsChange}
                      className="mt-0.5 h-3 w-3 cursor-pointer accent-purple-600"
                    />

                    <span
                      className={`font-mono text-[6px] uppercase leading-3 transition-colors ${
                        termsAccepted
                          ? "text-green-400"
                          : darkMode
                            ? "text-white/30"
                            : "text-black/45"
                      }`}
                    >
                      I agree to the{" "}
                      <span className="font-bold text-purple-400">
                        Terms & Conditions
                      </span>{" "}
                      and{" "}
                      <span className="font-bold text-purple-400">
                        Privacy Policy
                      </span>
                    </span>

                    {termsAccepted && (
                      <FiCheck
                        size={11}
                        className="ml-auto shrink-0 text-green-400"
                      />
                    )}
                  </label>

                  {/* ERROR */}

                  {error && (
                    <div className="animate-[fadeIn_0.2s_ease-out] border border-red-500/30 bg-red-500/5 px-2 py-1.5">
                      <p className="font-mono text-[6px] font-bold uppercase text-red-400">
                        {error}
                      </p>
                    </div>
                  )}

                  {/* SUCCESS */}

                  {success && (
                    <div className="animate-[fadeIn_0.2s_ease-out] border border-green-500/30 bg-green-500/5 px-2 py-1.5">
                      <p className="font-mono text-[6px] font-bold uppercase text-green-400">
                        ✓ {success}
                      </p>
                    </div>
                  )}

                  {/* SUBMIT */}

                  <button
                    type="submit"
                    disabled={isButtonDisabled}
                    className={`group flex h-9 w-full items-center justify-center gap-3 border-2 border-purple-400 bg-purple-600 font-mono text-[8px] font-black uppercase tracking-widest text-white shadow-[3px_3px_0px_#312e81] transition-all duration-300 ${
                      isButtonDisabled
                        ? "cursor-not-allowed opacity-50"
                        : "hover:-translate-y-0.5 hover:bg-purple-500 hover:shadow-[4px_4px_0px_#312e81] active:translate-y-0 active:shadow-[1px_1px_0px_#312e81]"
                    }`}
                  >
                    {loading ? (
                      <>
                        <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        Creating Account...
                      </>
                    ) : usernameStatus === "checking" ? (
                      <>Checking Username...</>
                    ) : emailStatus === "checking" ? (
                      <>Validating Email...</>
                    ) : !termsAccepted ? (
                      <>
                        Accept Terms
                        <FiLock size={12} />
                      </>
                    ) : (
                      <>
                        Create Account
                        <FiArrowRight
                          size={13}
                          className="transition-transform duration-300 group-hover:translate-x-1"
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
                    className="group mt-0.5 inline-flex items-center gap-2 font-mono text-[9px] font-black uppercase tracking-wider text-purple-500 transition-colors hover:text-purple-400"
                  >
                    Sign In
                    <FiArrowRight
                      size={11}
                      className="transition-transform duration-300 group-hover:translate-x-1"
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

      {/* OTP MODAL */}

      <OTPModal
        isOpen={showOTPModal}
        email={otpEmail}
        darkMode={darkMode}
        loading={otpLoading}
        error={otpError}
        purpose="REGISTER"
        onClose={() => {
          if (!otpLoading) {
            setShowOTPModal(false);
            setOtpError("");
          }
        }}
        onVerify={handleVerifyOTP}
        onResend={handleResendOTP}
      />
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
        className={`flex h-8 border-2 transition-all duration-300 focus-within:border-purple-500 ${
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
// PASSWORD FIELD
// =====================================================

const PasswordField = ({
  label,
  name,
  value,
  onChange,
  showPassword,
  setShowPassword,
  placeholder,
  darkMode,
  isValid = false,
  isInvalid = false,
}) => {
  return (
    <div>
      <label className="mb-0.5 block font-mono text-[7px] font-bold uppercase tracking-widest opacity-60">
        {label}
      </label>

      <div
        className={`flex h-8 border-2 transition-all duration-300 focus-within:border-purple-500 ${
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
          <FiLock size={13} />
        </div>

        <input
          name={name}
          value={value}
          onChange={onChange}
          type={showPassword ? "text" : "password"}
          placeholder={placeholder}
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
          className={`flex w-8 shrink-0 items-center justify-center border-l-2 border-inherit transition-colors hover:text-purple-400 ${
            darkMode ? "text-white/30" : "text-black/30"
          }`}
          aria-label={showPassword ? "Hide password" : "Show password"}
        >
          {showPassword ? <FiEyeOff size={13} /> : <FiEye size={13} />}
        </button>
      </div>
    </div>
  );
};

// =====================================================
// STATUS MESSAGE
// =====================================================

const StatusMessage = ({ status, message }) => {
  const isChecking = status === "checking";
  const isSuccess = status === "available";
  const isError =
    status === "unavailable" || status === "invalid" || status === "error";

  return (
    <div
      className={`mt-0.5 flex items-center gap-1 font-mono text-[6px] font-bold ${
        isSuccess
          ? "text-green-400"
          : isError
            ? "text-red-400"
            : isChecking
              ? "text-yellow-400"
              : "text-white/30"
      }`}
    >
      {isChecking && (
        <span className="h-2 w-2 animate-spin rounded-full border border-yellow-400/30 border-t-yellow-400" />
      )}

      {isSuccess && <FiCheck size={8} />}

      {isError && <FiX size={8} />}

      {message}
    </div>
  );
};

// =====================================================
// PASSWORD REQUIREMENT
// =====================================================

const PasswordRequirement = ({ valid, text, darkMode }) => {
  return (
    <div
      className={`flex items-center gap-1 font-mono text-[5px] transition-colors duration-300 ${
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
      className={`group border-2 p-3 transition-all duration-300 hover:-translate-y-1 ${
        darkMode
          ? "border-[#292630] bg-[#111014] hover:border-purple-500/40"
          : "border-black/10 bg-white/50 hover:border-purple-500/30"
      }`}
    >
      <div
        className={`mb-2 transition-transform duration-300 group-hover:scale-110 ${iconClass}`}
      >
        {icon}
      </div>

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
