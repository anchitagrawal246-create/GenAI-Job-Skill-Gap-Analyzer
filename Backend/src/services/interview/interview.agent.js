
const Interview = require("../../model/interview.model");
const Question = require("../../model/question.model");
const Answer = require("../../model/answer.model");
const Evaluation = require("../../model/evaluation.model");

const { generateAIResponse } = require("../ai/ai.gateway");

// ============================================================
// GENERATE NEXT INTERVIEW QUESTION
// ============================================================

const generateNextQuestion = async (userId, interviewId) => {
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
  // Get existing questions
  // ----------------------------------------------------------

  const questions = await Question.find({
    interview: interviewId,
  })
    .sort({
      questionNumber: 1,
    })
    .lean();

  // ----------------------------------------------------------
  // Check question limit
  // ----------------------------------------------------------

  if (questions.length >= interview.totalQuestions) {
    throw new Error("Maximum number of interview questions reached");
  }

  // ----------------------------------------------------------
  // Get previous answers
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
  // Get previous evaluations
  // ----------------------------------------------------------

  const evaluations = await Evaluation.find({
    interview: interviewId,
  })
    .sort({
      createdAt: 1,
    })
    .lean();

  // ----------------------------------------------------------
  // Determine next question number
  // ----------------------------------------------------------

  const nextQuestionNumber = questions.length + 1;

  // ----------------------------------------------------------
  // Build interview history
  // ----------------------------------------------------------

  const history = questions.map((question) => {
    const answer = answers.find(
      (item) =>
        item.question.toString() === question._id.toString()
    );

    const evaluation = evaluations.find(
      (item) =>
        item.question.toString() === question._id.toString()
    );

    return {
      questionNumber: question.questionNumber,
      question: question.question,
      category: question.category,
      difficulty: question.difficulty,

      answer: answer ? answer.answerText : null,

      evaluation: evaluation
        ? {
            correctnessScore: evaluation.correctnessScore,
            technicalScore: evaluation.technicalScore,
            communicationScore:
              evaluation.communicationScore,
            problemSolvingScore:
              evaluation.problemSolvingScore,
            overallScore: evaluation.overallScore,
            weaknesses: evaluation.weaknesses,
            mistakes: evaluation.mistakes,
            studyTopics: evaluation.studyTopics,
          }
        : null,
    };
  });

  // ----------------------------------------------------------
  // Convert history to readable text
  // ----------------------------------------------------------

  const historyText =
    history.length > 0
      ? history
          .map(
            (item) => `
Question ${item.questionNumber}:
${item.question}

Category:
${item.category}

Difficulty:
${item.difficulty}

Candidate Answer:
${item.answer || "Not answered"}

Evaluation:
${
  item.evaluation
    ? JSON.stringify(item.evaluation, null, 2)
    : "Not evaluated"
}
`
          )
          .join("\n-------------------------\n")
      : "No previous questions. This is the first question.";

  // ==========================================================
  // AI SYSTEM PROMPT
  // ==========================================================

  const systemPrompt = `
You are an expert AI interviewer.

Your job is to conduct a realistic adaptive technical interview.

You must generate exactly ONE next interview question.

The question must be appropriate for the candidate's:

- role
- experience level
- interview type
- difficulty
- technologies

You must also consider the candidate's previous answers and evaluations.

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

Total Questions:
${interview.totalQuestions}

Current Question Number:
${nextQuestionNumber}

============================================================
PREVIOUS INTERVIEW HISTORY
============================================================

${historyText}

============================================================
ADAPTIVE INTERVIEW RULES
============================================================

1. Do NOT repeat a previous question.

2. The next question should logically follow the interview.

3. Adapt the question according to the candidate's previous performance.

4. If the candidate performed poorly on an important concept:
   - ask a related question
   - test understanding
   - do not simply repeat the same question.

5. If the candidate performed well:
   - gradually increase difficulty
   - explore deeper concepts
   - ask practical or scenario-based questions.

6. For a fresher:
   - focus on fundamentals
   - do not unnecessarily ask extremely advanced questions.

7. For junior candidates:
   - include practical implementation questions.

8. For mid/senior candidates:
   - include architecture
   - trade-offs
   - scalability
   - debugging
   - production scenarios where appropriate.

9. For coding interviews:
   - ask coding/programming problems.
   - Include the problem statement.
   - Do not provide the solution.

10. For system-design interviews:
    - ask architecture/design questions.
    - Focus on requirements, scalability and trade-offs.

11. For behavioral interviews:
    - ask realistic behavioral questions.

12. For mixed interviews:
    - intelligently alternate between relevant categories.

13. Do not ask multiple questions at once.

14. Do not include the answer.

15. Do not include explanations outside the JSON.

============================================================
QUESTION DIFFICULTY
============================================================

Use one of:

easy
medium
hard

The difficulty should reflect the interview difficulty and
candidate performance.

============================================================
QUESTION CATEGORY
============================================================

Use exactly one:

technical
behavioral
coding
system-design
general

============================================================
EXPECTED TOPICS
============================================================

Return important concepts that a strong candidate should discuss
in the answer.

Do not return unrelated topics.

============================================================
OUTPUT
============================================================

Return ONLY valid JSON.

Format:

{
  "question": "",
  "category": "technical",
  "difficulty": "medium",
  "expectedTopics": []
}

Do not use markdown.

Do not use code fences.

Do not include any additional text.
`;

  // ==========================================================
  // CALL AI
  // ==========================================================

  const result = await generateAIResponse({
    systemPrompt,

    messages: [
      {
        role: "user",
        content:
          "Generate the next adaptive interview question.",
      },
    ],

    responseFormat: "json",
  });

  // ----------------------------------------------------------
  // Validate AI response
  // ----------------------------------------------------------

  if (!result || !result.content) {
    throw new Error(
      "AI interviewer returned an empty response"
    );
  }

  // ----------------------------------------------------------
  // Parse JSON
  // ----------------------------------------------------------

  let questionData;

  try {
    questionData = JSON.parse(result.content);
  } catch (error) {
    console.error(
      "[Interview Agent] Invalid AI JSON:",
      result.content
    );

    throw new Error(
      "AI interviewer returned invalid question JSON"
    );
  }

  // ==========================================================
  // VALIDATE QUESTION
  // ==========================================================

  if (
    typeof questionData.question !== "string" ||
    !questionData.question.trim()
  ) {
    throw new Error(
      "AI interviewer returned an invalid question"
    );
  }

  // ----------------------------------------------------------
  // Validate category
  // ----------------------------------------------------------

  const allowedCategories = [
    "technical",
    "behavioral",
    "coding",
    "system-design",
    "general",
  ];

  const category = allowedCategories.includes(
    questionData.category
  )
    ? questionData.category
    : "technical";

  // ----------------------------------------------------------
  // Validate difficulty
  // ----------------------------------------------------------

  const allowedDifficulties = [
    "easy",
    "medium",
    "hard",
  ];

  const difficulty = allowedDifficulties.includes(
    questionData.difficulty
  )
    ? questionData.difficulty
    : interview.difficulty;

  // ----------------------------------------------------------
  // Normalize expected topics
  // ----------------------------------------------------------

  const expectedTopics = Array.isArray(
    questionData.expectedTopics
  )
    ? questionData.expectedTopics
        .filter(
          (topic) =>
            typeof topic === "string" &&
            topic.trim()
        )
        .map((topic) => topic.trim())
        .slice(0, 10)
    : [];

  // ==========================================================
  // PREVENT DUPLICATE QUESTION
  // ==========================================================

  const normalizedQuestion =
    questionData.question.trim().toLowerCase();

  const duplicateQuestion = questions.some(
    (existingQuestion) =>
      existingQuestion.question.trim().toLowerCase() ===
      normalizedQuestion
  );

  if (duplicateQuestion) {
    throw new Error(
      "AI generated a duplicate interview question. Please try again."
    );
  }

  // ==========================================================
  // SAVE QUESTION
  // ==========================================================

  let question;

  try {
    question = await Question.create({
      interview: interviewId,

      questionNumber: nextQuestionNumber,

      question: questionData.question.trim(),

      category,

      difficulty,

      expectedTopics,

      status: "pending",
    });
  } catch (error) {
    // MongoDB duplicate questionNumber
    if (error.code === 11000) {
      throw new Error(
        "Question number already exists. Please try again."
      );
    }

    throw error;
  }

  // ==========================================================
  // RETURN RESULT
  // ==========================================================

  return {
    question,

    questionNumber: nextQuestionNumber,

    provider: result.provider || null,

    model: result.model || null,

    interviewProgress: {
      currentQuestion: nextQuestionNumber,

      totalQuestions: interview.totalQuestions,

      remainingQuestions: Math.max(
        interview.totalQuestions -
          nextQuestionNumber,
        0
      ),

      isLastQuestion:
        nextQuestionNumber >= interview.totalQuestions,
    },
  };
};

// ============================================================
// EXPORT
// ============================================================

module.exports = {
  generateNextQuestion,
};