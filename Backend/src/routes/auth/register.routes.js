const { Router } = require("express");

// =========================================================
// REGISTER ROUTES
// =========================================================
//
// File:
// routes/auth/register.routes.js
//
// Purpose:
// Contains all routes related to:
//
// 1. User registration
// 2. Username availability
// 3. Email availability
// 4. Registration OTP verification
//
// Workflow:
//
// Registration:
//
// Frontend
//   ↓
// POST /api/auth/register
//   ↓
// RegisterUserController
//   ↓
// Validate user data
//   ↓
// Generate OTP
//   ↓
// Store temporary registration data
//   ↓
// Send OTP email
//
// OTP verification:
//
// Frontend
//   ↓
// POST /api/auth/verify-registration
//   ↓
// VerifyRegistrationController
//   ↓
// Verify OTP
//   ↓
// Create/activate user
//   ↓
// Registration completed
//
// =========================================================

// =========================================================
// REGISTER CONTROLLER
// =========================================================

const {
  RegisterUserController,
} = require("../../controllers/auth/register.auth.controller");

// =========================================================
// USERNAME CONTROLLER
// =========================================================

const {
  CheckUsernameController,
} = require("../../controllers/auth/checkUsername.auth.controller");

// =========================================================
// EMAIL CONTROLLER
// =========================================================

const {
  CheckEmailController,
} = require("../../controllers/auth/email.auth.controller");

// =========================================================
// REGISTRATION OTP CONTROLLER
// =========================================================

const {
  VerifyRegistrationController,
} = require("../../controllers/auth/verifyRegistration.controller");

// =========================================================
// CREATE ROUTER
// =========================================================

const router = Router();
console.log("==========================================");
console.log("REGISTER CONTROLLER:", RegisterUserController);
console.log("USERNAME CONTROLLER:", CheckUsernameController);
console.log("EMAIL CONTROLLER:", CheckEmailController);
console.log("VERIFY REGISTRATION CONTROLLER:", VerifyRegistrationController);
console.log("==========================================");

// =========================================================
// CHECK USERNAME
// =========================================================
//
// GET /api/auth/check-username?username=anchit
//
// Workflow:
//
// Frontend
//   ↓
// Username entered
//   ↓
// GET /check-username
//   ↓
// CheckUsernameController
//   ↓
// MongoDB
//   ↓
// Available / Already exists
//
// =========================================================

router.get("/check-username", CheckUsernameController);

// =========================================================
// CHECK EMAIL
// =========================================================
//
// GET /api/auth/check-email?email=test@gmail.com
//
// Workflow:
//
// Frontend
//   ↓
// Email entered
//   ↓
// GET /check-email
//   ↓
// CheckEmailController
//   ↓
// MongoDB
//   ↓
// Available / Already exists
//
// =========================================================

router.get("/check-email", CheckEmailController);

// =========================================================
// REGISTER
// =========================================================
//
// POST /api/auth/register
//
// Request:
//
// {
//   "username": "anchit",
//   "email": "test@gmail.com",
//   "password": "Password@123"
// }
//
// =========================================================

router.post("/register", RegisterUserController);

// =========================================================
// VERIFY REGISTRATION OTP
// =========================================================
//
// POST /api/auth/verify-registration
//
// Request:
//
// {
//   "email": "test@gmail.com",
//   "otp": "123456"
// }
//
// =========================================================

router.post("/verify-registration", VerifyRegistrationController);

// =========================================================
// EXPORT
// =========================================================

module.exports = router;
