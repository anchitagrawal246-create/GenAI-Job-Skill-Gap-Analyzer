
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
  email,
  darkMode,
  loading = false,
  error = "",
  purpose = "verification",

  // Backend should provide the actual remaining cooldown.
  resendCooldown = 60,

  onClose,
  onVerify,
  onResend,
}) => {
  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(""));
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState("");
  const [timer, setTimer] = useState(resendCooldown);

  const inputRefs = useRef([]);

  /*
   * Reset modal state whenever it opens.
   */
  useEffect(() => {
    if (!isOpen) return;

    setOtp(Array(OTP_LENGTH).fill(""));
    setResendMessage("");

    // IMPORTANT:
    // Use backend-provided cooldown instead of always assuming 60.
    setTimer(
      typeof resendCooldown === "number" && resendCooldown > 0
        ? resendCooldown
        : 0
    );

    const timeout = setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 100);

    return () => clearTimeout(timeout);
  }, [isOpen, resendCooldown]);

  /*
   * Countdown timer.
   *
   * The backend/Redis decides the initial value.
   * Frontend only counts down locally.
   */
  useEffect(() => {
    if (!isOpen || timer <= 0) return;

    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }

        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, timer]);

  if (!isOpen) return null;

  const otpValue = otp.join("");

  /*
   * Modal title.
   */
  const getTitle = () => {
    switch (purpose) {
      case "register":
      case "REGISTER":
        return "Verify your account";

      case "forgot-password":
      case "FORGOT_PASSWORD":
        return "Verify password reset";

      case "forgot-id":
      case "FORGOT_ID":
        return "Verify your identity";

      default:
        return "Verify your email";
    }
  };

  /*
   * Modal description.
   */
  const getDescription = () => {
    switch (purpose) {
      case "register":
      case "REGISTER":
        return "Enter the verification code sent to your email to complete registration.";

      case "forgot-password":
      case "FORGOT_PASSWORD":
        return "Enter the verification code sent to your email to continue resetting your password.";

      case "forgot-id":
      case "FORGOT_ID":
        return "Enter the verification code sent to your email to recover your account ID.";

      default:
        return "Enter the verification code sent to your email.";
    }
  };

  /*
   * Handle OTP input.
   */
  const handleChange = (index, value) => {
    const numericValue = value.replace(/\D/g, "");

    /*
     * User deleted the value.
     */
    if (!numericValue) {
      setOtp((prev) => {
        const updated = [...prev];
        updated[index] = "";
        return updated;
      });

      return;
    }

    /*
     * If multiple digits are entered/pasted
     * into one field, distribute them.
     */
    if (numericValue.length > 1) {
      const newOtp = [...otp];

      numericValue
        .slice(0, OTP_LENGTH - index)
        .split("")
        .forEach((digit, offset) => {
          newOtp[index + offset] = digit;
        });

      setOtp(newOtp);

      const filledCount = Math.min(
        index + numericValue.length,
        OTP_LENGTH
      );

      const nextIndex = Math.min(
        filledCount,
        OTP_LENGTH - 1
      );

      inputRefs.current[nextIndex]?.focus();

      return;
    }

    /*
     * Normal single digit input.
     */
    const digit = numericValue.slice(-1);

    setOtp((prev) => {
      const updated = [...prev];
      updated[index] = digit;
      return updated;
    });

    /*
     * Move to next input.
     */
    if (index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  /*
   * Keyboard controls.
   */
  const handleKeyDown = (index, event) => {
    /*
     * Backspace.
     */
    if (event.key === "Backspace") {
      event.preventDefault();

      if (otp[index]) {
        setOtp((prev) => {
          const updated = [...prev];
          updated[index] = "";
          return updated;
        });

        return;
      }

      /*
       * If current field is empty,
       * move to previous field.
       */
      if (index > 0) {
        setOtp((prev) => {
          const updated = [...prev];
          updated[index - 1] = "";
          return updated;
        });

        inputRefs.current[index - 1]?.focus();
      }

      return;
    }

    /*
     * Left arrow.
     */
    if (
      event.key === "ArrowLeft" &&
      index > 0
    ) {
      event.preventDefault();

      inputRefs.current[index - 1]?.focus();

      return;
    }

    /*
     * Right arrow.
     */
    if (
      event.key === "ArrowRight" &&
      index < OTP_LENGTH - 1
    ) {
      event.preventDefault();

      inputRefs.current[index + 1]?.focus();

      return;
    }
  };

  /*
   * Handle complete OTP paste.
   */
  const handlePaste = (event) => {
    event.preventDefault();

    const pastedValue = event.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, OTP_LENGTH);

    if (!pastedValue) return;

    const newOtp = Array(OTP_LENGTH).fill("");

    pastedValue
      .split("")
      .forEach((digit, index) => {
        newOtp[index] = digit;
      });

    setOtp(newOtp);

    /*
     * Focus the last filled field.
     */
    const nextIndex = Math.min(
      pastedValue.length,
      OTP_LENGTH - 1
    );

    inputRefs.current[nextIndex]?.focus();
  };

  /*
   * Verify OTP.
   */
  const handleSubmit = async (event) => {
    event.preventDefault();

    if (loading) return;

    if (otpValue.length !== OTP_LENGTH) {
      return;
    }

    try {
      await onVerify(otpValue);
    } catch (err) {
      console.error(
        "OTP verification error:",
        err
      );
    }
  };

  /*
   * Resend OTP.
   *
   * IMPORTANT:
   * onResend() MUST return response.data
   * from Register.jsx.
   */
  const handleResend = async () => {
    if (
      timer > 0 ||
      resendLoading ||
      loading
    ) {
      return;
    }

    try {
      setResendLoading(true);
      setResendMessage("");

      const response = await onResend();

      /*
       * Backend should return:
       *
       * {
       *   success: true,
       *   message: "...",
       *   remainingSeconds: 60
       * }
       */
      const remainingSeconds =
        Number(response?.remainingSeconds) ||
        RESEND_TIME;

      setTimer(remainingSeconds);

      /*
       * Clear old OTP.
       */
      setOtp(Array(OTP_LENGTH).fill(""));

      setResendMessage("NEW OTP SENT");

      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);
    } catch (err) {
      console.error(
        "Resend OTP error:",
        err
      );

      /*
       * Backend may reject the request with:
       *
       * {
       *   remainingSeconds: 55
       * }
       *
       * Synchronize frontend with Redis.
       */
      const remainingSeconds =
        Number(
          err?.response?.data?.remainingSeconds
        ) || 0;

      if (remainingSeconds > 0) {
        setTimer(remainingSeconds);
      }

      setResendMessage(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "COULD NOT RESEND OTP"
      );
    } finally {
      setResendLoading(false);
    }
  };

  const isResendError =
    resendMessage.startsWith("COULD NOT") ||
    resendMessage.startsWith("Please wait") ||
    resendMessage.startsWith("Please");

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="otp-modal-title"
    >
      {/* BACKDROP */}
      <div
        className={`absolute inset-0 backdrop-blur-xl ${
          darkMode
            ? "bg-black/75"
            : "bg-black/45"
        }`}
        onClick={
          !loading && !resendLoading
            ? onClose
            : undefined
        }
      />

      {/* MODAL */}
      <div
        className={`relative z-10 w-full max-w-[430px] overflow-hidden rounded-2xl border shadow-2xl backdrop-blur-2xl ${
          darkMode
            ? "border-white/10 bg-[#111014]/90 shadow-purple-950/40"
            : "border-white/50 bg-white/80 shadow-purple-900/20"
        }`}
      >
        {/* TOP GLOW */}
        <div className="pointer-events-none absolute -left-20 -top-20 h-48 w-48 rounded-full bg-purple-600/20 blur-[80px]" />

        <div className="pointer-events-none absolute -bottom-20 -right-20 h-48 w-48 rounded-full bg-indigo-600/20 blur-[80px]" />

        {/* HEADER */}
        <div
          className={`relative flex items-center justify-between border-b px-5 py-4 ${
            darkMode
              ? "border-white/10"
              : "border-black/10"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-purple-400/30 bg-purple-500/15 text-purple-400 shadow-lg shadow-purple-900/20">
              <FiShield size={19} />
            </div>

            <div>
              <p className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-purple-400">
                Secure Verification
              </p>

              <p
                className={`mt-1 font-mono text-[7px] uppercase tracking-wider ${
                  darkMode
                    ? "text-white/35"
                    : "text-black/40"
                }`}
              >
                One Time Password
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={
              loading || resendLoading
            }
            aria-label="Close OTP modal"
            className={`flex h-8 w-8 items-center justify-center rounded-lg border transition ${
              darkMode
                ? "border-white/10 bg-white/5 text-white/40 hover:border-red-400/40 hover:bg-red-500/10 hover:text-red-400"
                : "border-black/10 bg-black/5 text-black/40 hover:border-red-400/40 hover:bg-red-500/10 hover:text-red-500"
            }`}
          >
            <FiX size={15} />
          </button>
        </div>

        {/* BODY */}
        <div className="relative px-5 py-6 sm:px-7">
          {/* INTRO */}
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-purple-400/30 bg-purple-500/10 text-purple-400 shadow-lg shadow-purple-900/20">
              <FiMail size={24} />
            </div>

            <h2
              id="otp-modal-title"
              className={`font-mono text-xl font-black uppercase tracking-tight ${
                darkMode
                  ? "text-white"
                  : "text-black"
              }`}
            >
              {getTitle()}
            </h2>

            <p
              className={`mx-auto mt-2 max-w-[320px] font-mono text-[8px] leading-4 ${
                darkMode
                  ? "text-white/40"
                  : "text-black/45"
              }`}
            >
              {getDescription()}
            </p>

            {/* EMAIL */}
            <div className="mx-auto mt-3 inline-flex max-w-full items-center rounded-lg border border-purple-500/20 bg-purple-500/5 px-3 py-2">
              <span className="truncate font-mono text-[8px] font-bold text-purple-400">
                {email}
              </span>
            </div>
          </div>

          {/* OTP FORM */}
          <form
            onSubmit={handleSubmit}
            className="mt-7"
          >
            <div className="flex justify-center gap-2 sm:gap-3">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={(element) => {
                    inputRefs.current[index] =
                      element;
                  }}
                  type="text"
                  inputMode="numeric"
                  autoComplete={
                    index === 0
                      ? "one-time-code"
                      : "off"
                  }
                  maxLength={OTP_LENGTH}
                  value={digit}
                  disabled={
                    loading || resendLoading
                  }
                  onChange={(event) =>
                    handleChange(
                      index,
                      event.target.value
                    )
                  }
                  onKeyDown={(event) =>
                    handleKeyDown(
                      index,
                      event
                    )
                  }
                  onPaste={handlePaste}
                  aria-label={`OTP digit ${
                    index + 1
                  }`}
                  className={`h-12 w-10 rounded-xl border text-center font-mono text-lg font-black outline-none transition-all duration-200 sm:h-14 sm:w-12 ${
                    digit
                      ? "border-purple-400 bg-purple-500/15 text-purple-400 shadow-[0_0_20px_rgba(139,92,246,0.15)]"
                      : darkMode
                        ? "border-white/10 bg-white/[0.04] text-white hover:border-purple-500/30"
                        : "border-black/10 bg-white/50 text-black hover:border-purple-500/30"
                  } focus:border-purple-400 focus:ring-2 focus:ring-purple-500/10`}
                />
              ))}
            </div>

            {/* ERROR */}
            {error && (
              <div className="mt-4 flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2">
                <FiX
                  className="shrink-0 text-red-400"
                  size={12}
                />

                <p className="font-mono text-[7px] font-bold uppercase text-red-400">
                  {error}
                </p>
              </div>
            )}

            {/* RESEND MESSAGE */}
            {resendMessage && (
              <div
                className={`mt-3 flex items-center justify-center gap-1 font-mono text-[7px] font-bold ${
                  isResendError
                    ? "text-red-400"
                    : "text-green-400"
                }`}
              >
                {!isResendError && (
                  <FiCheck size={9} />
                )}

                {resendMessage}
              </div>
            )}

            {/* VERIFY BUTTON */}
            <button
              type="submit"
              disabled={
                loading ||
                resendLoading ||
                otpValue.length !== OTP_LENGTH
              }
              className={`group mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-purple-400 bg-purple-600 font-mono text-[8px] font-black uppercase tracking-[0.15em] text-white shadow-[0_5px_20px_rgba(124,58,237,0.25)] transition-all ${
                loading ||
                resendLoading ||
                otpValue.length !== OTP_LENGTH
                  ? "cursor-not-allowed opacity-40"
                  : "hover:bg-purple-500 hover:shadow-[0_5px_30px_rgba(124,58,237,0.4)]"
              }`}
            >
              {loading ? (
                <>
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Verifying...
                </>
              ) : (
                <>
                  Verify OTP

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
                className={`inline-flex items-center gap-2 font-mono text-[7px] uppercase ${
                  darkMode
                    ? "text-white/30"
                    : "text-black/40"
                }`}
              >
                <FiClock size={10} />

                Resend OTP in{" "}

                <span className="font-bold text-purple-400">
                  {timer}s
                </span>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                disabled={
                  resendLoading || loading
                }
                className="inline-flex items-center gap-2 font-mono text-[7px] font-bold uppercase tracking-wider text-purple-400 transition hover:text-purple-300 disabled:opacity-40"
              >
                <FiRefreshCw
                  size={10}
                  className={
                    resendLoading
                      ? "animate-spin"
                      : ""
                  }
                />

                {resendLoading
                  ? "Sending..."
                  : "Resend OTP"}
              </button>
            )}
          </div>

          {/* SECURITY */}
          <div
            className={`mt-5 border-t pt-4 text-center ${
              darkMode
                ? "border-white/5"
                : "border-black/5"
            }`}
          >
            <p
              className={`font-mono text-[6px] uppercase tracking-widest ${
                darkMode
                  ? "text-white/20"
                  : "text-black/25"
              }`}
            >
              Never share your verification code
              with anyone
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OTPModal;

