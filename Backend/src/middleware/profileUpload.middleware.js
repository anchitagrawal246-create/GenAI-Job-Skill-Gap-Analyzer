
const multer = require("multer");

// =========================================================
// MEMORY STORAGE
// =========================================================

const storage = multer.memoryStorage();

// =========================================================
// FILE FILTER
// =========================================================

function fileFilter(req, file, cb) {
  // =======================================================
  // PROFILE PICTURE
  // =======================================================

  if (file.fieldname === "profilePicture") {
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      return cb(
        new Error(
          "Profile picture must be JPG, PNG, or WebP"
        )
      );
    }

    return cb(null, true);
  }

  // =======================================================
  // RESUME
  // =======================================================

  if (file.fieldname === "resume") {
    if (file.mimetype !== "application/pdf") {
      return cb(
        new Error("Resume must be a PDF file")
      );
    }

    return cb(null, true);
  }

  // =======================================================
  // UNKNOWN FIELD
  // =======================================================

  return cb(
    new Error(
      `Unexpected file field: ${file.fieldname}`
    )
  );
}

// =========================================================
// MULTER
// =========================================================

const profileUpload = multer({
  storage,

  limits: {
    // 5 MB per file
    fileSize: 5 * 1024 * 1024,

    // Maximum two files
    files: 2,
  },

  fileFilter,
});

module.exports = profileUpload;
