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
    console.log("URL:", `${config.baseURL}${config.url}`);
    console.log("PARAMS:", config.params);
    console.log("BODY:", config.data);
    console.log("HAS TOKEN:", Boolean(token));
    console.log("==================================================");

    return config;
  },
  (error) => {
    console.error("[INTERVIEW API REQUEST ERROR]", error);
    return Promise.reject(error);
  },
);

// ============================================================
// RESPONSE INTERCEPTOR
// ============================================================

interviewApi.interceptors.response.use(
  (response) => {
    console.log("==================================================");
    console.log("[INTERVIEW API SUCCESS]");
    console.log("STATUS:", response.status);
    console.log("METHOD:", response.config?.method?.toUpperCase());
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
    console.error("METHOD:", error?.config?.method?.toUpperCase());
    console.error("REQUEST BODY:", error?.config?.data);
    console.error("STACK:", error?.stack);
    console.error("==================================================");

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
      console.warn("[AUTH] Authentication failed:", code);

      localStorage.removeItem("accessToken");
      sessionStorage.removeItem("accessToken");
      localStorage.removeItem("user");
      sessionStorage.removeItem("user");

      window.location.href = "/login";
    }

    return Promise.reject(error);
  },
);

// ============================================================
// GET INTERVIEW
// ============================================================

export const getInterview = async (interviewId) => {
  console.log("[API] getInterview:", interviewId);

  return interviewApi.get(`/interviews/${interviewId}`);
};

// ============================================================
// GET ALL INTERVIEWS
// ============================================================

export const getInterviews = async () => {
  console.log("[API] getInterviews");

  return interviewApi.get("/interviews");
};

// ============================================================
// CREATE INTERVIEW
// ============================================================

export const createInterview = async (data) => {
  console.log("[API] createInterview PAYLOAD:", data);

  return interviewApi.post("/interviews", data);
};

// ============================================================
// START INTERVIEW
// ============================================================

export const startInterview = async (interviewId) => {
  console.log("[API] startInterview:", interviewId);

  return interviewApi.post(`/interviews/${interviewId}/start`);
};

// ============================================================
// GET QUESTIONS
// ============================================================

export const getInterviewQuestions = async (interviewId) => {
  console.log("[API] getInterviewQuestions:", interviewId);

  return interviewApi.get(`/interviews/${interviewId}/questions`);
};

// ============================================================
// GET CURRENT PENDING QUESTION
// ============================================================

export const getNextQuestion = async (interviewId) => {
  console.log("[API] getNextQuestion:", interviewId);

  return interviewApi.get(`/interviews/${interviewId}/next-question`);
};

// ============================================================
// GENERATE NEXT AI QUESTION
// ============================================================

export const generateInterviewQuestion = async (interviewId) => {
  console.log("==================================================");
  console.log("[API] generateInterviewQuestion");
  console.log("INTERVIEW ID:", interviewId);
  console.log("REQUEST URL:", `/interviews/${interviewId}/question`);
  console.log("==================================================");

  return interviewApi.post(`/interviews/${interviewId}/question`);
};

// ============================================================
// ALIAS
// ============================================================

export const generateNextQuestion = async (interviewId) => {
  console.log("[API] generateNextQuestion:", interviewId);

  return generateInterviewQuestion(interviewId);
};

// ============================================================
// SUBMIT ANSWER
// ============================================================

export const submitAnswer = async (interviewId, questionId, answerText) => {
  console.log("[API] submitAnswer:", {
    interviewId,
    questionId,
    answerLength: answerText?.length || 0,
  });

  return interviewApi.post(
    `/interviews/${interviewId}/questions/${questionId}/answer`,
    {
      answerText,
    },
  );
};

// ============================================================
// EVALUATE ANSWER
// ============================================================

export const evaluateAnswer = async (interviewId, questionId) => {
  console.log("[API] evaluateAnswer:", {
    interviewId,
    questionId,
  });

  return interviewApi.post(
    `/interviews/${interviewId}/questions/${questionId}/evaluate`,
  );
};

// ============================================================
// GET EVALUATION
// ============================================================

export const getEvaluation = async (interviewId, questionId) => {
  return interviewApi.get(
    `/interviews/${interviewId}/questions/${questionId}/evaluation`,
  );
};

// ============================================================
// GET ALL EVALUATIONS
// ============================================================

export const getInterviewEvaluations = async (interviewId) => {
  console.log("[API] getInterviewEvaluations:", interviewId);

  return interviewApi.get(`/interviews/${interviewId}/evaluations`);
};

// ============================================================
// GET PROGRESS
// ============================================================

export const getInterviewProgress = async (interviewId) => {
  console.log("[API] getInterviewProgress:", interviewId);

  return interviewApi.get(`/interviews/${interviewId}/progress`);
};

// ============================================================
// COMPLETE
// ============================================================

export const completeInterview = async (interviewId) => {
  console.log("[API] completeInterview:", interviewId);

  return interviewApi.post(`/interviews/${interviewId}/complete`);
};

// ============================================================
// CANCEL
// ============================================================

export const cancelInterview = async (
  interviewId,
  exitReason = "user-exit",
) => {
  console.log("[API] cancelInterview:", {
    interviewId,
    exitReason,
  });

  return interviewApi.post(`/interviews/${interviewId}/cancel`, {
    exitReason,
  });
};

// ============================================================
// EXPORT
// ============================================================

export default interviewApi;
