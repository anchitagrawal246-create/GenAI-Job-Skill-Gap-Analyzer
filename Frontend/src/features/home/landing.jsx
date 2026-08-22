import {
  FiArrowRight,
  FiCpu,
  FiZap,
  FiTarget,
  FiBarChart2,
  FiMessageSquare,
  FiShield,
  FiCode,
  FiMoon,
  FiSun,
  FiCheck,
} from "react-icons/fi";


import { useNavigate } from "react-router-dom";
import { useTheme } from "../../context/theme.context";

const Landing = () => {
  const navigate = useNavigate();
const { darkMode, toggleTheme } = useTheme();
 

  const features = [
    {
      icon: FiMessageSquare,
      title: "AI MOCK INTERVIEWS",
      description:
        "Practice realistic interviews with an AI agent that adapts questions to your role, experience, and skill level.",
      accent: "text-purple-400",
    },
    {
      icon: FiTarget,
      title: "ROLE-BASED QUESTIONS",
      description:
        "Prepare for frontend, backend, full-stack, data, DevOps, and other technical roles with targeted questions.",
      accent: "text-blue-400",
    },
    {
      icon: FiBarChart2,
      title: "SMART FEEDBACK",
      description:
        "Get actionable feedback on your answers, communication, technical depth, and overall interview performance.",
      accent: "text-green-400",
    },
    {
      icon: FiZap,
      title: "REAL-TIME ANALYSIS",
      description:
        "Analyze your responses instantly and identify areas that need improvement before the real interview.",
      accent: "text-yellow-400",
    },
    {
      icon: FiCode,
      title: "CODING PRACTICE",
      description:
        "Solve coding problems and explain your approach while the AI evaluates your reasoning and solution.",
      accent: "text-pink-400",
    },
    {
      icon: FiShield,
      title: "PRIVATE & SECURE",
      description:
        "Your candidate profile, interview history, and performance data remain protected.",
      accent: "text-cyan-400",
    },
  ];

  const stats = [
    ["01", "AI INTERVIEW"],
    ["02", "SMART FEEDBACK"],
    ["03", "PROGRESS TRACKING"],
    ["04", "CAREER READY"],
  ];

  const steps = [
    {
      number: "01",
      title: "CHOOSE YOUR ROLE",
      text: "Select the role you're preparing for and configure your interview experience.",
    },
    {
      number: "02",
      title: "START INTERVIEW",
      text: "Our AI agent asks realistic questions and adapts the interview based on your responses.",
    },
    {
      number: "03",
      title: "GET FEEDBACK",
      text: "Review your performance, identify weaknesses, and track your improvement over time.",
    },
  ];

  return (
    <main
      className={`relative min-h-screen w-full overflow-x-clip transition-colors duration-500 ${
        darkMode ? "bg-[#08070b] text-[#f4f0df]" : "bg-[#eee9dc] text-[#17131f]"
      }`}
    >
      {/* ================= BACKGROUND ================= */}

      <div className="pointer-events-none fixed inset-0 z-0 w-full overflow-clip">
        <div
          className={`absolute -left-48 -top-48 h-[500px] w-[500px] rounded-full blur-[150px] ${
            darkMode ? "bg-purple-700/15" : "bg-purple-400/15"
          }`}
        />

        <div
          className={`absolute -right-48 top-1/3 h-[500px] w-[500px] rounded-full blur-[150px] ${
            darkMode ? "bg-indigo-700/10" : "bg-indigo-400/15"
          }`}
        />

        <div
          className={`absolute inset-0 ${
            darkMode ? "opacity-[0.035]" : "opacity-[0.05]"
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

      {/* ================= HEADER ================= */}

      <header
        className={`relative z-30 mx-auto flex h-16 w-full max-w-7xl items-center justify-between border-b px-5 sm:px-8 ${
          darkMode ? "border-purple-500/15" : "border-purple-900/10"
        }`}
      >
        {/* Logo */}

        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center border-2 border-purple-500 bg-purple-600 shadow-[3px_3px_0px_#312e81]">
            <FiCpu size={17} />
          </div>

          <div>
            <p className="font-mono text-xs font-black tracking-[0.18em]">
              AI INTERVIEW
            </p>

            <p
              className={`font-mono text-[8px] tracking-[0.25em] ${
                darkMode ? "text-white/30" : "text-black/40"
              }`}
            >
              INTELLIGENT PREPARATION
            </p>
          </div>
        </div>

        {/* Navigation */}

        <nav className="hidden items-center gap-7 md:flex">
          <a
            href="#features"
            className={`font-mono text-[10px] uppercase tracking-widest transition ${
              darkMode
                ? "text-white/40 hover:text-purple-400"
                : "text-black/50 hover:text-purple-600"
            }`}
          >
            Features
          </a>

          <a
            href="#how-it-works"
            className={`font-mono text-[10px] uppercase tracking-widest transition ${
              darkMode
                ? "text-white/40 hover:text-purple-400"
                : "text-black/50 hover:text-purple-600"
            }`}
          >
            How It Works
          </a>

          <a
            href="#about"
            className={`font-mono text-[10px] uppercase tracking-widest transition ${
              darkMode
                ? "text-white/40 hover:text-purple-400"
                : "text-black/50 hover:text-purple-600"
            }`}
          >
            About
          </a>
        </nav>

        {/* Right Side */}

        <div className="flex items-center gap-3">
          {/* Theme */}

          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className={`flex h-9 w-9 shrink-0 items-center justify-center border-2 transition ${
              darkMode
                ? "border-[#302c38] bg-[#15131a] text-yellow-300 hover:border-purple-500"
                : "border-black/15 bg-white/70 text-purple-700 hover:border-purple-500"
            }`}
          >
            {darkMode ? <FiSun size={15} /> : <FiMoon size={15} />}
          </button>

          {/* LOGIN BUTTON */}

          <button
            type="button"
            onClick={() => navigate("/login")}
            className="hidden h-9 border-2 border-purple-500 px-5 font-mono text-[10px] font-bold uppercase tracking-widest text-purple-400 transition hover:bg-purple-500 hover:text-white sm:block"
          >
            Sign In
          </button>

          {/* REGISTER BUTTON */}

          <button
            type="button"
            onClick={() => navigate("/register")}
            className="hidden h-9 border-2 border-purple-500 bg-purple-600 px-5 font-mono text-[10px] font-bold uppercase tracking-widest text-white transition hover:bg-purple-500 sm:block"
          >
            Register
          </button>
        </div>
      </header>

      {/* ================= HERO ================= */}

      <section className="relative z-10 mx-auto w-full max-w-7xl px-5 pb-14 pt-12 sm:px-8 sm:pt-16 lg:pb-16 lg:pt-20">
        <div className="max-w-4xl">
          {/* Status */}

          <div className="mb-5 flex items-center gap-3">
            <div
              className={`flex items-center gap-2 border px-3 py-1.5 font-mono text-[9px] tracking-[0.2em] ${
                darkMode
                  ? "border-purple-500/30 bg-purple-500/5 text-purple-300"
                  : "border-purple-500/30 bg-purple-500/10 text-purple-700"
              }`}
            >
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-400" />
              AI AGENT ONLINE
            </div>
          </div>

          {/* Heading */}

          <h1 className="max-w-5xl font-mono text-5xl font-black uppercase leading-[0.9] tracking-tight sm:text-6xl lg:text-8xl">
            Prepare
            <br />
            <span className="text-purple-500">smarter.</span>
            <br />
            Interview better.
          </h1>

          {/* Description */}

          <p
            className={`mt-5 max-w-2xl font-mono text-sm leading-6 sm:text-base ${
              darkMode ? "text-white/40" : "text-black/55"
            }`}
          >
            An AI-powered interview agent that helps you practice realistic
            interviews, improve your answers, identify weaknesses, and become
            confident before the real interview.
          </p>

          {/* Buttons */}

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="group flex h-12 items-center justify-center gap-3 border-2 border-purple-400 bg-purple-600 px-7 py-2.5 font-mono text-xs font-black uppercase tracking-widest text-white shadow-[5px_5px_0px_#312e81] transition-all hover:bg-purple-500 hover:shadow-[3px_3px_0px_#312e81] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
            >
              Start Interview
              <FiArrowRight
                size={17}
                className="transition-transform group-hover:translate-x-1"
              />
            </button>

            <a
              href="#features"
              className={`flex h-12 items-center justify-center border-2 px-7 py-2.5 font-mono text-xs font-bold uppercase tracking-widest transition ${
                darkMode
                  ? "border-[#302c38] bg-[#111014] hover:border-purple-500"
                  : "border-black/15 bg-white/60 hover:border-purple-500"
              }`}
            >
              Explore Features
            </a>
          </div>
        </div>

        {/* ================= HERO TERMINAL ================= */}

        <div className="mt-12 grid w-full min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
          {/* Interview Terminal */}

          <div
            className={`min-w-0 overflow-hidden border-2 p-5 sm:p-6 ${
              darkMode
                ? "border-[#292630] bg-[#0d0c11]"
                : "border-black/10 bg-white/60"
            }`}
          >
            <div className="mb-5 flex items-center justify-between gap-4">
              <span
                className={`font-mono text-[9px] tracking-[0.2em] ${
                  darkMode ? "text-white/30" : "text-black/40"
                }`}
              >
                INTERVIEW_AGENT
              </span>

              <span className="flex shrink-0 items-center gap-2 font-mono text-[9px] text-green-400">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-400" />
                READY
              </span>
            </div>

            <div className="space-y-4 font-mono text-sm">
              <div>
                <p className="text-purple-400">agent.prompt</p>

                <p
                  className={`mt-1.5 break-words ${
                    darkMode ? "text-white/60" : "text-black/60"
                  }`}
                >
                  Tell me about a challenging technical problem you solved.
                </p>
              </div>

              <div>
                <p className="text-blue-400">candidate.response</p>

                <p
                  className={`mt-1.5 break-words ${
                    darkMode ? "text-white/40" : "text-black/50"
                  }`}
                >
                  I worked on a backend system where...
                </p>
              </div>

              <div className="border-l-2 border-purple-500 pl-4">
                <p className="text-green-400">ai.feedback</p>

                <p
                  className={`mt-1.5 text-xs leading-5 ${
                    darkMode ? "text-white/40" : "text-black/50"
                  }`}
                >
                  Good technical direction. Add measurable impact and explain
                  why you selected your approach.
                </p>
              </div>
            </div>
          </div>

          {/* Score */}

          <div
            className={`min-w-0 border-2 p-5 ${
              darkMode
                ? "border-[#292630] bg-[#111014]"
                : "border-black/10 bg-white/60"
            }`}
          >
            <p
              className={`font-mono text-[9px] tracking-[0.2em] ${
                darkMode ? "text-white/30" : "text-black/40"
              }`}
            >
              INTERVIEW SCORE
            </p>

            <div className="mt-6 flex items-end gap-3">
              <span className="font-mono text-6xl font-black text-purple-500">
                84
              </span>

              <span className="mb-2 font-mono text-xs text-green-400">
                +12%
              </span>
            </div>

            <div
              className={`mt-4 h-2 ${darkMode ? "bg-white/10" : "bg-black/10"}`}
            >
              <div className="h-full w-[84%] bg-purple-500" />
            </div>

            <div className="mt-5 space-y-2.5">
              {["Technical", "Communication", "Problem Solving"].map(
                (item, index) => (
                  <div
                    key={item}
                    className="flex items-center justify-between gap-3 font-mono text-[9px]"
                  >
                    <span
                      className={darkMode ? "text-white/35" : "text-black/45"}
                    >
                      {item}
                    </span>

                    <span className="text-purple-400">
                      {[89, 81, 83][index]}%
                    </span>
                  </div>
                ),
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ================= STATS ================= */}

      <section
        className={`relative z-10 w-full border-y ${
          darkMode ? "border-purple-500/15" : "border-purple-900/10"
        }`}
      >
        <div className="mx-auto grid w-full max-w-7xl grid-cols-2 lg:grid-cols-4">
          {stats.map(([number, title], index) => (
            <div
              key={number}
              className={`px-5 py-5 sm:px-6 ${
                index !== stats.length - 1
                  ? `border-r ${
                      darkMode ? "border-purple-500/10" : "border-black/10"
                    }`
                  : ""
              }`}
            >
              <p className="font-mono text-xs text-purple-500">{number}</p>

              <p className="mt-1.5 font-mono text-[10px] font-bold tracking-widest">
                {title}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ================= FEATURES ================= */}

      <section
        id="features"
        className="relative z-10 mx-auto w-full max-w-7xl px-5 py-20 sm:px-8 lg:py-24"
      >
        <div className="max-w-2xl">
          <p className="font-mono text-[10px] font-bold tracking-[0.25em] text-purple-400">
            // CAPABILITIES
          </p>

          <h2 className="mt-3 font-mono text-4xl font-black uppercase leading-tight sm:text-5xl">
            Everything you need
            <br />
            to <span className="text-purple-500">prepare.</span>
          </h2>

          <p
            className={`mt-4 font-mono text-sm leading-6 ${
              darkMode ? "text-white/35" : "text-black/50"
            }`}
          >
            One intelligent platform for realistic practice, detailed feedback,
            and measurable interview improvement.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;

            return (
              <div
                key={feature.title}
                className={`group min-w-0 border-2 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-purple-500 ${
                  darkMode
                    ? "border-[#292630] bg-[#111014]"
                    : "border-black/10 bg-white/50"
                }`}
              >
                <Icon size={22} className={`mb-5 ${feature.accent}`} />

                <p className="font-mono text-xs font-black tracking-wide">
                  {feature.title}
                </p>

                <p
                  className={`mt-3 font-mono text-[10px] leading-5 ${
                    darkMode ? "text-white/30" : "text-black/45"
                  }`}
                >
                  {feature.description}
                </p>

                <div className="mt-5 flex items-center gap-2 font-mono text-[8px] tracking-widest text-purple-400 opacity-0 transition group-hover:opacity-100">
                  <FiCheck size={11} />
                  AVAILABLE
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ================= HOW IT WORKS ================= */}

      <section
        id="how-it-works"
        className={`relative z-10 w-full border-y ${
          darkMode
            ? "border-purple-500/15 bg-[#0b0a0f]"
            : "border-purple-900/10 bg-[#e8e3d7]"
        }`}
      >
        <div className="mx-auto w-full max-w-7xl px-5 py-20 sm:px-8 lg:py-24">
          <div className="text-center">
            <p className="font-mono text-[10px] font-bold tracking-[0.25em] text-purple-400">
              // WORKFLOW
            </p>

            <h2 className="mt-3 font-mono text-4xl font-black uppercase sm:text-5xl">
              How it <span className="text-purple-500">works.</span>
            </h2>
          </div>

          <div className="mt-10 grid gap-7 md:grid-cols-3">
            {steps.map((step) => (
              <div key={step.number} className="relative min-w-0">
                <p className="font-mono text-5xl font-black text-purple-500/30">
                  {step.number}
                </p>

                <h3 className="mt-3 font-mono text-sm font-black">
                  {step.title}
                </h3>

                <p
                  className={`mt-2 font-mono text-[10px] leading-6 ${
                    darkMode ? "text-white/30" : "text-black/45"
                  }`}
                >
                  {step.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= CTA ================= */}

      <section
        id="about"
        className="relative z-10 mx-auto w-full max-w-7xl px-5 py-20 sm:px-8 lg:py-24"
      >
        <div
          className={`border-2 p-7 text-center sm:p-12 lg:p-16 ${
            darkMode
              ? "border-purple-500/30 bg-[#111014]"
              : "border-purple-500/20 bg-white/50"
          }`}
        >
          <p className="font-mono text-[10px] tracking-[0.25em] text-purple-400">
            READY WHEN YOU ARE
          </p>

          <h2 className="mx-auto mt-4 max-w-3xl font-mono text-4xl font-black uppercase leading-tight sm:text-5xl lg:text-6xl">
            Your next interview
            <br />
            starts <span className="text-purple-500">here.</span>
          </h2>

          <p
            className={`mx-auto mt-4 max-w-xl font-mono text-sm leading-6 ${
              darkMode ? "text-white/35" : "text-black/50"
            }`}
          >
            Stop guessing if you're ready. Practice with AI, understand your
            weaknesses, and walk into your next interview with confidence.
          </p>

          <button
            type="button"
            onClick={() => navigate("/register")}
            className="group mx-auto mt-7 flex h-12 items-center gap-3 border-2 border-purple-400 bg-purple-600 px-8 py-2.5 font-mono text-xs font-black uppercase tracking-widest text-white shadow-[5px_5px_0px_#312e81] transition hover:bg-purple-500 hover:shadow-[3px_3px_0px_#312e81]"
          >
            Start Preparing
            <FiArrowRight
              size={17}
              className="transition-transform group-hover:translate-x-1"
            />
          </button>
        </div>
      </section>

      {/* ================= FOOTER ================= */}

      <footer
        className={`relative z-10 w-full border-t ${
          darkMode ? "border-purple-500/15" : "border-purple-900/10"
        }`}
      >
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-5 py-6 sm:px-8 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-mono text-xs font-black tracking-[0.15em]">
              AI INTERVIEW
            </p>

            <p
              className={`mt-1 font-mono text-[8px] ${
                darkMode ? "text-white/25" : "text-black/35"
              }`}
            >
              INTELLIGENT INTERVIEW PREPARATION
            </p>
          </div>

          <p
            className={`font-mono text-[8px] tracking-widest ${
              darkMode ? "text-white/20" : "text-black/30"
            }`}
          >
            © 2026 AI INTERVIEW AGENT
          </p>
        </div>
      </footer>
    </main>
  );
};

export default Landing;
