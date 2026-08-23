const { Router } = require("express");

// =========================================================
// SESSION ROUTES
// =========================================================
//
// File:
// routes/auth/session.routes.js
//
// Purpose:
// Handles authenticated user sessions.
//
// Routes:
//
// POST /logout
// POST /logout-all
// GET  /getme
//
// All routes in this file are protected by:
//
// middleware/auth.middleware.js
//
// =========================================================
//
// AUTHENTICATION WORKFLOW
//
// Request
//   ↓
// Access Token
//   ↓
// authMiddleware
//   ↓
// Verify JWT
//   ↓
// Attach user information to req.user
//   ↓
// Controller
//
// =========================================================

// =========================================================
// CONTROLLERS
// =========================================================

const {
  LogoutUserController,
  LogoutAllDevicesController,
} = require("../../controllers/auth/logout.auth.controller");

const {
  GetMeUserController,
} = require("../../controllers/auth/user.auth.controller");

// =========================================================
// AUTHENTICATION MIDDLEWARE
// =========================================================
//
// File:
//
// middleware/auth.middleware.js
//
// Purpose:
//
// Verifies the access token before allowing the request
// to reach the protected controller.
//
// =========================================================

const authMiddleware = require("../../middleware/auth.middleware");

// =========================================================
// CREATE ROUTER
// =========================================================

const router = Router();

// =========================================================
// LOGOUT CURRENT DEVICE
// =========================================================
//
// POST /api/auth/logout
//
// Workflow:
//
// Access Token
//   ↓
// authMiddleware
//   ↓
// req.user
//   ↓
// LogoutUserController
//   ↓
// Destroy current Redis session
//   ↓
// Clear cookies
//
// =========================================================

router.post("/logout", authMiddleware, LogoutUserController);

// =========================================================
// LOGOUT ALL DEVICES
// =========================================================
//
// POST /api/auth/logout-all
//
// Workflow:
//
// Access Token
//   ↓
// authMiddleware
//   ↓
// req.user
//   ↓
// LogoutAllDevicesController
//   ↓
// Delete all Redis sessions
//   ↓
// Clear authentication
//
// =========================================================

router.post("/logout-all", authMiddleware, LogoutAllDevicesController);

// =========================================================
// GET CURRENT USER
// =========================================================
//
// GET /api/auth/getme
//
// Workflow:
//
// Access Token
//   ↓
// authMiddleware
//   ↓
// req.user
//   ↓
// GetMeUserController
//   ↓
// MongoDB
//   ↓
// Return user information
//
// =========================================================

router.get("/getme", authMiddleware, GetMeUserController);

// =========================================================
// EXPORT
// =========================================================

module.exports = router;
