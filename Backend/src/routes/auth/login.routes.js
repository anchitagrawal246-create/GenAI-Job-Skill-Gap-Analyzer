const { Router } = require("express");

// =========================================================
// LOGIN & TOKEN ROUTES
// =========================================================
//
// File:
// routes/auth/login.routes.js
//
// Purpose:
// Handles authentication and access-token renewal.
//
// Routes:
//
// POST /login
// POST /refresh
//
// =========================================================
//
// LOGIN WORKFLOW
//
// Frontend
//   ↓
// POST /api/auth/login
//   ↓
// LoginUserController
//   ↓
// Find user in MongoDB
//   ↓
// Verify password with bcrypt
//   ↓
// Create Redis session
//   ↓
// Generate refresh token
//   ↓
// Generate access token
//   ↓
// Set authentication cookies
//   ↓
// Response
//
// =========================================================
//
// REFRESH WORKFLOW
//
// Frontend
//   ↓
// POST /api/auth/refresh
//   ↓
// RefreshTokenController
//   ↓
// Read refreshToken cookie
//   ↓
// Read sessionId cookie
//   ↓
// Check Redis session
//   ↓
// Validate refresh token
//   ↓
// Rotate tokens
//   ↓
// Generate new access token
//   ↓
// Set new cookies
//
// IMPORTANT:
//
// /refresh does NOT use authMiddleware.
//
// Reason:
//
// The access token may already be expired.
// The refresh token is used to obtain a new access token.
//
// =========================================================

// =========================================================
// LOGIN CONTROLLER
// =========================================================

const {
  LoginUserController,
} = require("../../controllers/auth/login.auth.controller");

// =========================================================
// REFRESH CONTROLLER
// =========================================================

const {
  RefreshTokenController,
} = require("../../controllers/auth/refresh.auth.controller");

// =========================================================
// CREATE ROUTER
// =========================================================

const router = Router();

// =========================================================
// LOGIN
// =========================================================
//
// POST /api/auth/login
//
// =========================================================

router.post("/login", LoginUserController);

// =========================================================
// REFRESH ACCESS TOKEN
// =========================================================
//
// POST /api/auth/refresh
//
// No authMiddleware.
//
// =========================================================

router.post("/refresh", RefreshTokenController);

// =========================================================
// EXPORT
// =========================================================

module.exports = router;
