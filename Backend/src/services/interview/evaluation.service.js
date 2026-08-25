const Evaluation = require("../../model/evaluation.model");
const Answer = require("../../model/answer.model");
const Interview = require("../../model/interview.model");
const Question = require("../../model/question.model");
const { generateAIResponse } = require("../ai/ai.gateway");

// ============================================================
// EVALUATE ANSWER
// ============================================================

const evaluateAnswer = async (userId, interviewId, questionId) => {
  // ----------------------------------------------------------
  // Find interview
  // ----------------------------------------------------------

  const interview = await Interview.findOne({
    _id: interviewId,
    user: userId,
  }).lean();

  if (!interview) {
    throw new Error("Interview not found");
  }

  // ----------------------------------------------------------
  // Interview must be in progress
  // ----------------------------------------------------------

  if (interview.status !== "in-progress") {
    throw new Error("Interview is not in progress");
  }

  // ----------------------------------------------------------
  // Find question
  // ----------------------------------------------------------

  const question = await Question.findOne({
    _id: questionId,
    interview: interviewId,
  }).lean();

  if (!question) {
    throw new Error("Question not found");
  }

  // ----------------------------------------------------------
  // Find answer
  // ----------------------------------------------------------

  const answer = await Answer.findOne({
    interview: interviewId,
    question: questionId,
    user: userId,
  });

  if (!answer) {
    throw new Error("Answer not found");
  }

  // ----------------------------------------------------------
  // Validate answer
  // ----------------------------------------------------------

  if (!answer.answerText || !answer.answerText.trim()) {
    throw new Error("Cannot evaluate an empty answer");
  }

  // ----------------------------------------------------------
  // Prevent duplicate evaluation
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
    };
  }

  // ----------------------------------------------------------
  // Prevent evaluation while already processing
  // ----------------------------------------------------------

  if (answer.evaluationStatus === "processing") {
    throw new Error("Answer evaluation is already in progress");
  }

  // ----------------------------------------------------------
  // Mark answer as processing
  // ----------------------------------------------------------

  answer.evaluationStatus = "processing";
  await answer.save();

  try {
    // ========================================================
    // AI EVALUATION PROMPT
    // ========================================================

    const systemPrompt = `
You are an expert technical interview evaluator.

Evaluate the candidate's answer against the interview question.

Your evaluation must be fair, realistic, objective, and appropriate
for the candidate's experience level.

============================================================
INTERVIEW DETAILS
============================================================

Role:
${interview.role}

Experience Level:
${interview.experienceLevel}

Interview Type:
${interview.interviewType}

Difficulty:
${interview.difficulty}

Technologies:
${(interview.technologies || []).join(", ")}

============================================================
QUESTION
============================================================

${question.question}

Question Category:
${question.category}

Question Difficulty:
${question.difficulty}

Expected Topics:
${(question.expectedTopics || []).join(", ")}

============================================================
CANDIDATE ANSWER
============================================================

${answer.answerText}

============================================================
EVALUATION CRITERIA
============================================================

1. correctnessScore

How factually correct is the candidate's answer?

Score from 0 to 100.

2. technicalScore

How well does the candidate demonstrate relevant technical
knowledge?

Score from 0 to 100.

3. communicationScore

How clearly and effectively is the answer communicated?

Score from 0 to 100.

4. problemSolvingScore

How well does the answer demonstrate reasoning,
problem-solving ability, and practical thinking?

Score from 0 to 100.

5. overallScore

Overall quality of the candidate's answer considering the
question, experience level, and difficulty.

Score from 0 to 100.

============================================================
STRENGTHS
============================================================

Identify what the candidate did correctly.

Return concise and specific points.

Do not praise things that are not actually present in the answer.

============================================================
WEAKNESSES
============================================================

Identify important weaknesses in the answer.

Examples:

- Missing technical details
- Incorrect concepts
- Incomplete implementation
- Poor explanation
- Missing edge cases
- Missing practical considerations
- Weak reasoning

Only identify weaknesses supported by the candidate's answer.

============================================================
MISTAKES
============================================================

Identify specific mistakes made by the candidate.

Only include actual mistakes or technically incorrect claims.

Do not invent mistakes.

If there are no significant mistakes, return an empty array.

============================================================
CORRECTIONS
============================================================

For every important mistake or weakness, explain how the candidate
could improve or correct it.

Corrections should be practical and useful.

Do not simply repeat the weakness.

============================================================
WHAT TO STUDY
============================================================

Identify technical topics the candidate should study based ONLY on:

- mistakes
- weaknesses
- missing knowledge
- incomplete understanding

Do not recommend unrelated technologies.

Each study topic must contain a priority.

Priority rules:

high:
Major knowledge gap or important mistake.

medium:
Basic understanding exists but deeper understanding or practice
is needed.

low:
Basic understanding is present but further improvement is useful.

Return this structure:

[
  {
    "topic": "MongoDB Indexing",
    "priority": "high"
  }
]

============================================================
SUGGESTIONS
============================================================

Provide actionable recommendations for improving future answers.

Suggestions may include:

- Writing code
- Explaining implementation details
- Discussing edge cases
- Improving answer structure
- Practicing concepts
- Giving practical examples
- Explaining trade-offs

============================================================
FEEDBACK
============================================================

Provide concise overall feedback.

Explain:

- What the candidate understood
- What was missing
- What should be improved

Consider the candidate's experience level.

============================================================
IMPORTANT RULES
============================================================

1. Evaluate ONLY the candidate's answer.

2. Do not invent information.

3. Do not assume knowledge that the candidate did not demonstrate.

4. Do not excessively penalize a fresher for not knowing advanced
   concepts unless the question explicitly requires them.

5. Do not give excessively high scores without justification.

6. Do not give excessively low scores when the core concept is correct.

7. Distinguish between an incorrect answer and an incomplete answer.

8. If the answer is correct but lacks detail, identify the missing
   detail instead of calling the entire answer wrong.

9. Study topics must directly relate to weaknesses or knowledge gaps.

10. Return ONLY valid JSON.

============================================================
JSON FORMAT
============================================================

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
  "studyTopics": [
    {
      "topic": "",
      "priority": "low"
    }
  ],
  "feedback": ""
}

Return ONLY JSON.
`;

    // ========================================================
    // SEND TO AI GATEWAY
    // ========================================================

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

    // ========================================================
    // VALIDATE AI RESPONSE
    // ========================================================

    if (!result || !result.content) {
      throw new Error("AI provider returned an empty evaluation");
    }

    // ========================================================
    // PARSE JSON
    // ========================================================

    let evaluationData;

    try {
      evaluationData = JSON.parse(result.content);
    } catch (error) {
      console.error("[Evaluation Service] Invalid AI JSON:", result.content);

      throw new Error("AI provider returned invalid evaluation JSON");
    }

    // ========================================================
    // VALIDATE SCORES
    // ========================================================

    const scoreFields = [
      "correctnessScore",
      "technicalScore",
      "communicationScore",
      "problemSolvingScore",
      "overallScore",
    ];

    for (const field of scoreFields) {
      const value = Number(evaluationData[field]);

      if (Number.isNaN(value) || value < 0 || value > 100) {
        throw new Error(`Invalid ${field} returned by AI`);
      }

      evaluationData[field] = Math.round(value);
    }

    // ========================================================
    // NORMALIZE ARRAYS
    // ========================================================

    const normalizeStringArray = (value) => {
      if (!Array.isArray(value)) {
        return [];
      }

      return value
        .filter((item) => typeof item === "string" && item.trim())
        .map((item) => item.trim())
        .slice(0, 10);
    };

    const strengths = normalizeStringArray(evaluationData.strengths);

    const weaknesses = normalizeStringArray(evaluationData.weaknesses);

    const mistakes = normalizeStringArray(evaluationData.mistakes);

    const corrections = normalizeStringArray(evaluationData.corrections);

    const suggestions = normalizeStringArray(evaluationData.suggestions);

    // ========================================================
    // VALIDATE STUDY TOPICS
    // ========================================================

    const studyTopics = Array.isArray(evaluationData.studyTopics)
      ? evaluationData.studyTopics
          .filter(
            (item) =>
              item &&
              typeof item.topic === "string" &&
              item.topic.trim() &&
              ["low", "medium", "high"].includes(item.priority),
          )
          .map((item) => ({
            topic: item.topic.trim(),
            priority: item.priority,
          }))
          .slice(0, 10)
      : [];

    // ========================================================
    // NORMALIZE FEEDBACK
    // ========================================================

    const feedback =
      typeof evaluationData.feedback === "string"
        ? evaluationData.feedback.trim()
        : "";

    // ========================================================
    // CREATE EVALUATION
    // ========================================================

    const evaluation = await Evaluation.create({
      interview: interviewId,
      question: questionId,
      answer: answer._id,

      // ------------------------------------------------------
      // Scores
      // ------------------------------------------------------

      correctnessScore: evaluationData.correctnessScore,

      technicalScore: evaluationData.technicalScore,

      communicationScore: evaluationData.communicationScore,

      problemSolvingScore: evaluationData.problemSolvingScore,

      overallScore: evaluationData.overallScore,

      // ------------------------------------------------------
      // Analysis
      // ------------------------------------------------------

      strengths,
      weaknesses,
      mistakes,
      corrections,
      suggestions,

      // ------------------------------------------------------
      // Study recommendations
      // ------------------------------------------------------

      studyTopics,

      // ------------------------------------------------------
      // Overall feedback
      // ------------------------------------------------------

      feedback,

      // ------------------------------------------------------
      // AI provider
      // ------------------------------------------------------

      evaluatedBy: result.provider,
    });

    // ========================================================
    // MARK ANSWER AS EVALUATED
    // ========================================================

    answer.evaluationStatus = "completed";
    await answer.save();

    // ========================================================
    // MARK QUESTION AS EVALUATED
    // ========================================================

    await Question.findOneAndUpdate(
      {
        _id: questionId,
        interview: interviewId,
      },
      {
        status: "evaluated",
      },
    );

    // ========================================================
    // UPDATE INTERVIEW PROGRESS
    // ========================================================

    const completedQuestions = await Evaluation.countDocuments({
      interview: interviewId,
    });

    await Interview.findOneAndUpdate(
      {
        _id: interviewId,
        user: userId,
      },
      {
        completedQuestions,
      },
    );

    // ========================================================
    // RETURN RESULT
    // ========================================================

    return {
      evaluation,

      provider: result.provider,

      model: result.model,

      interviewProgress: {
        completedQuestions,
        totalQuestions: interview.totalQuestions,
        remainingQuestions: Math.max(
          interview.totalQuestions - completedQuestions,
          0,
        ),
        isLastQuestion: completedQuestions >= interview.totalQuestions,
      },
    };
  } catch (error) {
    // ========================================================
    // MARK ANSWER EVALUATION AS FAILED
    // ========================================================

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
// GET EVALUATION
// ============================================================

const getEvaluation = async (userId, interviewId, questionId) => {
  // ----------------------------------------------------------
  // Verify interview ownership
  // ----------------------------------------------------------

  const interview = await Interview.findOne({
    _id: interviewId,
    user: userId,
  }).lean();

  if (!interview) {
    throw new Error("Interview not found");
  }

  // ----------------------------------------------------------
  // Find evaluation
  // ----------------------------------------------------------

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
  // ----------------------------------------------------------
  // Verify interview ownership
  // ----------------------------------------------------------

  const interview = await Interview.findOne({
    _id: interviewId,
    user: userId,
  }).lean();

  if (!interview) {
    throw new Error("Interview not found");
  }

  // ----------------------------------------------------------
  // Get evaluations
  // ----------------------------------------------------------

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
