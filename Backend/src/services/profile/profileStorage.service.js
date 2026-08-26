const imagekit = require("../../config/imagekit");

// =========================================================
// CONSTANTS
// =========================================================

const PROFILE_FOLDER = "/ai-interview/profiles";
const RESUME_FOLDER = "/ai-interview/resumes";

const ALLOWED_PROFILE_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

const ALLOWED_RESUME_TYPES = ["application/pdf"];

// =========================================================
// CUSTOM ERROR
// =========================================================

function createStorageError(message, statusCode, code) {
  const error = new Error(message);

  error.statusCode = statusCode;
  error.code = code;

  return error;
}

// =========================================================
// GET FILE EXTENSION
// =========================================================

function getExtension(fileName) {
  if (!fileName || typeof fileName !== "string") {
    return "";
  }

  const index = fileName.lastIndexOf(".");

  if (index === -1) {
    return "";
  }

  return fileName.substring(index).toLowerCase();
}

// =========================================================
// VALIDATE FILE
// =========================================================

function validateFile(file) {
  if (!file) {
    throw createStorageError("File is required", 400, "FILE_REQUIRED");
  }

  if (!file.buffer) {
    throw createStorageError(
      "Uploaded file data is missing",
      400,
      "FILE_BUFFER_MISSING",
    );
  }

  if (!file.mimetype) {
    throw createStorageError(
      "Uploaded file type is missing",
      400,
      "FILE_TYPE_MISSING",
    );
  }
}

// =========================================================
// VALIDATE PROFILE PICTURE
// =========================================================

function validateProfilePicture(file) {
  validateFile(file);

  if (!ALLOWED_PROFILE_IMAGE_TYPES.includes(file.mimetype)) {
    throw createStorageError(
      "Profile picture must be a JPG, PNG, or WebP image",
      400,
      "INVALID_PROFILE_PICTURE_TYPE",
    );
  }
}

// =========================================================
// VALIDATE RESUME
// =========================================================

function validateResume(file) {
  validateFile(file);

  if (!ALLOWED_RESUME_TYPES.includes(file.mimetype)) {
    throw createStorageError(
      "Resume must be a PDF file",
      400,
      "INVALID_RESUME_TYPE",
    );
  }
}

// =========================================================
// UPLOAD PROFILE PICTURE
// =========================================================

async function uploadProfilePicture(file, userId) {
  if (!file) {
    return null;
  }

  validateProfilePicture(file);

  const extension = getExtension(file.originalname) || ".jpg";

  const fileName = `profile-${userId}-${Date.now()}${extension}`;

  const result = await imagekit.files.upload({
    file: file.buffer.toString("base64"),
    fileName,
    folder: PROFILE_FOLDER,
    useUniqueFileName: true,
  });

  return {
    url: result.url,
    fileId: result.fileId,
    fileName: result.name,
  };
}

// =========================================================
// UPLOAD RESUME
// =========================================================

async function uploadResume(file, userId) {
  if (!file) {
    return null;
  }

  validateResume(file);

  const fileName = `resume-${userId}-${Date.now()}.pdf`;

  const result = await imagekit.files.upload({
    file: file.buffer.toString("base64"),
    fileName,
    folder: RESUME_FOLDER,
    useUniqueFileName: true,
  });

  return {
    url: result.url,
    fileId: result.fileId,
    fileName: result.name,
  };
}

// =========================================================
// DELETE IMAGEKIT FILE
// =========================================================

async function deleteFile(fileId) {
  if (!fileId) {
    return;
  }

  try {
    await imagekit.files.delete(fileId);
  } catch (error) {
    // Deletion failure should not crash the entire profile
    // request after the database has already been updated.

    console.error("ImageKit delete error:", error.message);
  }
}

// =========================================================
// EXPORT
// =========================================================

module.exports = {
  uploadProfilePicture,
  uploadResume,
  deleteFile,
};
