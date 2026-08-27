const Interview = require("../../model/interview.model");
const Question = require("../../model/question.model");
const Answer = require("../../model/answer.model");
const Evaluation = require("../../model/evaluation.model");
const { generateAIResponse } = require("../ai/ai.gateway");

// ============================================================
// CONSTANTS
// ============================================================

const MAX_QUESTIONS = 100;
const MAX_GENERATION_ATTEMPTS = 3;
const HISTORY_LIMIT = 15;

const DIFFICULTIES = ["very-easy", "easy", "medium", "hard", "very-hard"];

const INTERVIEW_DIFFICULTIES = ["auto", ...DIFFICULTIES];

const ALLOWED_CATEGORIES = [
  "technical",
  "behavioral",
  "coding",
  "debugging",
  "system-design",
  "scenario",
  "dsa",
  "general",
];

const LEVELS = ["beginner", "knight", "conqueror"];

const PROMPT_VERSION = "interview-agent-v7";

// ============================================================
// DEBUG
// ============================================================

const debug = (message, data = null) => {
  console.log(`[INTERVIEW AGENT] ${message}`);

  if (data !== null) {
    console.log(data);
  }
};

const debugError = (message, error = null) => {
  console.error(`[INTERVIEW AGENT ERROR] ${message}`);

  if (error) {
    console.error(error?.stack || error?.message || error);
  }
};

// ============================================================
// HELPERS
// ============================================================

const normalizeText = (value) => {
  if (typeof value !== "string") {
    return "";
  }

  return value.toLowerCase().replace(/\s+/g, " ").trim();
};

const normalizeArray = (value, max = 20) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return [
    ...new Set(
      value
        .filter((item) => typeof item === "string" && item.trim().length > 0)
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

const roundScore = (value) => {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return null;
  }

  return Math.round(number * 100) / 100;
};

// ============================================================
// DIFFICULTY HELPERS
// ============================================================

const difficultyValue = (difficulty) => {
  const index = DIFFICULTIES.indexOf(difficulty);

  return index >= 0 ? index + 1 : 3;
};

const difficultyFromValue = (value) => {
  const safeValue = Math.round(clamp(value, 1, DIFFICULTIES.length));

  return DIFFICULTIES[safeValue - 1];
};

// ============================================================
// SCORE HELPERS
// ============================================================

const getAverageScore = (evaluations = []) => {
  if (!Array.isArray(evaluations) || evaluations.length === 0) {
    return null;
  }

  const scores = evaluations
    .map((evaluation) => Number(evaluation?.overallScore))
    .filter((score) => Number.isFinite(score));

  if (!scores.length) {
    return null;
  }

  const total = scores.reduce((sum, score) => sum + score, 0);

  return roundScore(total / scores.length);
};

const getRecentAverage = (evaluations = [], count = 3) => {
  if (!Array.isArray(evaluations) || evaluations.length === 0) {
    return null;
  }

  const safeCount = Math.max(1, Number(count) || 1);

  return getAverageScore(evaluations.slice(-safeCount));
};

const getScoreTrend = (evaluations = []) => {
  if (!Array.isArray(evaluations) || evaluations.length < 2) {
    return "insufficient-data";
  }

  const recent = evaluations.slice(-5);

  const scores = recent
    .map((item) => Number(item?.overallScore))
    .filter((score) => Number.isFinite(score));

  if (scores.length < 2) {
    return "insufficient-data";
  }

  const first = scores[0];
  const last = scores[scores.length - 1];

  const difference = last - first;

  if (difference >= 8) {
    return "improving";
  }

  if (difference <= -8) {
    return "declining";
  }

  return "stable";
};

// ============================================================
// LATEST EVALUATION PER QUESTION
// ============================================================

const getLatestEvaluations = (evaluations = []) => {
  const latestMap = new Map();

  if (!Array.isArray(evaluations)) {
    return [];
  }

  for (const evaluation of evaluations) {
    const questionId = evaluation?.question
      ? evaluation.question.toString()
      : null;

    if (!questionId) {
      continue;
    }

    const existing = latestMap.get(questionId);

    if (!existing) {
      latestMap.set(questionId, evaluation);
      continue;
    }

    const existingVersion = Number(existing?.version) || 1;

    const currentVersion = Number(evaluation?.version) || 1;

    if (currentVersion > existingVersion) {
      latestMap.set(questionId, evaluation);
      continue;
    }

    if (
      currentVersion === existingVersion &&
      new Date(evaluation?.createdAt || 0) > new Date(existing?.createdAt || 0)
    ) {
      latestMap.set(questionId, evaluation);
    }
  }

  return Array.from(latestMap.values()).sort(
    (a, b) => new Date(a?.createdAt || 0) - new Date(b?.createdAt || 0),
  );
};

// ============================================================
// CANDIDATE LEVEL
// ============================================================

const estimateCandidateLevel = ({ evaluations = [], questions = [] }) => {
  if (!evaluations.length) {
    return {
      level: null,
      score: null,
      confidence: null,
    };
  }

  const averageScore = getAverageScore(evaluations);

  if (averageScore === null) {
    return {
      level: null,
      score: null,
      confidence: null,
    };
  }

  let hardAttempted = 0;
  let veryHardAttempted = 0;
  let strongHardPerformance = 0;

  const evaluationMap = new Map();

  for (const evaluation of evaluations) {
    if (evaluation?.question) {
      evaluationMap.set(evaluation.question.toString(), evaluation);
    }
  }

  for (const question of questions) {
    if (!question?._id) {
      continue;
    }

    if (question.difficulty === "hard") {
      hardAttempted += 1;
    }

    if (question.difficulty === "very-hard") {
      veryHardAttempted += 1;
    }

    if (question.difficulty === "hard" || question.difficulty === "very-hard") {
      const evaluation = evaluationMap.get(question._id.toString());

      if (evaluation && Number(evaluation.overallScore) >= 75) {
        strongHardPerformance += 1;
      }
    }
  }

  let level = "beginner";

  if (averageScore >= 85 && hardAttempted >= 3 && strongHardPerformance >= 2) {
    level = "conqueror";
  } else if (
    averageScore >= 60 &&
    (hardAttempted >= 1 || veryHardAttempted >= 1 || evaluations.length >= 5)
  ) {
    level = "knight";
  }

  let confidence = 30 + evaluations.length * 6;

  if (hardAttempted >= 2) {
    confidence += 10;
  }

  if (strongHardPerformance >= 2) {
    confidence += 10;
  }

  if (veryHardAttempted >= 1) {
    confidence += 5;
  }

  confidence = clamp(confidence, 30, 95);

  return {
    level: LEVELS.includes(level) ? level : "beginner",
    score: averageScore,
    confidence,
  };
};

// ============================================================
// TOPICS
// ============================================================

const extractWeakTopics = (evaluations = []) => {
  const topics = [];

  for (const evaluation of evaluations) {
    if (Array.isArray(evaluation?.weaknesses)) {
      topics.push(...evaluation.weaknesses);
    }

    if (Array.isArray(evaluation?.mistakes)) {
      topics.push(...evaluation.mistakes);
    }

    if (Array.isArray(evaluation?.studyTopics)) {
      for (const item of evaluation.studyTopics) {
        if (item && typeof item.topic === "string") {
          topics.push(item.topic);
        }
      }
    }
  }

  return [
    ...new Set(
      topics
        .filter((item) => typeof item === "string" && item.trim())
        .map((item) => item.trim()),
    ),
  ].slice(-20);
};

const extractStrongTopics = (evaluations = []) => {
  const topics = [];

  for (const evaluation of evaluations) {
    if (Array.isArray(evaluation?.strengths)) {
      topics.push(...evaluation.strengths);
    }
  }

  return [
    ...new Set(
      topics
        .filter((item) => typeof item === "string" && item.trim())
        .map((item) => item.trim()),
    ),
  ].slice(-20);
};

// ============================================================
// TECHNOLOGY PERFORMANCE
// ============================================================

const getTechnologyPerformance = ({ evaluations = [], questions = [] }) => {
  const evaluationMap = new Map();

  for (const evaluation of evaluations) {
    if (evaluation?.question) {
      evaluationMap.set(evaluation.question.toString(), evaluation);
    }
  }

  const performance = new Map();

  for (const question of questions) {
    const skill =
      typeof question?.skill === "string" ? question.skill.trim() : "";

    if (!skill) {
      continue;
    }

    if (!performance.has(skill)) {
      performance.set(skill, {
        technology: skill,
        scores: [],
        questions: 0,
      });
    }

    const item = performance.get(skill);

    item.questions += 1;

    const evaluation = evaluationMap.get(question._id.toString());

    if (evaluation && Number.isFinite(Number(evaluation.overallScore))) {
      item.scores.push(Number(evaluation.overallScore));
    }
  }

  return Array.from(performance.values()).map((item) => ({
    technology: item.technology,
    score: item.scores.length
      ? roundScore(
          item.scores.reduce((sum, score) => sum + score, 0) /
            item.scores.length,
        )
      : null,
    questions: item.questions,
  }));
};

// ============================================================
// CHOOSE NEXT TECHNOLOGY
// ============================================================

const chooseTargetSkill = ({ interview, questions = [], evaluations = [] }) => {
  const technologies = normalizeArray(interview?.technologies, 30);

  if (!technologies.length) {
    return null;
  }

  const performance = getTechnologyPerformance({
    evaluations,
    questions,
  });

  const performanceMap = new Map(
    performance.map((item) => [normalizeText(item.technology), item]),
  );

  // First cover every technology.
  const uncovered = technologies.filter((technology) => {
    const askedCount = questions.filter(
      (question) =>
        normalizeText(question?.skill) === normalizeText(technology),
    ).length;

    return askedCount === 0;
  });

  if (uncovered.length) {
    return uncovered[questions.length % uncovered.length];
  }

  // Then focus weakest.
  let weakest = null;

  for (const technology of technologies) {
    const item = performanceMap.get(normalizeText(technology));

    const score =
      item?.score === null || item?.score === undefined
        ? 50
        : Number(item.score);

    if (!weakest || score < weakest.score) {
      weakest = {
        technology,
        score,
      };
    }
  }

  return (
    weakest?.technology || technologies[questions.length % technologies.length]
  );
};

// ============================================================
// CATEGORY
// ============================================================

const determineCategory = ({ interview, questions = [], evaluations = [] }) => {
  const type = interview?.interviewType;

  if (type === "technical") {
    return "technical";
  }

  if (type === "behavioral") {
    return "behavioral";
  }

  if (type === "coding") {
    return "coding";
  }

  if (type === "debugging" || type === "technical-debugging") {
    return "debugging";
  }

  if (type === "system-design") {
    return "system-design";
  }

  if (type === "technical-coding") {
    return "coding";
  }

  if (type === "mixed") {
    const categories = [
      "technical",
      "coding",
      "debugging",
      "system-design",
      "behavioral",
    ];

    const recentCategories = questions
      .slice(-4)
      .map((question) => question?.category)
      .filter(Boolean);

    const recentAverage = getRecentAverage(evaluations, 3);

    if (recentAverage !== null && recentAverage < 45 && questions.length) {
      const lastCategory = questions[questions.length - 1]?.category;

      if (categories.includes(lastCategory)) {
        return lastCategory;
      }
    }

    const available = categories.filter(
      (category) => !recentCategories.includes(category),
    );

    if (available.length) {
      return available[questions.length % available.length];
    }

    return categories[questions.length % categories.length];
  }

  return "technical";
};

// ============================================================
// ADAPTIVE DIFFICULTY
// ============================================================

const determineNextDifficulty = ({
  interview,
  questions = [],
  evaluations = [],
}) => {
  const configured = interview?.difficulty || "auto";

  if (configured !== "auto" && INTERVIEW_DIFFICULTIES.includes(configured)) {
    return configured;
  }

  if (!evaluations.length) {
    return "medium";
  }

  const recentAverage = getRecentAverage(evaluations, 3);

  const trend = getScoreTrend(evaluations);

  if (recentAverage === null) {
    return "medium";
  }

  const previousQuestion = questions[questions.length - 1];

  const previousDifficulty =
    previousQuestion?.difficulty || interview?.currentDifficulty || "medium";

  let value = difficultyValue(previousDifficulty);

  if (recentAverage < 40) {
    value -= 1;
  } else if (recentAverage < 60) {
    value -= 1;
  } else if (recentAverage < 70) {
    // Maintain.
  } else if (recentAverage < 85) {
    if (trend === "improving") {
      value += 1;
    }
  } else {
    value += 1;
  }

  const previousValue = difficultyValue(previousDifficulty);

  if (Math.abs(value - previousValue) > 1) {
    value = previousValue + Math.sign(value - previousValue);
  }

  value = clamp(value, 1, DIFFICULTIES.length);

  return difficultyFromValue(value);
};

// ============================================================
// ADAPTIVE REASON
// ============================================================

const getAdaptiveReason = ({
  evaluations = [],
  currentDifficulty,
  nextDifficulty,
  questions = [],
}) => {
  if (!questions.length) {
    return "initial-question";
  }

  if (nextDifficulty !== currentDifficulty) {
    return;
    difficultyValue(nextDifficulty) > difficultyValue(currentDifficulty)
      ? "difficulty-increase"
      : "difficulty-decrease";
  }

  const recentAverage = getRecentAverage(evaluations, 3);

  if (recentAverage === null) {
    return "initial-question";
  }

  if (recentAverage >= 80) {
    return "strong-performance";
  }

  if (recentAverage < 50) {
    return "weak-performance";
  }

  return "skill-focus";
};

// ============================================================
// BUILD HISTORY
// ============================================================

const buildHistory = ({ questions = [], answers = [], evaluations = [] }) => {
  const answerMap = new Map();

  for (const answer of answers) {
    if (answer?.question) {
      answerMap.set(answer.question.toString(), answer);
    }
  }

  const latestEvaluations = getLatestEvaluations(evaluations);

  const evaluationMap = new Map();

  for (const evaluation of latestEvaluations) {
    if (evaluation?.question) {
      evaluationMap.set(evaluation.question.toString(), evaluation);
    }
  }

  return questions.map((question) => {
    const questionId = question._id.toString();

    const answer = answerMap.get(questionId);

    const evaluation = evaluationMap.get(questionId);

    return {
      questionNumber: question.questionNumber,

      question: question.question,

      category: question.category,

      difficulty: question.difficulty,

      skill: question.skill || null,

      expectedTopics: question.expectedTopics || [],

      answer: answer?.answerText || answer?.code || null,

      evaluation: evaluation
        ? {
            overallScore: evaluation.overallScore,

            correctnessScore: evaluation.correctnessScore,

            technicalScore: evaluation.technicalScore,

            communicationScore: evaluation.communicationScore,

            problemSolvingScore: evaluation.problemSolvingScore,
          }
        : null,
    };
  });
};

// ============================================================
// PREVIOUS QUESTION PROMPT
// ============================================================

const buildPreviousQuestionText = (history) => {
  if (!history.length) {
    return "No previous questions.";
  }

  return history
    .slice(-HISTORY_LIMIT)
    .map(
      (item) =>
        `Q${item.questionNumber} | ${item.category} | ${item.difficulty} | Skill: ${
          item.skill || "unspecified"
        } | ${item.question}`,
    )
    .join("\n");
};

// ============================================================
// JSON CLEANER
// ============================================================

const cleanAIJson = (content) => {
  if (typeof content !== "string") {
    return null;
  }

  const trimmed = content.trim();

  if (!trimmed) {
    return null;
  }

  try {
    return JSON.parse(trimmed);
  } catch (_) {
    // Continue.
  }

  const withoutFence = trimmed
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    return JSON.parse(withoutFence);
  } catch (_) {
    return null;
  }
};

// ============================================================
// VALIDATE AI QUESTION
// ============================================================

const validateQuestionData = ({
  data,
  expectedCategory,
  expectedDifficulty,
}) => {
  if (!data || typeof data !== "object") {
    throw new Error("AI returned an invalid question object");
  }

  // ==========================================================
  // QUESTION
  // ==========================================================

  if (typeof data.question !== "string" || data.question.trim().length < 5) {
    throw new Error("AI returned invalid question text");
  }

  if (data.question.trim().length > 5000) {
    throw new Error("AI question exceeds the maximum length");
  }

  // ==========================================================
  // CATEGORY
  // ==========================================================

  if (
    typeof data.category !== "string" ||
    !ALLOWED_CATEGORIES.includes(data.category)
  ) {
    throw new Error("AI returned invalid question category");
  }

  if (data.category !== expectedCategory) {
    throw new Error(
      `AI returned category ${data.category}, expected ${expectedCategory}`,
    );
  }

  // ==========================================================
  // DIFFICULTY
  // ==========================================================

  if (
    typeof data.difficulty !== "string" ||
    !DIFFICULTIES.includes(data.difficulty)
  ) {
    throw new Error("AI returned invalid difficulty");
  }

  if (data.difficulty !== expectedDifficulty) {
    throw new Error(
      `AI returned difficulty ${data.difficulty}, expected ${expectedDifficulty}`,
    );
  }

  // ==========================================================
  // EXPECTED TOPICS
  // ==========================================================

  if (
    data.expectedTopics !== undefined &&
    !Array.isArray(data.expectedTopics)
  ) {
    throw new Error("AI returned invalid expected topics");
  }

  // ==========================================================
  // EXPLANATION REQUIRED
  // ==========================================================

  if (typeof data.explanation !== "string" || !data.explanation.trim()) {
    throw new Error("AI returned no explanation. Explanation is required.");
  }

  // ==========================================================
  // SOLUTION REQUIRED
  // ==========================================================

  if (typeof data.solution !== "string" || !data.solution.trim()) {
    throw new Error("AI returned no solution. Solution is required.");
  }

  return true;
};

// ============================================================
// CATEGORY RULES
// ============================================================

const buildCategoryRules = (category) => {
  if (category === "coding" || category === "dsa") {
    return `
CODING / DSA RULES:

- Generate a genuine interview coding problem.
- Use a function-based problem.
- Include function signature.
- Include starter code.
- Include examples.
- Include constraints.
- Include hidden test cases.
- Provide idealAnswer internally.
- Provide explanation.
- Provide complete correct solution.
- Provide time and space complexity.
- Never put the solution in the candidate-facing question.
`;
  }

  if (category === "debugging") {
    return `
DEBUGGING RULES:

- Generate realistic intentionally broken code.
- The bug must be deterministic.
- Include buggyCode.
- Include bugDescription internally.
- Include expectedBehavior.
- Include hidden test cases.
- Provide idealAnswer internally.
- Provide explanation.
- Provide corrected solution.
- Explain the fix.
- Never expose internal bugDescription as hidden metadata.
`;
  }

  if (category === "system-design") {
    return `
SYSTEM DESIGN RULES:

- Ask one complete system-design problem.
- Include realistic scale.
- Include functional requirements.
- Include non-functional requirements.
- Include scalability.
- Include reliability.
- Include storage.
- Include caching where relevant.
- Include consistency considerations.
- Include observability.
- Include trade-offs.
- Provide idealAnswer internally.
- Provide explanation.
- Provide a detailed solution.
`;
  }

  if (category === "behavioral") {
    return `
BEHAVIORAL RULES:

- Ask one realistic behavioral interview question.
- Use a concrete scenario.
- Do not ask the candidate to self-rate.
- Provide idealAnswer internally.
- Provide explanation.
- Provide a strong example solution/response.
`;
  }

  if (category === "scenario") {
    return `
SCENARIO RULES:

- Ask one realistic engineering scenario.
- Require the candidate to explain decisions.
- Provide idealAnswer internally.
- Provide explanation.
- Provide an ideal solution/response.
`;
  }

  return `
TECHNICAL RULES:

- Ask one focused technical question.
- Test actual understanding.
- Do not ask multiple unrelated questions.
- Provide idealAnswer internally.
- Provide explanation.
- Provide a clear correct solution.
`;
};

// ============================================================
// SANITIZE QUESTION FOR CANDIDATE
// ============================================================

const sanitizeQuestionForCandidate = (question) => {
  if (!question) {
    return null;
  }

  const plain =
    typeof question?.toObject === "function" ? question.toObject() : question;

  const safe = {
    _id: plain._id,

    interview: plain.interview,

    questionNumber: plain.questionNumber,

    question: plain.question,

    category: plain.category,

    difficulty: plain.difficulty,

    skill: plain.skill || null,

    expectedTopics: Array.isArray(plain.expectedTopics)
      ? plain.expectedTopics
      : [],

    status: plain.status,

    isFollowUp: Boolean(plain.isFollowUp),

    createdAt: plain.createdAt,

    // ========================================================
    // EXPLANATION
    // ========================================================

    explanation: typeof plain.explanation === "string" ? plain.explanation : "",

    // ========================================================
    // SOLUTION
    // ========================================================

    solution: typeof plain.solution === "string" ? plain.solution : "",

    // ========================================================
    // COMPLEXITY
    // ========================================================

    complexity: {
      time:
        typeof plain?.complexity?.time === "string"
          ? plain.complexity.time
          : null,

      space:
        typeof plain?.complexity?.space === "string"
          ? plain.complexity.space
          : null,
    },
  };

  // ==========================================================
  // CODING
  // ==========================================================

  if (plain.category === "coding" || plain.category === "dsa") {
    safe.coding = {
      language: plain.coding?.language || null,

      functionName: plain.coding?.functionName || null,

      functionSignature: plain.coding?.functionSignature || null,

      starterCode: plain.coding?.starterCode || null,

      inputFormat: plain.coding?.inputFormat || null,

      outputFormat: plain.coding?.outputFormat || null,

      examples: Array.isArray(plain.coding?.examples)
        ? plain.coding.examples
        : [],

      constraints: Array.isArray(plain.coding?.constraints)
        ? plain.coding.constraints
        : [],
    };
  }

  // ==========================================================
  // DEBUGGING
  // ==========================================================

  if (plain.category === "debugging") {
    safe.debugging = {
      language: plain.debugging?.language || null,

      buggyCode: plain.debugging?.buggyCode || null,

      expectedBehavior: plain.debugging?.expectedBehavior || null,

      knownBugTypes: Array.isArray(plain.debugging?.knownBugTypes)
        ? plain.debugging.knownBugTypes
        : [],
    };
  }

  return safe;
};

// ============================================================
// GENERATE NEXT QUESTION
// ============================================================

const generateNextQuestion = async (userId, interviewId) => {
  const startedAt = Date.now();

  debug("Generation started", {
    userId: String(userId),

    interviewId: String(interviewId),
  });

  // ==========================================================
  // INTERVIEW
  // ==========================================================

  const interview = await Interview.findOne({
    _id: interviewId,
    user: userId,
  });

  if (!interview) {
    throw new Error("Interview not found");
  }

  if (interview.status !== "in-progress") {
    throw new Error(
      `Interview is not in progress. Current status: ${interview.status}`,
    );
  }

  // ==========================================================
  // TARGET
  // ==========================================================

  const targetQuestions = clamp(interview.totalQuestions, 1, MAX_QUESTIONS);

  // ==========================================================
  // QUESTIONS
  // ==========================================================

  let questions = await Question.find({
    interview: interviewId,
  })
    .sort({
      questionNumber: 1,
    })
    .lean();

  debug("Questions loaded", {
    generated: questions.length,

    target: targetQuestions,
  });

  // ==========================================================
  // TARGET ALREADY REACHED
  // ==========================================================

  if (questions.length >= targetQuestions) {
    const completedQuestions = Math.min(
      Number(interview.completedQuestions) || 0,
      targetQuestions,
    );

    const progressPercentage =
      targetQuestions > 0
        ? Math.round((completedQuestions / targetQuestions) * 100)
        : 0;

    return {
      question: null,

      questionNumber: targetQuestions,

      provider: null,

      model: null,

      interviewProgress: {
        currentQuestion:
          interview.currentQuestionNumber ||
          Math.min(completedQuestions + 1, targetQuestions),

        currentQuestionNumber:
          interview.currentQuestionNumber ||
          Math.min(completedQuestions + 1, targetQuestions),

        totalQuestions: targetQuestions,

        generatedQuestions: questions.length,

        completedQuestions,

        answeredQuestions: interview.answeredQuestions || 0,

        skippedQuestions: interview.skippedQuestions || 0,

        remainingQuestions: Math.max(targetQuestions - completedQuestions, 0),

        isLastQuestion: completedQuestions >= targetQuestions,

        percentage: progressPercentage,

        progressPercentage,

        interviewCompleted: interview.status === "completed",
      },

      adaptiveState: {
        difficulty: interview.currentDifficulty,

        category: null,

        skill: null,

        candidateLevel: interview.estimatedCandidateLevel || null,

        candidateLevelScore: interview.candidateLevelScore || null,

        candidateLevelConfidence: interview.candidateLevelConfidence || null,
      },
    };
  }

  // ==========================================================
  // EXISTING PENDING QUESTION
  // ==========================================================

  const pendingQuestion = await Question.findOne({
    interview: interviewId,
    status: "pending",
  })
    .sort({
      questionNumber: 1,
    })
    .lean();

  if (pendingQuestion) {
    const hasExplanation =
      typeof pendingQuestion.explanation === "string" &&
      pendingQuestion.explanation.trim().length > 0;

    const hasSolution =
      typeof pendingQuestion.solution === "string" &&
      pendingQuestion.solution.trim().length > 0;

    // ========================================================
    // OLD / INCOMPLETE QUESTION
    // ========================================================

    if (!hasExplanation || !hasSolution) {
      debug(
        "Found incomplete pending question. Removing it before regeneration.",
        {
          questionId: String(pendingQuestion._id),

          questionNumber: pendingQuestion.questionNumber,

          hasExplanation,

          hasSolution,
        },
      );

      await Question.deleteOne({
        _id: pendingQuestion._id,

        interview: interviewId,
      });

      // Refresh questions after deleting old record.
      questions = await Question.find({
        interview: interviewId,
      })
        .sort({
          questionNumber: 1,
        })
        .lean();

      debug("Incomplete pending question removed", {
        remainingQuestions: questions.length,
      });
    } else {
      // ======================================================
      // VALID PENDING QUESTION
      // ======================================================

      const questionNumber = pendingQuestion.questionNumber;

      const completedQuestions = Math.min(
        Number(interview.completedQuestions) || 0,
        targetQuestions,
      );

      const progressPercentage =
        targetQuestions > 0
          ? Math.round((completedQuestions / targetQuestions) * 100)
          : 0;

      debug("Returning existing valid pending question", {
        questionId: String(pendingQuestion._id),

        questionNumber,

        hasExplanation,

        hasSolution,
      });

      return {
        question: sanitizeQuestionForCandidate(pendingQuestion),

        questionNumber,

        provider: pendingQuestion?.generation?.provider || null,

        model: pendingQuestion?.generation?.model || null,

        interviewProgress: {
          currentQuestion: questionNumber,

          currentQuestionNumber: questionNumber,

          totalQuestions: targetQuestions,

          generatedQuestions: questions.length,

          completedQuestions,

          answeredQuestions: interview.answeredQuestions || 0,

          skippedQuestions: interview.skippedQuestions || 0,

          remainingQuestions: Math.max(targetQuestions - completedQuestions, 0),

          isLastQuestion: questionNumber === targetQuestions,

          percentage: progressPercentage,

          progressPercentage,
        },

        adaptiveState: {
          difficulty: pendingQuestion.difficulty,

          category: pendingQuestion.category,

          skill: pendingQuestion.skill || null,

          candidateLevel: interview.estimatedCandidateLevel || null,

          candidateLevelScore: interview.candidateLevelScore || null,

          candidateLevelConfidence: interview.candidateLevelConfidence || null,
        },
      };
    }
  }

  // ==========================================================
  // ANSWERS
  // ==========================================================

  const answers = await Answer.find({
    interview: interviewId,
    user: userId,
  })
    .sort({
      submittedAt: 1,
    })
    .lean();

  // ==========================================================
  // ALL EVALUATIONS
  // ==========================================================

  const allEvaluations = await Evaluation.find({
    interview: interviewId,
  })
    .sort({
      createdAt: 1,
    })
    .lean();

  const evaluations = getLatestEvaluations(allEvaluations);

  // ==========================================================
  // NEXT QUESTION NUMBER
  // ==========================================================

  const nextQuestionNumber = questions.length + 1;

  if (nextQuestionNumber > targetQuestions) {
    throw new Error("Interview has reached its configured question limit");
  }

  // ==========================================================
  // ADAPTIVE STATE
  // ==========================================================

  const nextDifficulty = determineNextDifficulty({
    interview,
    questions,
    evaluations,
  });

  const nextCategory = determineCategory({
    interview,
    questions,
    evaluations,
  });

  const targetSkill = chooseTargetSkill({
    interview,
    questions,
    evaluations,
  });

  const candidateLevel = estimateCandidateLevel({
    evaluations,
    questions,
  });

  const weakTopics = extractWeakTopics(evaluations);

  const strongTopics = extractStrongTopics(evaluations);

  const history = buildHistory({
    questions,
    answers,
    evaluations: allEvaluations,
  });

  const previousQuestionTexts = buildPreviousQuestionText(history);

  const previousDifficulty = interview.currentDifficulty || "medium";

  const adaptiveReason = getAdaptiveReason({
    evaluations,
    currentDifficulty: previousDifficulty,
    nextDifficulty,
    questions,
  });

  // ==========================================================
  // TECHNOLOGIES
  // ==========================================================

  const technologies = normalizeArray(interview.technologies, 30);

  const technologyText = technologies.length
    ? technologies.join(", ")
    : "No explicit technologies supplied.";

  // ==========================================================
  // PERFORMANCE
  // ==========================================================

  const averageScore = getAverageScore(evaluations);

  const recentAverage = getRecentAverage(evaluations, 3);

  const scoreTrend = getScoreTrend(evaluations);

  // ==========================================================
  // CATEGORY RULES
  // ==========================================================

  const categoryRules = buildCategoryRules(nextCategory);

  // ==========================================================
  // AI PROMPT
  // ==========================================================

  const systemPrompt = `
You are the senior AI engine for an adaptive technical interview platform.

Generate EXACTLY ONE interview question.

============================================================
INTERVIEW CONFIGURATION
============================================================

Role:
${interview.role}

Interview Type:
${interview.interviewType}

Difficulty Mode:
${interview.difficulty}

Target Difficulty:
${nextDifficulty}

Question Number:
${nextQuestionNumber}

Target Total Questions:
${targetQuestions}

Skill Mode:
${interview.skillMode}

Target Skill:
${targetSkill || "None"}

Available Technologies:
${technologyText}

============================================================
CURRENT PERFORMANCE
============================================================

Average Score:
${averageScore ?? "No evaluated answers"}

Recent Average:
${recentAverage ?? "No evaluated answers"}

Performance Trend:
${scoreTrend}

Candidate Level:
${candidateLevel.level || "Not enough evidence"}

Candidate Level Score:
${candidateLevel.score ?? "Not enough evidence"}

Candidate Level Confidence:
${candidateLevel.confidence ?? "Not enough evidence"}

Weak Areas:
${weakTopics.length ? weakTopics.join(", ") : "None confirmed"}

Strong Areas:
${strongTopics.length ? strongTopics.join(", ") : "None confirmed"}

============================================================
ADAPTIVE STATE
============================================================

Previous Difficulty:
${previousDifficulty}

Target Difficulty:
${nextDifficulty}

Adaptive Reason:
${adaptiveReason}

============================================================
PREVIOUS QUESTIONS
============================================================

${previousQuestionTexts}

============================================================
STRICT RULES
============================================================

1. Generate exactly ONE question.

2. Never repeat an earlier question.

3. Match the requested category exactly.

4. Match the requested difficulty exactly.

5. Match the requested skill when one is provided.

6. Use only explicitly available technologies.

7. Never invent technologies.

8. Never ask the candidate to self-declare level.

9. Use demonstrated performance for adaptation.

10. Skipped questions are NOT negative performance evidence.

11. Do not ask multiple unrelated questions.

12. Keep the question appropriate to the role.

13. Return internal ideal answers and solutions for server storage.

14. Never put the solution inside the candidate-facing question.

15. Explanation is REQUIRED.

16. Solution is REQUIRED.

17. Explanation MUST be a non-empty string.

18. Solution MUST be a non-empty string.

19. Never return null for explanation.

20. Never return null for solution.

21. Coding and DSA questions must include usable starter code.

22. Coding and DSA questions must include complete correct solution.

23. Debugging questions must contain intentionally broken code.

24. Debugging questions must include corrected solution.

25. System-design questions must include a detailed ideal architecture.

26. Behavioral questions must include a strong example response.

27. Return JSON only.

${categoryRules}

============================================================
OUTPUT
============================================================

Return ONLY valid JSON:

{
  "question": "string",
  "category": "${nextCategory}",
  "difficulty": "${nextDifficulty}",
  "skill": "string or null",
  "expectedTopics": ["string"],

  "idealAnswer": "string",

  "explanation": "string",

  "solution": "string",

  "complexity": {
    "time": "string or null",
    "space": "string or null"
  },

  "coding": {
    "language": "string or null",
    "functionName": "string or null",
    "functionSignature": "string or null",
    "starterCode": "string or null",
    "inputFormat": "string or null",
    "outputFormat": "string or null",
    "examples": [],
    "constraints": [],
    "testCases": []
  },

  "debugging": {
    "language": "string or null",
    "buggyCode": "string or null",
    "bugDescription": "string or null",
    "expectedBehavior": "string or null",
    "knownBugTypes": [],
    "testCases": []
  }
}
`;

  // ==========================================================
  // AI GENERATION
  // ==========================================================

  let result = null;
  let questionData = null;
  let lastGenerationError = null;

  for (let attempt = 1; attempt <= MAX_GENERATION_ATTEMPTS; attempt += 1) {
    try {
      debug(`AI generation attempt ${attempt}/${MAX_GENERATION_ATTEMPTS}`, {
        questionNumber: nextQuestionNumber,

        category: nextCategory,

        difficulty: nextDifficulty,

        skill: targetSkill,
      });

      result = await generateAIResponse({
        systemPrompt,

        messages: [
          {
            role: "user",
            content: "Generate the next interview question now.",
          },
        ],

        responseFormat: "json",
      });

      if (
        !result ||
        typeof result.content !== "string" ||
        !result.content.trim()
      ) {
        throw new Error("AI provider returned an empty response");
      }

      questionData = cleanAIJson(result.content);

      if (!questionData) {
        throw new Error("AI returned invalid JSON");
      }

      validateQuestionData({
        data: questionData,

        expectedCategory: nextCategory,

        expectedDifficulty: nextDifficulty,
      });

      // ========================================================
      // DUPLICATE PROTECTION
      // ========================================================

      const normalizedGenerated = normalizeText(questionData.question);

      const duplicate = questions.some(
        (existingQuestion) =>
          normalizeText(existingQuestion.question) === normalizedGenerated,
      );

      if (duplicate) {
        throw new Error("AI generated a duplicate question");
      }

      break;
    } catch (error) {
      lastGenerationError = error;

      debugError(`Generation attempt ${attempt} failed`, error);

      if (attempt === MAX_GENERATION_ATTEMPTS) {
        throw new Error(
          lastGenerationError?.message ||
            "Failed to generate interview question",
        );
      }
    }
  }

  // ==========================================================
  // FINAL VALIDATION
  // ==========================================================

  if (!questionData) {
    throw new Error("AI interviewer failed to generate a valid question");
  }

  const questionText = questionData.question.trim();

  // ==========================================================
  // FINAL SKILL
  // ==========================================================

  let skill =
    typeof questionData.skill === "string" && questionData.skill.trim()
      ? questionData.skill.trim()
      : targetSkill;

  if (
    targetSkill &&
    skill &&
    normalizeText(skill) !== normalizeText(targetSkill)
  ) {
    skill = targetSkill;
  }

  if (interview.skillMode === "specific" && technologies.length) {
    const validTechnology = technologies.find(
      (technology) => normalizeText(technology) === normalizeText(skill),
    );

    skill = validTechnology || targetSkill || technologies[0];
  }

  if (interview.skillMode === "all" && targetSkill) {
    skill = targetSkill;
  }

  // ==========================================================
  // EXPECTED TOPICS
  // ==========================================================

  const expectedTopics = normalizeArray(questionData.expectedTopics, 20);

  // ==========================================================
  // IDEAL ANSWER
  // ==========================================================

  const idealAnswer =
    typeof questionData.idealAnswer === "string" &&
    questionData.idealAnswer.trim()
      ? questionData.idealAnswer.trim().slice(0, 15000)
      : null;

  // ==========================================================
  // EXPLANATION
  // ==========================================================

  const explanation =
    typeof questionData.explanation === "string"
      ? questionData.explanation.trim().slice(0, 15000)
      : "";

  if (!explanation) {
    throw new Error("Generated question has no explanation");
  }

  // ==========================================================
  // SOLUTION
  // ==========================================================

  const solution =
    typeof questionData.solution === "string"
      ? questionData.solution.trim().slice(0, 30000)
      : "";

  if (!solution) {
    throw new Error("Generated question has no solution");
  }

  // ==========================================================
  // COMPLEXITY
  // ==========================================================

  const complexity = {
    time:
      typeof questionData?.complexity?.time === "string"
        ? questionData.complexity.time.trim().slice(0, 500)
        : null,

    space:
      typeof questionData?.complexity?.space === "string"
        ? questionData.complexity.space.trim().slice(0, 500)
        : null,
  };

  // ==========================================================
  // CODING
  // ==========================================================

  let coding = null;

  if (nextCategory === "coding" || nextCategory === "dsa") {
    const rawCoding = questionData.coding || {};

    coding = {
      language:
        typeof rawCoding.language === "string"
          ? rawCoding.language.trim().slice(0, 50)
          : null,

      functionName:
        typeof rawCoding.functionName === "string"
          ? rawCoding.functionName.trim().slice(0, 150)
          : null,

      functionSignature:
        typeof rawCoding.functionSignature === "string"
          ? rawCoding.functionSignature.trim().slice(0, 1000)
          : null,

      starterCode:
        typeof rawCoding.starterCode === "string"
          ? rawCoding.starterCode.slice(0, 30000)
          : null,

      inputFormat:
        typeof rawCoding.inputFormat === "string"
          ? rawCoding.inputFormat.trim().slice(0, 5000)
          : null,

      outputFormat:
        typeof rawCoding.outputFormat === "string"
          ? rawCoding.outputFormat.trim().slice(0, 5000)
          : null,

      examples: Array.isArray(rawCoding.examples)
        ? rawCoding.examples.slice(0, 10).map((item) => ({
            input:
              typeof item?.input === "string" ? item.input.slice(0, 5000) : "",

            output:
              typeof item?.output === "string"
                ? item.output.slice(0, 5000)
                : "",

            explanation:
              typeof item?.explanation === "string"
                ? item.explanation.slice(0, 5000)
                : "",
          }))
        : [],

      constraints: Array.isArray(rawCoding.constraints)
        ? normalizeArray(rawCoding.constraints, 30)
        : [],

      testCases: Array.isArray(rawCoding.testCases)
        ? rawCoding.testCases.slice(0, 100).map((item) => ({
            input: item?.input ?? null,

            expectedOutput: item?.expectedOutput ?? null,

            hidden: item?.hidden !== false,
          }))
        : [],
    };

    if (!coding.language || !coding.functionSignature || !coding.starterCode) {
      throw new Error("AI coding question is missing required fields");
    }

    if (!coding.testCases.length) {
      throw new Error("AI coding question contains no test cases");
    }
  }

  // ==========================================================
  // DEBUGGING
  // ==========================================================

  let debugging = null;

  if (nextCategory === "debugging") {
    const rawDebugging = questionData.debugging || {};

    debugging = {
      language:
        typeof rawDebugging.language === "string"
          ? rawDebugging.language.trim().slice(0, 50)
          : null,

      buggyCode:
        typeof rawDebugging.buggyCode === "string"
          ? rawDebugging.buggyCode.slice(0, 30000)
          : null,

      bugDescription:
        typeof rawDebugging.bugDescription === "string"
          ? rawDebugging.bugDescription.trim().slice(0, 5000)
          : null,

      expectedBehavior:
        typeof rawDebugging.expectedBehavior === "string"
          ? rawDebugging.expectedBehavior.trim().slice(0, 5000)
          : null,

      knownBugTypes: Array.isArray(rawDebugging.knownBugTypes)
        ? normalizeArray(rawDebugging.knownBugTypes, 20)
        : [],

      testCases: Array.isArray(rawDebugging.testCases)
        ? rawDebugging.testCases.slice(0, 100).map((item) => ({
            input: item?.input ?? null,

            expectedOutput: item?.expectedOutput ?? null,

            hidden: item?.hidden !== false,
          }))
        : [],
    };

    if (
      !debugging.language ||
      !debugging.buggyCode ||
      !debugging.expectedBehavior
    ) {
      throw new Error("AI debugging question is missing required fields");
    }

    if (!debugging.testCases.length) {
      throw new Error("AI debugging question contains no test cases");
    }
  }

  // ==========================================================
  // FINAL DEBUG
  // ==========================================================

  debug("FINAL GENERATED CONTENT", {
    question: questionText,

    explanationLength: explanation.length,

    solutionLength: solution.length,

    explanationPreview: explanation.slice(0, 150),

    solutionPreview: solution.slice(0, 150),
  });

  // ==========================================================
  // SAVE QUESTION
  // ==========================================================

  let question;

  try {
    question = await Question.create({
      interview: interviewId,

      questionNumber: nextQuestionNumber,

      question: questionText,

      category: nextCategory,

      difficulty: nextDifficulty,

      skill: skill || null,

      expectedTopics,

      status: "pending",

      // Internal answer.
      idealAnswer,

      // Candidate-facing explanation.
      explanation,

      // Candidate-facing solution.
      solution,

      complexity,

      coding,

      debugging,

      generation: {
        provider: result?.provider || null,

        model: result?.model || null,

        promptVersion: PROMPT_VERSION,

        generatedAt: new Date(),
      },

      adaptive: {
        generatedBecause: adaptiveReason,

        previousDifficulty,

        targetDifficulty: nextDifficulty,

        basedOnQuestionNumber: questions.length
          ? questions[questions.length - 1]?.questionNumber || null
          : null,

        basedOnScore: recentAverage,

        targetSkill: skill || null,
      },

      snapshotVersion: 1,
    });
  } catch (error) {
    debugError("Failed to save generated question", error);

    if (error?.code === 11000) {
      throw new Error("Question number already exists. Please retry.");
    }

    throw error;
  }

  // ==========================================================
  // UPDATE INTERVIEW
  // ==========================================================

  interview.generatedQuestions = nextQuestionNumber;

  // Current active question.
  interview.currentQuestionNumber = nextQuestionNumber;

  interview.currentDifficulty = nextDifficulty;

  if (candidateLevel.level) {
    interview.estimatedCandidateLevel = candidateLevel.level;

    interview.candidateLevelScore = candidateLevel.score;

    interview.candidateLevelConfidence = candidateLevel.confidence;
  }

  interview.lastActivityAt = new Date();

  await interview.save();

  // ==========================================================
  // REAL PROGRESS
  // ==========================================================

  const completedQuestions = Math.min(
    Number(interview.completedQuestions) || 0,
    targetQuestions,
  );

  const progressPercentage =
    targetQuestions > 0
      ? Math.round((completedQuestions / targetQuestions) * 100)
      : 0;

  const isLastQuestion = nextQuestionNumber === targetQuestions;

  const processingTimeMs = Date.now() - startedAt;

  // ==========================================================
  // DEBUG
  // ==========================================================

  debug("Question generated successfully", {
    questionId: String(question._id),

    questionNumber: nextQuestionNumber,

    category: question.category,

    difficulty: question.difficulty,

    skill: question.skill,

    provider: result?.provider || null,

    model: result?.model || null,

    explanationLength: explanation.length,

    solutionLength: solution.length,

    processingTimeMs,
  });

  // ==========================================================
  // RETURN
  // ==========================================================

  return {
    question: sanitizeQuestionForCandidate(question),

    questionNumber: nextQuestionNumber,

    provider: result?.provider || null,

    model: result?.model || null,

    interviewProgress: {
      currentQuestion: nextQuestionNumber,

      currentQuestionNumber: nextQuestionNumber,

      totalQuestions: targetQuestions,

      // Generated question count.
      generatedQuestions: interview.generatedQuestions,

      // Actual completed progress.
      completedQuestions,

      answeredQuestions: interview.answeredQuestions,

      skippedQuestions: interview.skippedQuestions,

      remainingQuestions: Math.max(targetQuestions - completedQuestions, 0),

      isLastQuestion,

      percentage: progressPercentage,

      progressPercentage,

      interviewCompleted: false,
    },

    adaptiveState: {
      difficulty: nextDifficulty,

      category: nextCategory,

      skill: skill || null,

      adaptiveReason,

      candidateLevel: candidateLevel.level,

      candidateLevelScore: candidateLevel.score,

      candidateLevelConfidence: candidateLevel.confidence,

      weakTopics,

      strongTopics,

      averageScore,

      recentAverage,

      performanceTrend: scoreTrend,
    },
  };
};

// ============================================================
// EXPORT
// ============================================================

module.exports = {
  generateNextQuestion,
};
