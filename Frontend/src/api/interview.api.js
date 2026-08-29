
import axios from "axios";

// ============================================================
// API CONFIG
// ============================================================

const API_URL = "http://localhost:3000/api";

// ============================================================
// AXIOS INSTANCE
// ============================================================

const interviewApi = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// ============================================================
// REQUEST INTERCEPTOR
// ============================================================

interviewApi.interceptors.request.use(
  (config) => {
    const token =
      localStorage.getItem("accessToken") ||
      sessionStorage.getItem("accessToken");

    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    console.log("==================================================");
    console.log("[INTERVIEW API REQUEST]");
    console.log("METHOD:", config.method?.toUpperCase());
    console.log(
      "URL:",
      `${config.baseURL}${config.url}`
    );
    console.log("PARAMS:", config.params);
    console.log("BODY:", config.data);
    console.log("HAS TOKEN:", Boolean(token));
    console.log("==================================================");

    return config;
  },
  (error) => {
    console.error("[INTERVIEW API REQUEST ERROR]", error);
    return Promise.reject(error);
  }
);

// ============================================================
// RESPONSE INTERCEPTOR
// ============================================================

interviewApi.interceptors.response.use(
  (response) => {
    console.log("==================================================");
    console.log("[INTERVIEW API SUCCESS]");
    console.log("STATUS:", response.status);
    console.log(
      "METHOD:",
      response.config?.method?.toUpperCase()
    );
    console.log("URL:", response.config?.url);
    console.log("DATA:", response.data);
    console.log("==================================================");

    return response;
  },
  (error) => {
    const status = error?.response?.status;
    const responseData = error?.response?.data;
    const code = responseData?.code;

    console.error("==================================================");
    console.error("[INTERVIEW API ERROR]");
    console.error("STATUS:", status);
    console.error("CODE:", code);
    console.error("MESSAGE:", responseData?.message);
    console.error("DATA:", responseData);
    console.error("URL:", error?.config?.url);
    console.error(
      "METHOD:",
      error?.config?.method?.toUpperCase()
    );
    console.error("REQUEST BODY:", error?.config?.data);
    console.error("==================================================");

    // ========================================================
    // AUTH FAILURE
    // ========================================================

    if (
      status === 401 &&
      [
        "ACCESS_TOKEN_EXPIRED",
        "ACCESS_TOKEN_INVALID",
        "ACCESS_TOKEN_MISSING",
        "ACCESS_TOKEN_REVOKED",
        "SESSION_INVALID",
        "SESSION_USER_MISMATCH",
        "SESSION_ID_MISMATCH",
      ].includes(code)
    ) {
      localStorage.removeItem("accessToken");
      sessionStorage.removeItem("accessToken");

      localStorage.removeItem("user");
      sessionStorage.removeItem("user");

      window.location.href = "/login";
    }

    return Promise.reject(error);
  }
);

// ============================================================
// INTERVIEW
// ============================================================

// GET /api/interviews
export const getInterviews = async () => {
  return interviewApi.get("/interviews");
};

// GET /api/interviews/:id
export const getInterview = async (interviewId) => {
  return interviewApi.get(
    `/interviews/${interviewId}`
  );
};

// POST /api/interviews
export const createInterview = async (data) => {
  return interviewApi.post(
    "/interviews",
    data
  );
};

// ============================================================
// INTERVIEW LIFECYCLE
// ============================================================

// POST /api/interviews/:id/start
export const startInterview = async (interviewId) => {
  return interviewApi.post(
    `/interviews/${interviewId}/start`
  );
};

// POST /api/interviews/:id/pause
export const pauseInterview = async (
  interviewId,
  reason = "paused"
) => {
  return interviewApi.post(
    `/interviews/${interviewId}/pause`,
    {
      reason,
    }
  );
};

// POST /api/interviews/:id/resume
export const resumeInterview = async (interviewId) => {
  return interviewApi.post(
    `/interviews/${interviewId}/resume`
  );
};

// POST /api/interviews/:id/complete
export const completeInterview = async (interviewId) => {
  return interviewApi.post(
    `/interviews/${interviewId}/complete`
  );
};

// POST /api/interviews/:id/cancel
export const cancelInterview = async (
  interviewId,
  exitReason = "user-exit"
) => {
  return interviewApi.post(
    `/interviews/${interviewId}/cancel`,
    {
      exitReason,
    }
  );
};

// ============================================================
// INTERVIEW PROGRESS / SCORE / REPORT
// ============================================================

// GET /api/interviews/:id/progress
export const getInterviewProgress = async (interviewId) => {
  return interviewApi.get(
    `/interviews/${interviewId}/progress`
  );
};

// GET /api/interviews/:id/score
export const getInterviewScore = async (interviewId) => {
  return interviewApi.get(
    `/interviews/${interviewId}/score`
  );
};

// GET /api/interviews/:id/report
export const getInterviewReport = async (interviewId) => {
  return interviewApi.get(
    `/interviews/${interviewId}/report`
  );
};

// POST /api/interviews/:id/report
export const generateInterviewReport = async (interviewId) => {
  return interviewApi.post(
    `/interviews/${interviewId}/report`
  );
};

// ============================================================
// QUESTIONS
// ============================================================

// GET /api/interviews/:id/questions
export const getInterviewQuestions = async (interviewId) => {
  return interviewApi.get(
    `/interviews/${interviewId}/questions`
  );
};

// GET /api/interviews/:id/current-question
export const getCurrentQuestion = async (interviewId) => {
  return interviewApi.get(
    `/interviews/${interviewId}/current-question`
  );
};

// GET /api/interviews/:id/next-question
export const getNextQuestion = async (interviewId) => {
  return interviewApi.get(
    `/interviews/${interviewId}/next-question`
  );
};

// GET /api/interviews/:id/previous-question
export const getPreviousQuestion = async (interviewId) => {
  return interviewApi.get(
    `/interviews/${interviewId}/previous-question`
  );
};

// GET /api/interviews/:id/questions/:questionNumber
export const getQuestionByNumber = async (
  interviewId,
  questionNumber
) => {
  return interviewApi.get(
    `/interviews/${interviewId}/questions/${questionNumber}`
  );
};

// POST /api/interviews/:id/questions/:questionNumber/select
export const selectQuestion = async (
  interviewId,
  questionNumber
) => {
  return interviewApi.post(
    `/interviews/${interviewId}/questions/${questionNumber}/select`
  );
};

// POST /api/interviews/:id/question
export const generateInterviewQuestion = async (
  interviewId
) => {
  return interviewApi.post(
    `/interviews/${interviewId}/question`
  );
};

// ============================================================
// ANSWERS
// ============================================================

// POST /api/interviews/:id/questions/:questionId/answer
export const submitAnswer = async (
  interviewId,
  questionId,
  data
) => {
  const payload =
    typeof data === "string"
      ? {
          answerType: "text",
          answerText: data,
        }
      : {
          ...(data || {}),
        };

  return interviewApi.post(
    `/interviews/${interviewId}/questions/${questionId}/answer`,
    payload
  );
};

// PUT /api/interviews/:id/questions/:questionId/answer
export const updateAnswer = async (
  interviewId,
  questionId,
  data
) => {
  const payload =
    typeof data === "string"
      ? {
          answerType: "text",
          answerText: data,
        }
      : {
          ...(data || {}),
        };

  return interviewApi.put(
    `/interviews/${interviewId}/questions/${questionId}/answer`,
    payload
  );
};

// POST /api/interviews/:id/questions/:questionId/resubmit
export const resubmitAnswer = async (
  interviewId,
  questionId,
  data
) => {
  const payload =
    typeof data === "string"
      ? {
          answerType: "text",
          answerText: data,
        }
      : {
          ...(data || {}),
        };

  return interviewApi.post(
    `/interviews/${interviewId}/questions/${questionId}/resubmit`,
    payload
  );
};

// GET /api/interviews/:id/questions/:questionId/answer
export const getAnswer = async (
  interviewId,
  questionId
) => {
  return interviewApi.get(
    `/interviews/${interviewId}/questions/${questionId}/answer`
  );
};

// GET /api/interviews/:id/answers
export const getInterviewAnswers = async (interviewId) => {
  return interviewApi.get(
    `/interviews/${interviewId}/answers`
  );
};

// ============================================================
// CODING
// ============================================================

// POST /api/interviews/:id/questions/:questionId/run
export const runCode = async (
  interviewId,
  questionId,
  runData
) => {
  return interviewApi.post(
    `/interviews/${interviewId}/questions/${questionId}/run`,
    runData
  );
};

// ============================================================
// SKIP QUESTION
// ============================================================

// POST /api/interviews/:id/questions/:questionId/skip
export const skipQuestion = async (
  interviewId,
  questionId,
  skipReason = "user-skipped"
) => {
  return interviewApi.post(
    `/interviews/${interviewId}/questions/${questionId}/skip`,
    {
      skipReason,
    }
  );
};

// POST /api/interviews/:id/questions/:questionId/answer-skipped
export const answerSkippedQuestion = async (
  interviewId,
  questionId,
  data
) => {
  const payload =
    typeof data === "string"
      ? {
          answerType: "text",
          answerText: data,
        }
      : {
          ...(data || {}),
        };

  return interviewApi.post(
    `/interviews/${interviewId}/questions/${questionId}/answer-skipped`,
    payload
  );
};

// ============================================================
// QUESTION STATUS
// ============================================================

// GET /api/interviews/:id/question-statuses
export const getInterviewQuestionStatuses = async (
  interviewId
) => {
  return interviewApi.get(
    `/interviews/${interviewId}/question-statuses`
  );
};

// ============================================================
// EVALUATION
// ============================================================

// POST /api/interviews/:id/questions/:questionId/evaluate
export const evaluateAnswer = async (
  interviewId,
  questionId
) => {
  return interviewApi.post(
    `/interviews/${interviewId}/questions/${questionId}/evaluate`
  );
};

// POST /api/interviews/:id/questions/:questionId/re-evaluate
export const reEvaluateAnswer = async (
  interviewId,
  questionId,
  data = {}
) => {
  const payload =
    typeof data === "string"
      ? {
          answerType: "text",
          answerText: data,
        }
      : {
          ...(data || {}),
        };

  return interviewApi.post(
    `/interviews/${interviewId}/questions/${questionId}/re-evaluate`,
    payload
  );
};

// GET /api/interviews/:id/questions/:questionId/evaluation
export const getEvaluation = async (
  interviewId,
  questionId
) => {
  return interviewApi.get(
    `/interviews/${interviewId}/questions/${questionId}/evaluation`
  );
};

// GET /api/interviews/:id/evaluations
export const getInterviewEvaluations = async (
  interviewId
) => {
  return interviewApi.get(
    `/interviews/${interviewId}/evaluations`
  );
};

// POST /api/interviews/:id/re-evaluate
export const reEvaluateInterview = async (
  interviewId
) => {
  return interviewApi.post(
    `/interviews/${interviewId}/re-evaluate`
  );
};

// ============================================================
// DEFAULT EXPORT
// ============================================================

export default interviewApi;
