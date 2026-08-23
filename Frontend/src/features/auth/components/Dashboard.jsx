
import { useLocation, useNavigate } from "react-router-dom";
import { FiArrowRight, FiCheck, FiCpu, FiHome, FiShield } from "react-icons/fi";
import { useTheme } from "../../../context/theme.context";

const Successfull = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { darkMode } = useTheme();

  const username = location.state?.username || "";

  

  const handleLogin = () => {
    navigate("/login");
  };

  const handleHome = () => {
    navigate("/");
  };

  return (
    <main
      className={`relative flex min-h-screen items-center justify-center overflow-hidden px-5 transition-colors duration-500 ${
        darkMode ? "bg-[#08070b] text-white" : "bg-[#eee9dc] text-[#17131f]"
      }`}
    >
      {/* BACKGROUND */}

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          className={`absolute -left-40 -top-40 h-[450px] w-[450px] rounded-full blur-[150px] ${
            darkMode ? "bg-purple-700/20" : "bg-purple-400/20"
          }`}
        />

        <div
          className={`absolute -bottom-40 -right-40 h-[450px] w-[450px] rounded-full blur-[150px] ${
            darkMode ? "bg-indigo-700/20" : "bg-indigo-400/20"
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

      <header className="absolute left-0 right-0 top-0 z-20 mx-auto flex h-16 max-w-[1600px] items-center justify-between border-b border-purple-500/10 px-5 sm:px-8 lg:px-14 xl:px-20">
        <button
          type="button"
          onClick={handleHome}
          className="group flex items-center gap-3"
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

        <button
          type="button"
          onClick={handleHome}
          className={`flex h-9 items-center gap-2 border-2 px-3 font-mono text-[8px] font-bold uppercase tracking-wider ${
            darkMode
              ? "border-white/10 bg-white/5 text-white/60 hover:border-purple-500 hover:text-white"
              : "border-black/10 bg-white/60 text-black/60 hover:border-purple-500"
          }`}
        >
          <FiHome size={13} />
          Home
        </button>
      </header>

      {/* SUCCESS CARD */}

      <div className="relative z-10 w-full max-w-[470px]">
        <div
          className={`rounded-2xl border p-1 shadow-2xl ${
            darkMode
              ? "border-purple-500/20 bg-white/[0.02] shadow-purple-950/30"
              : "border-purple-500/20 bg-white/30 shadow-purple-900/10"
          }`}
        >
          <div
            className={`rounded-xl border p-7 text-center backdrop-blur-xl sm:p-9 ${
              darkMode
                ? "border-white/10 bg-[#111014]/80"
                : "border-white/50 bg-white/70"
            }`}
          >
            {/* SUCCESS ICON */}

            <div className="relative mx-auto mb-6 flex h-20 w-20 items-center justify-center">
              <div className="absolute inset-0 animate-pulse rounded-full bg-green-500/10 blur-xl" />

              <div className="relative flex h-20 w-20 items-center justify-center rounded-full border-2 border-green-400/40 bg-green-500/10 text-green-400 shadow-[0_0_35px_rgba(34,197,94,0.15)]">
                <FiCheck size={36} strokeWidth={2.5} />
              </div>
            </div>

            {/* STATUS */}

            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-green-400/20 bg-green-500/5 px-3 py-1.5">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-400" />

              <span className="font-mono text-[7px] font-bold uppercase tracking-[0.2em] text-green-400">
                Verification Complete
              </span>
            </div>

            <h1 className="font-mono text-2xl font-black uppercase tracking-tight sm:text-3xl">
              Account <span className="text-purple-500">created.</span>
            </h1>

            <p
              className={`mx-auto mt-3 max-w-[340px] font-mono text-[8px] leading-5 ${
                darkMode ? "text-white/40" : "text-black/45"
              }`}
            >
              Your email has been successfully verified and your candidate
              account is ready.
            </p>

            {username && (
              <div
                className={`mx-auto mt-5 max-w-[300px] rounded-xl border px-4 py-3 ${
                  darkMode
                    ? "border-purple-500/20 bg-purple-500/5"
                    : "border-purple-500/20 bg-purple-500/5"
                }`}
              >
                <p
                  className={`font-mono text-[6px] uppercase tracking-widest ${
                    darkMode ? "text-white/25" : "text-black/30"
                  }`}
                >
                  Candidate
                </p>

                <p className="mt-1 font-mono text-xs font-bold text-purple-400">
                  @{username}
                </p>
              </div>
            )}

            {/* SECURITY */}

            <div
              className={`mt-5 flex items-center justify-center gap-2 border-y py-3 ${
                darkMode ? "border-white/5" : "border-black/5"
              }`}
            >
              <FiShield size={13} className="text-green-400" />

              <span
                className={`font-mono text-[7px] uppercase tracking-wider ${
                  darkMode ? "text-white/30" : "text-black/40"
                }`}
              >
                Email verified • Account secured
              </span>
            </div>

            {/* LOGIN BUTTON */}

            <button
              type="button"
              onClick={handleLogin}
              className="group mt-6 flex h-11 w-full items-center justify-center gap-3 rounded-xl border border-purple-400 bg-purple-600 font-mono text-[8px] font-black uppercase tracking-[0.15em] text-white shadow-[0_5px_20px_rgba(124,58,237,0.25)] transition-all hover:bg-purple-500 hover:shadow-[0_5px_30px_rgba(124,58,237,0.4)]"
            >
              Continue to Sign In
              <FiArrowRight
                size={13}
                className="transition-transform group-hover:translate-x-1"
              />
            </button>

            <button
              type="button"
              onClick={handleHome}
              className={`mt-3 font-mono text-[7px] uppercase tracking-wider transition ${
                darkMode
                  ? "text-white/30 hover:text-white/70"
                  : "text-black/35 hover:text-black/70"
              }`}
            >
              Return to Home
            </button>
          </div>
        </div>
      </div>
    </main>
  );
};

export default Successfull;
