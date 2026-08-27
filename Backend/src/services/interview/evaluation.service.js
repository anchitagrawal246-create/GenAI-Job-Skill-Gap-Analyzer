const mongoose = require("mongoose");

const Evaluation = require("../../model/evaluation.model");
const Answer = require("../../model/answer.model");
const Interview = require("../../model/interview.model");
const Question = require("../../model/question.model");

const { generateAIResponse } = require("../ai/ai.gateway");

// ============================================================
// CONSTANTS
// ============================================================

const MAX_QUESTIONS = 100;
const MAX_ARRAY_ITEMS = 30;
const MAX_ANSWER_LENGTH = 50000;

const PROVIDERS = ["groq", "gemini", "deepseek", "ollama", "openai", "manual"];

const CANDIDATE_LEVELS = ["beginner", "knight", "conqueror"];

const SCORE_HISTORY_REASONS = [
  "initial-evaluation",
  "question-re-evaluation",
  "full-re-evaluation",
  "manual-recalculation",
  "final-calculation",
];

const PROMPT_VERSION = "evaluation-service-v6";

// ============================================================
// DEBUG
// ============================================================

const debug = (message, data = null) => {
  console.log(`[EVALUATION] ${message}`);

  if (data !== null) {
    console.log(data);
  }
};

const debugError = (message, error = null) => {
  console.error(`[EVALUATION ERROR] ${message}`);

  if (error) {
    console.error(error?.stack || error?.message || error);
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
// REFERENCE ID HELPER
// Supports:
//   ObjectId
//   populated document
//   string
// ============================================================

const getRefId = (value) => {
  if (!value) {
    return null;
  }

  if (typeof value === "object" && value._id) {
    return String(value._id);
  }

  return String(value);
};

// ============================================================
// TEXT HELPERS
// ============================================================

const cleanText = (value, maxLength = MAX_ANSWER_LENGTH) => {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().slice(0, maxLength);
};

const normalizeStringArray = (value, max = MAX_ARRAY_ITEMS) => {
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

// ============================================================
// NUMBER HELPERS
// ============================================================

const clampScore = (value, fieldName) => {
  const score = Number(value);

  if (!Number.isFinite(score) || score < 0 || score > 100) {
    throw new Error(`Invalid ${fieldName} returned by AI`);
  }

  return Math.round(score * 100) / 100;
};

const average = (values = []) => {
  const valid = values.map(Number).filter(Number.isFinite);

  if (!valid.length) {
    return null;
  }

  const total = valid.reduce((sum, value) => sum + value, 0);

  return Math.round((total / valid.length) * 100) / 100;
};

// ============================================================
// JSON PARSER
// ============================================================

const parseAIJson = (content) => {
  if (typeof content !== "string") {
    return null;
  }

  const trimmed = content.trim();

  if (!trimmed) {
    return null;
  }

  // Direct JSON
  try {
    return JSON.parse(trimmed);
  } catch (_) {
    // continue
  }

  // Markdown JSON block
  const cleaned = trimmed
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch (_) {
    return null;
  }
};

// ============================================================
// LATEST EVALUATION PER QUESTION
// ============================================================

const getLatestEvaluations = (evaluations = []) => {
  const map = new Map();

  for (const evaluation of evaluations) {
    const questionId = getRefId(evaluation?.question);

    if (!questionId) {
      continue;
    }

    const existing = map.get(questionId);

    if (!existing) {
      map.set(questionId, evaluation);
      continue;
    }

    const currentVersion = Number(evaluation?.version) || 1;

    const existingVersion = Number(existing?.version) || 1;

    if (currentVersion > existingVersion) {
      map.set(questionId, evaluation);
      continue;
    }

    if (
      currentVersion === existingVersion &&
      new Date(evaluation?.createdAt || 0) > new Date(existing?.createdAt || 0)
    ) {
      map.set(questionId, evaluation);
    }
  }

  return Array.from(map.values()).sort(
    (a, b) => new Date(a?.createdAt || 0) - new Date(b?.createdAt || 0),
  );
};

// ============================================================
// ORIGINAL EVALUATION PER QUESTION
// ============================================================

const getOriginalEvaluations = (evaluations = []) => {
  const map = new Map();

  for (const evaluation of evaluations) {
    if (evaluation?.evaluationType !== "original") {
      continue;
    }

    const questionId = getRefId(evaluation?.question);

    if (!questionId) {
      continue;
    }

    const existing = map.get(questionId);

    if (!existing) {
      map.set(questionId, evaluation);
      continue;
    }

    if (
      new Date(evaluation?.createdAt || 0) < new Date(existing?.createdAt || 0)
    ) {
      map.set(questionId, evaluation);
    }
  }

  return Array.from(map.values());
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
// QUESTION
// ============================================================

const getInterviewQuestion = async (interviewId, questionId) => {
  validateObjectId(interviewId, "interview ID");

  validateObjectId(questionId, "question ID");

  const question = await Question.findOne({
    _id: questionId,
    interview: interviewId,
  }).lean();

  if (!question) {
    throw new Error("Question not found");
  }

  return question;
};

// ============================================================
// CANDIDATE ANSWER EXTRACTION
// IMPORTANT:
// coding/debugging -> answer.code
// text             -> answer.answerText
// ============================================================

const getCandidateAnswerText = (answer, question) => {
  const category = question?.category;

  if (category === "coding" || category === "dsa" || category === "debugging") {
    return cleanText(answer?.code);
  }

  return cleanText(answer?.answerText);
};

// ============================================================
// EVALUATION PROMPT
// ============================================================

const buildEvaluationPrompt = ({
  interview,
  question,
  answer,
  evaluationType,
  version,
}) => {
  const candidateAnswer = getCandidateAnswerText(answer, question);

  const language =
    question?.coding?.language ||
    question?.debugging?.language ||
    answer?.language ||
    "unknown";

  const isCoding =
    question?.category === "coding" || question?.category === "dsa";

  const isDebugging = question?.category === "debugging";

  let codingContext = "";

  if (isCoding) {
    codingContext = `
============================================================
CODING QUESTION DATA
============================================================

Language:
${language}

Starter Code:
${question?.coding?.starterCode || "Not provided"}

Function Signature:
${question?.coding?.functionSignature || "Not provided"}

Input Format:
${question?.coding?.inputFormat || "Not provided"}

Output Format:
${question?.coding?.outputFormat || "Not provided"}

Correct Solution:
${question?.solution || question?.idealAnswer || "Not available"}

Time Complexity:
${question?.complexity?.time || "Not provided"}

Space Complexity:
${question?.complexity?.space || "Not provided"}

Candidate Submission:
${candidateAnswer || "No submission provided"}
`;
  }

  let debuggingContext = "";

  if (isDebugging) {
    debuggingContext = `
============================================================
DEBUGGING QUESTION DATA
============================================================

Language:
${language}

Broken Code:
${question?.debugging?.buggyCode || "Not provided"}

Expected Behavior:
${question?.debugging?.expectedBehavior || "Not provided"}

Root Bug Description:
${question?.debugging?.bugDescription || "Not provided"}

Correct Solution:
${question?.solution || question?.idealAnswer || "Not available"}

Candidate Response / Fixed Code:
${candidateAnswer || "No response provided"}
`;
  }

  return `
You are an expert technical interview evaluator.

Evaluate ONLY what the candidate actually demonstrated.

Do not invent:
- skills
- knowledge
- experience
- intent
- reasoning that was not demonstrated

A skipped question is not evidence of weakness.

The candidate answer below is the only candidate evidence.

============================================================
EVALUATION INFORMATION
============================================================

Evaluation Type:
${evaluationType}

Evaluation Version:
${version}

============================================================
INTERVIEW
============================================================

Role:
${interview?.role || "Not provided"}

Interview Type:
${interview?.interviewType || "Not provided"}

Difficulty Mode:
${interview?.difficulty || "Not provided"}

Question Difficulty:
${question?.difficulty || "Not provided"}

Technologies:
${
  Array.isArray(interview?.technologies) && interview.technologies.length
    ? interview.technologies.join(", ")
    : "Not specified"
}

============================================================
QUESTION
============================================================

${question?.question || ""}

Category:
${question?.category || "technical"}

Skill:
${question?.skill || "Not specified"}

Expected Topics:
${
  Array.isArray(question?.expectedTopics) && question.expectedTopics.length
    ? question.expectedTopics.join(", ")
    : "None"
}

Ideal Answer:
${question?.idealAnswer || question?.solution || "Not provided"}

Explanation:
${question?.explanation || "Not provided"}

${codingContext}

${debuggingContext}

============================================================
CANDIDATE ANSWER
============================================================

${candidateAnswer || "No answer provided"}

============================================================
SCORING RULES
============================================================

Return every score from 0 to 100.

correctnessScore:
How factually, logically, and technically correct is the answer?

technicalScore:
How strong is the technical understanding demonstrated?

communicationScore:
How clearly and effectively is the answer communicated?

problemSolvingScore:
How well does the answer demonstrate reasoning and problem solving?

overallScore:
Overall quality relative to the difficulty of the question.

Important:

1. Judge demonstrated evidence only.

2. Do not reward unsupported claims.

3. Difficulty matters.

4. A correct answer to a very easy question should not automatically receive the same interpretation as a correct answer to a very hard question.

5. For coding/debugging:
   - compare against the stored solution
   - inspect correctness
   - inspect edge cases
   - inspect efficiency
   - inspect reasoning when present
   - do not award credit for code the candidate did not submit

6. A partially correct answer should receive a partial score.

7. If an answer is completely incorrect, score it accordingly.

8. Re-evaluation must evaluate the CURRENT candidate answer provided above.

   Do not reuse a previous candidate answer.

============================================================
STRENGTHS
============================================================

Only include strengths directly supported by the answer.

============================================================
WEAKNESSES
============================================================

Only include weaknesses supported by the answer.

============================================================
MISTAKES
============================================================

Only include actual technical, logical, or communication mistakes.

Return [] when there are no meaningful mistakes.

============================================================
CORRECTIONS
============================================================

Provide practical corrections for actual mistakes.

============================================================
SUGGESTIONS
============================================================

Provide practical advice for improving future interview answers.

============================================================
STUDY TOPICS
============================================================

Only recommend topics related to demonstrated weaknesses or actual knowledge gaps.

Each study topic:

{
  "topic": "string",
  "priority": "low | medium | high"
}

============================================================
FEEDBACK
============================================================

Provide concise useful feedback covering:

- what the candidate understood
- what was correct
- what was incorrect
- what was missing
- how the candidate can improve

============================================================
OUTPUT
============================================================

Return ONLY valid JSON.

{
  "correctnessScore": 0,
  "technicalScore": 0,
  "communicationScore": 0,
  "problemSolvingScore": 0,
  "overallScore": 0,
  "strengths": [],
  "weaknesses": [],
  "mistakes": [],
  "corrections": [],
  "suggestions": [],
  "studyTopics": [],
  "feedback": ""
}
`;
};

// ============================================================
// VALIDATE AI EVALUATION
// ============================================================

const validateEvaluationData = (data) => {
  if (!data || typeof data !== "object") {
    throw new Error("AI returned an invalid evaluation object");
  }

  const scoreFields = [
    "correctnessScore",
    "technicalScore",
    "communicationScore",
    "problemSolvingScore",
    "overallScore",
  ];

  for (const field of scoreFields) {
    if (data[field] === undefined || data[field] === null) {
      throw new Error(`AI evaluation is missing ${field}`);
    }

    data[field] = clampScore(data[field], field);
  }

  return data;
};

// ============================================================
// NORMALIZE EVALUATION
// ============================================================

const normalizeEvaluation = (data) => {
  const strengths = normalizeStringArray(data?.strengths, 20);

  const weaknesses = normalizeStringArray(data?.weaknesses, 20);

  const mistakes = normalizeStringArray(data?.mistakes, 30);

  const corrections = normalizeStringArray(data?.corrections, 30);

  const suggestions = normalizeStringArray(data?.suggestions, 30);

  const studyTopics = Array.isArray(data?.studyTopics)
    ? data.studyTopics
        .filter(
          (item) =>
            item &&
            typeof item.topic === "string" &&
            item.topic.trim().length > 0 &&
            ["low", "medium", "high"].includes(item.priority),
        )
        .map((item) => ({
          topic: cleanText(item.topic, 150),
          priority: item.priority,
        }))
        .slice(0, 30)
    : [];

  return {
    correctnessScore: data.correctnessScore,

    technicalScore: data.technicalScore,

    communicationScore: data.communicationScore,

    problemSolvingScore: data.problemSolvingScore,

    overallScore: data.overallScore,

    strengths,
    weaknesses,
    mistakes,
    corrections,
    suggestions,
    studyTopics,

    feedback: cleanText(data?.feedback, 5000),
  };
};

// ============================================================
// CANDIDATE LEVEL
// ============================================================

const calculateCandidateLevel = ({
  currentEvaluations = [],
  questions = [],
}) => {
  if (!currentEvaluations.length) {
    return {
      level: null,
      score: null,
      confidence: null,
    };
  }

  const score = average(
    currentEvaluations.map((evaluation) => evaluation?.overallScore),
  );

  if (score === null) {
    return {
      level: null,
      score: null,
      confidence: null,
    };
  }

  const evaluationMap = new Map();

  for (const evaluation of currentEvaluations) {
    const questionId = getRefId(evaluation?.question);

    if (questionId) {
      evaluationMap.set(questionId, evaluation);
    }
  }

  let hardQuestions = 0;
  let veryHardQuestions = 0;
  let strongAdvancedAnswers = 0;

  for (const question of questions) {
    if (!question?._id) {
      continue;
    }

    if (question.difficulty === "hard") {
      hardQuestions++;
    }

    if (question.difficulty === "very-hard") {
      veryHardQuestions++;
    }

    if (question.difficulty === "hard" || question.difficulty === "very-hard") {
      const evaluation = evaluationMap.get(String(question._id));

      if (evaluation && Number(evaluation.overallScore) >= 75) {
        strongAdvancedAnswers++;
      }
    }
  }

  let level = "beginner";

  if (score >= 85 && hardQuestions >= 3 && strongAdvancedAnswers >= 2) {
    level = "conqueror";
  } else if (
    score >= 60 &&
    (hardQuestions >= 1 ||
      veryHardQuestions >= 1 ||
      currentEvaluations.length >= 5)
  ) {
    level = "knight";
  }

  let confidence = 30 + currentEvaluations.length * 6;

  if (hardQuestions >= 2) {
    confidence += 10;
  }

  if (strongAdvancedAnswers >= 2) {
    confidence += 10;
  }

  if (veryHardQuestions >= 1) {
    confidence += 5;
  }

  confidence = Math.min(95, Math.max(30, confidence));

  return {
    level: CANDIDATE_LEVELS.includes(level) ? level : "beginner",
    score,
    confidence,
  };
};

// ============================================================
// SCORE HISTORY
// ============================================================

const appendScoreHistory = ({
  history,
  version,
  score,
  reason,
  changedQuestionId = null,
}) => {
  if (!Array.isArray(history) || !Number.isFinite(Number(score))) {
    return;
  }

  if (!SCORE_HISTORY_REASONS.includes(reason)) {
    return;
  }

  history.push({
    version,
    score,
    reason,
    changedQuestionId: changedQuestionId || null,
    calculatedAt: new Date(),
  });
};

// ============================================================
// CANDIDATE LEVEL HISTORY
// ============================================================

const appendCandidateLevelHistory = ({
  interview,
  level,
  score,
  confidence,
  reason,
}) => {
  if (!interview || !level || !CANDIDATE_LEVELS.includes(level)) {
    return;
  }

  const history = Array.isArray(interview.candidateLevelHistory)
    ? interview.candidateLevelHistory
    : [];

  const last = history.length ? history[history.length - 1] : null;

  const unchanged =
    last &&
    last.level === level &&
    Number(last.score ?? -1) === Number(score ?? -1) &&
    Number(last.confidence ?? -1) === Number(confidence ?? -1);

  if (unchanged) {
    interview.candidateLevelHistory = history;
    return;
  }

  const validReasons = [
    "initial-assessment",
    "interview-progress",
    "interview-completion",
    "question-re-evaluation",
    "full-re-evaluation",
    "evidence-update",
    "manual-recalculation",
  ];

  if (!validReasons.includes(reason)) {
    return;
  }

  history.push({
    level,
    score: score === null || score === undefined ? null : score,
    confidence:
      confidence === null || confidence === undefined ? null : confidence,
    reason,
    evaluatedAt: new Date(),
  });

  interview.candidateLevelHistory = history;
};

// ============================================================
// NEXT EVALUATION VERSION
// Per interview + question
// ============================================================

const getNextEvaluationVersion = async ({ interviewId, questionId }) => {
  const latest = await Evaluation.findOne({
    interview: interviewId,
    question: questionId,
    status: "completed",
  })
    .sort({
      version: -1,
      createdAt: -1,
    })
    .lean();

  return (Number(latest?.version) || 0) + 1;
};

// ============================================================
// AI
// ============================================================

const runAIEvaluation = async ({
  interview,
  question,
  answer,
  evaluationType,
  version,
}) => {
  const startedAt = Date.now();

  const systemPrompt = buildEvaluationPrompt({
    interview,
    question,
    answer,
    evaluationType,
    version,
  });

  const result = await generateAIResponse({
    systemPrompt,

    messages: [
      {
        role: "user",
        content:
          "Evaluate the candidate answer using the exact question, ideal answer, and candidate answer contained in the evaluation prompt.",
      },
    ],

    responseFormat: "json",
  });

  if (!result || typeof result.content !== "string" || !result.content.trim()) {
    throw new Error("AI provider returned an empty evaluation");
  }

  const rawEvaluation = parseAIJson(result.content);

  if (!rawEvaluation) {
    throw new Error("AI provider returned invalid evaluation JSON");
  }

  validateEvaluationData(rawEvaluation);

  const evaluationData = normalizeEvaluation(rawEvaluation);

  return {
    result,
    evaluationData,
    processingTimeMs: Date.now() - startedAt,
  };
};

// ============================================================
// CREATE EVALUATION DOCUMENT
// ============================================================

const createEvaluation = async ({
  interview,
  question,
  answer,
  evaluationData,
  result,
  evaluationType,
  version,
  previousEvaluation = null,
  answerVersion = 1,
  processingTimeMs = null,
}) => {
  const provider = PROVIDERS.includes(result?.provider)
    ? result.provider
    : "manual";

  const model = result?.model || null;

  return Evaluation.create({
    interview: interview._id,
    question: question._id,
    answer: answer._id,

    evaluationType,
    version,

    previousEvaluation: previousEvaluation?._id || null,

    technology: question?.skill || null,

    category: question?.category || "technical",

    difficulty: question?.difficulty || "medium",

    correctnessScore: evaluationData.correctnessScore,

    technicalScore: evaluationData.technicalScore,

    communicationScore: evaluationData.communicationScore,

    problemSolvingScore: evaluationData.problemSolvingScore,

    overallScore: evaluationData.overallScore,

    strengths: evaluationData.strengths,

    weaknesses: evaluationData.weaknesses,

    mistakes: evaluationData.mistakes,

    corrections: evaluationData.corrections,

    suggestions: evaluationData.suggestions,

    studyTopics: evaluationData.studyTopics,

    feedback: evaluationData.feedback,

    evaluatedBy: provider,

    status: "completed",

    metadata: {
      model,
      promptVersion: PROMPT_VERSION,

      processingTimeMs,

      // Important for matching
      // evaluation to the answer state.
      answerVersion,
    },
  });
};

// ============================================================
// RECALCULATE INTERVIEW SCORES
// ============================================================

const recalculateInterviewScores = async ({
  userId,
  interviewId,
  reason,
  changedQuestionId = null,
}) => {
  validateObjectId(userId, "user ID");

  validateObjectId(interviewId, "interview ID");

  const interview = await Interview.findOne({
    _id: interviewId,
    user: userId,
  });

  if (!interview) {
    throw new Error("Interview not found");
  }

  const questions = await Question.find({
    interview: interviewId,
  })
    .sort({
      questionNumber: 1,
    })
    .lean();

  const allEvaluations = await Evaluation.find({
    interview: interviewId,
    status: "completed",
  })
    .sort({
      version: 1,
      createdAt: 1,
    })
    .lean();

  const latestEvaluations = getLatestEvaluations(allEvaluations);

  const originalEvaluations = getOriginalEvaluations(allEvaluations);

  const latestByQuestion = new Map();

  for (const evaluation of latestEvaluations) {
    const questionId = getRefId(evaluation?.question);

    if (questionId) {
      latestByQuestion.set(questionId, evaluation);
    }
  }

  const originalByQuestion = new Map();

  for (const evaluation of originalEvaluations) {
    const questionId = getRefId(evaluation?.question);

    if (questionId) {
      originalByQuestion.set(questionId, evaluation);
    }
  }

  // ========================================================
  // ANSWERED QUESTIONS
  // ========================================================

  const answeredQuestions = questions.filter(
    (question) => question?.status === "answered",
  );

  const answeredIds = new Set(
    answeredQuestions.map((question) => String(question._id)),
  );

  // ========================================================
  // CURRENT SCORE
  // ========================================================

  const currentScores = latestEvaluations
    .filter((evaluation) => {
      const questionId = getRefId(evaluation?.question);

      return questionId && answeredIds.has(questionId);
    })
    .map((evaluation) => Number(evaluation.overallScore))
    .filter(Number.isFinite);

  const currentScore = average(currentScores);

  // ========================================================
  // ORIGINAL SCORE
  // ========================================================

  const originalScores = originalEvaluations
    .filter((evaluation) => {
      const questionId = getRefId(evaluation?.question);

      return questionId && answeredIds.has(questionId);
    })
    .map((evaluation) => Number(evaluation.overallScore))
    .filter(Number.isFinite);

  const originalScore = average(originalScores);

  // ========================================================
  // TECHNOLOGY SCORES
  // ========================================================

  const technologyMap = new Map();

  const ensureTechnology = (technology) => {
    const cleanTechnology =
      typeof technology === "string" ? technology.trim() : "";

    if (!cleanTechnology) {
      return null;
    }

    const normalizedKey = cleanTechnology.toLowerCase();

    if (!technologyMap.has(normalizedKey)) {
      technologyMap.set(normalizedKey, {
        technology: cleanTechnology,

        currentScores: [],
        originalScores: [],

        questionsAsked: 0,
        questionsAnswered: 0,
        questionsSkipped: 0,

        strengths: [],
        weaknesses: [],
      });
    }

    return technologyMap.get(normalizedKey);
  };

  for (const question of questions) {
    const technology = question?.skill;

    const item = ensureTechnology(technology);

    if (!item) {
      continue;
    }

    item.questionsAsked += 1;

    if (question.status === "answered") {
      item.questionsAnswered += 1;
    }

    if (question.status === "skipped") {
      item.questionsSkipped += 1;
    }

    const questionId = String(question._id);

    const currentEvaluation = latestByQuestion.get(questionId);

    if (
      currentEvaluation &&
      Number.isFinite(Number(currentEvaluation.overallScore)) &&
      answeredIds.has(questionId)
    ) {
      item.currentScores.push(Number(currentEvaluation.overallScore));

      if (Array.isArray(currentEvaluation.strengths)) {
        item.strengths.push(...currentEvaluation.strengths);
      }

      if (Array.isArray(currentEvaluation.weaknesses)) {
        item.weaknesses.push(...currentEvaluation.weaknesses);
      }
    }

    const originalEvaluation = originalByQuestion.get(questionId);

    if (
      originalEvaluation &&
      Number.isFinite(Number(originalEvaluation.overallScore)) &&
      answeredIds.has(questionId)
    ) {
      item.originalScores.push(Number(originalEvaluation.overallScore));
    }
  }

  // ========================================================
  // PREVIOUS TECHNOLOGY STATE
  // ========================================================

  const previousTechnologyMap = new Map();

  for (const previous of interview.technologyScores || []) {
    if (previous?.technology) {
      previousTechnologyMap.set(
        previous.technology.trim().toLowerCase(),
        previous,
      );
    }
  }

  // ========================================================
  // BUILD TECHNOLOGY SCORES
  // ========================================================

  const finalTechnologyScores = Array.from(technologyMap.values()).map(
    (item) => {
      const normalizedKey = item.technology.trim().toLowerCase();

      const previous = previousTechnologyMap.get(normalizedKey);

      const currentTechnologyScore = average(item.currentScores);

      const originalTechnologyScore = average(item.originalScores);

      const previousCurrentScore = previous?.currentScore ?? null;

      let scoreVersion = Number(previous?.scoreVersion) || 0;

      const scoreChanged =
        currentTechnologyScore !== null &&
        Number(previousCurrentScore) !== Number(currentTechnologyScore);

      const scoreHistory = Array.isArray(previous?.scoreHistory)
        ? [...previous.scoreHistory]
        : [];

      if (scoreChanged) {
        scoreVersion += 1;

        let historyReason = "initial-evaluation";

        if (reason === "question-re-evaluation") {
          historyReason = "question-re-evaluation";
        } else if (reason === "full-re-evaluation") {
          historyReason = "full-re-evaluation";
        } else if (reason === "manual-recalculation") {
          historyReason = "manual-recalculation";
        } else if (reason === "final-calculation") {
          historyReason = "final-calculation";
        }

        scoreHistory.push({
          version: scoreVersion || 1,

          score: currentTechnologyScore,

          reason: historyReason,

          evaluatedAt: new Date(),
        });
      }

      return {
        technology: item.technology,

        originalScore:
          originalTechnologyScore ?? previous?.originalScore ?? null,

        currentScore: currentTechnologyScore,

        scoreVersion,

        questionsAsked: Math.min(item.questionsAsked, MAX_QUESTIONS),

        questionsAnswered: Math.min(item.questionsAnswered, MAX_QUESTIONS),

        questionsSkipped: Math.min(item.questionsSkipped, MAX_QUESTIONS),

        strengths: [
          ...new Set(normalizeStringArray(item.strengths, MAX_ARRAY_ITEMS)),
        ],

        weaknesses: [
          ...new Set(normalizeStringArray(item.weaknesses, MAX_ARRAY_ITEMS)),
        ],

        scoreHistory,
      };
    },
  );

  // ========================================================
  // CANDIDATE LEVEL
  // ========================================================

  const candidateEvaluations = latestEvaluations.filter((evaluation) => {
    const questionId = getRefId(evaluation?.question);

    return questionId && answeredIds.has(questionId);
  });

  const levelData = calculateCandidateLevel({
    currentEvaluations: candidateEvaluations,
    questions,
  });

  // ========================================================
  // SCORE HISTORY
  // ========================================================

  let scoreVersion = Number(interview.scoreVersion) || 0;

  const scoreHistory = Array.isArray(interview.scoreHistory)
    ? [...interview.scoreHistory]
    : [];

  const previousCurrentScore = interview.currentScore ?? null;

  const overallScoreChanged =
    currentScore !== null &&
    (previousCurrentScore === null ||
      Number(previousCurrentScore) !== Number(currentScore));

  if (overallScoreChanged) {
    scoreVersion += 1;

    appendScoreHistory({
      history: scoreHistory,
      version: scoreVersion,
      score: currentScore,
      reason,
      changedQuestionId,
    });
  }

  // ========================================================
  // COUNTERS
  // ========================================================

  const answeredCount = answeredQuestions.length;

  const skippedCount = questions.filter(
    (question) => question?.status === "skipped",
  ).length;

  const generatedCount = questions.length;

  const targetQuestions = Math.min(
    Number(interview.totalQuestions) || MAX_QUESTIONS,
    MAX_QUESTIONS,
  );

  const completedCount = Math.min(
    answeredCount + skippedCount,
    targetQuestions,
  );

  // ========================================================
  // SAVE
  // ========================================================

  interview.currentScore = currentScore;

  interview.overallScore = currentScore;

  if (interview.originalScore === null && originalScore !== null) {
    interview.originalScore = originalScore;
  }

  interview.scoreVersion = scoreVersion;

  interview.scoreHistory = scoreHistory;

  interview.technologyScores = finalTechnologyScores;

  interview.answeredQuestions = Math.min(answeredCount, targetQuestions);

  interview.skippedQuestions = Math.min(skippedCount, targetQuestions);

  interview.generatedQuestions = Math.min(generatedCount, MAX_QUESTIONS);

  interview.completedQuestions = completedCount;

  // Do not move navigation during
  // score recalculation.
  if (!interview.currentQuestionNumber) {
    interview.currentQuestionNumber = Math.min(
      completedCount + 1,
      targetQuestions,
    );
  }

  if (levelData.level) {
    interview.estimatedCandidateLevel = levelData.level;

    interview.candidateLevelScore = levelData.score;

    interview.candidateLevelConfidence = levelData.confidence;

    let levelHistoryReason = "interview-progress";

    if (reason === "question-re-evaluation") {
      levelHistoryReason = "question-re-evaluation";
    } else if (reason === "full-re-evaluation") {
      levelHistoryReason = "full-re-evaluation";
    } else if (reason === "manual-recalculation") {
      levelHistoryReason = "manual-recalculation";
    } else if (reason === "final-calculation") {
      levelHistoryReason = "interview-completion";
    }

    appendCandidateLevelHistory({
      interview,
      level: levelData.level,
      score: levelData.score,
      confidence: levelData.confidence,
      reason: levelHistoryReason,
    });
  }

  interview.lastActivityAt = new Date();

  await interview.save();

  debug("Interview scores recalculated", {
    interviewId: String(interviewId),

    originalScore: interview.originalScore,

    currentScore: interview.currentScore,

    scoreVersion: interview.scoreVersion,

    answeredQuestions: interview.answeredQuestions,

    skippedQuestions: interview.skippedQuestions,

    technologyCount: finalTechnologyScores.length,

    candidateLevel: interview.estimatedCandidateLevel,

    candidateLevelConfidence: interview.candidateLevelConfidence,
  });

  return {
    originalScore: interview.originalScore,

    currentScore: interview.currentScore,

    overallScore: interview.currentScore,

    scoreVersion: interview.scoreVersion,

    scoreHistory: interview.scoreHistory,

    technologyScores: interview.technologyScores,

    candidateLevel: interview.estimatedCandidateLevel,

    candidateLevelScore: interview.candidateLevelScore,

    candidateLevelConfidence: interview.candidateLevelConfidence,

    candidateLevelHistory: interview.candidateLevelHistory,

    answeredQuestions: interview.answeredQuestions,

    skippedQuestions: interview.skippedQuestions,

    completedQuestions: interview.completedQuestions,

    generatedQuestions: interview.generatedQuestions,

    targetQuestions: interview.totalQuestions,

    scoreChanged: overallScoreChanged,
  };
};

// ============================================================
// UPDATE ANSWER EVALUATION STATE
// ============================================================

const markAnswerEvaluationCompleted = async ({ answerId, evaluation }) => {
  await Answer.findByIdAndUpdate(answerId, {
    $set: {
      evaluationStatus: "completed",

      evaluationVersion: Number(evaluation?.version) || 1,

      evaluatedAt: new Date(),

      evaluationError: {
        code: null,
        message: null,
        provider: evaluation?.evaluatedBy || null,
        occurredAt: null,
      },
    },
  });
};

const markAnswerEvaluationFailed = async ({ answerId, error }) => {
  await Answer.findByIdAndUpdate(answerId, {
    $set: {
      evaluationStatus: "failed",

      evaluationError: {
        code: error?.code || "EVALUATION_FAILED",

        message: error?.message || "Evaluation failed",

        provider: null,

        occurredAt: new Date(),
      },
    },
  });
};

// ============================================================
// EVALUATE ANSWER
// ORIGINAL EVALUATION
// ============================================================

const evaluateAnswer = async (userId, interviewId, questionId) => {
  validateObjectId(userId, "user ID");

  validateObjectId(interviewId, "interview ID");

  validateObjectId(questionId, "question ID");

  const interview = await Interview.findOne({
    _id: interviewId,
    user: userId,
  }).lean();

  if (!interview) {
    throw new Error("Interview not found");
  }

  if (interview.status !== "in-progress" && interview.status !== "completed") {
    throw new Error("Interview cannot be evaluated in its current state");
  }

  const question = await getInterviewQuestion(interviewId, questionId);

  // ----------------------------------------------------------
  // LATEST ANSWER DOCUMENT
  // ----------------------------------------------------------

  const answer = await Answer.findOne({
    interview: interviewId,
    question: questionId,
    user: userId,
  }).sort({
    submissionVersion: -1,
    createdAt: -1,
  });

  if (!answer) {
    throw new Error("Answer not found");
  }

  const answerText = getCandidateAnswerText(answer, question);

  if (!answerText) {
    throw new Error("Cannot evaluate an empty answer");
  }

  // ----------------------------------------------------------
  // ORIGINAL EVALUATION ALREADY EXISTS
  // ----------------------------------------------------------

  const originalEvaluation = await Evaluation.findOne({
    interview: interviewId,
    question: questionId,
    evaluationType: "original",
    status: "completed",
  })
    .sort({
      version: 1,
      createdAt: 1,
    })
    .lean();

  if (originalEvaluation) {
    return {
      evaluation: originalEvaluation,

      provider: originalEvaluation.evaluatedBy,

      model: originalEvaluation?.metadata?.model || null,

      alreadyEvaluated: true,
      reEvaluation: false,

      version: Number(originalEvaluation.version) || 1,

      answerVersion:
        Number(originalEvaluation?.metadata?.answerVersion) ||
        Number(answer.submissionVersion) ||
        1,

      interviewProgress: null,
      scoreData: null,
    };
  }

  // ----------------------------------------------------------
  // PROCESSING LOCK
  // ----------------------------------------------------------

  const lock = await Answer.findOneAndUpdate(
    {
      _id: answer._id,

      evaluationStatus: {
        $in: ["pending", "failed"],
      },
    },
    {
      $set: {
        evaluationStatus: "processing",

        evaluationError: {
          code: null,
          message: null,
          provider: null,
          occurredAt: null,
        },
      },
    },
    {
      new: true,
    },
  );

  if (!lock) {
    const currentAnswer = await Answer.findById(answer._id).lean();

    if (currentAnswer?.evaluationStatus === "processing") {
      throw new Error("Answer evaluation is already in progress");
    }

    if (currentAnswer?.evaluationStatus === "completed") {
      const completedEvaluation = await Evaluation.findOne({
        interview: interviewId,
        question: questionId,
        answer: answer._id,
        status: "completed",
      })
        .sort({
          version: -1,
          createdAt: -1,
        })
        .lean();

      if (completedEvaluation) {
        return {
          evaluation: completedEvaluation,

          provider: completedEvaluation.evaluatedBy,

          model: completedEvaluation?.metadata?.model || null,

          alreadyEvaluated: true,
          reEvaluation: false,

          version: Number(completedEvaluation.version) || 1,

          answerVersion:
            Number(completedEvaluation?.metadata?.answerVersion) ||
            Number(answer.submissionVersion) ||
            1,

          interviewProgress: null,
          scoreData: null,
        };
      }
    }

    throw new Error("Unable to start answer evaluation");
  }

  try {
    const aiResult = await runAIEvaluation({
      interview,
      question,
      answer: lock,
      evaluationType: "original",
      version: 1,
    });

    let evaluation;

    try {
      evaluation = await createEvaluation({
        interview,
        question,
        answer: lock,

        evaluationData: aiResult.evaluationData,

        result: aiResult.result,

        evaluationType: "original",

        version: 1,

        previousEvaluation: null,

        answerVersion: Number(lock.submissionVersion) || 1,

        processingTimeMs: aiResult.processingTimeMs,
      });
    } catch (error) {
      if (error?.code === 11000) {
        const duplicate = await Evaluation.findOne({
          interview: interviewId,
          question: questionId,
          evaluationType: "original",
          status: "completed",
        })
          .sort({
            version: 1,
            createdAt: 1,
          })
          .lean();

        if (duplicate) {
          await Answer.findByIdAndUpdate(lock._id, {
            $set: {
              evaluationStatus: "completed",

              evaluationVersion: Number(duplicate.version) || 1,

              evaluatedAt: new Date(),
            },
          });

          return {
            evaluation: duplicate,

            provider: duplicate.evaluatedBy,

            model: duplicate?.metadata?.model || null,

            alreadyEvaluated: true,
            reEvaluation: false,

            version: Number(duplicate.version) || 1,

            answerVersion:
              Number(duplicate?.metadata?.answerVersion) ||
              Number(lock.submissionVersion) ||
              1,

            interviewProgress: null,
            scoreData: null,
          };
        }
      }

      throw error;
    }

    await markAnswerEvaluationCompleted({
      answerId: lock._id,
      evaluation,
    });

    // Question should already be marked
    // answered by answer.service.
    // Keep it synchronized.
    await Question.findOneAndUpdate(
      {
        _id: questionId,
        interview: interviewId,
      },
      {
        $set: {
          status: "answered",
          skippedAt: null,
        },
      },
    );

    const scoreData = await recalculateInterviewScores({
      userId,
      interviewId,
      reason: "initial-evaluation",
      changedQuestionId: null,
    });

    const finalEvaluation = await Evaluation.findById(evaluation._id).lean();

    return {
      evaluation: finalEvaluation,

      provider: aiResult.result.provider,

      model: aiResult.result.model || null,

      alreadyEvaluated: false,
      reEvaluation: false,

      version: 1,

      answerVersion: Number(lock.submissionVersion) || 1,

      interviewProgress: {
        completedQuestions: scoreData.completedQuestions,

        answeredQuestions: scoreData.answeredQuestions,

        skippedQuestions: scoreData.skippedQuestions,

        generatedQuestions: scoreData.generatedQuestions,

        targetQuestions: scoreData.targetQuestions,

        remainingQuestions: Math.max(
          scoreData.targetQuestions - scoreData.completedQuestions,
          0,
        ),

        percentage: scoreData.targetQuestions
          ? Math.round(
              (scoreData.completedQuestions / scoreData.targetQuestions) * 100,
            )
          : 0,

        interviewCompleted:
          scoreData.completedQuestions >= scoreData.targetQuestions,
      },

      scoreData,
    };
  } catch (error) {
    debugError("Original evaluation failed", error);

    await markAnswerEvaluationFailed({
      answerId: lock._id,
      error,
    });

    throw error;
  }
};

// ============================================================
// APPLY NEW ANSWER VERSION
//
// IMPORTANT:
// Still uses ONE Answer document.
//
// If answer content changed:
//   answerVersions gets new version.
//
// If answer content did not change:
//   no duplicate answer version is created.
// ============================================================

const applyAnswerVersion = async ({
  answer,
  answerType,
  answerText,
  code,
  language,
}) => {
  const normalizedText = cleanText(answerText);

  const normalizedCode = cleanText(code);

  const normalizedLanguage = cleanText(language, 100);

  const currentVersion = Number(answer.submissionVersion) || 1;

  const currentText = cleanText(answer.answerText);

  const currentCode = cleanText(answer.code);

  const currentLanguage = cleanText(answer.language, 100);

  const sameAnswer =
    (currentText || "") === (normalizedText || "") &&
    (currentCode || "") === (normalizedCode || "") &&
    (currentLanguage || "") === (normalizedLanguage || "") &&
    (answer.answerType || "") === (answerType || "");

  // No content change.
  if (sameAnswer) {
    return {
      answer,
      answerVersion: currentVersion,
      changed: false,
    };
  }

  const nextVersion = currentVersion + 1;

  if (nextVersion > 100) {
    throw new Error("Maximum of 100 answer versions allowed for one question");
  }

  const now = new Date();

  if (!Array.isArray(answer.answerVersions)) {
    answer.answerVersions = [];
  }

  answer.answerVersions.push({
    version: nextVersion,

    text: normalizedText || null,

    code: normalizedCode || null,

    language: normalizedLanguage || null,

    submissionType: "resubmission",

    submittedAt: now,
  });

  answer.answerType = answerType;

  answer.answerText = normalizedText || null;

  answer.code = normalizedCode || null;

  answer.language = normalizedLanguage || null;

  answer.currentAnswer = {
    text: normalizedText || null,

    code: normalizedCode || null,

    language: normalizedLanguage || null,

    version: nextVersion,

    submittedAt: now,
  };

  answer.submissionVersion = nextVersion;

  answer.lastSubmissionAt = now;

  await answer.save();

  return {
    answer,
    answerVersion: nextVersion,
    changed: true,
  };
};

// ============================================================
// RE-EVALUATE ANSWER
//
// One Answer document.
// New answer version ONLY when answer changed.
// New Evaluation document EVERY time.
// ============================================================

const reEvaluateAnswer = async (
  userId,
  interviewId,
  questionId,
  answerInput = {},
) => {
  validateObjectId(userId, "user ID");

  validateObjectId(interviewId, "interview ID");

  validateObjectId(questionId, "question ID");

  const interview = await Interview.findOne({
    _id: interviewId,
    user: userId,
  }).lean();

  if (!interview) {
    throw new Error("Interview not found");
  }

  if (interview.status !== "in-progress" && interview.status !== "completed") {
    throw new Error("Interview cannot be re-evaluated in its current state");
  }

  const question = await getInterviewQuestion(interviewId, questionId);

  if (question.status !== "answered") {
    throw new Error("Only answered questions can be re-evaluated");
  }

  // ----------------------------------------------------------
  // SAME ANSWER DOCUMENT
  // ----------------------------------------------------------

  const answer = await Answer.findOne({
    interview: interviewId,
    question: questionId,
    user: userId,
  }).sort({
    submissionVersion: -1,
    createdAt: -1,
  });

  if (!answer) {
    throw new Error("Answer not found");
  }

  // ----------------------------------------------------------
  // ORIGINAL EVALUATION
  // ----------------------------------------------------------

  const originalEvaluation = await Evaluation.findOne({
    interview: interviewId,
    question: questionId,
    evaluationType: "original",
    status: "completed",
  })
    .sort({
      version: 1,
      createdAt: 1,
    })
    .lean();

  if (!originalEvaluation) {
    throw new Error("Original evaluation must exist before re-evaluation");
  }

  // ----------------------------------------------------------
  // DETERMINE EFFECTIVE ANSWER
  // ----------------------------------------------------------

  const questionType = question.category;

  const isCodeQuestion =
    questionType === "coding" ||
    questionType === "dsa" ||
    questionType === "debugging";

  const requestedAnswerText =
    typeof answerInput?.answerText === "string"
      ? cleanText(answerInput.answerText)
      : null;

  const requestedAnswerType =
    typeof answerInput?.answerType === "string"
      ? answerInput.answerType.trim()
      : null;

  const requestedCode =
    typeof answerInput?.code === "string" ? cleanText(answerInput.code) : null;

  const requestedLanguage =
    typeof answerInput?.language === "string"
      ? cleanText(answerInput.language, 100)
      : null;

  let effectiveAnswerType =
    requestedAnswerType ||
    answer.answerType ||
    (isCodeQuestion ? questionType : "text");

  let effectiveAnswerText =
    requestedAnswerText !== null
      ? requestedAnswerText
      : cleanText(answer.answerText);

  let effectiveCode =
    requestedCode !== null ? requestedCode : cleanText(answer.code);

  let effectiveLanguage =
    requestedLanguage !== null
      ? requestedLanguage
      : cleanText(answer.language, 100);

  // Coding/debugging must be evaluated
  // from code.
  if (isCodeQuestion) {
    effectiveAnswerText = "";
  } else {
    effectiveCode = "";
    effectiveLanguage = "";
    effectiveAnswerType = "text";
  }

  const effectiveCandidateAnswer = isCodeQuestion
    ? effectiveCode
    : effectiveAnswerText;

  if (!effectiveCandidateAnswer) {
    throw new Error("Cannot re-evaluate an empty answer");
  }

  // ----------------------------------------------------------
  // APPLY ANSWER VERSION ONLY IF CHANGED
  // ----------------------------------------------------------

  const versionResult = await applyAnswerVersion({
    answer,
    answerType: effectiveAnswerType,

    answerText: effectiveAnswerText,

    code: effectiveCode,

    language: effectiveLanguage,
  });

  const currentAnswer = versionResult.answer;

  const answerVersion = versionResult.answerVersion;

  // ----------------------------------------------------------
  // NEXT EVALUATION VERSION
  // ----------------------------------------------------------

  const nextEvaluationVersion = await getNextEvaluationVersion({
    interviewId,
    questionId,
  });

  // ----------------------------------------------------------
  // AI
  // ----------------------------------------------------------

  try {
    await Answer.findByIdAndUpdate(currentAnswer._id, {
      $set: {
        evaluationStatus: "processing",

        evaluationError: {
          code: null,
          message: null,
          provider: null,
          occurredAt: null,
        },
      },
    });

    const aiResult = await runAIEvaluation({
      interview,
      question,
      answer: currentAnswer,
      evaluationType: "re-evaluation",
      version: nextEvaluationVersion,
    });

    const latestEvaluation = await Evaluation.findOne({
      interview: interviewId,
      question: questionId,
      status: "completed",
    })
      .sort({
        version: -1,
        createdAt: -1,
      })
      .lean();

    const evaluation = await createEvaluation({
      interview,
      question,
      answer: currentAnswer,

      evaluationData: aiResult.evaluationData,

      result: aiResult.result,

      evaluationType: "re-evaluation",

      version: nextEvaluationVersion,

      previousEvaluation: latestEvaluation,

      answerVersion,

      processingTimeMs: aiResult.processingTimeMs,
    });

    await markAnswerEvaluationCompleted({
      answerId: currentAnswer._id,

      evaluation,
    });

    // Keep question answered.
    await Question.findOneAndUpdate(
      {
        _id: questionId,
        interview: interviewId,
      },
      {
        $set: {
          status: "answered",
          skippedAt: null,
        },
      },
    );

    // --------------------------------------------------------
    // RECALCULATE
    // --------------------------------------------------------

    const scoreData = await recalculateInterviewScores({
      userId,
      interviewId,
      reason: "question-re-evaluation",
      changedQuestionId: questionId,
    });

    const finalEvaluation = await Evaluation.findById(evaluation._id).lean();

    // --------------------------------------------------------
    // ORIGINAL VS CURRENT
    // --------------------------------------------------------

    const originalScore = Number(originalEvaluation.overallScore);

    const reEvaluatedScore = Number(finalEvaluation?.overallScore);

    const difference =
      Number.isFinite(originalScore) && Number.isFinite(reEvaluatedScore)
        ? Math.round((reEvaluatedScore - originalScore) * 100) / 100
        : null;

    debug("Answer re-evaluation completed", {
      questionId: String(questionId),

      answerVersion,

      evaluationVersion: nextEvaluationVersion,

      answerChanged: versionResult.changed,

      originalScore,

      reEvaluatedScore,

      difference,
    });

    return {
      evaluation: finalEvaluation,

      answer: {
        _id: currentAnswer._id,

        version: answerVersion,

        answerType: currentAnswer.answerType,

        answerText: currentAnswer.answerText,

        code: currentAnswer.code,

        language: currentAnswer.language,
      },

      previousAnswer: {
        _id: versionResult.changed ? null : currentAnswer._id,

        version: Math.max(1, answerVersion - 1),
      },

      originalEvaluation,

      comparison: {
        originalScore,
        reEvaluatedScore,
        difference,
      },

      provider: aiResult.result.provider,

      model: aiResult.result.model || null,

      alreadyEvaluated: false,
      reEvaluation: true,

      version: nextEvaluationVersion,

      answerVersion,

      scoreData,
    };
  } catch (error) {
    debugError("Answer re-evaluation failed", error);

    await markAnswerEvaluationFailed({
      answerId: currentAnswer._id,

      error,
    });

    throw error;
  }
};

// ============================================================
// FULL INTERVIEW RE-EVALUATION
// ============================================================

const reEvaluateInterview = async (userId, interviewId) => {
  validateObjectId(userId, "user ID");

  validateObjectId(interviewId, "interview ID");

  const interview = await Interview.findOne({
    _id: interviewId,
    user: userId,
  }).lean();

  if (!interview) {
    throw new Error("Interview not found");
  }

  const questions = await Question.find({
    interview: interviewId,
    status: "answered",
  })
    .sort({
      questionNumber: 1,
    })
    .lean();

  if (!questions.length) {
    throw new Error("No answered questions are available for re-evaluation");
  }

  const results = [];
  const failures = [];

  for (const question of questions) {
    try {
      const latestAnswer = await Answer.findOne({
        interview: interviewId,
        question: question._id,
        user: userId,
      })
        .sort({
          submissionVersion: -1,
          createdAt: -1,
        })
        .lean();

      if (!latestAnswer) {
        throw new Error("Answer not found");
      }

      let payload;

      const isCodeQuestion =
        question.category === "coding" ||
        question.category === "dsa" ||
        question.category === "debugging";

      if (isCodeQuestion) {
        payload = {
          answerType: latestAnswer.answerType,
          code: latestAnswer.code || "",
          language: latestAnswer.language || "",
        };
      } else {
        payload = {
          answerType: "text",
          answerText: latestAnswer.answerText || "",
        };
      }

      const result = await reEvaluateAnswer(
        userId,
        interviewId,
        question._id,
        payload,
      );

      results.push({
        questionId: String(question._id),

        questionNumber: question.questionNumber,

        success: true,

        answerVersion: result.answerVersion || null,

        evaluationVersion: result.version || null,

        score: result.evaluation?.overallScore ?? null,

        originalScore: result.comparison?.originalScore ?? null,

        reEvaluatedScore: result.comparison?.reEvaluatedScore ?? null,

        difference: result.comparison?.difference ?? null,
      });
    } catch (error) {
      failures.push({
        questionId: String(question._id),

        questionNumber: question.questionNumber,

        success: false,

        message: error?.message || "Re-evaluation failed",
      });

      debugError(`Failed to re-evaluate Q${question.questionNumber}`, error);
    }
  }

  const scoreData = await recalculateInterviewScores({
    userId,
    interviewId,
    reason: "full-re-evaluation",
    changedQuestionId: null,
  });

  return {
    success: failures.length === 0,

    interviewId,

    evaluatedQuestions: results.length,

    failedQuestions: failures.length,

    results,
    failures,

    scoreData,
  };
};

// ============================================================
// GET SINGLE EVALUATION
// ============================================================

const getEvaluation = async (userId, interviewId, questionId) => {
  validateObjectId(userId, "user ID");

  validateObjectId(interviewId, "interview ID");

  validateObjectId(questionId, "question ID");

  await getOwnedInterview(userId, interviewId);

  const current = await Evaluation.findOne({
    interview: interviewId,
    question: questionId,
    status: "completed",
  })
    .sort({
      version: -1,
      createdAt: -1,
    })
    .populate("question")
    .populate("answer")
    .lean();

  if (!current) {
    throw new Error("Evaluation not found");
  }

  const history = await Evaluation.find({
    interview: interviewId,
    question: questionId,
    status: "completed",
  })
    .sort({
      version: 1,
      createdAt: 1,
    })
    .populate("answer")
    .lean();

  const original =
    history.find((item) => item.evaluationType === "original") || null;

  let comparison = null;

  if (original) {
    const originalScore = Number(original.overallScore);

    const currentScore = Number(current.overallScore);

    if (Number.isFinite(originalScore) && Number.isFinite(currentScore)) {
      comparison = {
        originalScore,
        currentScore,

        difference: Math.round((currentScore - originalScore) * 100) / 100,
      };
    }
  }

  return {
    current,

    original,

    history,

    comparison,

    currentVersion: Number(current.version) || 1,

    answerVersion:
      Number(current?.metadata?.answerVersion) ||
      Number(current?.answer?.submissionVersion) ||
      1,
  };
};

// ============================================================
// GET ALL INTERVIEW EVALUATIONS
// ============================================================

const getInterviewEvaluations = async (userId, interviewId) => {
  validateObjectId(userId, "user ID");

  validateObjectId(interviewId, "interview ID");

  await getOwnedInterview(userId, interviewId);

  const allEvaluations = await Evaluation.find({
    interview: interviewId,
    status: "completed",
  })
    .populate("question")
    .populate("answer")
    .sort({
      createdAt: 1,
    })
    .lean();

  const latestEvaluations = getLatestEvaluations(allEvaluations);

  return {
    current: latestEvaluations,

    history: allEvaluations,
  };
};

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  evaluateAnswer,
  reEvaluateAnswer,
  reEvaluateInterview,

  getEvaluation,
  getInterviewEvaluations,

  recalculateInterviewScores,
};
