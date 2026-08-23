import { useEffect, useRef, useState } from "react";
import {
  FiArrowRight,
  FiCheck,
  FiClock,
  FiMail,
  FiRefreshCw,
  FiShield,
  FiX,
} from "react-icons/fi";

const OTP_LENGTH = 6;
const RESEND_TIME = 60;

const OTPModal = ({
  isOpen,
  email = "",
  darkMode,
  loading = false,
  error = "",
  purpose = "verification",
  resendCooldown = RESEND_TIME,
  onClose,
  onVerify,
  onResend,
}) => {
  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(""));

  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState("");
  const [timer, setTimer] = useState(resendCooldown);

  const inputRefs = useRef([]);

  // =====================================================
  // RESET MODAL
  // =====================================================

  useEffect(() => {
    if (!isOpen) return;

    setOtp(Array(OTP_LENGTH).fill(""));
    setResendMessage("");

    setTimer(
      typeof resendCooldown === "number" && resendCooldown > 0
        ? resendCooldown
        : 0,
    );

    const timeout = setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 100);

    return () => clearTimeout(timeout);
  }, [isOpen, resendCooldown]);

  // =====================================================
  // COUNTDOWN
  // =====================================================

  useEffect(() => {
    if (!isOpen || timer <= 0) return;

    const interval = setInterval(() => {
      setTimer((previous) => {
        if (previous <= 1) {
          clearInterval(interval);
          return 0;
        }

        return previous - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, timer]);

  if (!isOpen) {
    return null;
  }

  const otpValue = otp.join("");
  const isComplete = otpValue.length === OTP_LENGTH;

  // =====================================================
  // TITLE
  // =====================================================

  const getTitle = () => {
    switch (purpose) {
      case "register":
      case "REGISTER":
        return "Verify your account";

      case "forgot-password":
      case "FORGOT_PASSWORD":
        return "Verify password reset";

      case "forgot-user-id":
      case "forgot-id":
      case "FORGOT_USER_ID":
      case "FORGOT_ID":
        return "Verify User ID";

      default:
        return "Verify your email";
    }
  };

  // =====================================================
  // DESCRIPTION
  // =====================================================

  const getDescription = () => {
    switch (purpose) {
      case "register":
      case "REGISTER":
        return "Enter the verification code sent to your email.";

      case "forgot-password":
      case "FORGOT_PASSWORD":
        return "Enter the code sent to your email to continue.";

      case "forgot-user-id":
      case "forgot-id":
      case "FORGOT_USER_ID":
      case "FORGOT_ID":
        return "Enter the code sent to your email to recover your account ID.";

      default:
        return "Enter the verification code sent to your email.";
    }
  };

  // =====================================================
  // OTP CHANGE
  // =====================================================

  const handleChange = (index, value) => {
    const numericValue = value.replace(/\D/g, "");

    if (!numericValue) {
      setOtp((previous) => {
        const updated = [...previous];
        updated[index] = "";
        return updated;
      });

      return;
    }

    // Paste multiple digits into current position
    if (numericValue.length > 1) {
      const newOtp = [...otp];

      numericValue
        .slice(0, OTP_LENGTH - index)
        .split("")
        .forEach((digit, offset) => {
          newOtp[index + offset] = digit;
        });

      setOtp(newOtp);

      const nextIndex = Math.min(index + numericValue.length, OTP_LENGTH - 1);

      inputRefs.current[nextIndex]?.focus();

      return;
    }

    const digit = numericValue.slice(-1);

    setOtp((previous) => {
      const updated = [...previous];
      updated[index] = digit;
      return updated;
    });

    if (index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // =====================================================
  // KEYBOARD
  // =====================================================

  const handleKeyDown = (index, event) => {
    if (event.key === "Backspace") {
      event.preventDefault();

      if (otp[index]) {
        setOtp((previous) => {
          const updated = [...previous];
          updated[index] = "";
          return updated;
        });

        return;
      }

      if (index > 0) {
        setOtp((previous) => {
          const updated = [...previous];
          updated[index - 1] = "";
          return updated;
        });

        inputRefs.current[index - 1]?.focus();
      }

      return;
    }

    if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();

      inputRefs.current[index - 1]?.focus();

      return;
    }

    if (event.key === "ArrowRight" && index < OTP_LENGTH - 1) {
      event.preventDefault();

      inputRefs.current[index + 1]?.focus();
    }
  };

  // =====================================================
  // PASTE
  // =====================================================

  const handlePaste = (event) => {
    event.preventDefault();

    const pastedValue = event.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, OTP_LENGTH);

    if (!pastedValue) return;

    const newOtp = Array(OTP_LENGTH).fill("");

    pastedValue.split("").forEach((digit, index) => {
      newOtp[index] = digit;
    });

    setOtp(newOtp);

    const nextIndex = Math.min(pastedValue.length, OTP_LENGTH - 1);

    inputRefs.current[nextIndex]?.focus();
  };

  // =====================================================
  // VERIFY
  // =====================================================

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (loading || !isComplete) {
      return;
    }

    try {
      await onVerify(otpValue);
    } catch (err) {
      console.error("OTP verification error:", err);
    }
  };

  // =====================================================
  // RESEND
  // =====================================================

  const handleResend = async () => {
    if (timer > 0 || resendLoading || loading) {
      return;
    }

    try {
      setResendLoading(true);
      setResendMessage("");

      const response = await onResend();

      const remainingSeconds =
        Number(response?.remainingSeconds) ||
        Number(response?.data?.remainingSeconds) ||
        RESEND_TIME;

      setTimer(remainingSeconds);

      setOtp(Array(OTP_LENGTH).fill(""));

      setResendMessage("New code sent");

      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);
    } catch (err) {
      console.error("Resend OTP error:", err);

      const remainingSeconds =
        Number(err?.response?.data?.remainingSeconds) || 0;

      if (remainingSeconds > 0) {
        setTimer(remainingSeconds);
      }

      setResendMessage(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          "Could not resend code",
      );
    } finally {
      setResendLoading(false);
    }
  };

  const isResendError =
    resendMessage.toLowerCase().includes("could") ||
    resendMessage.toLowerCase().includes("wait") ||
    resendMessage.toLowerCase().includes("error");

  // =====================================================
  // UI
  // =====================================================

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="otp-modal-title"
    >
      {/* BACKDROP */}
      <div
        className={`absolute inset-0 backdrop-blur-md ${
          darkMode ? "bg-black/75" : "bg-black/45"
        }`}
        onClick={!loading && !resendLoading ? onClose : undefined}
      />

      {/* MODAL */}
      <div
        className={`relative z-10 w-full max-w-[410px] overflow-hidden border shadow-2xl ${
          darkMode
            ? "border-purple-500/30 bg-[#0b0810]"
            : "border-purple-500/30 bg-white"
        }`}
      >
        {/* TOP ACCENT */}
        <div className="h-[2px] bg-gradient-to-r from-purple-500 via-fuchsia-400 to-purple-500" />

        {/* HEADER */}
        <div
          className={`flex items-center justify-between border-b px-5 py-4 ${
            darkMode ? "border-white/10" : "border-black/10"
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`flex h-9 w-9 items-center justify-center border ${
                darkMode
                  ? "border-purple-400/30 bg-purple-500/10 text-purple-400"
                  : "border-purple-500/30 bg-purple-50 text-purple-600"
              }`}
            >
              <FiShield size={17} />
            </div>

            <span
              className={`font-mono text-[9px] font-bold uppercase tracking-[0.16em] ${
                darkMode ? "text-white/70" : "text-black/70"
              }`}
            >
              Secure verification
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={loading || resendLoading}
            aria-label="Close OTP modal"
            className={`flex h-8 w-8 items-center justify-center border transition ${
              darkMode
                ? "border-white/10 text-white/40 hover:border-red-400/50 hover:text-red-400"
                : "border-black/10 text-black/40 hover:border-red-400/50 hover:text-red-500"
            }`}
          >
            <FiX size={14} />
          </button>
        </div>

        {/* BODY */}
        <div className="px-5 py-7 sm:px-7">
          {/* TITLE */}
          <div className="text-center">
            <div
              className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center border ${
                darkMode
                  ? "border-purple-400/30 bg-purple-500/10 text-purple-400"
                  : "border-purple-500/30 bg-purple-50 text-purple-600"
              }`}
            >
              <FiMail size={21} />
            </div>

            <h2
              id="otp-modal-title"
              className={`font-mono text-xl font-black tracking-tight ${
                darkMode ? "text-white" : "text-black"
              }`}
            >
              {getTitle()}
            </h2>

            <p
              className={`mx-auto mt-2 max-w-[300px] font-mono text-[8px] leading-4 ${
                darkMode ? "text-white/40" : "text-black/45"
              }`}
            >
              {getDescription()}
            </p>

            {/* MASKED EMAIL */}
            <div
              className={`mx-auto mt-4 inline-flex max-w-full items-center gap-2 border px-3 py-2 ${
                darkMode
                  ? "border-purple-500/20 bg-purple-500/5"
                  : "border-purple-500/20 bg-purple-50"
              }`}
            >
              <FiMail
                size={10}
                className={darkMode ? "text-purple-400" : "text-purple-600"}
              />

              <span
                className={`truncate font-mono text-[8px] font-bold ${
                  darkMode ? "text-purple-400" : "text-purple-700"
                }`}
              >
                {email || "your registered email"}
              </span>
            </div>
          </div>

          {/* FORM */}
          <form onSubmit={handleSubmit} className="mt-8">
            {/* OTP INPUTS */}
            <div className="flex justify-center gap-2.5 sm:gap-3">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={(element) => {
                    inputRefs.current[index] = element;
                  }}
                  type="text"
                  inputMode="numeric"
                  autoComplete={index === 0 ? "one-time-code" : "off"}
                  maxLength={OTP_LENGTH}
                  value={digit}
                  disabled={loading || resendLoading}
                  onChange={(event) => handleChange(index, event.target.value)}
                  onKeyDown={(event) => handleKeyDown(index, event)}
                  onPaste={handlePaste}
                  aria-label={`OTP digit ${index + 1}`}
                  className={`h-12 w-10 border text-center font-mono text-lg font-black outline-none transition-all sm:h-13 sm:w-11 ${
                    digit
                      ? darkMode
                        ? "border-green-400 bg-green-400/10 text-green-400"
                        : "border-green-500 bg-green-50 text-green-700"
                      : darkMode
                        ? "border-white/10 bg-white/[0.03] text-white"
                        : "border-black/10 bg-black/[0.02] text-black"
                  } focus:border-purple-400 focus:ring-1 focus:ring-purple-400/20`}
                />
              ))}
            </div>

            {/* ERROR */}
            {error && (
              <div
                className={`mt-4 flex items-center gap-2 border px-3 py-2 ${
                  darkMode
                    ? "border-red-400/20 bg-red-500/5 text-red-400"
                    : "border-red-400/30 bg-red-50 text-red-500"
                }`}
              >
                <FiX size={12} />

                <p className="font-mono text-[7px] font-bold">{error}</p>
              </div>
            )}

            {/* RESEND MESSAGE */}
            {resendMessage && (
              <div
                className={`mt-3 flex items-center justify-center gap-1 font-mono text-[7px] font-bold ${
                  isResendError ? "text-red-400" : "text-green-400"
                }`}
              >
                {!isResendError && <FiCheck size={9} />}

                {resendMessage}
              </div>
            )}

            {/* VERIFY */}
            <button
              type="submit"
              disabled={loading || resendLoading || !isComplete}
              className={`group mt-5 flex h-11 w-full items-center justify-center gap-2 border font-mono text-[8px] font-black uppercase tracking-[0.15em] transition-all ${
                loading || resendLoading || !isComplete
                  ? darkMode
                    ? "cursor-not-allowed border-purple-500/20 bg-purple-500/5 text-white/20"
                    : "cursor-not-allowed border-purple-500/20 bg-purple-50 text-black/30"
                  : darkMode
                    ? "border-purple-400 bg-purple-600 text-white hover:bg-purple-500"
                    : "border-purple-600 bg-purple-600 text-white hover:bg-purple-500"
              }`}
            >
              {loading ? (
                <>
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Verifying...
                </>
              ) : (
                <>
                  Verify code
                  <FiArrowRight
                    size={13}
                    className="transition-transform group-hover:translate-x-1"
                  />
                </>
              )}
            </button>
          </form>

          {/* RESEND */}
          <div className="mt-5 text-center">
            {timer > 0 ? (
              <div
                className={`inline-flex items-center gap-2 font-mono text-[7px] ${
                  darkMode ? "text-white/30" : "text-black/40"
                }`}
              >
                <FiClock size={10} />
                Resend code in
                <span
                  className={
                    darkMode
                      ? "font-bold text-purple-400"
                      : "font-bold text-purple-600"
                  }
                >
                  {timer}s
                </span>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                disabled={resendLoading || loading}
                className={`inline-flex items-center gap-2 font-mono text-[7px] font-bold uppercase tracking-wider transition disabled:opacity-40 ${
                  darkMode
                    ? "text-purple-400 hover:text-purple-300"
                    : "text-purple-600 hover:text-purple-500"
                }`}
              >
                <FiRefreshCw
                  size={10}
                  className={resendLoading ? "animate-spin" : ""}
                />

                {resendLoading ? "Sending..." : "Resend code"}
              </button>
            )}
          </div>

          {/* FOOTNOTE */}
          <p
            className={`mt-6 text-center font-mono text-[6px] uppercase tracking-widest ${
              darkMode ? "text-white/15" : "text-black/20"
            }`}
          >
            Never share your verification code
          </p>
        </div>
      </div>
    </div>
  );
};

export default OTPModal;
