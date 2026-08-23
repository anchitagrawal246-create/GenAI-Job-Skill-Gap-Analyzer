const { Router } = require("express");

// =========================================================
// AUTH ROUTE HUB
// =========================================================
//
// File:
// routes/auth.routes.js
//
// Purpose:
// Central router for all authentication-related routes.
//
// Base URL:
// /api/auth
//
// This file DOES NOT contain individual route definitions.
//
// Instead, it imports smaller route modules:
//
// register.routes.js
// login.routes.js
// session.routes.js
// recovery.routes.js
//
// Workflow:
//
// Client
//   ↓
// /api/auth
//   ↓
// auth.routes.js
//   ↓
// ┌─────────────────────────────┐
// │ register.routes.js          │
// │ login.routes.js             │
// │ session.routes.js           │
// │ recovery.routes.js          │
// └─────────────────────────────┘
//
// Why split the routes?
//
// Keeping every authentication route in one file makes the
// file difficult to maintain.
//
// Each route group is therefore placed in its own module.
//
// =========================================================

// =========================================================
// REGISTER ROUTES
// =========================================================
//
// Handles:
//
// POST /register
// GET  /check-username
// GET  /check-email
// POST /verify-registration
//
// =========================================================

const registerRoutes = require("./auth/register.routes");

// =========================================================
// LOGIN ROUTES
// =========================================================
//
// Handles:
//
// POST /login
// POST /refresh
//
// =========================================================

const loginRoutes = require("./auth/login.routes");

// =========================================================
// SESSION ROUTES
// =========================================================
//
// Handles:
//
// POST /logout
// POST /logout-all
// GET  /getme
//
// =========================================================

const sessionRoutes = require("./auth/session.routes");

// =========================================================
// RECOVERY ROUTES
// =========================================================
//
// Handles:
//
// POST /forgot-user-id
// POST /verify-user-id
// POST /forgot-password
// POST /verify-password-otp
// POST /reset-password
//
// =========================================================

const recoveryRoutes = require("./auth/recovery.routes");

// =========================================================
// CREATE AUTH ROUTER
// =========================================================

const authRouter = Router();

// =========================================================
// MOUNT ROUTE MODULES
// =========================================================

authRouter.use(registerRoutes);

authRouter.use(loginRoutes);

authRouter.use(sessionRoutes);

authRouter.use(recoveryRoutes);

// =========================================================
// EXPORT
// =========================================================

module.exports = authRouter;
