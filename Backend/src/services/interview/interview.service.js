
const mongoose = require("mongoose");

const Interview = require("../../model/interview.model");
const Question = require("../../model/question.model");
const Evaluation = require("../../model/evaluation.model");
const { generateNextQuestion } = require("./interview.agent");

// ============================================================
// CONSTANTS
// ============================================================

const MAX_QUESTIONS = 100;

const ALLOWED_INTERVIEW_TYPES = [
  "technical",
  "behavioral",
  "mixed",
  "coding",
  "debugging",
  "system-design",
  "technical-coding",
  "technical-debugging",
];

const ALLOWED_DIFFICULTIES = [
  "auto",
  "very-easy",
  "easy",
  "medium",
  "hard",
  "very-hard",
];

const ALLOWED_SKILL_MODES = ["all", "specific"];

const ALLOWED_EXIT_REASONS = [
  "user-exit",
  "page-closed",
  "paused",
  "maximum-reached",
  "completed",
  "system-error",
  "user-cancelled",
];

// ============================================================
// DEBUG
// ============================================================

const debug = (message, data = null) => {
  console.log(`[INTERVIEW SERVICE] ${message}`);

  if (data !== null) {
    console.log(data);
  }
};

const debugError = (message, error = null) => {
  console.error(`[INTERVIEW SERVICE ERROR] ${message}`);

  if (error) {
    console.error(
      error?.stack ||
        error?.message ||
        error,
    );
  }
};

// ============================================================
// OBJECT ID
// ============================================================

const validateObjectId = (id, fieldName) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error(`Invalid ${fieldName}`);
  }

  return id;
};

// ============================================================
// BASIC HELPERS
// ============================================================

const normalizeStringArray = (value, max = 30) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return [
    ...new Set(
      value
        .filter(
          (item) =>
            typeof item === "string" &&
            item.trim().length > 0,
        )
        .map((item) => item.trim()),
    ),
  ].slice(0, max);
};

const clamp = (value, min, max) => {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return min;
  }

  return Math.min(max, Math.max(min, number));
};

// ============================================================
// OWNED INTERVIEW
// ============================================================

const getOwnedInterview = async (userId, interviewId) => {
  validateObjectId(userId, "user ID");
  validateObjectId(interviewId, "interview ID");

  const interview = await Interview.findOne({
    _id: interviewId,
    user: userId,
  });

  if (!interview) {
    throw new Error("Interview not found");
  }

  return interview;
};

// ============================================================
// EVALUATION HELPERS
// ============================================================

const getLatestEvaluations = (evaluations = []) => {
  const map = new Map();

  for (const evaluation of evaluations) {
    if (!evaluation?.question) {
      continue;
    }

    const questionId = evaluation.question.toString();

    const existing = map.get(questionId);

    if (!existing) {
      map.set(questionId, evaluation);
      continue;
    }

    const currentVersion =
      Number(evaluation?.version) || 1;

    const existingVersion =
      Number(existing?.version) || 1;

    if (currentVersion > existingVersion) {
      map.set(questionId, evaluation);
      continue;
    }

    if (
      currentVersion === existingVersion &&
      new Date(evaluation?.createdAt || 0) >
        new Date(existing?.createdAt || 0)
    ) {
      map.set(questionId, evaluation);
    }
  }

  return Array.from(map.values());
};

const getOriginalEvaluations = (evaluations = []) => {
  const map = new Map();

  for (const evaluation of evaluations) {
    if (!evaluation?.question) {
      continue;
    }

    if (evaluation.evaluationType !== "original") {
      continue;
    }

    const questionId = evaluation.question.toString();

    if (!map.has(questionId)) {
      map.set(questionId, evaluation);
    }
  }

  return Array.from(map.values());
};

const calculateAverage = (values = []) => {
  const scores = values
    .map(Number)
    .filter((score) => Number.isFinite(score));

  if (!scores.length) {
    return null;
  }

  const average =
    scores.reduce(
      (sum, score) => sum + score,
      0,
    ) / scores.length;

  return Math.round(average * 100) / 100;
};

const calculateCurrentScore = (evaluations = []) => {
  return calculateAverage(
    evaluations.map(
      (evaluation) => evaluation?.overallScore,
    ),
  );
};

const calculateOriginalScore = (evaluations = []) => {
  return calculateAverage(
    evaluations.map(
      (evaluation) => evaluation?.overallScore,
    ),
  );
};

// ============================================================
// CANDIDATE LEVEL
// ============================================================

const calculateCandidateLevel = ({
  currentEvaluations = [],
  questions = [],
}) => {
  const score = calculateCurrentScore(
    currentEvaluations,
  );

  if (score === null) {
    return {
      level: null,
      score: null,
      confidence: null,
    };
  }

  let hardQuestions = 0;
  let veryHardQuestions = 0;
  let strongAdvancedAnswers = 0;

  const evaluationMap = new Map();

  for (const evaluation of currentEvaluations) {
    if (evaluation?.question) {
      evaluationMap.set(
        evaluation.question.toString(),
        evaluation,
      );
    }
  }

  for (const question of questions) {
    if (question?.difficulty === "hard") {
      hardQuestions += 1;
    }

    if (question?.difficulty === "very-hard") {
      veryHardQuestions += 1;
    }

    const questionId = question?._id
      ? question._id.toString()
      : null;

    const evaluation = questionId
      ? evaluationMap.get(questionId)
      : null;

    if (
      evaluation &&
      Number(evaluation.overallScore) >= 75 &&
      (
        question.difficulty === "hard" ||
        question.difficulty === "very-hard"
      )
    ) {
      strongAdvancedAnswers += 1;
    }
  }

  let level = "beginner";

  if (
    score >= 85 &&
    (
      hardQuestions >= 3 ||
      veryHardQuestions >= 1
    ) &&
    strongAdvancedAnswers >= 2
  ) {
    level = "conqueror";
  } else if (
    score >= 60 &&
    (
      hardQuestions >= 1 ||
      veryHardQuestions >= 1 ||
      currentEvaluations.length >= 5
    )
  ) {
    level = "knight";
  }

  let confidence =
    30 + currentEvaluations.length * 6;

  if (hardQuestions >= 2) {
    confidence += 10;
  }

  if (strongAdvancedAnswers >= 2) {
    confidence += 10;
  }

  confidence = clamp(
    confidence,
    30,
    95,
  );

  return {
    level,
    score,
    confidence,
  };
};

// ============================================================
// COUNTERS
// ============================================================

const synchronizeInterviewCounters = async (
  interview,
) => {
  if (!interview) {
    throw new Error("Interview not found");
  }

  const [
    generatedQuestions,
    answeredQuestions,
    skippedQuestions,
  ] = await Promise.all([
    Question.countDocuments({
      interview: interview._id,
    }),

    Question.countDocuments({
      interview: interview._id,
      status: "answered",
    }),

    Question.countDocuments({
      interview: interview._id,
      status: "skipped",
    }),
  ]);

  const totalQuestions = clamp(
    interview.totalQuestions,
    1,
    MAX_QUESTIONS,
  );

  const safeGenerated = Math.min(
    generatedQuestions,
    MAX_QUESTIONS,
  );

  const safeAnswered = Math.min(
    answeredQuestions,
    totalQuestions,
  );

  const safeSkipped = Math.min(
    skippedQuestions,
    totalQuestions,
  );

  const completedQuestions = Math.min(
    safeAnswered + safeSkipped,
    totalQuestions,
  );

  interview.generatedQuestions = safeGenerated;
  interview.answeredQuestions = safeAnswered;
  interview.skippedQuestions = safeSkipped;
  interview.completedQuestions = completedQuestions;

  if (
    !interview.currentQuestionNumber ||
    interview.currentQuestionNumber < 1
  ) {
    interview.currentQuestionNumber = Math.min(
      completedQuestions + 1,
      totalQuestions,
    );
  }

  interview.currentQuestionNumber = clamp(
    interview.currentQuestionNumber,
    1,
    totalQuestions,
  );

  interview.lastActivityAt = new Date();

  await interview.save();

  return interview;
};

// ============================================================
// BUILD PROGRESS
// ============================================================

const buildProgress = (
  interview,
  currentQuestion = null,
) => {
  const totalQuestions = clamp(
    interview?.totalQuestions,
    1,
    MAX_QUESTIONS,
  );

  const generatedQuestions = clamp(
    interview?.generatedQuestions,
    0,
    totalQuestions,
  );

  const answeredQuestions = clamp(
    interview?.answeredQuestions,
    0,
    totalQuestions,
  );

  const skippedQuestions = clamp(
    interview?.skippedQuestions,
    0,
    totalQuestions,
  );

  const completedQuestions = Math.min(
    answeredQuestions + skippedQuestions,
    totalQuestions,
  );

  const progressPercentage =
    totalQuestions > 0
      ? Math.min(
          100,
          Math.round(
            (completedQuestions /
              totalQuestions) *
              100,
          ),
        )
      : 0;

  const activeQuestionNumber =
    Number(currentQuestion) ||
    Number(
      interview?.currentQuestionNumber,
    ) ||
    (
      completedQuestions < totalQuestions
        ? completedQuestions + 1
        : totalQuestions
    );

  return {
    currentQuestion:
      activeQuestionNumber,

    currentQuestionNumber:
      activeQuestionNumber,

    totalQuestions,

    maximumQuestions:
      MAX_QUESTIONS,

    generatedQuestions,

    answeredQuestions,

    skippedQuestions,

    completedQuestions,

    remainingQuestions:
      Math.max(
        totalQuestions -
          completedQuestions,
        0,
      ),

    isLastQuestion:
      activeQuestionNumber ===
      totalQuestions,

    progressPercentage,

    percentage:
      progressPercentage,

    interviewCompleted:
      interview?.status === "completed",
  };
};

// ============================================================
// SANITIZE QUESTION
// ============================================================

const sanitizeQuestion = (question) => {
  if (!question) {
    return null;
  }

  const plain =
    typeof question.toObject === "function"
      ? question.toObject()
      : question;

  const safe = {
    _id: plain?._id,

    interview:
      plain?.interview,

    questionNumber:
      plain?.questionNumber,

    question:
      plain?.question,

    category:
      plain?.category,

    difficulty:
      plain?.difficulty,

    skill:
      plain?.skill || null,

    expectedTopics:
      Array.isArray(
        plain?.expectedTopics,
      )
        ? plain.expectedTopics
        : [],

    status:
      plain?.status,

    isFollowUp:
      Boolean(plain?.isFollowUp),

    explanation:
      typeof plain?.explanation === "string"
        ? plain.explanation
        : "",

    solution:
      typeof plain?.solution === "string"
        ? plain.solution
        : "",

    complexity: {
      time:
        typeof plain?.complexity?.time ===
        "string"
          ? plain.complexity.time
          : null,

      space:
        typeof plain?.complexity?.space ===
        "string"
          ? plain.complexity.space
          : null,
    },
  };

  // ----------------------------------------------------------
  // CODING
  // ----------------------------------------------------------

  if (
    plain?.category === "coding" ||
    plain?.category === "dsa"
  ) {
    safe.coding = {
      language:
        plain?.coding?.language || null,

      functionName:
        plain?.coding?.functionName || null,

      functionSignature:
        plain?.coding?.functionSignature ||
        null,

      starterCode:
        plain?.coding?.starterCode ||
        null,

      inputFormat:
        plain?.coding?.inputFormat ||
        null,

      outputFormat:
        plain?.coding?.outputFormat ||
        null,

      examples:
        Array.isArray(
          plain?.coding?.examples,
        )
          ? plain.coding.examples
          : [],

      constraints:
        Array.isArray(
          plain?.coding?.constraints,
        )
          ? plain.coding.constraints
          : [],
    };
  }

  // ----------------------------------------------------------
  // DEBUGGING
  // ----------------------------------------------------------

  if (
    plain?.category === "debugging"
  ) {
    safe.debugging = {
      language:
        plain?.debugging?.language ||
        null,

      buggyCode:
        plain?.debugging?.buggyCode ||
        null,

      expectedBehavior:
        plain?.debugging
          ?.expectedBehavior || null,

      knownBugTypes:
        Array.isArray(
          plain?.debugging?.knownBugTypes,
        )
          ? plain.debugging.knownBugTypes
          : [],
    };
  }

  return safe;
};

// ============================================================
// CREATE INTERVIEW
// ============================================================

const createInterview = async (
  userId,
  data = {},
) => {
  validateObjectId(
    userId,
    "user ID",
  );

  const {
    title,
    role,
    interviewType = "technical",
    difficulty = "auto",
    skillMode = "all",
    technologies = [],
    totalQuestions = 10,
  } = data;

  if (
    typeof role !== "string" ||
    !role.trim()
  ) {
    throw new Error(
      "Role is required",
    );
  }

  if (
    !ALLOWED_INTERVIEW_TYPES.includes(
      interviewType,
    )
  ) {
    throw new Error(
      "Invalid interview type",
    );
  }

  if (
    !ALLOWED_DIFFICULTIES.includes(
      difficulty,
    )
  ) {
    throw new Error(
      "Invalid difficulty",
    );
  }

  if (
    !ALLOWED_SKILL_MODES.includes(
      skillMode,
    )
  ) {
    throw new Error(
      "Invalid skill mode",
    );
  }

  const requestedQuestions =
    Number(totalQuestions);

  if (
    !Number.isInteger(
      requestedQuestions,
    ) ||
    requestedQuestions < 1 ||
    requestedQuestions > MAX_QUESTIONS
  ) {
    throw new Error(
      "Number of questions must be between 1 and 100",
    );
  }

  const normalizedTechnologies =
    normalizeStringArray(
      technologies,
      30,
    );

  if (
    skillMode === "specific" &&
    !normalizedTechnologies.length
  ) {
    throw new Error(
      "At least one technology is required when skill mode is specific",
    );
  }

  const initialDifficulty =
    difficulty === "auto"
      ? "medium"
      : difficulty;

  const interview =
    await Interview.create({
      user: userId,

      title:
        typeof title === "string" &&
        title.trim()
          ? title.trim()
          : `${role.trim()} Interview`,

      role: role.trim(),

      interviewType,

      difficulty,

      currentDifficulty:
        initialDifficulty,

      skillMode,

      technologies:
        normalizedTechnologies,

      totalQuestions:
        requestedQuestions,

      generatedQuestions: 0,

      answeredQuestions: 0,

      skippedQuestions: 0,

      completedQuestions: 0,

      currentQuestionNumber: 0,

      status: "created",

      exitReason: null,

      startedAt: null,

      lastActivityAt: null,

      pausedAt: null,

      cancelledAt: null,

      completedAt: null,

      overallScore: null,

      originalScore: null,

      currentScore: null,

      scoreVersion: 0,

      scoreHistory: [],

      technologyScores: [],

      estimatedCandidateLevel:
        null,

      candidateLevelScore:
        null,

      candidateLevelConfidence:
        null,

      estimatedExperienceLevel:
        null,

      experienceConfidence:
        null,

      reportStatus:
        "not-generated",

      reportGeneratedAt:
        null,
    });

  debug(
    "Interview created",
    {
      interviewId:
        String(interview._id),

      totalQuestions:
        interview.totalQuestions,
    },
  );

  return interview;
};

// ============================================================
// GET USER INTERVIEWS
// ============================================================

const getUserInterviews = async (
  userId,
) => {
  validateObjectId(
    userId,
    "user ID",
  );

  return Interview.find({
    user: userId,
  })
    .sort({
      createdAt: -1,
    })
    .lean();
};

// ============================================================
// GET INTERVIEW BY ID
// ============================================================

const getInterviewById = async (
  userId,
  interviewId,
) => {
  validateObjectId(
    userId,
    "user ID",
  );

  validateObjectId(
    interviewId,
    "interview ID",
  );

  return Interview.findOne({
    _id: interviewId,
    user: userId,
  }).lean();
};

// ============================================================
// START INTERVIEW
// ============================================================

const startInterview = async (
  userId,
  interviewId,
) => {
  const interview =
    await getOwnedInterview(
      userId,
      interviewId,
    );

  if (
    interview.status === "completed"
  ) {
    throw new Error(
      "Interview has already been completed",
    );
  }

  if (
    interview.status === "cancelled"
  ) {
    throw new Error(
      "Cancelled interview cannot be restarted",
    );
  }

  if (
    interview.status === "in-progress"
  ) {
    return interview;
  }

  if (
    interview.status === "paused"
  ) {
    return resumeInterview(
      userId,
      interviewId,
    );
  }

  interview.status =
    "in-progress";

  interview.startedAt =
    interview.startedAt ||
    new Date();

  interview.lastActivityAt =
    new Date();

  interview.exitReason =
    null;

  interview.pausedAt =
    null;

  interview.cancelledAt =
    null;

  if (
    !interview.currentQuestionNumber
  ) {
    interview.currentQuestionNumber =
      1;
  }

  await interview.save();

  debug(
    "Interview started",
    {
      interviewId:
        String(interview._id),
    },
  );

  return interview;
};

// ============================================================
// PAUSE
// ============================================================

const pauseInterview = async (
  userId,
  interviewId,
  reason = "paused",
) => {
  const interview =
    await getOwnedInterview(
      userId,
      interviewId,
    );

  if (
    interview.status !==
    "in-progress"
  ) {
    throw new Error(
      `Interview cannot be paused in status ${interview.status}`,
    );
  }

  interview.status = "paused";

  interview.pausedAt =
    new Date();

  interview.exitReason =
    "paused";

  interview.lastActivityAt =
    new Date();

  await interview.save();

  debug(
    "Interview paused",
    {
      interviewId:
        String(interview._id),

      reason,
    },
  );

  return interview;
};

// ============================================================
// RESUME
// ============================================================

const resumeInterview = async (
  userId,
  interviewId,
) => {
  const interview =
    await getOwnedInterview(
      userId,
      interviewId,
    );

  if (
    interview.status ===
    "completed"
  ) {
    throw new Error(
      "Completed interview cannot be resumed",
    );
  }

  if (
    interview.status ===
    "cancelled"
  ) {
    throw new Error(
      "Cancelled interview cannot be resumed",
    );
  }

  if (
    interview.status ===
    "in-progress"
  ) {
    return interview;
  }

  interview.status =
    "in-progress";

  interview.lastActivityAt =
    new Date();

  interview.exitReason =
    null;

  interview.pausedAt =
    null;

  interview.cancelledAt =
    null;

  interview.startedAt =
    interview.startedAt ||
    new Date();

  if (
    !interview.currentQuestionNumber
  ) {
    interview.currentQuestionNumber =
      1;
  }

  await interview.save();

  debug(
    "Interview resumed",
    {
      interviewId:
        String(interview._id),
    },
  );

  return interview;
};

// ============================================================
// GET ALL QUESTIONS
// ============================================================

const getInterviewQuestions =
  async (
    userId,
    interviewId,
  ) => {
    await getOwnedInterview(
      userId,
      interviewId,
    );

    const questions =
      await Question.find({
        interview: interviewId,
      })
        .sort({
          questionNumber: 1,
        })
        .lean();

    return questions.map(
      sanitizeQuestion,
    );
  };

// ============================================================
// GET CURRENT QUESTION
// ============================================================

const getCurrentQuestion =
  async (
    userId,
    interviewId,
  ) => {
    const interview =
      await getOwnedInterview(
        userId,
        interviewId,
      );

    await synchronizeInterviewCounters(
      interview,
    );

    const activeNumber =
      Number(
        interview.currentQuestionNumber,
      ) || 1;

    const question =
      await Question.findOne({
        interview: interviewId,
        questionNumber:
          activeNumber,
      }).lean();

    if (!question) {
      return {
        question: null,

        questionNumber:
          activeNumber,

        needsGeneration:
          interview.completedQuestions <
          interview.totalQuestions,

        interviewProgress:
          buildProgress(
            interview,
            activeNumber,
          ),
      };
    }

    return {
      question:
        sanitizeQuestion(question),

      questionNumber:
        question.questionNumber,

      needsGeneration: false,

      interviewProgress:
        buildProgress(
          interview,
          question.questionNumber,
        ),
    };
  };

// ============================================================
// GET NEXT QUESTION
// ============================================================

const getNextQuestion = async (
  userId,
  interviewId,
) => {
  const interview =
    await getOwnedInterview(
      userId,
      interviewId,
    );

  if (
    interview.status !==
    "in-progress"
  ) {
    throw new Error(
      `Interview is not in progress. Current status: ${interview.status}`,
    );
  }

  await synchronizeInterviewCounters(
    interview,
  );

  const refreshed =
    await Interview.findById(
      interview._id,
    );

  if (!refreshed) {
    throw new Error(
      "Interview not found",
    );
  }

  const totalQuestions =
    clamp(
      refreshed.totalQuestions,
      1,
      MAX_QUESTIONS,
    );

  const currentNumber =
    Number(
      refreshed.currentQuestionNumber,
    ) || 1;

  const nextNumber =
    currentNumber + 1;

  if (
    nextNumber > totalQuestions
  ) {
    return {
      question: null,

      questionNumber:
        currentNumber,

      needsGeneration: false,

      isLastQuestion: true,

      interviewProgress:
        buildProgress(
          refreshed,
          currentNumber,
        ),
    };
  }

  const nextQuestion =
    await Question.findOne({
      interview: interviewId,

      questionNumber:
        nextNumber,
    }).lean();

  if (!nextQuestion) {
    return {
      question: null,

      questionNumber:
        nextNumber,

      needsGeneration: true,

      interviewProgress:
        buildProgress(
          refreshed,
          nextNumber,
        ),
    };
  }

  refreshed.currentQuestionNumber =
    nextQuestion.questionNumber;

  refreshed.lastActivityAt =
    new Date();

  await refreshed.save();

  return {
    question:
      sanitizeQuestion(
        nextQuestion,
      ),

    questionNumber:
      nextQuestion.questionNumber,

    needsGeneration: false,

    isLastQuestion:
      nextQuestion.questionNumber ===
      totalQuestions,

    interviewProgress:
      buildProgress(
        refreshed,
        nextQuestion.questionNumber,
      ),
  };
};

// ============================================================
// GET PREVIOUS QUESTION
// ============================================================

const getPreviousQuestion =
  async (
    userId,
    interviewId,
  ) => {
    const interview =
      await getOwnedInterview(
        userId,
        interviewId,
      );

    const currentNumber =
      Number(
        interview.currentQuestionNumber,
      ) || 1;

    if (currentNumber <= 1) {
      return {
        question: null,

        questionNumber: 1,

        hasPrevious: false,

        interviewProgress:
          buildProgress(
            interview,
            1,
          ),
      };
    }

    const previousNumber =
      currentNumber - 1;

    const question =
      await Question.findOne({
        interview: interviewId,

        questionNumber:
          previousNumber,
      }).lean();

    if (!question) {
      return {
        question: null,

        questionNumber:
          previousNumber,

        hasPrevious: true,

        interviewProgress:
          buildProgress(
            interview,
            previousNumber,
          ),
      };
    }

    interview.currentQuestionNumber =
      previousNumber;

    interview.lastActivityAt =
      new Date();

    await interview.save();

    return {
      question:
        sanitizeQuestion(question),

      questionNumber:
        previousNumber,

      hasPrevious:
        previousNumber > 1,

      interviewProgress:
        buildProgress(
          interview,
          previousNumber,
        ),
    };
  };

// ============================================================
// SELECT QUESTION
// ============================================================

const selectQuestion =
  async (
    userId,
    interviewId,
    questionNumber,
  ) => {
    const interview =
      await getOwnedInterview(
        userId,
        interviewId,
      );

    const number =
      Number(questionNumber);

    if (
      !Number.isInteger(number) ||
      number < 1 ||
      number >
        interview.totalQuestions
    ) {
      throw new Error(
        "Invalid question number",
      );
    }

    const question =
      await Question.findOne({
        interview: interviewId,

        questionNumber:
          number,
      }).lean();

    if (!question) {
      throw new Error(
        "Question not found",
      );
    }

    interview.currentQuestionNumber =
      number;

    interview.lastActivityAt =
      new Date();

    await interview.save();

    return {
      question:
        sanitizeQuestion(question),

      questionNumber:
        number,

      interviewProgress:
        buildProgress(
          interview,
          number,
        ),
    };
  };

// ============================================================
// GENERATE INTERVIEW QUESTION
// ============================================================

const generateInterviewQuestion =
  async (
    userId,
    interviewId,
  ) => {
    const interview =
      await getOwnedInterview(
        userId,
        interviewId,
      );

    if (
      interview.status !==
      "in-progress"
    ) {
      throw new Error(
        `Interview is not in progress. Current status: ${interview.status}`,
      );
    }

    await synchronizeInterviewCounters(
      interview,
    );

    const refreshedInterview =
      await Interview.findById(
        interview._id,
      );

    if (!refreshedInterview) {
      throw new Error(
        "Interview not found after synchronization",
      );
    }

    const targetQuestions =
      clamp(
        refreshedInterview.totalQuestions,
        1,
        MAX_QUESTIONS,
      );

    // ----------------------------------------------------------
    // COMPLETION
    // ----------------------------------------------------------

    if (
      refreshedInterview.completedQuestions >=
      targetQuestions
    ) {
      return {
        question: null,

        needsGeneration: false,

        interviewProgress:
          buildProgress(
            refreshedInterview,
            refreshedInterview.currentQuestionNumber,
          ),
      };
    }

    // ----------------------------------------------------------
    // NEVER CREATE DUPLICATE QUESTION
    // ----------------------------------------------------------

    const existingQuestion =
      await Question.findOne({
        interview: interviewId,

        questionNumber:
          refreshedInterview
            .generatedQuestions + 1,
      }).lean();

    if (existingQuestion) {
      refreshedInterview.currentQuestionNumber =
        existingQuestion.questionNumber;

      refreshedInterview.lastActivityAt =
        new Date();

      await refreshedInterview.save();

      return {
        question:
          sanitizeQuestion(
            existingQuestion,
          ),

        provider:
          existingQuestion
            ?.generation?.provider ||
          null,

        model:
          existingQuestion
            ?.generation?.model ||
          null,

        interviewProgress:
          buildProgress(
            refreshedInterview,
            existingQuestion.questionNumber,
          ),
      };
    }

    // ----------------------------------------------------------
    // NEXT QUESTION NUMBER
    // ----------------------------------------------------------

    const nextQuestionNumber =
      Number(
        refreshedInterview.generatedQuestions,
      ) + 1;

    if (
      nextQuestionNumber >
      targetQuestions
    ) {
      return {
        question: null,

        needsGeneration: false,

        interviewProgress:
          buildProgress(
            refreshedInterview,
            refreshedInterview.currentQuestionNumber,
          ),
      };
    }

    debug(
      "Generating next question",
      {
        interviewId:
          String(interviewId),

        nextQuestionNumber,

        targetQuestions,

        completedQuestions:
          refreshedInterview.completedQuestions,

        answeredQuestions:
          refreshedInterview.answeredQuestions,

        skippedQuestions:
          refreshedInterview.skippedQuestions,
      },
    );

    // ----------------------------------------------------------
    // AI AGENT
    // ----------------------------------------------------------

    const result =
      await generateNextQuestion(
        userId,
        interviewId,
      );

    if (
      !result ||
      !result.question
    ) {
      throw new Error(
        "AI interviewer failed to generate a question",
      );
    }

    const question =
      result.question;

    const safeQuestion =
      sanitizeQuestion(question);

    if (
      !safeQuestion
    ) {
      throw new Error(
        "Generated question is invalid",
      );
    }

    // ----------------------------------------------------------
    // ENSURE QUESTION NUMBER
    // ----------------------------------------------------------

    if (
      !safeQuestion.questionNumber
    ) {
      safeQuestion.questionNumber =
        nextQuestionNumber;
    }

    refreshedInterview.currentQuestionNumber =
      safeQuestion.questionNumber;

    refreshedInterview.lastActivityAt =
      new Date();

    await refreshedInterview.save();

    return {
      ...result,

      question:
        safeQuestion,

      interviewProgress:
        buildProgress(
          refreshedInterview,
          safeQuestion.questionNumber,
        ),
    };
  };

// ============================================================
// COMPLETE INTERVIEW
// ============================================================

const completeInterview =
  async (
    userId,
    interviewId,
  ) => {
    const interview =
      await getOwnedInterview(
        userId,
        interviewId,
      );

    if (
      interview.status ===
      "completed"
    ) {
      return {
        interview,

        alreadyCompleted:
          true,
      };
    }

    if (
      interview.status !==
      "in-progress"
    ) {
      throw new Error(
        `Interview is not in progress. Current status: ${interview.status}`,
      );
    }

    const questions =
      await Question.find({
        interview: interviewId,
      })
        .sort({
          questionNumber: 1,
        })
        .lean();

    if (!questions.length) {
      throw new Error(
        "No questions found for this interview",
      );
    }

    const pendingQuestions =
      questions.filter(
        (question) =>
          question.status ===
          "pending",
      );

    if (
      pendingQuestions.length
    ) {
      throw new Error(
        "All configured questions must be answered or skipped before completing the interview",
      );
    }

    const allEvaluations =
      await Evaluation.find({
        interview: interviewId,
      })
        .sort({
          createdAt: 1,
        })
        .lean();

    const currentEvaluations =
      getLatestEvaluations(
        allEvaluations,
      );

    const answeredQuestions =
      questions.filter(
        (question) =>
          question.status ===
          "answered",
      );

    const answeredIds =
      new Set(
        answeredQuestions.map(
          (question) =>
            question._id.toString(),
        ),
      );

    const missingEvaluations =
      answeredQuestions.filter(
        (question) => {
          const questionId =
            question._id.toString();

          return !currentEvaluations.some(
            (evaluation) =>
              evaluation?.question &&
              evaluation.question.toString() ===
                questionId,
          );
        },
      );

    if (
      missingEvaluations.length
    ) {
      throw new Error(
        "All answered questions must be evaluated before completing the interview",
      );
    }

    const filteredCurrentEvaluations =
      currentEvaluations.filter(
        (evaluation) =>
          evaluation?.question &&
          answeredIds.has(
            evaluation.question.toString(),
          ),
      );

    const overallScore =
      calculateCurrentScore(
        filteredCurrentEvaluations,
      );

    if (
      overallScore === null &&
      answeredQuestions.length > 0
    ) {
      throw new Error(
        "Unable to calculate interview score",
      );
    }

    const originalEvaluations =
      getOriginalEvaluations(
        allEvaluations,
      );

    const originalScore =
      calculateOriginalScore(
        originalEvaluations.filter(
          (evaluation) =>
            evaluation?.question &&
            answeredIds.has(
              evaluation.question.toString(),
            ),
        ),
      );

    const levelData =
      calculateCandidateLevel({
        currentEvaluations:
          filteredCurrentEvaluations,

        questions,
      });

    const skippedQuestions =
      questions.filter(
        (question) =>
          question.status ===
          "skipped",
      );

    interview.answeredQuestions =
      answeredQuestions.length;

    interview.skippedQuestions =
      skippedQuestions.length;

    interview.completedQuestions =
      Math.min(
        interview.answeredQuestions +
          interview.skippedQuestions,
        interview.totalQuestions,
      );

    interview.generatedQuestions =
      Math.min(
        questions.length,
        MAX_QUESTIONS,
      );

    interview.currentQuestionNumber =
      Math.max(
        1,
        Math.min(
          questions.length,
          interview.totalQuestions,
        ),
      );

    interview.currentScore =
      overallScore;

    interview.overallScore =
      overallScore;

    if (
      interview.originalScore ===
        null &&
      originalScore !== null
    ) {
      interview.originalScore =
        originalScore;
    }

    interview.estimatedCandidateLevel =
      levelData.level;

    interview.candidateLevelScore =
      levelData.score;

    interview.candidateLevelConfidence =
      levelData.confidence;

    if (
      !Array.isArray(
        interview.scoreHistory,
      )
    ) {
      interview.scoreHistory =
        [];
    }

    const currentVersion =
      Number(
        interview.scoreVersion,
      ) || 0;

    const nextVersion =
      currentVersion + 1;

    interview.scoreVersion =
      nextVersion;

    interview.scoreHistory.push({
      version:
        nextVersion,

      score:
        overallScore,

      reason:
        "final-calculation",

      changedQuestionId:
        null,

      evaluatedAt:
        new Date(),
    });

    interview.status =
      "completed";

    interview.completedAt =
      new Date();

    interview.lastActivityAt =
      new Date();

    interview.exitReason =
      "completed";

    await interview.save();

    debug(
      "Interview completed",
      {
        interviewId:
          String(interview._id),

        totalQuestions:
          interview.totalQuestions,

        generatedQuestions:
          interview.generatedQuestions,

        answeredQuestions:
          interview.answeredQuestions,

        skippedQuestions:
          interview.skippedQuestions,

        completedQuestions:
          interview.completedQuestions,
      },
    );

    return {
      interview,

      totalQuestions:
        interview.totalQuestions,

      generatedQuestions:
        interview.generatedQuestions,

      completedQuestions:
        interview.completedQuestions,

      answeredQuestions:
        interview.answeredQuestions,

      skippedQuestions:
        interview.skippedQuestions,

      originalScore:
        interview.originalScore,

      currentScore:
        interview.currentScore,

      overallScore:
        interview.currentScore,

      candidateLevel:
        interview.estimatedCandidateLevel,

      candidateLevelConfidence:
        interview.candidateLevelConfidence,

      evaluations:
        filteredCurrentEvaluations,
    };
  };

// ============================================================
// CANCEL INTERVIEW
// ============================================================

const cancelInterview =
  async (
    userId,
    interviewId,
    exitReason = "user-exit",
  ) => {
    const interview =
      await getOwnedInterview(
        userId,
        interviewId,
      );

    if (
      interview.status ===
      "completed"
    ) {
      throw new Error(
        "Completed interview cannot be cancelled",
      );
    }

    if (
      interview.status ===
      "cancelled"
    ) {
      throw new Error(
        "Interview is already cancelled",
      );
    }

    if (
      !ALLOWED_EXIT_REASONS.includes(
        exitReason,
      )
    ) {
      throw new Error(
        "Invalid exit reason",
      );
    }

    interview.status =
      "cancelled";

    interview.exitReason =
      exitReason;

    interview.cancelledAt =
      new Date();

    interview.lastActivityAt =
      new Date();

    await interview.save();

    debug(
      "Interview cancelled",
      {
        interviewId:
          String(interview._id),

        exitReason,
      },
    );

    return interview;
  };

// ============================================================
// GET INTERVIEW PROGRESS
// ============================================================

const getInterviewProgress =
  async (
    userId,
    interviewId,
  ) => {
    const interview =
      await getOwnedInterview(
        userId,
        interviewId,
      );

    await synchronizeInterviewCounters(
      interview,
    );

    const refreshedInterview =
      await Interview.findById(
        interview._id,
      ).lean();

    if (
      !refreshedInterview
    ) {
      throw new Error(
        "Interview not found",
      );
    }

    const [
      questionCount,
      answeredCount,
      skippedCount,
      evaluatedCount,
    ] = await Promise.all([
      Question.countDocuments({
        interview: interviewId,
      }),

      Question.countDocuments({
        interview: interviewId,

        status: "answered",
      }),

      Question.countDocuments({
        interview: interviewId,

        status: "skipped",
      }),

      Evaluation.countDocuments({
        interview: interviewId,

        status: "completed",
      }),
    ]);

    const pendingQuestion =
      await Question.findOne({
        interview: interviewId,

        status: "pending",
      })
        .sort({
          questionNumber: 1,
        })
        .lean();

    const totalQuestions =
      clamp(
        refreshedInterview.totalQuestions,
        1,
        MAX_QUESTIONS,
      );

    const completedCount =
      Math.min(
        answeredCount +
          skippedCount,
        totalQuestions,
      );

    const progressPercentage =
      totalQuestions > 0
        ? Math.min(
            100,
            Math.round(
              (
                completedCount /
                totalQuestions
              ) * 100,
            ),
          )
        : 0;

    const evaluationPercentage =
      answeredCount > 0
        ? Math.min(
            100,
            Math.round(
              (
                Math.min(
                  evaluatedCount,
                  answeredCount,
                ) /
                answeredCount
              ) * 100,
            ),
          )
        : 0;

    const currentQuestionNumber =
      pendingQuestion?.questionNumber ??
      refreshedInterview.currentQuestionNumber ??
      Math.min(
        completedCount + 1,
        totalQuestions,
      );

    return {
      interviewId,

      status:
        refreshedInterview.status,

      totalQuestions,

      maximumQuestions:
        MAX_QUESTIONS,

      generatedQuestions:
        questionCount,

      answeredQuestions:
        answeredCount,

      skippedQuestions:
        skippedCount,

      completedQuestions:
        completedCount,

      evaluatedQuestions:
        Math.min(
          evaluatedCount,
          answeredCount,
        ),

      remainingQuestions:
        Math.max(
          totalQuestions -
            completedCount,
          0,
        ),

      progressPercentage,

      evaluationPercentage,

      currentQuestion:
        currentQuestionNumber,

      currentQuestionNumber,

      currentDifficulty:
        refreshedInterview.currentDifficulty,

      difficultyMode:
        refreshedInterview.difficulty,

      skillMode:
        refreshedInterview.skillMode,

      technologies:
        refreshedInterview.technologies,

      originalScore:
        refreshedInterview.originalScore,

      currentScore:
        refreshedInterview.currentScore,

      overallScore:
        refreshedInterview.overallScore,

      estimatedCandidateLevel:
        refreshedInterview
          .estimatedCandidateLevel,

      candidateLevelConfidence:
        refreshedInterview
          .candidateLevelConfidence,

      estimatedExperienceLevel:
        refreshedInterview
          .estimatedExperienceLevel,

      experienceConfidence:
        refreshedInterview
          .experienceConfidence,

      exitReason:
        refreshedInterview.exitReason,

      interviewCompleted:
        refreshedInterview.status ===
        "completed",

      currentQuestionData:
        pendingQuestion
          ? sanitizeQuestion(
              pendingQuestion,
            )
          : null,
    };
  };

// ============================================================
// GET INTERVIEW REPORT
// ============================================================

const getInterviewReport =
  async (
    userId,
    interviewId,
  ) => {
    const interview =
      await getOwnedInterview(
        userId,
        interviewId,
      );

    const questions =
      await Question.find({
        interview: interviewId,
      })
        .sort({
          questionNumber: 1,
        })
        .lean();

    const evaluations =
      await Evaluation.find({
        interview: interviewId,
      })
        .sort({
          createdAt: 1,
        })
        .lean();

    return {
      interview,

      summary: {
        originalScore:
          interview.originalScore,

        currentScore:
          interview.currentScore,

        overallScore:
          interview.overallScore,

        candidateLevel:
          interview.estimatedCandidateLevel,

        candidateLevelConfidence:
          interview.candidateLevelConfidence,

        totalQuestions:
          interview.totalQuestions,

        generatedQuestions:
          interview.generatedQuestions,

        answeredQuestions:
          interview.answeredQuestions,

        skippedQuestions:
          interview.skippedQuestions,

        completedQuestions:
          interview.completedQuestions,
      },

      technologyScores:
        interview.technologyScores ||
        [],

      analysis:
        interview.analysis ||
        null,

      questions:
        questions.map(
          sanitizeQuestion,
        ),

      evaluations,
    };
  };

// ============================================================
// GENERATE REPORT
// ============================================================

const generateInterviewReport =
  async (
    userId,
    interviewId,
  ) => {
    const interview =
      await getOwnedInterview(
        userId,
        interviewId,
      );

    if (
      interview.status !==
        "completed" &&
      interview.status !==
        "cancelled"
    ) {
      throw new Error(
        "Interview must be completed or cancelled before generating a report",
      );
    }

    interview.reportStatus =
      "generated";

    interview.reportGeneratedAt =
      new Date();

    await interview.save();

    return getInterviewReport(
      userId,
      interviewId,
    );
  };

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  // Interview
  createInterview,
  getUserInterviews,
  getInterviewById,

  startInterview,
  pauseInterview,
  resumeInterview,

  // Questions
  getInterviewQuestions,
  generateInterviewQuestion,

  getCurrentQuestion,
  getNextQuestion,
  getPreviousQuestion,
  selectQuestion,

  // Completion / cancellation
  completeInterview,
  cancelInterview,

  // Progress
  getInterviewProgress,

  // Reports
  getInterviewReport,
  generateInterviewReport,

  // Utility
  synchronizeInterviewCounters,
};
