import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  FiArrowLeft,
  FiAlertCircle,
  FiCheckCircle,
  FiClock,
  FiCpu,
  FiLoader,
  FiSend,
  FiX,
  FiChevronRight,
  FiCode,
  FiBarChart2,
  FiAward,
  FiActivity,
} from "react-icons/fi";

import {
  getInterview,
  startInterview,
  getInterviewQuestions,
  getNextQuestion,
  generateInterviewQuestion,
  submitAnswer,
  evaluateAnswer,
  completeInterview,
  cancelInterview,
  getInterviewProgress,
} from "../../api/interview.api";

const MAX_QUESTIONS = 100;

// ============================================================
// COMPONENT
// ============================================================

const InterviewAgent = () => {
  const { id: interviewId } = useParams();
  const navigate = useNavigate();

  // ==========================================================
  // STATE
  // ==========================================================

  const [interview, setInterview] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [question, setQuestion] = useState(null);

  const [answerText, setAnswerText] = useState("");
  const [evaluation, setEvaluation] = useState(null);
  const [progress, setProgress] = useState(null);

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [exiting, setExiting] = useState(false);

  const [error, setError] = useState("");
  const [completed, setCompleted] = useState(false);

  // ==========================================================
  // ERROR
  // ==========================================================

  const getErrorMessage = useCallback((err, fallback) => {
    return (
      err?.response?.data?.message ||
      err?.response?.data?.error?.message ||
      err?.message ||
      fallback
    );
  }, []);

  // ==========================================================
  // RESPONSE HELPERS
  // ==========================================================

  const extractInterview = useCallback((response) => {
    const data = response?.data;

    return (
      data?.data?.interview ||
      data?.data ||
      data?.interview ||
      response?.interview ||
      null
    );
  }, []);

  const extractQuestions = useCallback((response) => {
    const data = response?.data;

    const questionsData = data?.data || data?.questions || data || [];

    return Array.isArray(questionsData) ? questionsData : [];
  }, []);

  const extractProgress = useCallback((response) => {
    const data = response?.data;

    return data?.data || data?.progress || data || null;
  }, []);

  const extractGeneratedQuestion = useCallback((response) => {
    const data = response?.data;

    const result = data?.data || data || null;

    return {
      question: result?.question || null,

      interviewProgress: result?.interviewProgress || null,

      adaptiveState: result?.adaptiveState || null,

      provider: result?.provider || null,

      model: result?.model || null,
    };
  }, []);

  // ==========================================================
  // LOAD INTERVIEW
  // ==========================================================

  const loadInterview = useCallback(async () => {
    if (!interviewId) {
      throw new Error("Interview ID is missing.");
    }

    console.log("[InterviewAgent] GET INTERVIEW:", interviewId);

    const response = await getInterview(interviewId);

    console.log("[InterviewAgent] GET INTERVIEW RESPONSE:", response?.data);

    const interviewData = extractInterview(response);

    if (!interviewData) {
      throw new Error("Interview not found.");
    }

    setInterview(interviewData);

    return interviewData;
  }, [interviewId, extractInterview]);

  // ==========================================================
  // LOAD QUESTIONS
  // ==========================================================

  const loadQuestions = useCallback(async () => {
    if (!interviewId) {
      return [];
    }

    const response = await getInterviewQuestions(interviewId);

    const questionList = extractQuestions(response);

    setQuestions(questionList);

    return questionList;
  }, [interviewId, extractQuestions]);

  // ==========================================================
  // LOAD PROGRESS
  // ==========================================================

  const loadProgress = useCallback(async () => {
    if (!interviewId) {
      return null;
    }

    try {
      const response = await getInterviewProgress(interviewId);

      const progressData = extractProgress(response);

      if (progressData) {
        setProgress(progressData);

        setInterview((previous) => {
          if (!previous) {
            return previous;
          }

          return {
            ...previous,

            totalQuestions:
              progressData.totalQuestions ??
              previous.totalQuestions ??
              MAX_QUESTIONS,

            completedQuestions:
              progressData.completedQuestions ??
              previous.completedQuestions ??
              0,

            currentDifficulty:
              progressData.currentDifficulty ??
              previous.currentDifficulty ??
              "medium",

            estimatedExperienceLevel:
              progressData.estimatedExperienceLevel ??
              previous.estimatedExperienceLevel ??
              null,

            experienceConfidence:
              progressData.experienceConfidence ??
              previous.experienceConfidence ??
              null,

            overallScore:
              progressData.overallScore ?? previous.overallScore ?? null,

            status: progressData.status ?? previous.status,

            exitReason: progressData.exitReason ?? previous.exitReason ?? null,
          };
        });
      }

      return progressData;
    } catch (err) {
      console.warn(
        "[InterviewAgent] PROGRESS ERROR:",
        err?.response?.data || err,
      );

      return null;
    }
  }, [interviewId, extractProgress]);

  // ==========================================================
  // FIND PENDING QUESTION
  // ==========================================================

  const findPendingQuestion = useCallback((questionList) => {
    if (!Array.isArray(questionList)) {
      return null;
    }

    return questionList.find((item) => item?.status === "pending") || null;
  }, []);

  // ==========================================================
  // ENSURE STARTED
  // ==========================================================

  const ensureInterviewStarted = useCallback(async () => {
    const currentInterview = await loadInterview();

    if (!currentInterview) {
      throw new Error("Interview could not be loaded.");
    }

    if (currentInterview.status === "in-progress") {
      return currentInterview;
    }

    if (currentInterview.status === "completed") {
      setCompleted(true);
      return currentInterview;
    }

    if (currentInterview.status === "cancelled") {
      throw new Error("This interview has been cancelled.");
    }

    if (currentInterview.status === "created") {
      const startResponse = await startInterview(interviewId);

      const startedInterview = extractInterview(startResponse);

      if (!startedInterview) {
        throw new Error("Interview start returned no interview data.");
      }

      if (startedInterview.status !== "in-progress") {
        throw new Error(
          `Interview failed to enter in-progress state. Current status: ${startedInterview.status}`,
        );
      }

      setInterview(startedInterview);

      return startedInterview;
    }

    throw new Error(
      `Interview cannot be started. Current status: ${currentInterview.status}`,
    );
  }, [interviewId, loadInterview, extractInterview]);

  // ==========================================================
  // GENERATE QUESTION
  // ==========================================================

  const generateNextQuestion = useCallback(async () => {
    try {
      setGenerating(true);
      setError("");

      console.log("[InterviewAgent] GENERATING QUESTION", interviewId);

      const currentInterview = await ensureInterviewStarted();

      if (currentInterview.status === "completed") {
        setCompleted(true);
        return null;
      }

      if (currentInterview.status !== "in-progress") {
        throw new Error(
          `Interview is not in progress. Current status: ${currentInterview.status}`,
        );
      }

      const response = await generateInterviewQuestion(interviewId);

      console.log("[InterviewAgent] GENERATE RESPONSE:", response?.data);

      const {
        question: generatedQuestion,
        interviewProgress,
        adaptiveState,
      } = extractGeneratedQuestion(response);

      if (!generatedQuestion) {
        throw new Error("AI interviewer did not return a question.");
      }

      setQuestion(generatedQuestion);
      setAnswerText("");
      setEvaluation(null);

      if (interviewProgress) {
        setProgress(interviewProgress);
      }

      if (adaptiveState) {
        setInterview((previous) => {
          if (!previous) {
            return previous;
          }

          return {
            ...previous,

            currentDifficulty:
              adaptiveState.difficulty ??
              previous.currentDifficulty ??
              "medium",

            estimatedExperienceLevel:
              adaptiveState.estimatedExperienceLevel ??
              previous.estimatedExperienceLevel ??
              null,

            experienceConfidence:
              adaptiveState.experienceConfidence ??
              previous.experienceConfidence ??
              null,
          };
        });
      }

      await loadQuestions();

      return generatedQuestion;
    } catch (err) {
      console.error(
        "[InterviewAgent] GENERATE QUESTION ERROR:",
        err?.response?.data || err,
      );

      const message = getErrorMessage(err, "Failed to generate next question.");

      if (message.toLowerCase().includes("maximum of 100")) {
        setCompleted(true);
      } else {
        setError(message);
      }

      return null;
    } finally {
      setGenerating(false);
    }
  }, [
    interviewId,
    ensureInterviewStarted,
    extractGeneratedQuestion,
    loadQuestions,
    getErrorMessage,
  ]);

  // ==========================================================
  // LOAD OR GENERATE NEXT
  // ==========================================================

  const loadNextQuestion = useCallback(async () => {
    try {
      setError("");
      setEvaluation(null);
      setAnswerText("");

      const currentInterview = await ensureInterviewStarted();

      if (currentInterview.status === "completed") {
        setCompleted(true);
        return null;
      }

      // ----------------------------------------------------
      // Try pending endpoint
      // ----------------------------------------------------

      try {
        const pendingResponse = await getNextQuestion(interviewId);

        const pendingData =
          pendingResponse?.data?.data ?? pendingResponse?.data ?? null;

        const pendingQuestion = pendingData?.question || null;

        if (pendingQuestion) {
          setQuestion(pendingQuestion);

          if (pendingData?.interviewProgress) {
            setProgress(pendingData.interviewProgress);
          }

          return pendingQuestion;
        }
      } catch (pendingError) {
        console.warn(
          "[InterviewAgent] NEXT QUESTION LOOKUP FAILED:",
          pendingError?.response?.data || pendingError,
        );
      }

      // ----------------------------------------------------
      // Backup question list
      // ----------------------------------------------------

      const existingQuestions = await loadQuestions();

      const pendingQuestion = findPendingQuestion(existingQuestions);

      if (pendingQuestion) {
        setQuestion(pendingQuestion);

        return pendingQuestion;
      }

      // ----------------------------------------------------
      // Generate
      // ----------------------------------------------------

      return await generateNextQuestion();
    } catch (err) {
      console.error(
        "[InterviewAgent] LOAD NEXT QUESTION ERROR:",
        err?.response?.data || err,
      );

      setError(getErrorMessage(err, "Failed to load next question."));

      return null;
    }
  }, [
    interviewId,
    ensureInterviewStarted,
    loadQuestions,
    findPendingQuestion,
    generateNextQuestion,
    getErrorMessage,
  ]);

  // ==========================================================
  // INITIALIZE
  // ==========================================================

  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      try {
        if (!interviewId) {
          throw new Error("Interview ID is missing.");
        }

        setLoading(true);
        setError("");

        console.log("==================================================");
        console.log("[InterviewAgent] INITIALIZATION START");
        console.log("[InterviewAgent] INTERVIEW ID:", interviewId);
        console.log("==================================================");

        const currentInterview = await ensureInterviewStarted();

        if (!mounted) {
          return;
        }

        if (currentInterview.status === "completed") {
          setCompleted(true);
          return;
        }

        if (currentInterview.status === "cancelled") {
          throw new Error("This interview has been cancelled.");
        }

        if (currentInterview.status !== "in-progress") {
          throw new Error(
            `Interview could not be started. Current status: ${currentInterview.status}`,
          );
        }

        await loadProgress();

        if (!mounted) {
          return;
        }

        await loadNextQuestion();

        console.log("[InterviewAgent] INITIALIZATION COMPLETE");
      } catch (err) {
        console.error(
          "[InterviewAgent] INITIALIZATION ERROR:",
          err?.response?.data || err,
        );

        if (mounted) {
          setError(getErrorMessage(err, "Failed to initialize interview."));
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initialize();

    return () => {
      mounted = false;
    };
  }, [
    interviewId,
    ensureInterviewStarted,
    loadProgress,
    loadNextQuestion,
    getErrorMessage,
  ]);

  // ==========================================================
  // SUBMIT + EVALUATE
  // ==========================================================

  const handleSubmitAnswer = useCallback(async () => {
    if (!question?._id) {
      setError("No active question.");
      return;
    }

    const trimmedAnswer = answerText.trim();

    if (!trimmedAnswer) {
      setError("Please enter your answer.");
      return;
    }

    if (submitting || evaluating) {
      return;
    }

    try {
      setError("");
      setSubmitting(true);

      await submitAnswer(interviewId, question._id, trimmedAnswer);

      setEvaluating(true);

      const evaluationResponse = await evaluateAnswer(
        interviewId,
        question._id,
      );

      console.log(
        "[InterviewAgent] EVALUATION RESPONSE:",
        evaluationResponse?.data,
      );

      const evaluationData =
        evaluationResponse?.data?.data ?? evaluationResponse?.data ?? null;

      const evaluationResult =
        evaluationData?.evaluation ?? evaluationData ?? null;

      if (!evaluationResult) {
        throw new Error("Evaluation was not returned by the server.");
      }

      setEvaluation(evaluationResult);

      const [updatedInterview, updatedQuestions, updatedProgress] =
        await Promise.all([loadInterview(), loadQuestions(), loadProgress()]);

      setQuestions(updatedQuestions);

      const currentStatus =
        updatedInterview?.status ?? updatedProgress?.status ?? null;

      const currentQuestionNumber = Number(question.questionNumber || 0);

      if (currentStatus === "completed") {
        setCompleted(true);
        return;
      }

      if (currentQuestionNumber >= MAX_QUESTIONS) {
        setCompleting(true);

        const completionResponse = await completeInterview(interviewId);

        const completedInterview = extractInterview(completionResponse);

        if (completedInterview) {
          setInterview(completedInterview);
        } else {
          await loadInterview();
        }

        setCompleted(true);
      }
    } catch (err) {
      console.error(
        "[InterviewAgent] SUBMIT/EVALUATE ERROR:",
        err?.response?.data || err,
      );

      setError(getErrorMessage(err, "Failed to submit or evaluate answer."));
    } finally {
      setSubmitting(false);
      setEvaluating(false);
      setCompleting(false);
    }
  }, [
    interviewId,
    question,
    answerText,
    submitting,
    evaluating,
    loadInterview,
    loadQuestions,
    loadProgress,
    extractInterview,
    getErrorMessage,
  ]);

  // ==========================================================
  // NEXT
  // ==========================================================

  const handleNextQuestion = useCallback(async () => {
    if (generating || submitting || evaluating || completing) {
      return;
    }

    setQuestion(null);
    setEvaluation(null);
    setAnswerText("");
    setError("");

    await loadNextQuestion();
  }, [generating, submitting, evaluating, completing, loadNextQuestion]);

  // ==========================================================
  // COMPLETE
  // ==========================================================

  const handleCompleteInterview = useCallback(async () => {
    if (completing) {
      return;
    }

    try {
      setCompleting(true);
      setError("");

      const response = await completeInterview(interviewId);

      const completedInterview = extractInterview(response);

      if (completedInterview) {
        setInterview(completedInterview);
      } else {
        await loadInterview();
      }

      setCompleted(true);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to complete interview."));
    } finally {
      setCompleting(false);
    }
  }, [
    completing,
    interviewId,
    extractInterview,
    loadInterview,
    getErrorMessage,
  ]);

  // ==========================================================
  // EXIT
  // ==========================================================

  const handleExit = useCallback(async () => {
    if (exiting) {
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to exit this interview?",
    );

    if (!confirmed) {
      return;
    }

    try {
      setExiting(true);

      await cancelInterview(interviewId, "user-exit");
    } catch (err) {
      console.warn(
        "[InterviewAgent] CANCEL ERROR:",
        err?.response?.data || err,
      );
    } finally {
      setExiting(false);
      navigate("/dashboard");
    }
  }, [exiting, interviewId, navigate]);

  // ==========================================================
  // DERIVED DATA
  // ==========================================================

  const currentQuestionNumber = Math.min(
    Number(
      question?.questionNumber ??
        progress?.currentQuestion ??
        questions.length + 1,
    ) || 1,
    MAX_QUESTIONS,
  );

  const generatedQuestions = Math.min(
    Number(progress?.generatedQuestions ?? questions.length ?? 0) || 0,
    MAX_QUESTIONS,
  );

  const completedQuestions = Math.min(
    Number(
      progress?.completedQuestions ?? interview?.completedQuestions ?? 0,
    ) || 0,
    MAX_QUESTIONS,
  );

  const progressPercentage = Math.min(
    100,
    Math.max(
      0,
      Number(
        progress?.progressPercentage ??
          (generatedQuestions / MAX_QUESTIONS) * 100,
      ) || 0,
    ),
  );

  const currentDifficulty =
    question?.difficulty ||
    interview?.currentDifficulty ||
    progress?.currentDifficulty ||
    "medium";

  const estimatedLevel =
    interview?.estimatedExperienceLevel ||
    progress?.estimatedExperienceLevel ||
    "Analyzing";

  const experienceConfidence =
    interview?.experienceConfidence ?? progress?.experienceConfidence ?? null;

  const technologies = useMemo(() => {
    const values = Array.isArray(interview?.technologies)
      ? interview.technologies
      : [];

    return [
      ...new Set(
        values
          .filter(
            (technology) => typeof technology === "string" && technology.trim(),
          )
          .map((technology) => technology.trim()),
      ),
    ];
  }, [interview]);

  // ==========================================================
  // LOADING
  // ==========================================================

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#282828] text-white">
        <div className="text-center">
          <FiCode className="mx-auto text-5xl text-emerald-400" />

          <div className="mt-5 flex items-center justify-center gap-3 text-slate-300">
            <FiLoader className="animate-spin text-emerald-400" />
            Preparing interview...
          </div>

          <p className="mt-2 text-sm text-slate-500">
            Loading your adaptive coding interview
          </p>
        </div>
      </div>
    );
  }

  // ==========================================================
  // ERROR
  // ==========================================================

  if (error && !interview) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#282828] p-6 text-white">
        <div className="w-full max-w-lg rounded-xl border border-[#3c3c3c] bg-[#1f1f1f] p-6">
          <div className="flex items-center gap-3 text-red-400">
            <FiAlertCircle />
            <h2 className="font-semibold">Interview Error</h2>
          </div>

          <p className="mt-4 text-sm leading-6 text-slate-400">{error}</p>

          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="mt-6 w-full rounded-md bg-[#3c3c3c] px-4 py-3 text-sm font-medium transition hover:bg-[#4a4a4a]"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ==========================================================
  // COMPLETED
  // ==========================================================

  if (completed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#282828] p-6 text-white">
        <div className="w-full max-w-2xl rounded-xl border border-[#3c3c3c] bg-[#1f1f1f] p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
            <FiCheckCircle className="text-3xl text-emerald-400" />
          </div>

          <h1 className="mt-5 text-2xl font-bold">Interview Completed</h1>

          <p className="mt-3 text-sm text-slate-400">
            Your adaptive interview has finished successfully.
          </p>

          <div className="mt-7 grid grid-cols-3 gap-3">
            <div className="rounded-md border border-[#3c3c3c] bg-[#282828] p-4">
              <p className="text-xs text-slate-500">Questions</p>

              <p className="mt-2 text-xl font-semibold">{completedQuestions}</p>
            </div>

            <div className="rounded-md border border-[#3c3c3c] bg-[#282828] p-4">
              <p className="text-xs text-slate-500">Score</p>

              <p className="mt-2 text-xl font-semibold">
                {interview?.overallScore ?? progress?.overallScore ?? "—"}
              </p>
            </div>

            <div className="rounded-md border border-[#3c3c3c] bg-[#282828] p-4">
              <p className="text-xs text-slate-500">Difficulty</p>

              <p className="mt-2 text-xl font-semibold capitalize">
                {currentDifficulty}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="mt-8 w-full rounded-md bg-emerald-600 px-5 py-3 font-semibold transition hover:bg-emerald-500"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ==========================================================
  // MAIN
  // ==========================================================

  return (
    <div className="min-h-screen bg-[#282828] text-white">
      {/* ====================================================
          TOP BAR
      ==================================================== */}

      <header className="sticky top-0 z-30 border-b border-[#3c3c3c] bg-[#1f1f1f]">
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleExit}
              disabled={exiting}
              className="flex h-9 w-9 items-center justify-center rounded-md text-slate-400 transition hover:bg-[#303030] hover:text-white"
            >
              {exiting ? (
                <FiLoader className="animate-spin" />
              ) : (
                <FiArrowLeft />
              )}
            </button>

            <div className="h-6 w-px bg-[#3c3c3c]" />

            <div>
              <p className="text-sm font-semibold">
                {interview?.title || "AI Interview"}
              </p>

              <p className="text-[11px] text-slate-500">
                {interview?.role || "Software Developer"}
              </p>
            </div>
          </div>

          <div className="hidden items-center gap-4 md:flex">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <FiActivity />
              {completedQuestions}/{MAX_QUESTIONS}
            </div>

            <div className="h-5 w-px bg-[#3c3c3c]" />

            <button
              type="button"
              onClick={handleExit}
              disabled={exiting}
              className="flex items-center gap-2 rounded-md border border-[#444] px-3 py-1.5 text-xs text-slate-400 transition hover:bg-[#303030] hover:text-white"
            >
              <FiX />
              Exit
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-0.5 bg-[#333]">
          <div
            className="h-full bg-emerald-500 transition-all duration-500"
            style={{
              width: `${progressPercentage}%`,
            }}
          />
        </div>
      </header>

      {/* ====================================================
          ERROR
      ==================================================== */}

      {error && (
        <div className="border-b border-red-500/20 bg-red-500/5 px-4 py-3">
          <div className="mx-auto flex max-w-[1600px] items-center gap-3 text-sm text-red-300">
            <FiAlertCircle />
            <span>{error}</span>

            <button
              type="button"
              onClick={() => setError("")}
              className="ml-auto text-red-400 hover:text-red-200"
            >
              <FiX />
            </button>
          </div>
        </div>
      )}

      {/* ====================================================
          INTERVIEW BODY
      ==================================================== */}

      <main className="mx-auto max-w-[1600px] p-3 lg:p-4">
        <div className="grid min-h-[calc(100vh-90px)] gap-3 lg:grid-cols-[1fr_1fr_280px]">
          {/* ==================================================
              QUESTION PANEL
          ================================================== */}

          <section className="overflow-hidden rounded-md border border-[#3c3c3c] bg-[#1f1f1f]">
            <div className="flex items-center justify-between border-b border-[#3c3c3c] bg-[#252525] px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-slate-300">
                  Problem
                </span>

                <span className="rounded bg-[#333] px-2 py-1 text-[10px] text-slate-500">
                  Q{currentQuestionNumber}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="rounded bg-emerald-500/10 px-2 py-1 text-[10px] capitalize text-emerald-400">
                  {question?.difficulty || currentDifficulty}
                </span>

                <span className="rounded bg-[#333] px-2 py-1 text-[10px] text-slate-400">
                  {question?.category || "technical"}
                </span>
              </div>
            </div>

            <div className="max-h-[calc(100vh-160px)] overflow-y-auto p-5 lg:p-6">
              {generating ? (
                <div className="flex min-h-[520px] items-center justify-center">
                  <div className="text-center">
                    <FiCpu className="mx-auto text-5xl text-emerald-400" />

                    <p className="mt-5 text-sm font-medium">
                      AI is generating the next problem...
                    </p>

                    <p className="mt-2 text-xs text-slate-500">
                      Adapting difficulty based on your previous answer
                    </p>
                  </div>
                </div>
              ) : !question ? (
                <div className="flex min-h-[520px] items-center justify-center">
                  <div className="text-center">
                    <FiClock className="mx-auto text-4xl text-slate-600" />

                    <p className="mt-4 text-sm text-slate-400">
                      Preparing problem...
                    </p>

                    <button
                      type="button"
                      onClick={loadNextQuestion}
                      className="mt-5 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium hover:bg-emerald-500"
                    >
                      Retry
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Title */}
                  <h1 className="text-2xl font-bold leading-relaxed text-white">
                    {question.question}
                  </h1>

                  {/* Tags */}
                  <div className="mt-5 flex flex-wrap gap-2">
                    <span className="rounded bg-[#333] px-2 py-1 text-[11px] text-slate-400">
                      {question.category || "general"}
                    </span>

                    <span className="rounded bg-[#333] px-2 py-1 text-[11px] capitalize text-slate-400">
                      {question.difficulty || "medium"}
                    </span>

                    {technologies.slice(0, 8).map((technology) => (
                      <span
                        key={technology}
                        className="rounded bg-blue-500/10 px-2 py-1 text-[11px] text-blue-400"
                      >
                        {technology}
                      </span>
                    ))}
                  </div>

                  {/* Divider */}
                  <div className="my-6 h-px bg-[#3c3c3c]" />

                  {/* Expected topics */}
                  {Array.isArray(question.expectedTopics) &&
                    question.expectedTopics.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                          Topics evaluated
                        </p>

                        <div className="mt-3 flex flex-wrap gap-2">
                          {question.expectedTopics.map((topic, index) => (
                            <span
                              key={`${topic}-${index}`}
                              className="rounded-md border border-[#3c3c3c] bg-[#292929] px-2.5 py-1.5 text-xs text-slate-400"
                            >
                              {topic}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                  {/* Interview instruction */}
                  <div className="mt-8 rounded-md border border-[#3c3c3c] bg-[#292929] p-4">
                    <div className="flex items-start gap-3">
                      <FiCode className="mt-0.5 shrink-0 text-emerald-400" />

                      <div>
                        <p className="text-xs font-semibold text-slate-300">
                          Interview mode
                        </p>

                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          Explain your reasoning clearly. The AI will evaluate
                          correctness, technical depth, communication and
                          problem solving.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Interview progress */}
                  <div className="mt-8">
                    <div className="mb-2 flex items-center justify-between text-xs">
                      <span className="text-slate-500">Interview progress</span>

                      <span className="text-slate-400">
                        {completedQuestions}/{MAX_QUESTIONS}
                      </span>
                    </div>

                    <div className="h-1.5 rounded-full bg-[#333]">
                      <div
                        className="h-full rounded-full bg-emerald-500"
                        style={{
                          width: `${progressPercentage}%`,
                        }}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          </section>

          {/* ==================================================
              ANSWER EDITOR
          ================================================== */}

          <section className="flex min-h-0 flex-col overflow-hidden rounded-md border border-[#3c3c3c] bg-[#1f1f1f]">
            <div className="flex items-center justify-between border-b border-[#3c3c3c] bg-[#252525] px-4 py-3">
              <div className="flex items-center gap-3">
                <FiCode className="text-emerald-400" />

                <span className="text-xs font-semibold text-slate-300">
                  Your Answer
                </span>
              </div>

              <span className="text-[10px] text-slate-600">
                {answerText.length}/20000
              </span>
            </div>

            <div className="flex min-h-0 flex-1 flex-col">
              {!question ? (
                <div className="flex flex-1 items-center justify-center text-sm text-slate-600">
                  Waiting for question...
                </div>
              ) : evaluation ? (
                <div className="flex-1 overflow-y-auto p-5">
                  <div className="rounded-md border border-emerald-500/20 bg-emerald-500/5 p-5">
                    <div className="flex items-center gap-3">
                      <FiCheckCircle className="text-emerald-400" />

                      <div>
                        <p className="text-sm font-semibold text-white">
                          Answer Evaluated
                        </p>

                        <p className="text-xs text-slate-500">
                          AI assessment completed
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-3">
                      {[
                        ["Correctness", evaluation.correctnessScore],
                        ["Technical", evaluation.technicalScore],
                        ["Communication", evaluation.communicationScore],
                        ["Problem Solving", evaluation.problemSolvingScore],
                        ["Overall", evaluation.overallScore],
                      ].map(([label, value]) => (
                        <div
                          key={label}
                          className="rounded-md border border-[#3c3c3c] bg-[#252525] p-3"
                        >
                          <p className="text-[10px] uppercase text-slate-500">
                            {label}
                          </p>

                          <p className="mt-1 text-xl font-bold text-white">
                            {value ?? "—"}
                          </p>
                        </div>
                      ))}
                    </div>

                    {evaluation.feedback && (
                      <div className="mt-5">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                          Feedback
                        </p>

                        <p className="mt-2 text-sm leading-6 text-slate-300">
                          {evaluation.feedback}
                        </p>
                      </div>
                    )}

                    {Array.isArray(evaluation.strengths) &&
                      evaluation.strengths.length > 0 && (
                        <div className="mt-5">
                          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                            Strengths
                          </p>

                          <div className="mt-2 space-y-2">
                            {evaluation.strengths.map((item, index) => (
                              <p
                                key={index}
                                className="text-sm text-emerald-300"
                              >
                                + {item}
                              </p>
                            ))}
                          </div>
                        </div>
                      )}

                    {Array.isArray(evaluation.weaknesses) &&
                      evaluation.weaknesses.length > 0 && (
                        <div className="mt-5">
                          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                            Areas to improve
                          </p>

                          <div className="mt-2 space-y-2">
                            {evaluation.weaknesses.map((item, index) => (
                              <p key={index} className="text-sm text-red-300">
                                − {item}
                              </p>
                            ))}
                          </div>
                        </div>
                      )}
                  </div>

                  <button
                    type="button"
                    onClick={handleNextQuestion}
                    disabled={
                      generating || submitting || evaluating || completing
                    }
                    className="mt-5 flex w-full items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 py-3 text-sm font-semibold transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {generating ? (
                      <>
                        <FiLoader className="animate-spin" />
                        Preparing...
                      </>
                    ) : (
                      <>
                        Next Question
                        <FiChevronRight />
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <>
                  <textarea
                    value={answerText}
                    onChange={(event) => setAnswerText(event.target.value)}
                    disabled={submitting || evaluating}
                    maxLength={20000}
                    placeholder="Write your answer here...

Explain:
- your approach
- why it works
- complexity
- edge cases
- trade-offs"
                    className="min-h-0 flex-1 resize-none border-0 bg-[#1f1f1f] p-5 font-mono text-sm leading-7 text-slate-200 outline-none placeholder:text-slate-700 focus:ring-0"
                  />

                  <div className="border-t border-[#3c3c3c] bg-[#252525] p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="hidden items-center gap-4 text-[10px] text-slate-600 sm:flex">
                        <span>Adaptive</span>

                        <span>{currentDifficulty}</span>

                        <span>{estimatedLevel}</span>
                      </div>

                      <button
                        type="button"
                        onClick={handleSubmitAnswer}
                        disabled={
                          !answerText.trim() || submitting || evaluating
                        }
                        className="ml-auto flex items-center gap-2 rounded-md bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {submitting || evaluating ? (
                          <>
                            <FiLoader className="animate-spin" />

                            {evaluating ? "Evaluating..." : "Submitting..."}
                          </>
                        ) : (
                          <>
                            <FiSend />
                            Submit Answer
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </section>

          {/* ==================================================
              SIDEBAR
          ================================================== */}

          <aside className="space-y-3">
            {/* Difficulty */}
            <InfoCard
              icon={FiActivity}
              label="Difficulty"
              value={currentDifficulty}
              capitalize
            />

            {/* AI Level */}
            <InfoCard
              icon={FiAward}
              label="AI Estimated Level"
              value={estimatedLevel}
              capitalize
            />

            {/* Confidence */}
            {experienceConfidence !== null && (
              <InfoCard
                icon={FiBarChart2}
                label="Confidence"
                value={`${experienceConfidence}%`}
              />
            )}

            {/* Interview Type */}
            <InfoCard
              icon={FiCpu}
              label="Interview Type"
              value={interview?.interviewType || "mixed"}
              capitalize
            />

            {/* Technologies */}
            <div className="rounded-md border border-[#3c3c3c] bg-[#1f1f1f]">
              <div className="border-b border-[#3c3c3c] px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Technologies
                </p>
              </div>

              <div className="p-4">
                {technologies.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {technologies.map((technology) => (
                      <span
                        key={technology}
                        className="rounded bg-blue-500/10 px-2 py-1 text-[10px] text-blue-400"
                      >
                        {technology}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-slate-600">
                    No technologies attached to this interview.
                  </div>
                )}
              </div>
            </div>

            {/* Progress */}
            <div className="rounded-md border border-[#3c3c3c] bg-[#1f1f1f] p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Progress
              </p>

              <div className="mt-3 flex items-end justify-between">
                <span className="text-2xl font-bold">
                  {Math.round(progressPercentage)}%
                </span>

                <span className="text-xs text-slate-600">
                  {completedQuestions}/{MAX_QUESTIONS}
                </span>
              </div>

              <div className="mt-3 h-1.5 rounded-full bg-[#333]">
                <div
                  className="h-full rounded-full bg-emerald-500"
                  style={{
                    width: `${progressPercentage}%`,
                  }}
                />
              </div>
            </div>

            {/* Complete */}
            {completedQuestions > 0 &&
              !question &&
              !generating &&
              !completed && (
                <button
                  type="button"
                  onClick={handleCompleteInterview}
                  disabled={completing}
                  className="flex w-full items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 py-3 text-sm font-semibold transition hover:bg-emerald-500 disabled:opacity-50"
                >
                  {completing ? (
                    <FiLoader className="animate-spin" />
                  ) : (
                    <FiCheckCircle />
                  )}
                  Complete Interview
                </button>
              )}
          </aside>
        </div>
      </main>
    </div>
  );
};

// ============================================================
// INFO CARD
// ============================================================

const InfoCard = ({ icon: Icon, label, value, capitalize = false }) => {
  return (
    <div className="rounded-md border border-[#3c3c3c] bg-[#1f1f1f] p-4">
      <div className="flex items-center gap-2">
        <Icon className="text-slate-600" size={14} />

        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          {label}
        </p>
      </div>

      <p
        className={`mt-2 text-sm font-semibold text-white ${
          capitalize ? "capitalize" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
};

export default InterviewAgent;
