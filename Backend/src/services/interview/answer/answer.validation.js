// Backend/services/interview/answer/answer.validation.js

const mongoose = require("mongoose");

const validateObjectId = (id, fieldName) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error(`Invalid ${fieldName}`);
  }

  return id;
};

const cleanString = (value) => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length ? trimmed : null;
};

module.exports = {
  validateObjectId,
  cleanString,
};
