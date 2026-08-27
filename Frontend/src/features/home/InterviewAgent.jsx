import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  FiActivity,
  FiAlertCircle,
  FiArrowLeft,
  FiAward,
  FiBarChart2,
  FiBookOpen,
  FiCheck,
  FiCheckCircle,
  FiChevronLeft,
  FiChevronRight,
  FiClock,
  FiCode,
  FiCopy,
  FiCpu,
  FiEdit3,
  FiLayers,
  FiLoader,
  FiPause,
  FiPlay,
  FiSend,
  FiSkipForward,
  FiTarget,
  FiTrendingUp,
  FiX,
  FiZap,
} from "react-icons/fi";

import {
  getInterview,
  startInterview,
  resumeInterview,
  pauseInterview,
  completeInterview,
  cancelInterview,
  getInterviewQuestions,
  getNextQuestion,
  getPreviousQuestion,
  generateInterviewQuestion,
  submitAnswer,
  resubmitAnswer,
  answerSkippedQuestion,
  evaluateAnswer,
  reEvaluateAnswer,
  getEvaluation,
  skipQuestion as skipQuestionApi,
  getInterviewProgress,
} from "../../api/interview.api";

// ============================================================
// CONSTANTS
// ============================================================

const MAX_QUESTIONS = 100;
const MAX_ANSWER_LENGTH = 50000;

// ============================================================
// HELPERS
// ============================================================

const clamp = (value, min, max) => {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return min;
  }

  return Math.min(max, Math.max(min, number));
};

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message ||
  error?.response?.data?.error?.message ||
  error?.message ||
  fallback;

const getQuestionId = (question) =>
  question?._id ||
  question?.id ||
  question?.questionId ||
  null;

const getQuestionNumber = (question) => {
  const number = Number(question?.questionNumber);
  return Number.isInteger(number) ? number : 0;
};

const getQuestionType = (question) => {
  if (
    question?.category === "coding" ||
    question?.category === "dsa" ||
    question?.coding
  ) {
    return "coding";
  }

  if (
    question?.category === "debugging" ||
    question?.debugging
  ) {
    return "debugging";
  }

  return "text";
};

const getAnswerText = (question) =>
  question?.answerText ||
  question?.candidateAnswer ||
  question?.answer?.answerText ||
  question?.answer?.currentAnswer?.text ||
  "";

const getAnswerCode = (question) =>
  question?.code ||
  question?.candidateCode ||
  question?.answer?.code ||
  question?.answer?.currentAnswer?.code ||
  "";

const getAnswerValue = (question) => {
  const type = getQuestionType(question);

  return type === "coding" || type === "debugging"
    ? getAnswerCode(question)
    : getAnswerText(question);
};

const isQuestionAnswered = (question) =>
  Boolean(
    question &&
      (
        question.status === "answered" ||
        question.evaluationStatus === "completed" ||
        getAnswerText(question) ||
        getAnswerCode(question)
      ),
  );

const sortQuestions = (list) =>
  [...list].sort(
    (a, b) =>
      getQuestionNumber(a) -
      getQuestionNumber(b),
  );

// ============================================================
// RESPONSE EXTRACTORS
// ============================================================

const extractInterview = (response) => {
  const data = response?.data;

  const candidates = [
    data?.data?.interview,
    data?.data?.interviewData,
    data?.interview,
    data?.data,
    response?.interview,
  ];

  return (
    candidates.find(
      (item) =>
        item &&
        typeof item === "object" &&
        !Array.isArray(item) &&
        (item._id ||
          item.id ||
          item.status ||
          item.role),
    ) || null
  );
};

const extractQuestions = (response) => {
  const data = response?.data;

  const candidates = [
    data?.data?.questions,
    data?.questions,
    data?.data,
    data,
  ];

  for (const value of candidates) {
    if (Array.isArray(value)) {
      return sortQuestions(value);
    }
  }

  return [];
};

const extractProgress = (response) => {
  const data = response?.data;

  const candidates = [
    data?.data?.progress,
    data?.progress,
    data?.data,
    data,
  ];

  for (const value of candidates) {
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value)
    ) {
      return value;
    }
  }

  return null;
};

const extractQuestionResult = (response) => {
  const data = response?.data;

  let result =
    data?.data?.data ||
    data?.data ||
    data ||
    {};

  if (
    result?.data &&
    typeof result.data === "object" &&
    !Array.isArray(result.data) &&
    !result.question
  ) {
    result = result.data;
  }

  return {
    question: result?.question || null,
    questionNumber:
      result?.questionNumber ??
      result?.question?.questionNumber ??
      null,
    interviewProgress:
      result?.interviewProgress ||
      result?.progress ||
      null,
    adaptiveState:
      result?.adaptiveState || null,
    interview:
      result?.interview || null,
    navigation:
      result?.navigation || null,
    needsGeneration:
      Boolean(result?.needsGeneration),
    isLastQuestion:
      Boolean(result?.isLastQuestion),
  };
};

const extractEvaluation = (response) => {
  const data = response?.data;

  const candidates = [
    data?.data?.evaluation,
    data?.evaluation,
    data?.data,
    data,
  ];

  for (const value of candidates) {
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      (
        value.overallScore !== undefined ||
        value.correctnessScore !== undefined ||
        value.feedback !== undefined
      )
    ) {
      return value;
    }
  }

  return null;
};

// ============================================================
// COMPONENT
// ============================================================

const InterviewAgent = () => {
  const { id: interviewId } = useParams();
  const navigate = useNavigate();

  const [interview, setInterview] =
    useState(null);

  const [questions, setQuestions] =
    useState([]);

  const [currentQuestionNumber, setCurrentQuestionNumber] =
    useState(0);

  const [answerDrafts, setAnswerDrafts] =
    useState({});

  const [evaluations, setEvaluations] =
    useState({});

  const [progress, setProgress] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [generating, setGenerating] =
    useState(false);

  const [submitting, setSubmitting] =
    useState(false);

  const [evaluating, setEvaluating] =
    useState(false);

  const [skipping, setSkipping] =
    useState(false);

  const [pausing, setPausing] =
    useState(false);

  const [completing, setCompleting] =
    useState(false);

  const [cancelling, setCancelling] =
    useState(false);

  const [completed, setCompleted] =
    useState(false);

  const [paused, setPaused] =
    useState(false);

  const [error, setError] =
    useState("");

  const [activeTab, setActiveTab] =
    useState("question");

  const [editingAnswer, setEditingAnswer] =
    useState(false);

  // ==========================================================
  // REFS
  // ==========================================================

  const initializationRef =
    useRef(new Map());

  const generatingRef =
    useRef(false);

  const submittingRef =
    useRef(false);

  const actionRef =
    useRef(false);

  const evaluationPromiseRef =
    useRef(new Map());

  // ==========================================================
  // CURRENT QUESTION
  // ==========================================================

  const currentQuestion = useMemo(() => {
    if (!currentQuestionNumber) {
      return null;
    }

    return (
      questions.find(
        (question) =>
          getQuestionNumber(question) ===
          Number(currentQuestionNumber),
      ) || null
    );
  }, [
    questions,
    currentQuestionNumber,
  ]);

  const currentQuestionId =
    getQuestionId(currentQuestion);

  const currentQuestionType =
    getQuestionType(currentQuestion);

  // ==========================================================
  // ANSWER
  // ==========================================================

  const answerValue = currentQuestionId
    ? (
        answerDrafts[currentQuestionId] ??
        getAnswerValue(currentQuestion)
      )
    : "";

  const evaluation =
    currentQuestionId
      ? evaluations[currentQuestionId] || null
      : null;

  // ==========================================================
  // APPLY INTERVIEW
  // ==========================================================

  const applyInterview = useCallback(
    (data) => {
      if (!data) return;

      setInterview(data);

      if (data.currentQuestionNumber) {
        setCurrentQuestionNumber(
          Number(
            data.currentQuestionNumber,
          ),
        );
      }

      setCompleted(
        data.status === "completed",
      );

      setPaused(
        data.status === "paused",
      );
    },
    [],
  );

  // ==========================================================
  // APPLY PROGRESS
  // ==========================================================

  const applyProgress = useCallback(
    (data) => {
      if (!data) return;

      setProgress(data);

      const activeNumber =
        Number(
          data.currentQuestionNumber ??
            data.currentQuestion,
        ) || 0;

      if (activeNumber > 0) {
        setCurrentQuestionNumber(
          activeNumber,
        );
      }

      setInterview((previous) => {
        if (!previous) {
          return previous;
        }

        return {
          ...previous,

          totalQuestions:
            data.totalQuestions ??
            previous.totalQuestions ??
            10,

          generatedQuestions:
            data.generatedQuestions ??
            previous.generatedQuestions ??
            0,

          answeredQuestions:
            data.answeredQuestions ??
            previous.answeredQuestions ??
            0,

          skippedQuestions:
            data.skippedQuestions ??
            previous.skippedQuestions ??
            0,

          completedQuestions:
            data.completedQuestions ??
            previous.completedQuestions ??
            0,

          currentQuestionNumber:
            activeNumber ||
            previous.currentQuestionNumber ||
            0,

          currentDifficulty:
            data.currentDifficulty ??
            previous.currentDifficulty ??
            "medium",

          estimatedCandidateLevel:
            data.estimatedCandidateLevel ??
            previous.estimatedCandidateLevel ??
            null,

          candidateLevelScore:
            data.candidateLevelScore ??
            previous.candidateLevelScore ??
            null,

          candidateLevelConfidence:
            data.candidateLevelConfidence ??
            previous.candidateLevelConfidence ??
            null,

          estimatedExperienceLevel:
            data.estimatedExperienceLevel ??
            previous.estimatedExperienceLevel ??
            null,

          experienceConfidence:
            data.experienceConfidence ??
            previous.experienceConfidence ??
            null,

          currentScore:
            data.currentScore ??
            previous.currentScore ??
            null,

          overallScore:
            data.overallScore ??
            previous.overallScore ??
            null,

          originalScore:
            data.originalScore ??
            previous.originalScore ??
            null,

          status:
            data.status ??
            previous.status,

          exitReason:
            data.exitReason ??
            previous.exitReason ??
            null,
        };
      });

      if (
        data.status === "completed" ||
        Number(
          data.completedQuestions,
        ) >=
          Number(data.totalQuestions)
      ) {
        setCompleted(true);
      }
    },
    [],
  );

  // ==========================================================
  // ADAPTIVE STATE
  // ==========================================================

  const applyAdaptiveState =
    useCallback((data) => {
      if (!data) return;

      setInterview((previous) => {
        if (!previous) {
          return previous;
        }

        return {
          ...previous,
          currentDifficulty:
            data.difficulty ??
            previous.currentDifficulty ??
            "medium",
          estimatedCandidateLevel:
            data.candidateLevel ??
            previous.estimatedCandidateLevel ??
            null,
          candidateLevelScore:
            data.candidateLevelScore ??
            previous.candidateLevelScore ??
            null,
          candidateLevelConfidence:
            data.candidateLevelConfidence ??
            previous.candidateLevelConfidence ??
            null,
          estimatedExperienceLevel:
            data.estimatedExperienceLevel ??
            previous.estimatedExperienceLevel ??
            null,
          experienceConfidence:
            data.experienceConfidence ??
            previous.experienceConfidence ??
            null,
        };
      });
    }, []);

  // ==========================================================
  // REFRESH PROGRESS
  // ==========================================================

  const refreshProgress =
    useCallback(async () => {
      if (!interviewId) {
        return null;
      }

      const response =
        await getInterviewProgress(
          interviewId,
        );

      const data =
        extractProgress(response);

      if (data) {
        applyProgress(data);
      }

      return data;
    }, [
      interviewId,
      applyProgress,
    ]);

  // ==========================================================
  // REFRESH QUESTIONS
  // ==========================================================

  const refreshQuestions =
    useCallback(async () => {
      if (!interviewId) {
        return [];
      }

      const response =
        await getInterviewQuestions(
          interviewId,
        );

      const list =
        extractQuestions(response);

      setQuestions(list);

      return list;
    }, [interviewId]);

  // ==========================================================
  // EVALUATION
  // ==========================================================

  const loadQuestionEvaluation =
    useCallback(
      async (questionId) => {
        if (
          !questionId ||
          !interviewId
        ) {
          return null;
        }

        if (
          evaluations[questionId]
        ) {
          return evaluations[
            questionId
          ];
        }

        const existingPromise =
          evaluationPromiseRef.current.get(
            questionId,
          );

        if (existingPromise) {
          return existingPromise;
        }

        const promise =
          (async () => {
            try {
              const response =
                await getEvaluation(
                  interviewId,
                  questionId,
                );

              const result =
                extractEvaluation(
                  response,
                );

              if (result) {
                setEvaluations(
                  (previous) => ({
                    ...previous,
                    [questionId]:
                      result,
                  }),
                );
              }

              return result;
            } catch {
              return null;
            } finally {
              evaluationPromiseRef.current.delete(
                questionId,
              );
            }
          })();

        evaluationPromiseRef.current.set(
          questionId,
          promise,
        );

        return promise;
      },
      [
        interviewId,
        evaluations,
      ],
    );

  // ==========================================================
  // DISPLAY QUESTION
  // ==========================================================

  const displayQuestion =
    useCallback(
      async (
        question,
        openSolution = true,
      ) => {
        if (!question) return;

        const number =
          getQuestionNumber(question);

        if (!number) return;

        setCurrentQuestionNumber(
          number,
        );

        const id =
          getQuestionId(question);

        if (!id) return;

        setAnswerDrafts((previous) => ({
          ...previous,
          [id]:
            previous[id] ??
            getAnswerValue(question),
        }));

        setEditingAnswer(false);
        setError("");

        const cached =
          evaluations[id] || null;

        if (cached) {
          setActiveTab(
            openSolution
              ? "solution"
              : "question",
          );
          return;
        }

        if (
          isQuestionAnswered(
            question,
          )
        ) {
          const loaded =
            await loadQuestionEvaluation(
              id,
            );

          setActiveTab(
            loaded && openSolution
              ? "solution"
              : "question",
          );

          return;
        }

        setActiveTab("question");
      },
      [
        evaluations,
        loadQuestionEvaluation,
      ],
    );

  // ==========================================================
  // QUESTION CACHE
  // ==========================================================

  const upsertQuestion =
    useCallback(
      (incoming) => {
        if (!incoming) return;

        const id =
          getQuestionId(incoming);

        if (!id) return;

        setQuestions((previous) => {
          const index =
            previous.findIndex(
              (item) =>
                getQuestionId(item) ===
                id,
            );

          if (index >= 0) {
            return sortQuestions(
              previous.map(
                (item, itemIndex) =>
                  itemIndex === index
                    ? {
                        ...item,
                        ...incoming,
                      }
                    : item,
              ),
            );
          }

          return sortQuestions([
            ...previous,
            incoming,
          ]);
        });
      },
      [],
    );

  // ==========================================================
  // GENERATE
  // ==========================================================

  const generateQuestionInternal =
    useCallback(async () => {
      if (
        !interviewId ||
        generatingRef.current
      ) {
        return null;
      }

      generatingRef.current = true;
      setGenerating(true);
      setError("");

      try {
        // Check whether backend already
        // has next generated question.
        try {
          const response =
            await getNextQuestion(
              interviewId,
            );

          const result =
            extractQuestionResult(
              response,
            );

          if (
            result.interviewProgress
          ) {
            applyProgress(
              result.interviewProgress,
            );
          }

          if (result.adaptiveState) {
            applyAdaptiveState(
              result.adaptiveState,
            );
          }

          if (result.question) {
            const question =
              result.question;

            upsertQuestion(question);

            const number =
              getQuestionNumber(
                question,
              );

            setCurrentQuestionNumber(
              number,
            );

            const id =
              getQuestionId(question);

            if (id) {
              setAnswerDrafts(
                (previous) => ({
                  ...previous,
                  [id]:
                    getAnswerValue(
                      question,
                    ),
                }),
              );

              setEvaluations(
                (previous) => {
                  const next = {
                    ...previous,
                  };

                  delete next[id];

                  return next;
                },
              );
            }

            setEditingAnswer(false);
            setActiveTab("question");

            return question;
          }
        } catch {
          // Continue to AI generation.
        }

        const progressData =
          await refreshProgress();

        const total = clamp(
          progressData?.totalQuestions ??
            interview?.totalQuestions ??
            10,
          1,
          MAX_QUESTIONS,
        );

        const completedCount =
          clamp(
            progressData?.completedQuestions ??
              interview?.completedQuestions ??
              0,
            0,
            total,
          );

        if (
          completedCount >= total
        ) {
          setCompleted(true);
          return null;
        }

        const response =
          await generateInterviewQuestion(
            interviewId,
          );

        const result =
          extractQuestionResult(
            response,
          );

        if (!result.question) {
          throw new Error(
            "AI interviewer did not return a question.",
          );
        }

        if (
          result.interviewProgress
        ) {
          applyProgress(
            result.interviewProgress,
          );
        }

        if (result.adaptiveState) {
          applyAdaptiveState(
            result.adaptiveState,
          );
        }

        const question =
          result.question;

        upsertQuestion(question);

        const number =
          getQuestionNumber(
            question,
          );

        setCurrentQuestionNumber(
          number,
        );

        const id =
          getQuestionId(question);

        if (id) {
          setAnswerDrafts(
            (previous) => ({
              ...previous,
              [id]:
                getAnswerValue(
                  question,
                ),
            }),
          );
        }

        setEditingAnswer(false);
        setActiveTab("question");

        return question;
      } catch (generationError) {
        setError(
          getErrorMessage(
            generationError,
            "Failed to generate question.",
          ),
        );

        return null;
      } finally {
        generatingRef.current = false;
        setGenerating(false);
      }
    }, [
      interviewId,
      interview,
      applyProgress,
      applyAdaptiveState,
      upsertQuestion,
      refreshProgress,
    ]);

  // ==========================================================
  // INITIALIZATION
  // ==========================================================

  useEffect(() => {
    if (!interviewId) {
      setLoading(false);
      setError(
        "Interview ID is missing.",
      );
      return;
    }

    const existing =
      initializationRef.current.get(
        interviewId,
      );

    if (existing) {
      existing.finally(() => {
        if (
          initializationRef.current.get(
            interviewId,
          ) === existing
        ) {
          setLoading(false);
        }
      });

      return;
    }

    const initialize =
      (async () => {
        try {
          setLoading(true);
          setError("");

          const interviewResponse =
            await getInterview(
              interviewId,
            );

          let currentInterview =
            extractInterview(
              interviewResponse,
            );

          if (!currentInterview) {
            throw new Error(
              "Interview not found.",
            );
          }

          if (
            currentInterview.status ===
            "created"
          ) {
            const response =
              await startInterview(
                interviewId,
              );

            const started =
              extractInterview(response);

            if (!started) {
              throw new Error(
                "Interview start returned no interview.",
              );
            }

            currentInterview = started;
          }

          if (
            currentInterview.status ===
            "paused"
          ) {
            const response =
              await resumeInterview(
                interviewId,
              );

            const resumed =
              extractInterview(response);

            if (!resumed) {
              throw new Error(
                "Interview resume returned no interview.",
              );
            }

            currentInterview = resumed;
          }

          applyInterview(
            currentInterview,
          );

          if (
            currentInterview.status ===
            "completed"
          ) {
            setCompleted(true);
            return;
          }

          if (
            currentInterview.status ===
            "cancelled"
          ) {
            setError(
              "This interview has been cancelled.",
            );
            return;
          }

          const [
            progressResponse,
            questionsResponse,
          ] = await Promise.all([
            getInterviewProgress(
              interviewId,
            ),
            getInterviewQuestions(
              interviewId,
            ),
          ]);

          const progressData =
            extractProgress(
              progressResponse,
            );

          const questionList =
            extractQuestions(
              questionsResponse,
            );

          if (progressData) {
            applyProgress(
              progressData,
            );
          }

          setQuestions(
            questionList,
          );

          const restoredAnswers = {};

          questionList.forEach(
            (question) => {
              const id =
                getQuestionId(
                  question,
                );

              if (id) {
                restoredAnswers[id] =
                  getAnswerValue(
                    question,
                  );
              }
            },
          );

          setAnswerDrafts(
            restoredAnswers,
          );

          const serverCurrentNumber =
            Number(
              progressData?.currentQuestionNumber ??
                progressData?.currentQuestion ??
                currentInterview?.currentQuestionNumber ??
                0,
            );

          const pendingQuestion =
            questionList.find(
              (question) =>
                question?.status ===
                "pending",
            );

          if (pendingQuestion) {
            await displayQuestion(
              pendingQuestion,
              false,
            );
            return;
          }

          if (
            serverCurrentNumber > 0
          ) {
            const serverQuestion =
              questionList.find(
                (question) =>
                  getQuestionNumber(
                    question,
                  ) ===
                  serverCurrentNumber,
              );

            if (serverQuestion) {
              await displayQuestion(
                serverQuestion,
                true,
              );

              return;
            }
          }

          if (
            questionList.length > 0
          ) {
            await displayQuestion(
              questionList[
                questionList.length - 1
              ],
              true,
            );

            return;
          }

          await generateQuestionInternal();
        } catch (initializeError) {
          setError(
            getErrorMessage(
              initializeError,
              "Failed to initialize interview.",
            ),
          );
        } finally {
          setLoading(false);
        }
      })();

    initializationRef.current.set(
      interviewId,
      initialize,
    );
  }, [
    interviewId,
    applyInterview,
    applyProgress,
    displayQuestion,
    generateQuestionInternal,
  ]);

  // ==========================================================
  // NAVIGATION
  // ==========================================================

  const handleNextQuestion =
    useCallback(async () => {
      if (
        actionRef.current ||
        submitting ||
        evaluating ||
        skipping ||
        generating ||
        pausing ||
        completing ||
        cancelling
      ) {
        return;
      }

      try {
        setError("");

        const response =
          await getNextQuestion(
            interviewId,
          );

        const result =
          extractQuestionResult(
            response,
          );

        if (
          result.interviewProgress
        ) {
          applyProgress(
            result.interviewProgress,
          );
        }

        if (result.interview) {
          setInterview(
            (previous) =>
              previous
                ? {
                    ...previous,
                    ...result.interview,
                  }
                : previous,
          );
        }

        if (result.question) {
          upsertQuestion(
            result.question,
          );

          await displayQuestion(
            result.question,
            false,
          );

          return;
        }

        await generateQuestionInternal();
      } catch (nextError) {
        setError(
          getErrorMessage(
            nextError,
            "Failed to move to the next question.",
          ),
        );
      }
    }, [
      interviewId,
      submitting,
      evaluating,
      skipping,
      generating,
      pausing,
      completing,
      cancelling,
      applyProgress,
      upsertQuestion,
      displayQuestion,
      generateQuestionInternal,
    ]);

  const handlePreviousQuestion =
    useCallback(async () => {
      if (
        actionRef.current ||
        submitting ||
        evaluating ||
        skipping ||
        generating ||
        pausing ||
        completing ||
        cancelling
      ) {
        return;
      }

      if (
        !interviewId ||
        currentQuestionNumber <= 1
      ) {
        return;
      }

      try {
        setError("");

        const response =
          await getPreviousQuestion(
            interviewId,
          );

        const result =
          extractQuestionResult(
            response,
          );

        if (
          result.interviewProgress
        ) {
          applyProgress(
            result.interviewProgress,
          );
        }

        if (result.question) {
          upsertQuestion(
            result.question,
          );

          await displayQuestion(
            result.question,
            false,
          );
        }
      } catch (previousError) {
        setError(
          getErrorMessage(
            previousError,
            "Failed to move to the previous question.",
          ),
        );
      }
    }, [
      interviewId,
      currentQuestionNumber,
      submitting,
      evaluating,
      skipping,
      generating,
      pausing,
      completing,
      cancelling,
      applyProgress,
      upsertQuestion,
      displayQuestion,
    ]);

  // ==========================================================
  // ANSWER
  // ==========================================================

  const handleAnswerChange =
    useCallback(
      (value) => {
        if (!currentQuestionId) {
          return;
        }

        setAnswerDrafts(
          (previous) => ({
            ...previous,
            [currentQuestionId]:
              value,
          }),
        );
      },
      [currentQuestionId],
    );

  const buildAnswerPayload =
    useCallback(
      (question, value) => {
        const type =
          getQuestionType(question);

        if (
          type === "coding" ||
          type === "debugging"
        ) {
          return {
            answerType: type,
            code: value,
            language:
              question?.coding
                ?.language ||
              question?.debugging
                ?.language ||
              undefined,
          };
        }

        return {
          answerType: "text",
          answerText: value,
        };
      },
      [],
    );

  const updateLocalQuestionAnswer =
    useCallback(
      (questionId, value) => {
        setQuestions((previous) =>
          previous.map(
            (item) => {
              if (
                getQuestionId(
                  item,
                ) !== questionId
              ) {
                return item;
              }

              const type =
                getQuestionType(
                  item,
                );

              if (
                type === "coding" ||
                type === "debugging"
              ) {
                return {
                  ...item,
                  status:
                    "answered",
                  code: value,
                  candidateCode:
                    value,
                  evaluationStatus:
                    "completed",
                  answer: {
                    ...(item.answer ||
                      {}),
                    code: value,
                    currentAnswer: {
                      ...(item.answer
                        ?.currentAnswer ||
                        {}),
                      code: value,
                    },
                  },
                };
              }

              return {
                ...item,
                status:
                  "answered",
                answerText: value,
                candidateAnswer:
                  value,
                evaluationStatus:
                  "completed",
                answer: {
                  ...(item.answer ||
                    {}),
                  answerText:
                    value,
                  currentAnswer: {
                    ...(item.answer
                      ?.currentAnswer ||
                      {}),
                    text: value,
                  },
                },
              };
            },
          ),
        );
      },
      [],
    );

  const handleEditAnswer =
    useCallback(() => {
      if (
        !currentQuestionId ||
        !currentQuestion
      ) {
        return;
      }

      setEditingAnswer(true);
      setActiveTab("question");
      setError("");

      setAnswerDrafts(
        (previous) => ({
          ...previous,
          [currentQuestionId]:
            answerValue,
        }),
      );
    }, [
      currentQuestion,
      currentQuestionId,
      answerValue,
    ]);

  const handleCancelEdit =
    useCallback(() => {
      if (!currentQuestionId) {
        return;
      }

      setAnswerDrafts(
        (previous) => ({
          ...previous,
          [currentQuestionId]:
            getAnswerValue(
              currentQuestion,
            ),
        }),
      );

      setEditingAnswer(false);

      setActiveTab(
        evaluations[currentQuestionId]
          ? "solution"
          : "question",
      );
    }, [
      currentQuestion,
      currentQuestionId,
      evaluations,
    ]);

  // ==========================================================
  // SUBMIT
  // ==========================================================

  const handleSubmitAnswer =
    useCallback(async () => {
      if (
        !currentQuestion ||
        !currentQuestionId
      ) {
        setError(
          "No active question.",
        );
        return;
      }

      if (
        submittingRef.current ||
        submitting ||
        evaluating ||
        skipping ||
        generating ||
        pausing ||
        completing ||
        cancelling
      ) {
        return;
      }

      const trimmed =
        String(
          answerValue || "",
        ).trim();

      if (!trimmed) {
        setError(
          currentQuestionType ===
            "text"
            ? "Please enter your answer."
            : "Please enter your code.",
        );
        return;
      }

      if (
        trimmed.length >
        MAX_ANSWER_LENGTH
      ) {
        setError(
          `Maximum ${MAX_ANSWER_LENGTH} characters allowed.`,
        );
        return;
      }

      submittingRef.current = true;

      try {
        setError("");

        const alreadyAnswered =
          currentQuestion.status ===
            "answered" ||
          Boolean(
            currentQuestion.answer,
          ) ||
          Boolean(
            evaluations[
              currentQuestionId
            ],
          ) ||
          editingAnswer;

        const payload =
          buildAnswerPayload(
            currentQuestion,
            trimmed,
          );

        if (alreadyAnswered) {
          setEvaluating(true);

          await resubmitAnswer(
            interviewId,
            currentQuestionId,
            payload,
          );

          updateLocalQuestionAnswer(
            currentQuestionId,
            trimmed,
          );

          const response =
            await reEvaluateAnswer(
              interviewId,
              currentQuestionId,
              payload,
            );

          let result =
            extractEvaluation(
              response,
            );

          if (!result) {
            result =
              await loadQuestionEvaluation(
                currentQuestionId,
              );
          }

          if (!result) {
            throw new Error(
              "Re-evaluation was not returned.",
            );
          }

          setEvaluations(
            (previous) => ({
              ...previous,
              [currentQuestionId]:
                result,
            }),
          );

          setAnswerDrafts(
            (previous) => ({
              ...previous,
              [currentQuestionId]:
                trimmed,
            }),
          );

          setEditingAnswer(false);
          setActiveTab("solution");

          await refreshProgress();

          return;
        }

        setSubmitting(true);

        await submitAnswer(
          interviewId,
          currentQuestionId,
          payload,
        );

        setSubmitting(false);
        setEvaluating(true);

        updateLocalQuestionAnswer(
          currentQuestionId,
          trimmed,
        );

        const response =
          await evaluateAnswer(
            interviewId,
            currentQuestionId,
          );

        let result =
          extractEvaluation(
            response,
          );

        if (!result) {
          result =
            await loadQuestionEvaluation(
              currentQuestionId,
            );
        }

        if (!result) {
          throw new Error(
            "Evaluation was not returned.",
          );
        }

        setEvaluations(
          (previous) => ({
            ...previous,
            [currentQuestionId]:
              result,
          }),
        );

        setAnswerDrafts(
          (previous) => ({
            ...previous,
            [currentQuestionId]:
              trimmed,
          }),
        );

        setActiveTab("solution");

        const latest =
          await refreshProgress();

        if (
          latest?.status ===
            "completed" ||
          Number(
            latest?.completedQuestions,
          ) >=
            Number(
              latest?.totalQuestions,
            )
        ) {
          setCompleted(true);
        }
      } catch (submitError) {
        setError(
          getErrorMessage(
            submitError,
            "Failed to submit answer.",
          ),
        );
      } finally {
        setSubmitting(false);
        setEvaluating(false);
        submittingRef.current =
          false;
      }
    }, [
      currentQuestion,
      currentQuestionId,
      currentQuestionType,
      answerValue,
      interviewId,
      submitting,
      evaluating,
      skipping,
      generating,
      pausing,
      completing,
      cancelling,
      evaluations,
      editingAnswer,
      buildAnswerPayload,
      updateLocalQuestionAnswer,
      loadQuestionEvaluation,
      refreshProgress,
    ]);

  // ==========================================================
  // SKIP
  // ==========================================================

  const handleSkipQuestion =
    useCallback(async () => {
      if (
        !currentQuestion ||
        !currentQuestionId
      ) {
        setError(
          "No active question.",
        );
        return;
      }

      if (
        actionRef.current ||
        submitting ||
        evaluating ||
        skipping ||
        generating ||
        pausing ||
        completing ||
        cancelling
      ) {
        return;
      }

      if (
        !window.confirm(
          "Skip this question?",
        )
      ) {
        return;
      }

      actionRef.current = true;

      try {
        setSkipping(true);
        setError("");

        await skipQuestionApi(
          interviewId,
          currentQuestionId,
          "user-skipped",
        );

        setQuestions((previous) =>
          previous.map(
            (item) =>
              getQuestionId(
                item,
              ) === currentQuestionId
                ? {
                    ...item,
                    status:
                      "skipped",
                    answerText:
                      "",
                    candidateAnswer:
                      "",
                    code: "",
                    candidateCode:
                      "",
                    evaluationStatus:
                      null,
                  }
                : item,
          ),
        );

        setAnswerDrafts(
          (previous) => ({
            ...previous,
            [currentQuestionId]:
              "",
          }),
        );

        setEvaluations((previous) => {
          const next = {
            ...previous,
          };

          delete next[
            currentQuestionId
          ];

          return next;
        });

        await refreshProgress();
        await handleNextQuestion();
      } catch (skipError) {
        setError(
          getErrorMessage(
            skipError,
            "Failed to skip question.",
          ),
        );
      } finally {
        setSkipping(false);
        actionRef.current = false;
      }
    }, [
      currentQuestion,
      currentQuestionId,
      submitting,
      evaluating,
      skipping,
      generating,
      pausing,
      completing,
      cancelling,
      interviewId,
      refreshProgress,
      handleNextQuestion,
    ]);

  // ==========================================================
  // ANSWER SKIPPED
  // ==========================================================

  const handleAnswerSkippedQuestion =
    useCallback(async () => {
      if (
        !currentQuestion ||
        !currentQuestionId
      ) {
        setError(
          "No active question.",
        );
        return;
      }

      const trimmed =
        String(
          answerValue || "",
        ).trim();

      if (!trimmed) {
        setError(
          "Please enter your answer.",
        );
        return;
      }

      if (
        submittingRef.current ||
        submitting ||
        evaluating
      ) {
        return;
      }

      submittingRef.current = true;

      try {
        setSubmitting(true);

        const payload =
          buildAnswerPayload(
            currentQuestion,
            trimmed,
          );

        await answerSkippedQuestion(
          interviewId,
          currentQuestionId,
          payload,
        );

        setSubmitting(false);
        setEvaluating(true);

        updateLocalQuestionAnswer(
          currentQuestionId,
          trimmed,
        );

        const response =
          await evaluateAnswer(
            interviewId,
            currentQuestionId,
          );

        let result =
          extractEvaluation(
            response,
          );

        if (!result) {
          result =
            await loadQuestionEvaluation(
              currentQuestionId,
            );
        }

        if (!result) {
          throw new Error(
            "Evaluation was not returned.",
          );
        }

        setEvaluations(
          (previous) => ({
            ...previous,
            [currentQuestionId]:
              result,
          }),
        );

        setActiveTab(
          "solution",
        );
      } catch (error) {
        setError(
          getErrorMessage(
            error,
            "Failed to answer skipped question.",
          ),
        );
      } finally {
        setSubmitting(false);
        setEvaluating(false);
        submittingRef.current =
          false;
      }
    }, [
      currentQuestion,
      currentQuestionId,
      answerValue,
      submitting,
      evaluating,
      interviewId,
      buildAnswerPayload,
      updateLocalQuestionAnswer,
      loadQuestionEvaluation,
    ]);

  // ==========================================================
  // PAUSE / RESUME / FINISH / CANCEL
  // ==========================================================

  const handlePause =
    useCallback(async () => {
      if (
        actionRef.current ||
        pausing ||
        completing ||
        cancelling
      ) {
        return;
      }

      if (
        !window.confirm(
          "Pause this interview? Your progress will be saved.",
        )
      ) {
        return;
      }

      actionRef.current = true;

      try {
        setPausing(true);

        await pauseInterview(
          interviewId,
          "user-paused",
        );

        setPaused(true);

        setInterview((previous) =>
          previous
            ? {
                ...previous,
                status: "paused",
              }
            : previous,
        );
      } catch (error) {
        setError(
          getErrorMessage(
            error,
            "Failed to pause interview.",
          ),
        );
      } finally {
        setPausing(false);
        actionRef.current = false;
      }
    }, [
      pausing,
      completing,
      cancelling,
      interviewId,
    ]);

  const handleResume =
    useCallback(async () => {
      if (
        !paused ||
        !interviewId ||
        actionRef.current
      ) {
        return;
      }

      actionRef.current = true;

      try {
        setLoading(true);

        const response =
          await resumeInterview(
            interviewId,
          );

        const resumed =
          extractInterview(
            response,
          );

        if (resumed) {
          applyInterview(resumed);
        }

        setPaused(false);

        const [
          progressData,
          questionList,
        ] = await Promise.all([
          refreshProgress(),
          refreshQuestions(),
        ]);

        const pending =
          questionList.find(
            (question) =>
              question.status ===
              "pending",
          );

        if (pending) {
          await displayQuestion(
            pending,
            false,
          );
          return;
        }

        const currentNumber =
          Number(
            progressData?.currentQuestionNumber ??
              progressData?.currentQuestion ??
              resumed?.currentQuestionNumber ??
              0,
          );

        if (currentNumber > 0) {
          const current =
            questionList.find(
              (question) =>
                getQuestionNumber(
                  question,
                ) ===
                currentNumber,
            );

          if (current) {
            await displayQuestion(
              current,
              true,
            );
            return;
          }
        }

        if (
          questionList.length
        ) {
          await displayQuestion(
            questionList[
              questionList.length -
                1
            ],
            true,
          );
          return;
        }

        await generateQuestionInternal();
      } catch (error) {
        setError(
          getErrorMessage(
            error,
            "Failed to resume interview.",
          ),
        );
      } finally {
        setLoading(false);
        actionRef.current = false;
      }
    }, [
      paused,
      interviewId,
      applyInterview,
      refreshProgress,
      refreshQuestions,
      displayQuestion,
      generateQuestionInternal,
    ]);

  const handleFinish =
    useCallback(async () => {
      if (
        actionRef.current ||
        completing ||
        cancelling ||
        pausing
      ) {
        return;
      }

      if (
        !window.confirm(
          "Finish this interview now?",
        )
      ) {
        return;
      }

      actionRef.current = true;

      try {
        setCompleting(true);

        const response =
          await completeInterview(
            interviewId,
          );

        const completedInterview =
          extractInterview(
            response,
          );

        if (completedInterview) {
          setInterview(
            completedInterview,
          );
        }

        setCompleted(true);
      } catch (error) {
        setError(
          getErrorMessage(
            error,
            "Failed to finish interview.",
          ),
        );
      } finally {
        setCompleting(false);
        actionRef.current = false;
      }
    }, [
      completing,
      cancelling,
      pausing,
      interviewId,
    ]);

  const handleCancel =
    useCallback(async () => {
      if (
        actionRef.current ||
        cancelling ||
        completing ||
        pausing
      ) {
        return;
      }

      if (
        !window.confirm(
          "Cancel this interview? Saved progress will remain available, but this interview cannot be resumed.",
        )
      ) {
        return;
      }

      actionRef.current = true;

      try {
        setCancelling(true);

        await cancelInterview(
          interviewId,
          "user-exit",
        );

        navigate("/dashboard");
      } catch (error) {
        setError(
          getErrorMessage(
            error,
            "Failed to cancel interview.",
          ),
        );

        actionRef.current =
          false;
      } finally {
        setCancelling(false);
      }
    }, [
      cancelling,
      completing,
      pausing,
      interviewId,
      navigate,
    ]);

  // ==========================================================
  // COPY
  // ==========================================================

  const copyToClipboard =
    useCallback(
      async (
        value,
        label = "Content",
      ) => {
        if (
          !value ||
          !String(value).trim()
        ) {
          setError(
            `${label} is empty.`,
          );
          return;
        }

        try {
          await navigator.clipboard.writeText(
            String(value),
          );

          setError("");
        } catch {
          setError(
            `Unable to copy ${label}.`,
          );
        }
      },
      [],
    );

  // ==========================================================
  // DERIVED DATA
  // ==========================================================

  const totalQuestions = clamp(
    interview?.totalQuestions ??
      progress?.totalQuestions ??
      10,
    1,
    MAX_QUESTIONS,
  );

  const generatedQuestions = clamp(
    interview?.generatedQuestions ??
      progress?.generatedQuestions ??
      questions.length,
    0,
    totalQuestions,
  );

  const answeredQuestions = clamp(
    interview?.answeredQuestions ??
      progress?.answeredQuestions ??
      questions.filter(
        (item) =>
          item.status === "answered",
      ).length,
    0,
    totalQuestions,
  );

  const skippedQuestions = clamp(
    interview?.skippedQuestions ??
      progress?.skippedQuestions ??
      questions.filter(
        (item) =>
          item.status === "skipped",
      ).length,
    0,
    totalQuestions,
  );

  const completedQuestions = clamp(
    interview?.completedQuestions ??
      progress?.completedQuestions ??
      answeredQuestions +
        skippedQuestions,
    0,
    totalQuestions,
  );

  const progressPercentage =
    totalQuestions > 0
      ? clamp(
          (completedQuestions /
            totalQuestions) *
            100,
          0,
          100,
        )
      : 0;

  const currentDifficulty =
    currentQuestion?.difficulty ||
    interview?.currentDifficulty ||
    progress?.currentDifficulty ||
    "medium";

  const candidateLevel =
    interview?.estimatedCandidateLevel ||
    progress?.estimatedCandidateLevel ||
    "Analyzing";

  const candidateLevelConfidence =
    interview?.candidateLevelConfidence ??
    progress?.candidateLevelConfidence ??
    null;

  const experienceLevel =
    interview?.estimatedExperienceLevel ||
    progress?.estimatedExperienceLevel ||
    "Analyzing";

  const experienceConfidence =
    interview?.experienceConfidence ??
    progress?.experienceConfidence ??
    null;

  const interviewScore =
    interview?.currentScore ??
    interview?.overallScore ??
    progress?.currentScore ??
    progress?.overallScore ??
    null;

  const technologies =
    useMemo(() => {
      const list =
        Array.isArray(
          interview?.technologies,
        )
          ? interview.technologies
          : [];

      return [
        ...new Set(
          list
            .filter(
              (item) =>
                typeof item ===
                  "string" &&
                item.trim(),
            )
            .map((item) =>
              item.trim(),
            ),
        ),
      ];
    }, [interview]);

  const questionStatus =
    currentQuestion?.status ||
    "pending";

  const isSkipped =
    currentQuestion?.status ===
    "skipped";

  const solutionUnlocked =
    Boolean(
      evaluation ||
        currentQuestion?.status ===
          "answered" ||
        currentQuestion?.evaluationStatus ===
          "completed",
    );

  const formatScore = (value) =>
    value === null ||
    value === undefined ||
    value === ""
      ? "—"
      : String(
          clamp(value, 0, 100),
        );

  // ==========================================================
  // LOADING
  // ==========================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-[#111315] text-white">
        <div className="flex min-h-screen items-center justify-center">
          <div className="w-full max-w-sm px-6 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-400/5">
              <FiZap className="text-4xl text-emerald-400" />
            </div>

            <h1 className="mt-6 text-xl font-semibold">
              Preparing your interview
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Loading your adaptive interview environment...
            </p>

            <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-400">
              <FiLoader className="animate-spin text-emerald-400" />
              Synchronizing interview state
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================================
  // ERROR SCREEN
  // ==========================================================

  if (
    error &&
    !interview
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#111315] p-6 text-white">
        <div className="w-full max-w-md rounded-2xl border border-red-500/20 bg-[#17191b] p-7">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/10 text-red-400">
            <FiAlertCircle size={22} />
          </div>

          <h1 className="mt-5 text-lg font-semibold">
            Unable to open interview
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            {error}
          </p>

          <button
            type="button"
            onClick={() =>
              navigate(
                "/dashboard",
              )
            }
            className="mt-6 w-full rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black transition hover:bg-slate-200"
          >
            Return to Dashboard
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
      <div className="min-h-screen bg-[#111315] text-white">
        <div className="flex min-h-screen items-center justify-center p-6">
          <div className="w-full max-w-2xl rounded-3xl border border-white/[0.08] bg-[#17191b] p-8 shadow-2xl sm:p-10">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl border border-emerald-400/20 bg-emerald-400/10">
              <FiCheckCircle className="text-4xl text-emerald-400" />
            </div>

            <div className="mt-6 text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">
                Interview complete
              </p>

              <h1 className="mt-3 text-3xl font-bold">
                Great work.
              </h1>

              <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-500">
                Your answers have been evaluated and your interview results are ready.
              </p>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <CompletionMetric
                label="Completed"
                value={`${completedQuestions}/${totalQuestions}`}
              />

              <CompletionMetric
                label="Answered"
                value={answeredQuestions}
              />

              <CompletionMetric
                label="Skipped"
                value={skippedQuestions}
              />

              <CompletionMetric
                label="Score"
                value={
                  interviewScore !== null
                    ? `${formatScore(
                        interviewScore,
                      )}%`
                    : "—"
                }
              />
            </div>

            <button
              type="button"
              onClick={() =>
                navigate(
                  "/dashboard",
                )
              }
              className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-3.5 text-sm font-semibold text-black transition hover:bg-emerald-400"
            >
              Back to Dashboard
              <FiArrowLeft />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================================
  // PAUSED
  // ==========================================================

  if (paused) {
    return (
      <div className="min-h-screen bg-[#111315] text-white">
        <div className="flex min-h-screen items-center justify-center p-6">
          <div className="w-full max-w-md rounded-3xl border border-white/[0.08] bg-[#17191b] p-8 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-amber-400/10 text-amber-400">
              <FiPause className="text-4xl" />
            </div>

            <h1 className="mt-6 text-2xl font-bold">
              Interview paused
            </h1>

            <p className="mt-3 text-sm leading-6 text-slate-500">
              Your progress has been saved. Resume whenever you're ready.
            </p>

            <div className="mt-7 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={
                  handleResume
                }
                disabled={loading}
                className="flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 font-semibold text-black transition hover:bg-emerald-400 disabled:opacity-40"
              >
                <FiPlay />
                Resume
              </button>

              <button
                type="button"
                onClick={() =>
                  navigate(
                    "/dashboard",
                  )
                }
                className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm font-semibold text-slate-300 transition hover:bg-white/[0.06]"
              >
                Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================================
  // MAIN
  // ==========================================================

  return (
    <div className="min-h-screen bg-[#111315] text-white">
      {/* ======================================================
          TOP BAR
      ====================================================== */}

      <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#111315]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1700px] items-center gap-3 px-4 py-3 lg:px-6">
          {/* Brand */}
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() =>
                navigate(
                  "/dashboard",
                )
              }
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.025] text-slate-400 transition hover:bg-white/[0.06] hover:text-white"
            >
              <FiArrowLeft />
            </button>

            <div className="hidden h-7 w-px bg-white/[0.08] sm:block" />

            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">
                {interview?.title ||
                  "AI Interview"}
              </p>

              <div className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-500">
                <span>
                  {interview?.role ||
                    "Software Developer"}
                </span>

                <span className="text-slate-700">
                  •
                </span>

                <span className="capitalize">
                  {interview?.interviewType ||
                    "technical"}
                </span>
              </div>
            </div>
          </div>

          {/* Center progress */}
          <div className="mx-auto hidden max-w-md flex-1 md:block">
            <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-slate-600">
              <span>
                Interview Progress
              </span>

              <span className="text-slate-400">
                {completedQuestions}/
                {totalQuestions}
              </span>
            </div>

            <div className="mt-2 h-1 rounded-full bg-white/[0.05]">
              <div
                className="h-full rounded-full bg-emerald-400 transition-all duration-500"
                style={{
                  width: `${progressPercentage}%`,
                }}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="ml-auto flex items-center gap-1.5">
            <HeaderAction
              icon={FiChevronLeft}
              label="Previous"
              onClick={
                handlePreviousQuestion
              }
              disabled={
                currentQuestionNumber <= 1 ||
                submitting ||
                evaluating ||
                skipping ||
                generating ||
                pausing ||
                completing ||
                cancelling
              }
            />

            <HeaderAction
              icon={FiChevronRight}
              label="Next"
              filled
              onClick={
                handleNextQuestion
              }
              loading={generating}
              disabled={
                submitting ||
                evaluating ||
                skipping ||
                generating ||
                pausing ||
                completing ||
                cancelling
              }
            />

            <div className="mx-1 hidden h-6 w-px bg-white/[0.08] lg:block" />

            <HeaderAction
              icon={FiPause}
              label="Pause"
              onClick={handlePause}
              disabled={
                pausing ||
                completing ||
                cancelling ||
                generating ||
                submitting ||
                evaluating ||
                skipping
              }
            />

            <HeaderAction
              icon={FiCheck}
              label="Finish"
              onClick={handleFinish}
              disabled={
                completing ||
                cancelling ||
                pausing ||
                generating ||
                submitting ||
                evaluating ||
                skipping
              }
            />

            <button
              type="button"
              onClick={handleCancel}
              disabled={
                cancelling ||
                completing ||
                pausing
              }
              className="hidden h-9 items-center gap-2 rounded-xl border border-red-500/15 bg-red-500/[0.03] px-3 text-xs font-semibold text-red-300 transition hover:bg-red-500/[0.08] disabled:opacity-40 sm:flex"
            >
              {cancelling ? (
                <FiLoader className="animate-spin" />
              ) : (
                <FiX />
              )}

              Cancel
            </button>
          </div>
        </div>

        <div className="h-px bg-white/[0.03]">
          <div
            className="h-full bg-emerald-400 transition-all duration-500"
            style={{
              width: `${progressPercentage}%`,
            }}
          />
        </div>
      </header>

      {/* ======================================================
          ERROR
      ====================================================== */}

      {error && (
        <div className="border-b border-red-500/15 bg-red-500/[0.04]">
          <div className="mx-auto flex max-w-[1700px] items-center gap-3 px-4 py-2.5 text-xs text-red-300 lg:px-6">
            <FiAlertCircle />

            <span className="flex-1">
              {error}
            </span>

            <button
              type="button"
              onClick={() =>
                setError("")
              }
              className="text-red-400/70 hover:text-red-300"
            >
              <FiX />
            </button>
          </div>
        </div>
      )}

      {/* ======================================================
          CONTENT
      ====================================================== */}

      <main className="mx-auto max-w-[1700px] p-3 lg:p-5">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_300px]">
          {/* ==================================================
              QUESTION
          ================================================== */}

          <section className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#17191b] shadow-xl">
            <PanelHeader
              left={
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-400/10 text-emerald-400">
                    {currentQuestionType ===
                    "coding" ? (
                      <FiCode size={15} />
                    ) : (
                      <FiBookOpen
                        size={15}
                      />
                    )}
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-slate-200">
                      Problem
                    </p>

                    <p className="text-[10px] text-slate-600">
                      Question{" "}
                      {currentQuestionNumber ||
                        1}
                    </p>
                  </div>
                </div>
              }
              right={
                <div className="flex items-center gap-2">
                  <Tag
                    label={
                      currentDifficulty
                    }
                    tone="green"
                  />

                  <Tag
                    label={questionStatus}
                    tone={
                      questionStatus ===
                      "answered"
                        ? "green"
                        : questionStatus ===
                          "skipped"
                        ? "amber"
                        : "slate"
                    }
                  />
                </div>
              }
            />

            {/* Question Tabs */}
            {currentQuestion && (
              <div className="flex border-b border-white/[0.06] bg-[#141618]">
                <PanelTab
                  active={
                    activeTab ===
                    "question"
                  }
                  icon={FiBookOpen}
                  label="Question"
                  onClick={() =>
                    setActiveTab(
                      "question",
                    )
                  }
                />

                <PanelTab
                  active={
                    activeTab ===
                    "solution"
                  }
                  icon={FiCheckCircle}
                  label="Solution"
                  disabled={
                    !solutionUnlocked
                  }
                  onClick={() => {
                    if (
                      solutionUnlocked
                    ) {
                      setActiveTab(
                        "solution",
                      );
                    }
                  }}
                />
              </div>
            )}

            <div className="max-h-[calc(100vh-150px)] overflow-y-auto p-5 lg:p-7">
              {generating ? (
                <GeneratingState />
              ) : !currentQuestion ? (
                <EmptyQuestionState
                  onGenerate={
                    generateQuestionInternal
                  }
                  loading={generating}
                />
              ) : activeTab ===
                "question" ? (
                <QuestionContent
                  question={
                    currentQuestion
                  }
                  technologies={
                    technologies
                  }
                  onCopy={
                    copyToClipboard
                  }
                />
              ) : (
                <SolutionContent
                  question={
                    currentQuestion
                  }
                  onCopy={
                    copyToClipboard
                  }
                />
              )}

              {currentQuestion && (
                <div className="mt-8 border-t border-white/[0.06] pt-5">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={
                        handlePreviousQuestion
                      }
                      disabled={
                        currentQuestionNumber <=
                          1 ||
                        submitting ||
                        evaluating ||
                        skipping ||
                        generating
                      }
                      className="flex h-10 items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.025] px-4 text-xs font-semibold text-slate-300 transition hover:bg-white/[0.05] disabled:cursor-not-allowed disabled:opacity-25"
                    >
                      <FiChevronLeft />
                      Previous
                    </button>

                    <div className="flex-1">
                      <div className="flex items-center justify-center gap-2 text-[11px] text-slate-600">
                        <span>
                          Q
                          {
                            currentQuestionNumber
                          }
                        </span>

                        <span className="text-slate-800">
                          /
                        </span>

                        <span>
                          {
                            totalQuestions
                          }
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={
                        handleNextQuestion
                      }
                      disabled={
                        submitting ||
                        evaluating ||
                        skipping ||
                        generating
                      }
                      className="flex h-10 items-center gap-2 rounded-xl bg-emerald-500 px-4 text-xs font-semibold text-black transition hover:bg-emerald-400 disabled:opacity-30"
                    >
                      Next
                      <FiChevronRight />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* ==================================================
              ANSWER
          ================================================== */}

          <section className="flex min-h-[650px] flex-col overflow-hidden rounded-2xl border border-white/[0.07] bg-[#17191b] shadow-xl">
            <PanelHeader
              left={
                <div className="flex items-center gap-2.5">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                      editingAnswer
                        ? "bg-amber-400/10 text-amber-400"
                        : "bg-blue-400/10 text-blue-400"
                    }`}
                  >
                    {editingAnswer ? (
                      <FiEdit3 size={15} />
                    ) : (
                      <FiCode size={15} />
                    )}
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-slate-200">
                      {evaluation &&
                      !editingAnswer
                        ? "Evaluation"
                        : currentQuestionType ===
                            "coding"
                        ? "Code Editor"
                        : currentQuestionType ===
                            "debugging"
                        ? "Debugging Response"
                        : "Your Answer"}
                    </p>

                    <p className="text-[10px] text-slate-600">
                      {currentQuestionType}
                    </p>
                  </div>
                </div>
              }
              right={
                <span className="text-[10px] tabular-nums text-slate-600">
                  {answerValue.length}/
                  {MAX_ANSWER_LENGTH}
                </span>
              }
            />

            <div className="flex min-h-0 flex-1 flex-col">
              {!currentQuestion ? (
                <div className="flex flex-1 items-center justify-center p-8 text-sm text-slate-600">
                  Waiting for question...
                </div>
              ) : evaluation &&
                !editingAnswer ? (
                <EvaluationPanel
                  evaluation={
                    evaluation
                  }
                  question={
                    currentQuestion
                  }
                  formatScore={
                    formatScore
                  }
                  onNext={
                    handleNextQuestion
                  }
                  onEdit={
                    handleEditAnswer
                  }
                  onCopy={
                    copyToClipboard
                  }
                  disabled={
                    submitting ||
                    evaluating ||
                    skipping ||
                    generating ||
                    completing ||
                    cancelling ||
                    pausing
                  }
                />
              ) : (
                <>
                  <div className="relative min-h-0 flex-1">
                    <div className="absolute left-0 top-0 flex w-full items-center gap-2 border-b border-white/[0.05] bg-[#141618] px-4 py-2">
                      <div className="h-2 w-2 rounded-full bg-red-400/70" />
                      <div className="h-2 w-2 rounded-full bg-amber-400/70" />
                      <div className="h-2 w-2 rounded-full bg-emerald-400/70" />

                      <span className="ml-2 text-[10px] text-slate-600">
                        {currentQuestionType ===
                        "coding"
                          ? currentQuestion
                              ?.coding
                              ?.language ||
                            "Code"
                          : currentQuestionType ===
                              "debugging"
                          ? currentQuestion
                              ?.debugging
                              ?.language ||
                            "Debug"
                          : "Answer"}
                      </span>
                    </div>

                    <textarea
                      value={
                        answerValue
                      }
                      onChange={(event) =>
                        handleAnswerChange(
                          event.target
                            .value,
                        )
                      }
                      disabled={
                        submitting ||
                        evaluating ||
                        skipping ||
                        generating ||
                        pausing ||
                        completing ||
                        cancelling
                      }
                      maxLength={
                        MAX_ANSWER_LENGTH
                      }
                      spellCheck={
                        currentQuestionType ===
                        "text"
                      }
                      placeholder={
                        currentQuestionType ===
                        "coding"
                          ? "Write your solution here..."
                          : currentQuestionType ===
                              "debugging"
                          ? "Explain the bug and provide the corrected code..."
                          : "Type your answer here. Explain your reasoning clearly..."
                      }
                      className="h-full w-full resize-none border-0 bg-[#111315] px-5 pb-5 pt-14 font-mono text-[13px] leading-7 text-slate-200 outline-none placeholder:text-slate-700"
                    />
                  </div>

                  {/* Bottom controls */}
                  <div className="border-t border-white/[0.06] bg-[#141618] p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="hidden items-center gap-2 text-[10px] text-slate-600 sm:flex">
                        <span>
                          {currentDifficulty}
                        </span>

                        <span className="text-slate-800">
                          •
                        </span>

                        <span>
                          {candidateLevel}
                        </span>
                      </div>

                      <div className="ml-auto flex items-center gap-2">
                        {editingAnswer && (
                          <button
                            type="button"
                            onClick={
                              handleCancelEdit
                            }
                            disabled={
                              submitting ||
                              evaluating
                            }
                            className="flex h-10 items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 text-xs font-semibold text-slate-300 transition hover:bg-white/[0.05] disabled:opacity-30"
                          >
                            <FiX />
                            Cancel
                          </button>
                        )}

                        {!editingAnswer &&
                          isSkipped && (
                            <button
                              type="button"
                              onClick={
                                handleAnswerSkippedQuestion
                              }
                              disabled={
                                submitting ||
                                evaluating ||
                                !answerValue.trim()
                              }
                              className="flex h-10 items-center gap-2 rounded-xl bg-emerald-500 px-4 text-xs font-semibold text-black transition hover:bg-emerald-400 disabled:opacity-30"
                            >
                              {submitting ||
                              evaluating ? (
                                <FiLoader className="animate-spin" />
                              ) : (
                                <FiSend />
                              )}

                              Answer Skipped
                            </button>
                          )}

                        {!isSkipped && (
                          <>
                            <button
                              type="button"
                              onClick={
                                handleSkipQuestion
                              }
                              disabled={
                                skipping ||
                                submitting ||
                                evaluating ||
                                generating ||
                                editingAnswer
                              }
                              className="flex h-10 items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.025] px-4 text-xs font-semibold text-slate-300 transition hover:bg-white/[0.05] disabled:opacity-30"
                            >
                              {skipping ? (
                                <FiLoader className="animate-spin" />
                              ) : (
                                <FiSkipForward />
                              )}
                              Skip
                            </button>

                            <button
                              type="button"
                              onClick={
                                handleSubmitAnswer
                              }
                              disabled={
                                !answerValue.trim() ||
                                submitting ||
                                evaluating ||
                                skipping ||
                                generating
                              }
                              className="flex h-10 items-center gap-2 rounded-xl bg-emerald-500 px-5 text-xs font-semibold text-black transition hover:bg-emerald-400 disabled:opacity-30"
                            >
                              {submitting ||
                              evaluating ? (
                                <>
                                  <FiLoader className="animate-spin" />

                                  {evaluating
                                    ? "Evaluating..."
                                    : "Submitting..."}
                                </>
                              ) : (
                                <>
                                  <FiSend />

                                  {editingAnswer ||
                                  isQuestionAnswered(
                                    currentQuestion,
                                  )
                                    ? "Save & Re-evaluate"
                                    : currentQuestionType ===
                                        "coding"
                                    ? "Submit Code"
                                    : currentQuestionType ===
                                        "debugging"
                                    ? "Submit Fix"
                                    : "Submit Answer"}
                                </>
                              )}
                            </button>
                          </>
                        )}
                      </div>
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
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-1">
              <SidebarMetric
                icon={FiTarget}
                label="Difficulty"
                value={
                  currentDifficulty
                }
              />

              <SidebarMetric
                icon={FiAward}
                label="Candidate Level"
                value={candidateLevel}
              />
            </div>

            <div className="grid grid-cols-2 gap-3 xl:grid-cols-1">
              {candidateLevelConfidence !==
                null && (
                <SidebarMetric
                  icon={FiBarChart2}
                  label="Confidence"
                  value={`${candidateLevelConfidence}%`}
                />
              )}

              <SidebarMetric
                icon={FiClock}
                label="Experience"
                value={experienceLevel}
              />
            </div>

            {/* Score */}
            <div className="rounded-2xl border border-white/[0.07] bg-[#17191b] p-4 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FiTrendingUp className="text-emerald-400" />

                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Current Score
                  </span>
                </div>

                <span className="text-[10px] text-slate-700">
                  LIVE
                </span>
              </div>

              <div className="mt-4 flex items-end gap-2">
                <span className="text-3xl font-bold tracking-tight">
                  {interviewScore !==
                  null
                    ? formatScore(
                        interviewScore,
                      )
                    : "—"}
                </span>

                {interviewScore !==
                  null && (
                  <span className="mb-1 text-xs text-slate-600">
                    /100
                  </span>
                )}
              </div>

              <div className="mt-4 h-1.5 rounded-full bg-white/[0.05]">
                <div
                  className="h-full rounded-full bg-emerald-400 transition-all"
                  style={{
                    width: `${clamp(
                      interviewScore ||
                        0,
                      0,
                      100,
                    )}%`,
                  }}
                />
              </div>
            </div>

            {/* Progress */}
            <div className="rounded-2xl border border-white/[0.07] bg-[#17191b] p-4 shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Progress
                </span>

                <span className="text-xs font-semibold text-slate-300">
                  {Math.round(
                    progressPercentage,
                  )}
                  %
                </span>
              </div>

              <div className="mt-4 h-2 rounded-full bg-white/[0.05]">
                <div
                  className="h-full rounded-full bg-emerald-400 transition-all duration-500"
                  style={{
                    width: `${progressPercentage}%`,
                  }}
                />
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2">
                <MiniStat
                  label="Answered"
                  value={
                    answeredQuestions
                  }
                />

                <MiniStat
                  label="Skipped"
                  value={
                    skippedQuestions
                  }
                />

                <MiniStat
                  label="Left"
                  value={Math.max(
                    0,
                    totalQuestions -
                      completedQuestions,
                  )}
                />
              </div>
            </div>

            {/* Technologies */}
            <div className="rounded-2xl border border-white/[0.07] bg-[#17191b] p-4 shadow-lg">
              <div className="flex items-center gap-2">
                <FiLayers className="text-blue-400" />

                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Technologies
                </span>
              </div>

              <div className="mt-4 flex flex-wrap gap-1.5">
                {technologies.length >
                0 ? (
                  technologies
                    .slice(0, 12)
                    .map(
                      (
                        technology,
                      ) => (
                        <span
                          key={
                            technology
                          }
                          className="rounded-lg border border-blue-400/10 bg-blue-400/[0.05] px-2 py-1 text-[10px] text-blue-300"
                        >
                          {
                            technology
                          }
                        </span>
                      ),
                    )
                ) : (
                  <p className="text-xs text-slate-600">
                    Adaptive engine selecting technologies...
                  </p>
                )}
              </div>
            </div>

            {/* Current question */}
            {currentQuestion && (
              <div className="rounded-2xl border border-white/[0.07] bg-[#17191b] p-4 shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Current Question
                  </span>

                  <span className="text-[10px] text-slate-700">
                    Q
                    {
                      currentQuestionNumber
                    }
                  </span>
                </div>

                <p className="mt-3 line-clamp-5 text-xs leading-6 text-slate-400">
                  {
                    currentQuestion.question
                  }
                </p>
              </div>
            )}

            {/* Mobile cancel */}
            <button
              type="button"
              onClick={
                handleCancel
              }
              disabled={
                cancelling ||
                completing ||
                pausing
              }
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/15 bg-red-500/[0.03] px-4 py-3 text-xs font-semibold text-red-300 transition hover:bg-red-500/[0.08] disabled:opacity-40 sm:hidden"
            >
              {cancelling ? (
                <FiLoader className="animate-spin" />
              ) : (
                <FiX />
              )}
              Cancel Interview
            </button>
          </aside>
        </div>
      </main>
    </div>
  );
};

// ============================================================
// QUESTION CONTENT
// ============================================================

const QuestionContent = ({
  question,
  technologies,
  onCopy,
}) => {
  return (
    <div>
      <div className="flex items-start justify-between gap-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Tag
              label={
                question.category ||
                "general"
              }
              tone="slate"
            />

            {question.skill && (
              <Tag
                label={
                  question.skill
                }
                tone="blue"
              />
            )}
          </div>

          <h1 className="mt-5 text-[26px] font-bold leading-[1.35] tracking-tight text-white">
            {question.question}
          </h1>
        </div>

        <CopyButton
          onClick={() =>
            onCopy(
              question.question,
              "Question",
            )
          }
        />
      </div>

      {technologies.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-1.5">
          {technologies
            .slice(0, 8)
            .map(
              (technology) => (
                <span
                  key={technology}
                  className="rounded-lg bg-white/[0.025] px-2.5 py-1 text-[10px] text-slate-500"
                >
                  {technology}
                </span>
              ),
            )}
        </div>
      )}

      {/* CODING */}
      {(question.category ===
        "coding" ||
        question.category ===
          "dsa") &&
        question.coding && (
          <div className="mt-7 overflow-hidden rounded-2xl border border-white/[0.07] bg-[#131517]">
            <div className="border-b border-white/[0.06] bg-white/[0.02] px-4 py-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Coding Challenge
                </span>

                {question.coding
                  .language && (
                  <span className="rounded-lg bg-emerald-400/10 px-2 py-1 text-[10px] capitalize text-emerald-300">
                    {
                      question.coding
                        .language
                    }
                  </span>
                )}
              </div>
            </div>

            <div className="p-4">
              {question.coding
                .functionSignature && (
                <CodeBlock
                  title="Function Signature"
                  value={
                    question.coding
                      .functionSignature
                  }
                />
              )}

              {question.coding
                .starterCode && (
                <div className="mt-4">
                  <CodeBlock
                    title="Starter Code"
                    value={
                      question.coding
                        .starterCode
                    }
                  />
                </div>
              )}

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {question.coding
                  .inputFormat && (
                  <InfoBlock
                    title="Input"
                    value={
                      question.coding
                        .inputFormat
                    }
                  />
                )}

                {question.coding
                  .outputFormat && (
                  <InfoBlock
                    title="Output"
                    value={
                      question.coding
                        .outputFormat
                    }
                  />
                )}
              </div>

              {Array.isArray(
                question.coding
                  .examples,
              ) &&
                question.coding
                  .examples
                  .length > 0 && (
                  <div className="mt-5">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                      Examples
                    </p>

                    <div className="mt-2 space-y-2">
                      {question.coding.examples.map(
                        (
                          example,
                          index,
                        ) => (
                          <div
                            key={index}
                            className="rounded-xl border border-white/[0.05] bg-white/[0.015] p-3"
                          >
                            <div className="text-[10px] text-slate-600">
                              Example{" "}
                              {index +
                                1}
                            </div>

                            <div className="mt-2 grid gap-2 sm:grid-cols-2">
                              <div>
                                <p className="text-[10px] uppercase text-slate-600">
                                  Input
                                </p>

                                <p className="mt-1 font-mono text-xs text-slate-300">
                                  {
                                    example?.input
                                  }
                                </p>
                              </div>

                              <div>
                                <p className="text-[10px] uppercase text-slate-600">
                                  Output
                                </p>

                                <p className="mt-1 font-mono text-xs text-slate-300">
                                  {
                                    example?.output
                                  }
                                </p>
                              </div>
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                )}
            </div>
          </div>
        )}

      {/* DEBUGGING */}
      {question.category ===
        "debugging" &&
        question.debugging && (
          <div className="mt-7 overflow-hidden rounded-2xl border border-red-400/10 bg-[#131517]">
            <div className="border-b border-white/[0.06] px-4 py-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-red-300/80">
                  Debugging Challenge
                </span>

                <span className="text-[10px] text-slate-600">
                  {
                    question
                      .debugging
                      .language ||
                    "Code"
                  }
                </span>
              </div>
            </div>

            <div className="p-4">
              <CodeBlock
                title="Buggy Code"
                value={
                  question.debugging
                    .buggyCode
                }
              />

              {question.debugging
                .expectedBehavior && (
                <div className="mt-5">
                  <InfoBlock
                    title="Expected Behavior"
                    value={
                      question
                        .debugging
                        .expectedBehavior
                    }
                  />
                </div>
              )}
            </div>
          </div>
        )}

      {/* EXPLANATION */}
      <div className="mt-7 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-400/10 text-emerald-400">
            <FiBookOpen
              size={15}
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold text-slate-300">
                Explanation
              </p>

              <CopyButton
                onClick={() =>
                  onCopy(
                    question.explanation ||
                      "",
                    "Explanation",
                  )
                }
              />
            </div>

            <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-400">
              {question.explanation ||
                "No explanation was provided."}
            </p>
          </div>
        </div>
      </div>

      {/* TOPICS */}
      {Array.isArray(
        question.expectedTopics,
      ) &&
        question.expectedTopics
          .length > 0 && (
          <div className="mt-6">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">
              Topics being evaluated
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              {question.expectedTopics.map(
                (
                  topic,
                  index,
                ) => (
                  <span
                    key={`${topic}-${index}`}
                    className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-1.5 text-xs text-slate-400"
                  >
                    {topic}
                  </span>
                ),
              )}
            </div>
          </div>
        )}
    </div>
  );
};

// ============================================================
// SOLUTION
// ============================================================

const SolutionContent = ({
  question,
  onCopy,
}) => {
  const solution =
    question.solution ||
    question.idealAnswer ||
    "";

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-400">
              <FiCheckCircle />
            </div>

            <div>
              <h2 className="text-lg font-semibold">
                Ideal Solution
              </h2>

              <p className="text-[10px] text-slate-600">
                Unlocked after answering
              </p>
            </div>
          </div>
        </div>

        <CopyButton
          onClick={() =>
            onCopy(
              solution,
              "Solution",
            )
          }
        />
      </div>

      <pre className="mt-6 overflow-x-auto whitespace-pre-wrap rounded-2xl border border-white/[0.07] bg-[#101214] p-5 font-mono text-xs leading-7 text-slate-300">
        {solution ||
          "No ideal solution was provided."}
      </pre>

      {question.complexity && (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <InfoBlock
            title="Time Complexity"
            value={
              question.complexity
                .time || "—"
            }
          />

          <InfoBlock
            title="Space Complexity"
            value={
              question.complexity
                .space || "—"
            }
          />
        </div>
      )}
    </div>
  );
};

// ============================================================
// EVALUATION
// ============================================================

const EvaluationPanel = ({
  evaluation,
  question,
  formatScore,
  onNext,
  onEdit,
  onCopy,
  disabled,
}) => {
  const submittedAnswer =
    getAnswerValue(question);

  const dimensions = [
    [
      "Correctness",
      evaluation.correctnessScore,
    ],
    [
      "Technical",
      evaluation.technicalScore,
    ],
    [
      "Communication",
      evaluation.communicationScore,
    ],
    [
      "Problem Solving",
      evaluation.problemSolvingScore,
    ],
  ];

  return (
    <>
      <div className="border-b border-white/[0.06] bg-emerald-400/[0.025] px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-400">
            <FiCheckCircle />
          </div>

          <div>
            <p className="text-xs font-semibold text-emerald-300">
              Answer evaluated
            </p>

            <p className="mt-0.5 text-[10px] text-slate-600">
              AI evaluation based only on demonstrated evidence
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        {/* Overall */}
        <div className="rounded-2xl border border-emerald-400/10 bg-emerald-400/[0.03] p-5">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                Overall Score
              </p>

              <p className="mt-2 text-4xl font-bold tracking-tight">
                {formatScore(
                  evaluation.overallScore,
                )}
                <span className="ml-1 text-sm text-slate-600">
                  /100
                </span>
              </p>
            </div>

            <div className="h-16 w-16 rounded-full border border-emerald-400/20 bg-emerald-400/5 p-2">
              <div className="flex h-full items-center justify-center rounded-full bg-emerald-400/5">
                <FiAward className="text-2xl text-emerald-400" />
              </div>
            </div>
          </div>

          <div className="mt-4 h-2 rounded-full bg-white/[0.05]">
            <div
              className="h-full rounded-full bg-emerald-400"
              style={{
                width: `${formatScore(
                  evaluation.overallScore,
                )}%`,
              }}
            />
          </div>
        </div>

        {/* Dimensions */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          {dimensions.map(
            ([label, value]) => (
              <ScoreCard
                key={label}
                label={label}
                value={formatScore(
                  value,
                )}
              />
            ),
          )}
        </div>

        {/* Feedback */}
        {evaluation.feedback && (
          <EvaluationSection
            title="Feedback"
            onCopy={() =>
              onCopy(
                evaluation.feedback,
                "Feedback",
              )
            }
          >
            <p className="whitespace-pre-wrap text-sm leading-7 text-slate-400">
              {evaluation.feedback}
            </p>
          </EvaluationSection>
        )}

        {/* Strengths */}
        {Array.isArray(
          evaluation.strengths,
        ) &&
          evaluation.strengths
            .length > 0 && (
            <EvaluationSection title="Strengths">
              <div className="space-y-2">
                {evaluation.strengths.map(
                  (
                    item,
                    index,
                  ) => (
                    <div
                      key={
                        index
                      }
                      className="flex gap-2 text-sm text-emerald-300"
                    >
                      <FiCheck
                        className="mt-1 shrink-0"
                        size={14}
                      />

                      <span>
                        {item}
                      </span>
                    </div>
                  ),
                )}
              </div>
            </EvaluationSection>
          )}

        {/* Weaknesses */}
        {Array.isArray(
          evaluation.weaknesses,
        ) &&
          evaluation.weaknesses
            .length > 0 && (
            <EvaluationSection title="Areas to Improve">
              <div className="space-y-2">
                {evaluation.weaknesses.map(
                  (
                    item,
                    index,
                  ) => (
                    <div
                      key={
                        index
                      }
                      className="flex gap-2 text-sm text-red-300"
                    >
                      <span className="mt-0.5 text-red-400">
                        −
                      </span>

                      <span>
                        {item}
                      </span>
                    </div>
                  ),
                )}
              </div>
            </EvaluationSection>
          )}

        {/* Corrections */}
        {Array.isArray(
          evaluation.corrections,
        ) &&
          evaluation.corrections
            .length > 0 && (
            <EvaluationSection title="Corrections">
              <div className="space-y-2">
                {evaluation.corrections.map(
                  (
                    item,
                    index,
                  ) => (
                    <div
                      key={
                        index
                      }
                      className="text-sm leading-6 text-slate-400"
                    >
                      <span className="mr-2 text-slate-700">
                        {index +
                          1}
                        .
                      </span>

                      {item}
                    </div>
                  ),
                )}
              </div>
            </EvaluationSection>
          )}

        {/* Answer */}
        {submittedAnswer && (
          <EvaluationSection
            title="Your Submitted Answer"
            onCopy={() =>
              onCopy(
                submittedAnswer,
                "Answer",
              )
            }
          >
            <pre className="whitespace-pre-wrap break-words rounded-xl border border-white/[0.05] bg-[#101214] p-4 font-mono text-xs leading-6 text-slate-400">
              {
                submittedAnswer
              }
            </pre>
          </EvaluationSection>
        )}

        {/* Study */}
        {Array.isArray(
          evaluation.studyTopics,
        ) &&
          evaluation.studyTopics
            .length > 0 && (
            <EvaluationSection title="Study Topics">
              <div className="space-y-2">
                {evaluation.studyTopics.map(
                  (
                    item,
                    index,
                  ) => (
                    <div
                      key={`${item.topic}-${index}`}
                      className="flex items-center justify-between rounded-xl border border-white/[0.05] bg-white/[0.02] px-3 py-2.5"
                    >
                      <span className="text-xs text-slate-400">
                        {
                          item.topic
                        }
                      </span>

                      <span className="text-[10px] capitalize text-slate-600">
                        {
                          item.priority
                        }
                      </span>
                    </div>
                  ),
                )}
              </div>
            </EvaluationSection>
          )}

        {/* Buttons */}
        <div className="mt-7 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onEdit}
            disabled={disabled}
            className="flex h-11 items-center justify-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.02] text-xs font-semibold text-slate-300 transition hover:bg-white/[0.05] disabled:opacity-30"
          >
            <FiEdit3 />
            Edit Answer
          </button>

          <button
            type="button"
            onClick={onNext}
            disabled={disabled}
            className="flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-500 text-xs font-semibold text-black transition hover:bg-emerald-400 disabled:opacity-30"
          >
            Next Question
            <FiChevronRight />
          </button>
        </div>
      </div>
    </>
  );
};

// ============================================================
// UI COMPONENTS
// ============================================================

const PanelHeader = ({
  left,
  right,
}) => (
  <div className="flex items-center justify-between gap-4 border-b border-white/[0.06] bg-[#191b1d] px-4 py-3">
    {left}

    {right}
  </div>
);

const PanelTab = ({
  active,
  icon: Icon,
  label,
  disabled,
  onClick,
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`flex h-11 flex-1 items-center justify-center gap-2 border-b-2 text-xs font-medium transition ${
      active
        ? "border-emerald-400 text-emerald-400"
        : "border-transparent text-slate-600 hover:text-slate-400"
    } ${
      disabled
        ? "cursor-not-allowed opacity-30"
        : ""
    }`}
  >
    <Icon size={14} />
    {label}
  </button>
);

const HeaderAction = ({
  icon: Icon,
  label,
  onClick,
  disabled,
  filled = false,
  loading = false,
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`flex h-9 items-center gap-1.5 rounded-xl px-3 text-xs font-semibold transition disabled:opacity-30 ${
      filled
        ? "bg-emerald-500 text-black hover:bg-emerald-400"
        : "border border-white/[0.07] bg-white/[0.025] text-slate-300 hover:bg-white/[0.05]"
    }`}
  >
    {loading ? (
      <FiLoader className="animate-spin" />
    ) : (
      <Icon />
    )}

    <span className="hidden lg:inline">
      {label}
    </span>
  </button>
);

const Tag = ({
  label,
  tone = "slate",
}) => {
  const styles = {
    slate:
      "bg-white/[0.035] text-slate-500 border-white/[0.05]",
    green:
      "bg-emerald-400/10 text-emerald-300 border-emerald-400/10",
    blue:
      "bg-blue-400/10 text-blue-300 border-blue-400/10",
    amber:
      "bg-amber-400/10 text-amber-300 border-amber-400/10",
  };

  return (
    <span
      className={`rounded-lg border px-2 py-1 text-[10px] capitalize ${styles[tone] || styles.slate}`}
    >
      {label}
    </span>
  );
};

const SidebarMetric = ({
  icon: Icon,
  label,
  value,
}) => (
  <div className="rounded-2xl border border-white/[0.07] bg-[#17191b] p-4 shadow-lg">
    <div className="flex items-center gap-2">
      <Icon
        size={14}
        className="text-slate-600"
      />

      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">
        {label}
      </span>
    </div>

    <p className="mt-2 truncate text-sm font-semibold capitalize text-slate-200">
      {value}
    </p>
  </div>
);

const MiniStat = ({
  label,
  value,
}) => (
  <div className="rounded-xl bg-white/[0.02] p-2.5 text-center">
    <p className="text-sm font-semibold text-slate-300">
      {value}
    </p>

    <p className="mt-1 text-[9px] uppercase tracking-wider text-slate-700">
      {label}
    </p>
  </div>
);

const CompletionMetric = ({
  label,
  value,
}) => (
  <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
    <p className="text-[10px] uppercase tracking-wider text-slate-600">
      {label}
    </p>

    <p className="mt-2 text-xl font-bold text-slate-100">
      {value}
    </p>
  </div>
);

const ScoreCard = ({
  label,
  value,
}) => (
  <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3.5">
    <p className="text-[9px] uppercase tracking-wider text-slate-600">
      {label}
    </p>

    <div className="mt-2 flex items-end gap-1">
      <span className="text-lg font-bold text-slate-200">
        {value}
      </span>

      <span className="mb-0.5 text-[9px] text-slate-700">
        /100
      </span>
    </div>
  </div>
);

const EvaluationSection = ({
  title,
  children,
  onCopy,
}) => (
  <div className="mt-6">
    <div className="flex items-center justify-between">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">
        {title}
      </p>

      {onCopy && (
        <CopyButton
          onClick={onCopy}
        />
      )}
    </div>

    <div className="mt-3">
      {children}
    </div>
  </div>
);

const InfoBlock = ({
  title,
  value,
}) => (
  <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-3">
    <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-700">
      {title}
    </p>

    <p className="mt-1.5 whitespace-pre-wrap text-xs leading-6 text-slate-400">
      {value}
    </p>
  </div>
);

const CodeBlock = ({
  title,
  value,
}) => {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(
        String(value || ""),
      );
    } catch {
      // ignored
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-600">
          {title}
        </p>

        <button
          type="button"
          onClick={copy}
          className="text-slate-700 transition hover:text-slate-300"
          title={`Copy ${title}`}
        >
          <FiCopy size={13} />
        </button>
      </div>

      <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-xl border border-white/[0.05] bg-[#0f1113] p-4 font-mono text-[11px] leading-6 text-slate-400">
        {value || "—"}
      </pre>
    </div>
  );
};

const CopyButton = ({
  onClick,
}) => (
  <button
    type="button"
    onClick={onClick}
    title="Copy"
    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.02] text-slate-600 transition hover:bg-white/[0.05] hover:text-slate-300"
  >
    <FiCopy size={13} />
  </button>
);

const GeneratingState = () => (
  <div className="flex min-h-[520px] items-center justify-center">
    <div className="text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-400/15 bg-emerald-400/5">
        <FiCpu className="text-3xl text-emerald-400" />
      </div>

      <p className="mt-5 text-sm font-semibold">
        AI is preparing your next question
      </p>

      <div className="mt-3 flex items-center justify-center gap-2 text-xs text-slate-600">
        <FiLoader className="animate-spin text-emerald-400" />
        Analyzing your interview state
      </div>
    </div>
  </div>
);

const EmptyQuestionState = ({
  onGenerate,
  loading,
}) => (
  <div className="flex min-h-[520px] items-center justify-center">
    <div className="text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.03] text-slate-700">
        <FiClock />
      </div>

      <p className="mt-5 text-sm font-medium text-slate-300">
        No question loaded
      </p>

      <p className="mt-2 text-xs text-slate-600">
        Generate the first adaptive interview question.
      </p>

      <button
        type="button"
        onClick={onGenerate}
        disabled={loading}
        className="mt-5 flex h-10 items-center gap-2 mx-auto rounded-xl bg-emerald-500 px-4 text-xs font-semibold text-black transition hover:bg-emerald-400 disabled:opacity-30"
      >
        {loading ? (
          <FiLoader className="animate-spin" />
        ) : (
          <FiZap />
        )}
        Generate Question
      </button>
    </div>
  </div>
);

export default InterviewAgent;
