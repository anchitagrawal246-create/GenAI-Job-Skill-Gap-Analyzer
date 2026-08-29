// Backend/services/interview/answer/answer.query.service.js

const Answer = require("../../../model/answer.model");
const Question = require("../../../model/question.model");
const Evaluation = require("../../../model/evaluation.model");

const { validateObjectId } = require("./answer.validation");

const { getOwnedInterview } = require("./answer.validation.helpers");

const { buildAnswerSnapshot } = require("./answer.helpers");

const { updateInterviewCounters } = require("./answer.counter.service");

// ============================================================
// GET LATEST EVALUATION
// ============================================================

const getLatestQuestionEvaluation = async (
  interviewId,
  questionId,
  answerId = null,
) => {
  const query = {
    interview: interviewId,
    question: questionId,
    status: "completed",
  };

  if (answerId) {
    query.answer = answerId;
  }

  return Evaluation.findOne(query)
    .sort({
      version: -1,
      createdAt: -1,
    })
    .lean();
};

// ============================================================
// GET SINGLE ANSWER
// ============================================================

const getAnswer = async (userId, interviewId, questionId) => {
  validateObjectId(userId, "user ID");
  validateObjectId(interviewId, "interview ID");
  validateObjectId(questionId, "question ID");

  await getOwnedInterview(userId, interviewId);

  const answer = await Answer.findOne({
    interview: interviewId,
    question: questionId,
    user: userId,
  })
    .populate("question")
    .lean();

  if (!answer) {
    throw new Error("Answer not found");
  }

  return answer;
};

// ============================================================
// GET ALL ANSWERS
// ============================================================

const getInterviewAnswers = async (userId, interviewId) => {
  validateObjectId(userId, "user ID");
  validateObjectId(interviewId, "interview ID");

  await getOwnedInterview(userId, interviewId);

  const answers = await Answer.find({
    interview: interviewId,
    user: userId,
  })
    .populate("question")
    .lean();

  answers.sort((a, b) => {
    const aNumber = Number(a?.question?.questionNumber) || 0;

    const bNumber = Number(b?.question?.questionNumber) || 0;

    if (aNumber !== bNumber) {
      return aNumber - bNumber;
    }

    return new Date(a?.createdAt || 0) - new Date(b?.createdAt || 0);
  });

  return answers;
};

// ============================================================
// GET QUESTION STATUSES
// ============================================================

const getInterviewQuestionStatuses = async (userId, interviewId) => {
  validateObjectId(userId, "user ID");

  validateObjectId(interviewId, "interview ID");

  const interview = await getOwnedInterview(userId, interviewId);

  const questions = await Question.find({
    interview: interviewId,
  })
    .sort({
      questionNumber: 1,
    })
    .lean();

  const answers = await Answer.find({
    interview: interviewId,
    user: userId,
  }).lean();

  const answerMap = new Map();

  for (const answer of answers) {
    answerMap.set(String(answer.question), answer);
  }

  const questionStatuses = questions.map((question) => {
    const answer = answerMap.get(String(question._id)) || null;

    const snapshot = buildAnswerSnapshot(answer);

    return {
      questionId: question._id,

      questionNumber: question.questionNumber,

      status: question.status,

      category: question.category,

      difficulty: question.difficulty,

      skill: question.skill,

      answeredAt: question.answeredAt || null,

      skippedAt: question.skippedAt || null,

      skipReason: question.skipReason || null,

      hasAnswer: Boolean(answer),

      answerId: answer?._id || null,

      answerType: answer?.answerType || null,

      submissionVersion: Number(answer?.submissionVersion) || 0,

      evaluationStatus: answer?.evaluationStatus || null,

      evaluationVersion: Number(answer?.evaluationVersion) || 0,

      evaluatedAt: answer?.evaluatedAt || null,

      hasOriginalAnswer: snapshot.hasAnswer && Boolean(snapshot.originalAnswer),

      hasCurrentAnswer: snapshot.hasAnswer && Boolean(snapshot.currentAnswer),

      answerVersionCount: Array.isArray(answer?.answerVersions)
        ? answer.answerVersions.length
        : 0,

      codeRunCount: Array.isArray(answer?.runHistory)
        ? answer.runHistory.length
        : 0,
    };
  });

  return {
    interview: {
      interviewId: interview._id,

      totalQuestions: interview.totalQuestions,

      generatedQuestions: interview.generatedQuestions,

      answeredQuestions: interview.answeredQuestions,

      skippedQuestions: interview.skippedQuestions,

      completedQuestions: interview.completedQuestions,

      currentQuestionNumber: interview.currentQuestionNumber,

      status: interview.status,

      difficulty: interview.difficulty,

      currentDifficulty: interview.currentDifficulty,
    },

    questions: questionStatuses,
  };
};

module.exports = {
  getLatestQuestionEvaluation,
  getAnswer,
  getInterviewAnswers,
  getInterviewQuestionStatuses,
};
