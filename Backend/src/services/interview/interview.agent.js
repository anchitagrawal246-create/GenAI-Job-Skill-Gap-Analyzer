const Interview = require("../../model/interview.model");
const Question = require("../../model/question.model");
const Answer = require("../../model/answer.model");
const Evaluation = require("../../model/evaluation.model");

const { generateAIResponse } = require("../ai/ai.gateway");

// ============================================================
// CONSTANTS
// ============================================================

const MAX_QUESTIONS = 100;

const ALLOWED_CATEGORIES = [
  "technical",
  "behavioral",
  "coding",
  "system-design",
  "general",
];

const ALLOWED_DIFFICULTIES = ["easy", "medium", "hard"];

const EXPERIENCE_LEVELS = ["fresher", "junior", "mid", "senior"];

// ============================================================
// HELPERS
// ============================================================

const normalizeText = (value) => {
  if (typeof value !== "string") {
    return "";
  }

  return value.toLowerCase().replace(/\s+/g, " ").trim();
};

const normalizeStringArray = (value, max = 10) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item) => typeof item === "string" && item.trim().length > 0)
    .map((item) => item.trim())
    .slice(0, max);
};

const clamp = (value, min, max) => {
  return Math.min(Math.max(Number(value) || 0, min), max);
};

// ============================================================
// AVERAGE SCORE
// ============================================================

const getAverageScore = (evaluations) => {
  if (!Array.isArray(evaluations) || evaluations.length === 0) {
    return null;
  }

  const scores = evaluations
    .map((item) => Number(item?.overallScore))
    .filter((score) => Number.isFinite(score));

  if (!scores.length) {
    return null;
  }

  const total = scores.reduce((sum, score) => sum + score, 0);

  return Math.round(total / scores.length);
};

// ============================================================
// RECENT AVERAGE
// ============================================================

const getRecentAverage = (evaluations, count = 3) => {
  if (!Array.isArray(evaluations) || evaluations.length === 0) {
    return null;
  }

  return getAverageScore(evaluations.slice(-count));
};

// ============================================================
// SCORE TREND
// ============================================================

const getScoreTrend = (evaluations) => {
  if (!Array.isArray(evaluations) || evaluations.length < 2) {
    return "insufficient-data";
  }

  const recent = evaluations.slice(-3);

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
// INITIAL DIFFICULTY
// ============================================================

const getInitialDifficulty = () => {
  return "medium";
};

// ============================================================
// DIFFICULTY VALUE
// ============================================================

const difficultyValue = (difficulty) => {
  if (difficulty === "easy") {
    return 1;
  }

  if (difficulty === "hard") {
    return 3;
  }

  return 2;
};

// ============================================================
// DIFFICULTY FROM VALUE
// ============================================================

const difficultyFromValue = (value) => {
  if (value <= 1) {
    return "easy";
  }

  if (value >= 3) {
    return "hard";
  }

  return "medium";
};

// ============================================================
// ADAPTIVE DIFFICULTY
// ============================================================

const determineNextDifficulty = ({ interview, questions, evaluations }) => {
  // Fixed difficulty
  if (
    interview?.difficulty &&
    interview.difficulty !== "adaptive" &&
    ALLOWED_DIFFICULTIES.includes(interview.difficulty)
  ) {
    return interview.difficulty;
  }

  // First question
  if (!evaluations.length) {
    return getInitialDifficulty();
  }

  const recentAverage = getRecentAverage(evaluations, 3);

  if (recentAverage === null) {
    return "medium";
  }

  let currentValue = difficultyValue(interview?.currentDifficulty || "medium");

  const trend = getScoreTrend(evaluations);

  if (recentAverage < 40) {
    currentValue -= 1;
  } else if (recentAverage < 55) {
    if (currentValue > 1) {
      currentValue -= 1;
    }
  } else if (recentAverage < 70) {
    // Keep current difficulty.
  } else if (recentAverage < 85) {
    if (trend === "improving") {
      currentValue += 1;
    }
  } else {
    currentValue += 1;
  }

  // Prevent jumping more than one level
  const previousDifficulty =
    questions.length > 0
      ? questions[questions.length - 1]?.difficulty
      : "medium";

  const previousValue = difficultyValue(previousDifficulty);

  if (Math.abs(currentValue - previousValue) > 1) {
    currentValue = previousValue + Math.sign(currentValue - previousValue);
  }

  currentValue = clamp(currentValue, 1, 3);

  return difficultyFromValue(currentValue);
};

// ============================================================
// EXPERIENCE ESTIMATION
// ============================================================

const estimateExperienceLevel = ({ evaluations, questions }) => {
  if (!Array.isArray(evaluations) || evaluations.length === 0) {
    return {
      level: null,
      confidence: null,
    };
  }

  const averageScore = getAverageScore(evaluations);

  if (averageScore === null) {
    return {
      level: null,
      confidence: null,
    };
  }

  let hardCount = 0;
  let mediumCount = 0;

  for (const question of questions) {
    if (question?.difficulty === "hard") {
      hardCount += 1;
    }

    if (question?.difficulty === "medium") {
      mediumCount += 1;
    }
  }

  const evaluationMap = new Map();

  for (const evaluation of evaluations) {
    if (evaluation?.question) {
      evaluationMap.set(evaluation.question.toString(), evaluation);
    }
  }

  const hardEvaluations = [];

  for (const question of questions) {
    if (question?.difficulty !== "hard") {
      continue;
    }

    const evaluation = evaluationMap.get(question._id.toString());

    if (evaluation) {
      hardEvaluations.push(evaluation);
    }
  }

  const hardAverage = getAverageScore(hardEvaluations);

  let level = "fresher";

  if (
    averageScore >= 80 &&
    hardCount >= 3 &&
    hardAverage !== null &&
    hardAverage >= 70
  ) {
    level = "senior";
  } else if (averageScore >= 65 && (hardCount >= 1 || mediumCount >= 4)) {
    level = "mid";
  } else if (averageScore >= 50) {
    level = "junior";
  }

  const evidenceCount = evaluations.length;

  let confidence = 30 + evidenceCount * 7;

  if (hardEvaluations.length >= 3) {
    confidence += 10;
  }

  if (getRecentAverage(evaluations, 5) !== null) {
    confidence += 5;
  }

  confidence = clamp(confidence, 30, 95);

  return {
    level: EXPERIENCE_LEVELS.includes(level) ? level : "fresher",
    confidence,
  };
};

// ============================================================
// WEAK TOPICS
// ============================================================

const extractWeakTopics = (evaluations) => {
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
  ].slice(-15);
};

// ============================================================
// STRONG TOPICS
// ============================================================

const extractStrongTopics = (evaluations) => {
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
  ].slice(-15);
};

// ============================================================
// CATEGORY
// ============================================================

const determineCategory = ({ interview, questions, evaluations }) => {
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

  if (type === "system-design") {
    return "system-design";
  }

  if (type === "mixed") {
    const categories = ["technical", "coding", "behavioral", "system-design"];

    if (!questions.length) {
      return "technical";
    }

    const recentCategories = questions
      .slice(-3)
      .map((question) => question?.category);

    const recentAverage = getRecentAverage(evaluations, 3);

    if (recentAverage !== null && recentAverage < 50) {
      const lastQuestion = questions[questions.length - 1];

      if (lastQuestion && categories.includes(lastQuestion.category)) {
        return lastQuestion.category;
      }
    }

    const available = categories.filter(
      (category) => !recentCategories.includes(category),
    );

    if (available.length) {
      return available[0];
    }

    return categories[questions.length % categories.length];
  }

  return "general";
};

// ============================================================
// HISTORY
// ============================================================

const buildHistory = ({ questions, answers, evaluations }) => {
  const answerMap = new Map();

  for (const answer of answers) {
    if (answer?.question) {
      answerMap.set(answer.question.toString(), answer);
    }
  }

  const evaluationMap = new Map();

  for (const evaluation of evaluations) {
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

      expectedTopics: question.expectedTopics || [],

      answer: answer?.answerText || null,

      evaluation: evaluation
        ? {
            correctnessScore: evaluation.correctnessScore,

            technicalScore: evaluation.technicalScore,

            communicationScore: evaluation.communicationScore,

            problemSolvingScore: evaluation.problemSolvingScore,

            overallScore: evaluation.overallScore,

            strengths: evaluation.strengths || [],

            weaknesses: evaluation.weaknesses || [],

            mistakes: evaluation.mistakes || [],

            studyTopics: evaluation.studyTopics || [],
          }
        : null,
    };
  });
};

// ============================================================
// GENERATE NEXT QUESTION
// ============================================================

const generateNextQuestion = async (userId, interviewId) => {
  // ----------------------------------------------------------
  // FIND INTERVIEW
  // ----------------------------------------------------------

  const interview = await Interview.findOne({
    _id: interviewId,
    user: userId,
  });

  if (!interview) {
    throw new Error("Interview not found");
  }

  // ----------------------------------------------------------
  // STATUS
  // ----------------------------------------------------------

  if (interview.status !== "in-progress") {
    throw new Error("Interview is not in progress");
  }

  // ----------------------------------------------------------
  // GET QUESTIONS
  // ----------------------------------------------------------

  const questions = await Question.find({
    interview: interviewId,
  })
    .sort({
      questionNumber: 1,
    })
    .lean();

  // ----------------------------------------------------------
  // PENDING QUESTION
  // ----------------------------------------------------------

  const pendingQuestion = questions.find(
    (question) => question?.status === "pending",
  );

  if (pendingQuestion) {
    return {
      question: pendingQuestion,
      questionNumber: pendingQuestion.questionNumber,

      provider: null,
      model: null,

      interviewProgress: {
        currentQuestion: pendingQuestion.questionNumber,

        totalQuestions: questions.length,

        maximumQuestions: MAX_QUESTIONS,

        remainingQuestions: Math.max(
          MAX_QUESTIONS - pendingQuestion.questionNumber,
          0,
        ),

        isLastQuestion: pendingQuestion.questionNumber === MAX_QUESTIONS,

        percentage: Math.round(
          (pendingQuestion.questionNumber / MAX_QUESTIONS) * 100,
        ),

        progressPercentage: Math.round(
          (pendingQuestion.questionNumber / MAX_QUESTIONS) * 100,
        ),
      },
    };
  }

  // ----------------------------------------------------------
  // MAXIMUM
  // ----------------------------------------------------------

  if (questions.length >= MAX_QUESTIONS) {
    throw new Error("Maximum of 100 interview questions reached");
  }

  // ----------------------------------------------------------
  // ANSWERS
  // ----------------------------------------------------------

  const answers = await Answer.find({
    interview: interviewId,
    user: userId,
  })
    .sort({
      submittedAt: 1,
    })
    .lean();

  // ----------------------------------------------------------
  // EVALUATIONS
  // ----------------------------------------------------------

  const evaluations = await Evaluation.find({
    interview: interviewId,
  })
    .sort({
      createdAt: 1,
    })
    .lean();

  // ----------------------------------------------------------
  // NEXT QUESTION NUMBER
  // ----------------------------------------------------------

  const nextQuestionNumber = questions.length + 1;

  // ----------------------------------------------------------
  // ADAPTIVE STATE
  // ----------------------------------------------------------

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

  const experienceEstimate = estimateExperienceLevel({
    evaluations,
    questions,
  });

  const history = buildHistory({
    questions,
    answers,
    evaluations,
  });

  const weakTopics = extractWeakTopics(evaluations);

  const strongTopics = extractStrongTopics(evaluations);

  const technologies = normalizeStringArray(interview.technologies, 30);

  // ----------------------------------------------------------
  // BUILD SMALL, SAFE PROMPT
  // ----------------------------------------------------------

  const previousQuestionsText = history.length
    ? history
        .slice(-10)
        .map((item) => `Q${item.questionNumber}: ${item.question}`)
        .join("\n")
    : "No previous questions.";

  const systemPrompt = `
You are an expert adaptive AI interviewer.

Generate exactly ONE interview question.

INTERVIEW ROLE:
${interview.role}

INTERVIEW TYPE:
${interview.interviewType}

TARGET CATEGORY:
${nextCategory}

TARGET DIFFICULTY:
${nextDifficulty}

TECHNOLOGIES:
${technologies.length ? technologies.join(", ") : "Not specified"}

ESTIMATED EXPERIENCE:
${experienceEstimate.level || "Not enough evidence"}

CONFIDENCE:
${experienceEstimate.confidence ?? "Not enough evidence"}

AVERAGE SCORE:
${getAverageScore(evaluations) ?? "No data"}

RECENT SCORE:
${getRecentAverage(evaluations, 3) ?? "No data"}

PERFORMANCE TREND:
${getScoreTrend(evaluations)}

WEAK AREAS:
${weakTopics.length ? weakTopics.join(", ") : "None confirmed"}

STRONG AREAS:
${strongTopics.length ? strongTopics.join(", ") : "None confirmed"}

PREVIOUS QUESTIONS:
${previousQuestionsText}

RULES:

1. Generate exactly one question.
2. Never repeat an earlier question.
3. Match the target category.
4. Match the target difficulty.
5. Keep the question relevant to the role.
6. Adapt based on demonstrated performance.
7. Do not ask the candidate to self-declare their experience level.
8. Do not invent technologies.
9. For coding, provide a complete problem statement but no solution.
10. For system design, ask one complete design problem.
11. For behavioral, ask one realistic behavioral question.
12. For technical, test useful technical understanding.

Return ONLY JSON.

{
  "question": "string",
  "category": "${nextCategory}",
  "difficulty": "${nextDifficulty}",
  "expectedTopics": ["string"]
}
`;

  // ----------------------------------------------------------
  // AI REQUEST
  // ----------------------------------------------------------

  const result = await generateAIResponse({
    systemPrompt,

    messages: [
      {
        role: "user",
        content: "Generate the next interview question.",
      },
    ],

    responseFormat: "json",
  });

  // ----------------------------------------------------------
  // VALIDATE AI RESULT
  // ----------------------------------------------------------

  if (!result || typeof result.content !== "string" || !result.content.trim()) {
    throw new Error("AI interviewer returned an empty response");
  }

  let questionData;

  try {
    questionData = JSON.parse(result.content);
  } catch (error) {
    console.error("[Interview Agent] Invalid AI JSON:", result.content);

    throw new Error("AI interviewer returned invalid JSON");
  }

  // ----------------------------------------------------------
  // QUESTION
  // ----------------------------------------------------------

  if (!questionData || typeof questionData.question !== "string") {
    throw new Error("AI interviewer returned an invalid question");
  }

  const questionText = questionData.question.trim();

  if (questionText.length < 5 || questionText.length > 2000) {
    throw new Error("AI interviewer returned a question with invalid length");
  }

  // ----------------------------------------------------------
  // CATEGORY
  // ----------------------------------------------------------

  let category = nextCategory;

  if (ALLOWED_CATEGORIES.includes(questionData.category)) {
    category = questionData.category;
  }

  // Enforce fixed interview types
  if (interview.interviewType === "technical") {
    category = "technical";
  } else if (interview.interviewType === "behavioral") {
    category = "behavioral";
  } else if (interview.interviewType === "coding") {
    category = "coding";
  } else if (interview.interviewType === "system-design") {
    category = "system-design";
  }

  // ----------------------------------------------------------
  // DIFFICULTY
  // ----------------------------------------------------------

  let difficulty = nextDifficulty;

  if (ALLOWED_DIFFICULTIES.includes(questionData.difficulty)) {
    difficulty = questionData.difficulty;
  }

  if (
    interview.difficulty !== "adaptive" &&
    ALLOWED_DIFFICULTIES.includes(interview.difficulty)
  ) {
    difficulty = interview.difficulty;
  }

  // ----------------------------------------------------------
  // EXPECTED TOPICS
  // ----------------------------------------------------------

  const expectedTopics = normalizeStringArray(questionData.expectedTopics, 10);

  // ----------------------------------------------------------
  // DUPLICATE CHECK
  // ----------------------------------------------------------

  const normalizedQuestion = normalizeText(questionText);

  const duplicateQuestion = questions.some(
    (existingQuestion) =>
      normalizeText(existingQuestion.question) === normalizedQuestion,
  );

  if (duplicateQuestion) {
    throw new Error(
      "AI generated a duplicate interview question. Please retry.",
    );
  }

  // ----------------------------------------------------------
  // SAVE QUESTION
  // ----------------------------------------------------------

  let question;

  try {
    question = await Question.create({
      interview: interviewId,

      questionNumber: nextQuestionNumber,

      question: questionText,

      category,

      difficulty,

      expectedTopics,

      status: "pending",
    });
  } catch (error) {
    if (error?.code === 11000) {
      throw new Error("Question number already exists. Please retry.");
    }

    throw error;
  }

  // ----------------------------------------------------------
  // UPDATE INTERVIEW
  // ----------------------------------------------------------

  interview.totalQuestions = nextQuestionNumber;

  interview.currentDifficulty = difficulty;

  if (experienceEstimate.level) {
    interview.estimatedExperienceLevel = experienceEstimate.level;

    interview.experienceConfidence = experienceEstimate.confidence;
  }

  await interview.save();

  // ----------------------------------------------------------
  // LAST QUESTION
  // ----------------------------------------------------------

  const isLastQuestion = nextQuestionNumber === MAX_QUESTIONS;

  const progressPercentage = Math.round(
    (nextQuestionNumber / MAX_QUESTIONS) * 100,
  );

  // ----------------------------------------------------------
  // RETURN
  // ----------------------------------------------------------

  return {
    question,

    questionNumber: nextQuestionNumber,

    provider: result.provider || null,

    model: result.model || null,

    interviewProgress: {
      currentQuestion: nextQuestionNumber,

      totalQuestions: nextQuestionNumber,

      maximumQuestions: MAX_QUESTIONS,

      remainingQuestions: Math.max(MAX_QUESTIONS - nextQuestionNumber, 0),

      isLastQuestion,

      percentage: progressPercentage,

      progressPercentage,
    },

    adaptiveState: {
      difficulty,
      category,

      estimatedExperienceLevel: experienceEstimate.level,

      experienceConfidence: experienceEstimate.confidence,

      weakTopics,
      strongTopics,

      averageScore: getAverageScore(evaluations),

      recentAverage: getRecentAverage(evaluations, 3),

      performanceTrend: getScoreTrend(evaluations),
    },
  };
};

// ============================================================
// EXPORT
// ============================================================

module.exports = {
  generateNextQuestion,
};
