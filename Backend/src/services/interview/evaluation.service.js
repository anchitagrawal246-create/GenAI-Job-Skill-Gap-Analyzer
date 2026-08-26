const Evaluation = require("../../model/evaluation.model");
const Answer = require("../../model/answer.model");
const Interview = require("../../model/interview.model");
const Question = require("../../model/question.model");
const { generateAIResponse } = require("../ai/ai.gateway");

// ============================================================
// CONSTANTS
// ============================================================

const MAX_QUESTIONS = 100;

// ============================================================
// HELPERS
// ============================================================

const normalizeStringArray = (value, max = 10) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item) => typeof item === "string" && item.trim().length > 0)
    .map((item) => item.trim())
    .slice(0, max);
};

const validateScore = (value, fieldName) => {
  const score = Number(value);

  if (Number.isNaN(score) || score < 0 || score > 100) {
    throw new Error(`Invalid ${fieldName} returned by AI`);
  }

  return Math.round(score);
};

// ============================================================
// EVALUATE ANSWER
// ============================================================

const evaluateAnswer = async (userId, interviewId, questionId) => {
  const interview = await Interview.findOne({
    _id: interviewId,
    user: userId,
  }).lean();

  if (!interview) {
    throw new Error("Interview not found");
  }

  if (interview.status !== "in-progress") {
    throw new Error("Interview is not in progress");
  }

  const question = await Question.findOne({
    _id: questionId,
    interview: interviewId,
  }).lean();

  if (!question) {
    throw new Error("Question not found");
  }

  const answer = await Answer.findOne({
    interview: interviewId,
    question: questionId,
    user: userId,
  });

  if (!answer) {
    throw new Error("Answer not found");
  }

  if (!answer.answerText || !answer.answerText.trim()) {
    throw new Error("Cannot evaluate an empty answer");
  }

  // ----------------------------------------------------------
  // EXISTING EVALUATION
  // ----------------------------------------------------------

  const existingEvaluation = await Evaluation.findOne({
    interview: interviewId,
    question: questionId,
    answer: answer._id,
  });

  if (existingEvaluation) {
    return {
      evaluation: existingEvaluation,
      provider: existingEvaluation.evaluatedBy,
      model: null,
      alreadyEvaluated: true,
      interviewProgress: null,
    };
  }

  // ----------------------------------------------------------
  // PROCESSING
  // ----------------------------------------------------------

  if (answer.evaluationStatus === "processing") {
    throw new Error("Answer evaluation is already in progress");
  }

  answer.evaluationStatus = "processing";

  await answer.save();

  try {
    const systemPrompt = `
You are an expert AI technical interviewer and evaluator.

Evaluate the candidate's answer against the question.

Evaluate ONLY what the candidate actually demonstrated.

Do not invent skills, knowledge, experience or intent.

============================================================
INTERVIEW
============================================================

Role:
${interview.role}

AI Estimated Experience:
${interview.estimatedExperienceLevel || "Not enough evidence"}

Experience Confidence:
${interview.experienceConfidence ?? "Not enough evidence"}

Interview Type:
${interview.interviewType}

Difficulty Mode:
${interview.difficulty}

Current Question Difficulty:
${question.difficulty}

Technologies:
${(interview.technologies || []).join(", ")}

============================================================
QUESTION
============================================================

${question.question}

Category:
${question.category}

Difficulty:
${question.difficulty}

Expected Topics:
${(question.expectedTopics || []).join(", ")}

============================================================
CANDIDATE ANSWER
============================================================

${answer.answerText}

============================================================
SCORING
============================================================

correctnessScore:
0-100

technicalScore:
0-100

communicationScore:
0-100

problemSolvingScore:
0-100

overallScore:
0-100

Consider the difficulty of the question and the
knowledge actually demonstrated.

============================================================
STRENGTHS
============================================================

Only return strengths actually demonstrated.

============================================================
WEAKNESSES
============================================================

Only return weaknesses supported by the answer.

============================================================
MISTAKES
============================================================

Only return actual technical or logical mistakes.

Return [] if there are no meaningful mistakes.

============================================================
CORRECTIONS
============================================================

Provide practical corrections for important mistakes.

============================================================
STUDY TOPICS
============================================================

Recommend only topics related to actual weaknesses
or demonstrated knowledge gaps.

Each item:

{
  "topic": "Topic",
  "priority": "low | medium | high"
}

============================================================
SUGGESTIONS
============================================================

Provide practical advice for improving future answers.

============================================================
FEEDBACK
============================================================

Brief overall feedback explaining:

- what was understood
- what was correct
- what was missing
- what to improve

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

    const result = await generateAIResponse({
      systemPrompt,

      messages: [
        {
          role: "user",
          content: "Evaluate the candidate's answer.",
        },
      ],

      responseFormat: "json",
    });

    if (!result || !result.content) {
      throw new Error("AI provider returned an empty evaluation");
    }

    let evaluationData;

    try {
      evaluationData =
        typeof result.content === "string"
          ? JSON.parse(result.content)
          : result.content;
    } catch (error) {
      console.error("[Evaluation Service] Invalid AI JSON:", result.content);

      throw new Error("AI provider returned invalid evaluation JSON");
    }

    // --------------------------------------------------------
    // VALIDATE SCORES
    // --------------------------------------------------------

    const scoreFields = [
      "correctnessScore",
      "technicalScore",
      "communicationScore",
      "problemSolvingScore",
      "overallScore",
    ];

    for (const field of scoreFields) {
      evaluationData[field] = validateScore(evaluationData[field], field);
    }

    // --------------------------------------------------------
    // NORMALIZE ARRAYS
    // --------------------------------------------------------

    const strengths = normalizeStringArray(evaluationData.strengths);

    const weaknesses = normalizeStringArray(evaluationData.weaknesses);

    const mistakes = normalizeStringArray(evaluationData.mistakes);

    const corrections = normalizeStringArray(evaluationData.corrections);

    const suggestions = normalizeStringArray(evaluationData.suggestions);

    // --------------------------------------------------------
    // STUDY TOPICS
    // --------------------------------------------------------

    const studyTopics = Array.isArray(evaluationData.studyTopics)
      ? evaluationData.studyTopics
          .filter(
            (item) =>
              item &&
              typeof item.topic === "string" &&
              item.topic.trim().length > 0 &&
              ["low", "medium", "high"].includes(item.priority),
          )
          .map((item) => ({
            topic: item.topic.trim().slice(0, 150),

            priority: item.priority,
          }))
          .slice(0, 10)
      : [];

    // --------------------------------------------------------
    // FEEDBACK
    // --------------------------------------------------------

    const feedback =
      typeof evaluationData.feedback === "string"
        ? evaluationData.feedback.trim().slice(0, 5000)
        : "";

    // --------------------------------------------------------
    // CREATE EVALUATION
    // --------------------------------------------------------

    let evaluation;

    try {
      evaluation = await Evaluation.create({
        interview: interviewId,
        question: questionId,
        answer: answer._id,

        correctnessScore: evaluationData.correctnessScore,

        technicalScore: evaluationData.technicalScore,

        communicationScore: evaluationData.communicationScore,

        problemSolvingScore: evaluationData.problemSolvingScore,

        overallScore: evaluationData.overallScore,

        strengths,
        weaknesses,
        mistakes,
        corrections,
        suggestions,
        studyTopics,
        feedback,

        evaluatedBy: result.provider || "manual",
      });
    } catch (error) {
      if (error.code === 11000) {
        const duplicateEvaluation = await Evaluation.findOne({
          interview: interviewId,
          question: questionId,
          answer: answer._id,
        });

        if (duplicateEvaluation) {
          answer.evaluationStatus = "completed";

          await answer.save();

          return {
            evaluation: duplicateEvaluation,
            provider: duplicateEvaluation.evaluatedBy,
            model: null,
            alreadyEvaluated: true,
            interviewProgress: null,
          };
        }
      }

      throw error;
    }

    // --------------------------------------------------------
    // MARK ANSWER COMPLETE
    // --------------------------------------------------------

    answer.evaluationStatus = "completed";

    await answer.save();

    // --------------------------------------------------------
    // MARK QUESTION ANSWERED
    // --------------------------------------------------------

    await Question.findOneAndUpdate(
      {
        _id: questionId,
        interview: interviewId,
      },
      {
        $set: {
          status: "answered",
        },
      },
    );

    // --------------------------------------------------------
    // COUNT EVALUATIONS
    // --------------------------------------------------------

    const completedQuestions = await Evaluation.countDocuments({
      interview: interviewId,
    });

    // --------------------------------------------------------
    // UPDATE INTERVIEW PROGRESS
    // --------------------------------------------------------

    await Interview.findOneAndUpdate(
      {
        _id: interviewId,
        user: userId,
      },
      {
        $set: {
          completedQuestions: Math.min(completedQuestions, MAX_QUESTIONS),

          totalQuestions: Math.min(
            await Question.countDocuments({
              interview: interviewId,
            }),
            MAX_QUESTIONS,
          ),
        },
      },
    );

    // --------------------------------------------------------
    // CHECK MAXIMUM
    // --------------------------------------------------------

    const reachedMaximum = completedQuestions >= MAX_QUESTIONS;

    // --------------------------------------------------------
    // AUTO COMPLETE AT Q100
    // --------------------------------------------------------

    if (reachedMaximum) {
      const allEvaluations = await Evaluation.find({
        interview: interviewId,
      }).lean();

      const totalScore = allEvaluations.reduce(
        (sum, item) => sum + Number(item.overallScore || 0),
        0,
      );

      const overallScore = allEvaluations.length
        ? Math.round(totalScore / allEvaluations.length)
        : 0;

      await Interview.findOneAndUpdate(
        {
          _id: interviewId,
          user: userId,
          status: "in-progress",
        },
        {
          $set: {
            status: "completed",

            completedAt: new Date(),

            completedQuestions: Math.min(allEvaluations.length, MAX_QUESTIONS),

            totalQuestions: Math.min(allEvaluations.length, MAX_QUESTIONS),

            overallScore,

            exitReason: "maximum-reached",
          },
        },
      );
    }

    // --------------------------------------------------------
    // PROGRESS
    // --------------------------------------------------------

    const totalQuestions = await Question.countDocuments({
      interview: interviewId,
    });

    const interviewProgress = {
      completedQuestions,

      totalQuestions: Math.min(totalQuestions, MAX_QUESTIONS),

      remainingQuestions: Math.max(MAX_QUESTIONS - completedQuestions, 0),

      isLastQuestion: completedQuestions >= MAX_QUESTIONS,

      percentage: Math.min(
        100,
        Math.round((completedQuestions / MAX_QUESTIONS) * 100),
      ),

      interviewCompleted: reachedMaximum,
    };

    return {
      evaluation,

      provider: result.provider || "unknown",

      model: result.model || null,

      alreadyEvaluated: false,

      interviewProgress,
    };
  } catch (error) {
    try {
      answer.evaluationStatus = "failed";

      await answer.save();
    } catch (saveError) {
      console.error(
        "[Evaluation Service] Failed to update answer status:",
        saveError,
      );
    }

    throw error;
  }
};

// ============================================================
// GET SINGLE EVALUATION
// ============================================================

const getEvaluation = async (userId, interviewId, questionId) => {
  const interview = await Interview.findOne({
    _id: interviewId,
    user: userId,
  }).lean();

  if (!interview) {
    throw new Error("Interview not found");
  }

  const evaluation = await Evaluation.findOne({
    interview: interviewId,
    question: questionId,
  })
    .populate("question")
    .populate("answer")
    .lean();

  if (!evaluation) {
    throw new Error("Evaluation not found");
  }

  return evaluation;
};

// ============================================================
// GET ALL INTERVIEW EVALUATIONS
// ============================================================

const getInterviewEvaluations = async (userId, interviewId) => {
  const interview = await Interview.findOne({
    _id: interviewId,
    user: userId,
  }).lean();

  if (!interview) {
    throw new Error("Interview not found");
  }

  return Evaluation.find({
    interview: interviewId,
  })
    .populate("question")
    .populate("answer")
    .sort({
      createdAt: 1,
    })
    .lean();
};

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  evaluateAnswer,
  getEvaluation,
  getInterviewEvaluations,
};
