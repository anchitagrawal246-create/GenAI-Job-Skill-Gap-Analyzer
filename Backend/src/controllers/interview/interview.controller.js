
const interviewService = require("../../services/interview/interview.service");
const answerService = require("../../services/interview/answer.service");
const evaluationService = require("../../services/interview/evaluation.service");

// ============================================================
// DEBUG
// ============================================================

const debug = (message, data = null) => {
  console.log(`[INTERVIEW CONTROLLER] ${message}`);

  if (data !== null) {
    console.log(data);
  }
};

const debugError = (message, error = null) => {
  console.error(`[INTERVIEW CONTROLLER ERROR] ${message}`);

  if (error) {
    console.error(
      error?.stack ||
        error?.message ||
        error,
    );
  }
};

// ============================================================
// AUTHENTICATED USER
// ============================================================

const getUserId = (req) => {
  const userId = req?.user?.id;

  if (!userId) {
    throw new Error(
      "Authenticated user not found",
    );
  }

  return userId;
};

// ============================================================
// HTTP ERROR STATUS
// ============================================================

const getErrorStatus = (error) => {
  const message =
    error?.message || "";

  // ----------------------------------------------------------
  // NOT FOUND
  // ----------------------------------------------------------

  if (
    message === "Interview not found" ||
    message === "Question not found" ||
    message === "Answer not found" ||
    message === "Evaluation not found" ||
    message === "Original answer not found" ||
    message === "Previous question not found"
  ) {
    return 404;
  }

  // ----------------------------------------------------------
  // BAD REQUEST
  // ----------------------------------------------------------

  if (
    message.startsWith("Invalid ") ||
    message.startsWith("Answer") ||
    message.startsWith("Question") ||
    message.startsWith("Interview") ||
    message.startsWith("Skipped") ||
    message.startsWith("Completed") ||
    message.startsWith("Cancelled") ||
    message.startsWith("At least one")
  ) {
    return 400;
  }

  // ----------------------------------------------------------
  // DEFAULT
  // ----------------------------------------------------------

  return 400;
};

// ============================================================
// CREATE INTERVIEW
// ============================================================

const createInterview = async (req, res) => {
  try {
    const userId = getUserId(req);

    debug("CREATE", {
      userId: String(userId),
      body: req.body || {},
    });

    const interview =
      await interviewService.createInterview(
        userId,
        req.body || {},
      );

    return res.status(201).json({
      success: true,
      message:
        "Interview created successfully",
      data: interview,
    });
  } catch (error) {
    debugError(
      "CREATE failed",
      error,
    );

    return res
      .status(getErrorStatus(error))
      .json({
        success: false,
        message:
          error?.message ||
          "Failed to create interview",
      });
  }
};

// ============================================================
// GET USER INTERVIEWS
// ============================================================

const getInterviews = async (
  req,
  res,
) => {
  try {
    const userId = getUserId(req);

    debug("GET ALL INTERVIEWS", {
      userId: String(userId),
    });

    const interviews =
      await interviewService.getUserInterviews(
        userId,
      );

    return res.status(200).json({
      success: true,
      data: interviews,
    });
  } catch (error) {
    debugError(
      "GET ALL failed",
      error,
    );

    return res
      .status(getErrorStatus(error))
      .json({
        success: false,
        message:
          error?.message ||
          "Failed to fetch interviews",
      });
  }
};

// ============================================================
// GET INTERVIEW BY ID
// ============================================================

const getInterview = async (
  req,
  res,
) => {
  try {
    const userId = getUserId(req);

    const interview =
      await interviewService.getInterviewById(
        userId,
        req.params.id,
      );

    if (!interview) {
      return res.status(404).json({
        success: false,
        message: "Interview not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: interview,
    });
  } catch (error) {
    debugError(
      "GET INTERVIEW failed",
      error,
    );

    return res
      .status(getErrorStatus(error))
      .json({
        success: false,
        message:
          error?.message ||
          "Failed to fetch interview",
      });
  }
};



// ============================================================
// START INTERVIEW
// ============================================================

const startInterview = async (
  req,
  res,
) => {
  try {
    const userId = getUserId(req);
    const interviewId =
      req.params.id;

    debug("START", {
      userId: String(userId),
      interviewId: String(
        interviewId,
      ),
    });

    const interview =
      await interviewService.startInterview(
        userId,
        interviewId,
      );

    return res.status(200).json({
      success: true,
      message:
        "Interview started successfully",
      data: interview,
    });
  } catch (error) {
    debugError(
      "START failed",
      error,
    );

    return res
      .status(getErrorStatus(error))
      .json({
        success: false,
        message:
          error?.message ||
          "Failed to start interview",
      });
  }
};

// ============================================================
// RESUME INTERVIEW
// ============================================================

const resumeInterview = async (
  req,
  res,
) => {
  try {
    const userId = getUserId(req);
    const interviewId =
      req.params.id;

    debug("RESUME", {
      userId: String(userId),
      interviewId: String(
        interviewId,
      ),
    });

    const result =
      await interviewService.resumeInterview(
        userId,
        interviewId,
      );

    return res.status(200).json({
      success: true,
      message:
        "Interview resumed successfully",
      data: result,
    });
  } catch (error) {
    debugError(
      "RESUME failed",
      error,
    );

    return res
      .status(getErrorStatus(error))
      .json({
        success: false,
        message:
          error?.message ||
          "Failed to resume interview",
      });
  }
};

// ============================================================
// PAUSE INTERVIEW
// ============================================================

const pauseInterview = async (
  req,
  res,
) => {
  try {
    const userId = getUserId(req);
    const interviewId =
      req.params.id;

    const reason =
      req.body?.reason ||
      "paused";

    debug("PAUSE", {
      userId: String(userId),
      interviewId: String(
        interviewId,
      ),
      reason,
    });

    const interview =
      await interviewService.pauseInterview(
        userId,
        interviewId,
        reason,
      );

    return res.status(200).json({
      success: true,
      message:
        "Interview paused successfully",
      data: interview,
    });
  } catch (error) {
    debugError(
      "PAUSE failed",
      error,
    );

    return res
      .status(getErrorStatus(error))
      .json({
        success: false,
        message:
          error?.message ||
          "Failed to pause interview",
      });
  }
};

// ============================================================
// GET ALL INTERVIEW QUESTIONS
// ============================================================

const getInterviewQuestions = async (
  req,
  res,
) => {
  try {
    const userId = getUserId(req);
    const interviewId =
      req.params.id;

    const questions =
      await interviewService.getInterviewQuestions(
        userId,
        interviewId,
      );

    return res.status(200).json({
      success: true,
      data: questions,
    });
  } catch (error) {
    debugError(
      "GET QUESTIONS failed",
      error,
    );

    return res
      .status(getErrorStatus(error))
      .json({
        success: false,
        message:
          error?.message ||
          "Failed to fetch interview questions",
      });
  }
};

// ============================================================
// GENERATE NEXT ADAPTIVE QUESTION
// ============================================================

const generateInterviewQuestion =
  async (req, res) => {
    try {
      const userId = getUserId(req);

      const interviewId =
        req.params.id;

      debug("GENERATE QUESTION", {
        userId: String(userId),
        interviewId: String(
          interviewId,
        ),
      });

      const result =
        await interviewService.generateInterviewQuestion(
          userId,
          interviewId,
        );

      return res.status(200).json({
        success: true,

        message:
          result?.question
            ? "Next interview question generated successfully"
            : "Interview has no further question to generate",

        data: result,
      });
    } catch (error) {
      debugError(
        "GENERATE QUESTION failed",
        error,
      );

      return res
        .status(getErrorStatus(error))
        .json({
          success: false,
          message:
            error?.message ||
            "Failed to generate next interview question",
        });
    }
  };

// ============================================================
// GET CURRENT QUESTION
// ============================================================

const getCurrentQuestion = async (
  req,
  res,
) => {
  try {
    const userId = getUserId(req);

    const interviewId =
      req.params.id;

    const result =
      await interviewService.getCurrentQuestion(
        userId,
        interviewId,
      );

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    debugError(
      "GET CURRENT QUESTION failed",
      error,
    );

    return res
      .status(getErrorStatus(error))
      .json({
        success: false,
        message:
          error?.message ||
          "Failed to fetch current question",
      });
  }
};

// ============================================================
// GET NEXT QUESTION
// ============================================================

const getNextQuestion = async (
  req,
  res,
) => {
  try {
    const userId = getUserId(req);

    const interviewId =
      req.params.id;

    const result =
      await interviewService.getNextQuestion(
        userId,
        interviewId,
      );

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    debugError(
      "NEXT QUESTION failed",
      error,
    );

    return res
      .status(getErrorStatus(error))
      .json({
        success: false,
        message:
          error?.message ||
          "Failed to move to next question",
      });
  }
};

// ============================================================
// GET PREVIOUS QUESTION
// ============================================================

const getPreviousQuestion =
  async (req, res) => {
    try {
      const userId = getUserId(req);

      const interviewId =
        req.params.id;

      const result =
        await interviewService.getPreviousQuestion(
          userId,
          interviewId,
        );

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      debugError(
        "PREVIOUS QUESTION failed",
        error,
      );

      return res
        .status(getErrorStatus(error))
        .json({
          success: false,
          message:
            error?.message ||
            "Failed to move to previous question",
        });
    }
  };

// ============================================================
// GET QUESTION BY NUMBER
// ============================================================

const getQuestionByNumber =
  async (req, res) => {
    try {
      const userId = getUserId(req);

      const interviewId =
        req.params.id;

      const questionNumber =
        req.params.questionNumber;

      const result =
        await interviewService.getQuestionByNumber(
          userId,
          interviewId,
          questionNumber,
        );

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      debugError(
        "GET QUESTION BY NUMBER failed",
        error,
      );

      return res
        .status(getErrorStatus(error))
        .json({
          success: false,
          message:
            error?.message ||
            "Failed to fetch question",
        });
    }
  };

// ============================================================
// SELECT QUESTION
// ============================================================

const selectQuestion = async (
  req,
  res,
) => {
  try {
    const userId = getUserId(req);

    const interviewId =
      req.params.id;

    const questionNumber =
      req.params.questionNumber;

    const result =
      await interviewService.selectQuestion(
        userId,
        interviewId,
        questionNumber,
      );

    return res.status(200).json({
      success: true,
      message:
        "Question selected successfully",
      data: result,
    });
  } catch (error) {
    debugError(
      "SELECT QUESTION failed",
      error,
    );

    return res
      .status(getErrorStatus(error))
      .json({
        success: false,
        message:
          error?.message ||
          "Failed to select question",
      });
  }
};

// ============================================================
// SUBMIT ANSWER
// ============================================================

const submitAnswer = async (
  req,
  res,
) => {
  try {
    const {
      id: interviewId,
      questionId,
    } = req.params;

    const userId =
      getUserId(req);

    const payload =
      req.body || {};

    debug("SUBMIT ANSWER", {
      userId: String(userId),
      interviewId: String(
        interviewId,
      ),
      questionId: String(
        questionId,
      ),
      answerType:
        payload.answerType ||
        "auto",
    });

    const answer =
      await answerService.submitAnswer(
        userId,
        interviewId,
        questionId,
        payload,
      );

    return res.status(201).json({
      success: true,
      message:
        "Answer submitted successfully",
      data: answer,
    });
  } catch (error) {
    debugError(
      "SUBMIT ANSWER failed",
      error,
    );

    return res
      .status(getErrorStatus(error))
      .json({
        success: false,
        message:
          error?.message ||
          "Failed to submit answer",
      });
  }
};

// ============================================================
// RESUBMIT ANSWER
// ============================================================

const resubmitAnswer = async (
  req,
  res,
) => {
  try {
    const {
      id: interviewId,
      questionId,
    } = req.params;

    const userId =
      getUserId(req);

    const answer =
      await answerService.resubmitAnswer(
        userId,
        interviewId,
        questionId,
        req.body || {},
      );

    return res.status(200).json({
      success: true,
      message:
        "Answer resubmitted successfully",
      data: answer,
    });
  } catch (error) {
    debugError(
      "RESUBMIT ANSWER failed",
      error,
    );

    return res
      .status(getErrorStatus(error))
      .json({
        success: false,
        message:
          error?.message ||
          "Failed to resubmit answer",
      });
  }
};

// ============================================================
// RUN CODE
// ============================================================

const runCode = async (
  req,
  res,
) => {
  try {
    const {
      id: interviewId,
      questionId,
    } = req.params;

    const result =
      await answerService.recordCodeRun(
        getUserId(req),
        interviewId,
        questionId,
        req.body || {},
      );

    return res.status(200).json({
      success: true,
      message:
        "Code run recorded successfully",
      data: result,
    });
  } catch (error) {
    debugError(
      "RUN CODE failed",
      error,
    );

    return res
      .status(getErrorStatus(error))
      .json({
        success: false,
        message:
          error?.message ||
          "Failed to run code",
      });
  }
};

// ============================================================
// SKIP QUESTION
// ============================================================

const skipQuestion = async (
  req,
  res,
) => {
  try {
    const {
      id: interviewId,
      questionId,
    } = req.params;

    const skipReason =
      req.body?.skipReason ||
      "user-skipped";

    const result =
      await answerService.skipQuestion(
        getUserId(req),
        interviewId,
        questionId,
        skipReason,
      );

    return res.status(200).json({
      success: true,
      message:
        "Question skipped successfully",
      data: result,
    });
  } catch (error) {
    debugError(
      "SKIP QUESTION failed",
      error,
    );

    return res
      .status(getErrorStatus(error))
      .json({
        success: false,
        message:
          error?.message ||
          "Failed to skip question",
      });
  }
};

// ============================================================
// ANSWER SKIPPED QUESTION
// ============================================================

const answerSkippedQuestion =
  async (req, res) => {
    try {
      const {
        id: interviewId,
        questionId,
      } = req.params;

      const result =
        await answerService.answerSkippedQuestion(
          getUserId(req),
          interviewId,
          questionId,
          req.body || {},
        );

      return res.status(200).json({
        success: true,
        message:
          "Skipped question answered successfully",
        data: result,
      });
    } catch (error) {
      debugError(
        "ANSWER SKIPPED QUESTION failed",
        error,
      );

      return res
        .status(getErrorStatus(error))
        .json({
          success: false,
          message:
            error?.message ||
            "Failed to answer skipped question",
        });
    }
  };

// ============================================================
// GET SINGLE ANSWER
// ============================================================

const getAnswer = async (
  req,
  res,
) => {
  try {
    const {
      id: interviewId,
      questionId,
    } = req.params;

    const answer =
      await answerService.getAnswer(
        getUserId(req),
        interviewId,
        questionId,
      );

    if (!answer) {
      return res.status(404).json({
        success: false,
        message: "Answer not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: answer,
    });
  } catch (error) {
    debugError(
      "GET ANSWER failed",
      error,
    );

    return res
      .status(getErrorStatus(error))
      .json({
        success: false,
        message:
          error?.message ||
          "Failed to fetch answer",
      });
  }
};

// ============================================================
// GET ALL INTERVIEW ANSWERS
// ============================================================

const getInterviewAnswers =
  async (req, res) => {
    try {
      const answers =
        await answerService.getInterviewAnswers(
          getUserId(req),
          req.params.id,
        );

      return res.status(200).json({
        success: true,
        data: answers,
      });
    } catch (error) {
      debugError(
        "GET ANSWERS failed",
        error,
      );

      return res
        .status(getErrorStatus(error))
        .json({
          success: false,
          message:
            error?.message ||
            "Failed to fetch interview answers",
        });
    }
  };

// ============================================================
// GET QUESTION STATUSES
// ============================================================

const getInterviewQuestionStatuses =
  async (req, res) => {
    try {
      const result =
        await answerService.getInterviewQuestionStatuses(
          getUserId(req),
          req.params.id,
        );

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      debugError(
        "GET QUESTION STATUSES failed",
        error,
      );

      return res
        .status(getErrorStatus(error))
        .json({
          success: false,
          message:
            error?.message ||
            "Failed to fetch question statuses",
        });
    }
  };

// ============================================================
// EVALUATE ANSWER
// ============================================================

const evaluateAnswer = async (
  req,
  res,
) => {
  try {
    const {
      id: interviewId,
      questionId,
    } = req.params;

    const result =
      await evaluationService.evaluateAnswer(
        getUserId(req),
        interviewId,
        questionId,
      );

    return res.status(200).json({
      success: true,
      message:
        result?.alreadyEvaluated
          ? "Answer was already evaluated"
          : "Answer evaluated successfully",
      data: result,
    });
  } catch (error) {
    debugError(
      "EVALUATE ANSWER failed",
      error,
    );

    return res
      .status(getErrorStatus(error))
      .json({
        success: false,
        message:
          error?.message ||
          "Failed to evaluate answer",
      });
  }
};

// ============================================================
// RE-EVALUATE ONE ANSWER
// ============================================================

const reEvaluateAnswer =
  async (req, res) => {
    try {
      const {
        id: interviewId,
        questionId,
      } = req.params;

      const result =
        await evaluationService.reEvaluateAnswer(
          getUserId(req),
          interviewId,
          questionId,
        );

      return res.status(200).json({
        success: true,
        message:
          "Answer re-evaluated successfully",
        data: result,
      });
    } catch (error) {
      debugError(
        "RE-EVALUATE ANSWER failed",
        error,
      );

      return res
        .status(getErrorStatus(error))
        .json({
          success: false,
          message:
            error?.message ||
            "Failed to re-evaluate answer",
        });
    }
  };

// ============================================================
// RE-EVALUATE ENTIRE INTERVIEW
// ============================================================

const reEvaluateInterview =
  async (req, res) => {
    try {
      const result =
        await evaluationService.reEvaluateInterview(
          getUserId(req),
          req.params.id,
        );

      return res.status(200).json({
        success: true,
        message:
          result?.success
            ? "Interview re-evaluated successfully"
            : "Interview re-evaluation completed with some failures",
        data: result,
      });
    } catch (error) {
      debugError(
        "FULL RE-EVALUATION failed",
        error,
      );

      return res
        .status(getErrorStatus(error))
        .json({
          success: false,
          message:
            error?.message ||
            "Failed to re-evaluate interview",
        });
    }
  };

// ============================================================
// GET SINGLE EVALUATION
// ============================================================

const getEvaluation = async (
  req,
  res,
) => {
  try {
    const {
      id: interviewId,
      questionId,
    } = req.params;

    const result =
      await evaluationService.getEvaluation(
        getUserId(req),
        interviewId,
        questionId,
      );

    if (!result) {
      return res.status(404).json({
        success: false,
        message:
          "Evaluation not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    debugError(
      "GET EVALUATION failed",
      error,
    );

    return res
      .status(getErrorStatus(error))
      .json({
        success: false,
        message:
          error?.message ||
          "Failed to fetch evaluation",
      });
  }
};

// ============================================================
// GET ALL INTERVIEW EVALUATIONS
// ============================================================

const getInterviewEvaluations =
  async (req, res) => {
    try {
      const evaluations =
        await evaluationService.getInterviewEvaluations(
          getUserId(req),
          req.params.id,
        );

      return res.status(200).json({
        success: true,
        data: evaluations,
      });
    } catch (error) {
      debugError(
        "GET EVALUATIONS failed",
        error,
      );

      return res
        .status(getErrorStatus(error))
        .json({
          success: false,
          message:
            error?.message ||
            "Failed to fetch interview evaluations",
        });
    }
  };

// ============================================================
// COMPLETE INTERVIEW
// ============================================================

const completeInterview =
  async (req, res) => {
    try {
      const result =
        await interviewService.completeInterview(
          getUserId(req),
          req.params.id,
        );

      return res.status(200).json({
        success: true,
        message:
          "Interview completed successfully",
        data: result,
      });
    } catch (error) {
      debugError(
        "COMPLETE failed",
        error,
      );

      return res
        .status(getErrorStatus(error))
        .json({
          success: false,
          message:
            error?.message ||
            "Failed to complete interview",
        });
    }
  };

// ============================================================
// CANCEL INTERVIEW
// ============================================================

const cancelInterview = async (
  req,
  res,
) => {
  try {
    const exitReason =
      req.body?.exitReason ||
      "user-exit";

    const interview =
      await interviewService.cancelInterview(
        getUserId(req),
        req.params.id,
        exitReason,
      );

    return res.status(200).json({
      success: true,
      message:
        "Interview cancelled successfully",
      data: interview,
    });
  } catch (error) {
    debugError(
      "CANCEL failed",
      error,
    );

    return res
      .status(getErrorStatus(error))
      .json({
        success: false,
        message:
          error?.message ||
          "Failed to cancel interview",
      });
  }
};

// ============================================================
// GET INTERVIEW PROGRESS
// ============================================================

const getInterviewProgress =
  async (req, res) => {
    try {
      const progress =
        await interviewService.getInterviewProgress(
          getUserId(req),
          req.params.id,
        );

      return res.status(200).json({
        success: true,
        data: progress,
      });
    } catch (error) {
      debugError(
        "PROGRESS failed",
        error,
      );

      return res
        .status(getErrorStatus(error))
        .json({
          success: false,
          message:
            error?.message ||
            "Failed to fetch interview progress",
        });
    }
  };

// ============================================================
// GET REPORT
// ============================================================

const getInterviewReport =
  async (req, res) => {
    try {
      const report =
        await interviewService.getInterviewReport(
          getUserId(req),
          req.params.id,
        );

      return res.status(200).json({
        success: true,
        data: report,
      });
    } catch (error) {
      debugError(
        "GET REPORT failed",
        error,
      );

      return res
        .status(getErrorStatus(error))
        .json({
          success: false,
          message:
            error?.message ||
            "Failed to fetch interview report",
        });
    }
  };

// ============================================================
// GENERATE / REGENERATE REPORT
// ============================================================

const generateInterviewReport =
  async (req, res) => {
    try {
      const report =
        await interviewService.generateInterviewReport(
          getUserId(req),
          req.params.id,
        );

      return res.status(200).json({
        success: true,
        message:
          "Interview report generated successfully",
        data: report,
      });
    } catch (error) {
      debugError(
        "GENERATE REPORT failed",
        error,
      );

      return res
        .status(getErrorStatus(error))
        .json({
          success: false,
          message:
            error?.message ||
            "Failed to generate interview report",
        });
    }
  };

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  // Interview
  createInterview,
  getInterviews,
  getInterview,

  startInterview,
  resumeInterview,
  pauseInterview,

  // Questions
  getInterviewQuestions,
  generateInterviewQuestion,

  getCurrentQuestion,
  getNextQuestion,
  getPreviousQuestion,
  getQuestionByNumber,
  selectQuestion,

  // Answers
  submitAnswer,
  resubmitAnswer,
  runCode,
  skipQuestion,
  answerSkippedQuestion,
  getAnswer,
  getInterviewAnswers,
  getInterviewQuestionStatuses,

  // Evaluation
  evaluateAnswer,
  reEvaluateAnswer,
  reEvaluateInterview,
  getEvaluation,
  getInterviewEvaluations,

  // Interview control
  completeInterview,
  cancelInterview,
  getInterviewProgress,

  // Reports
  getInterviewReport,
  generateInterviewReport,
};
