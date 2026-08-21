const { Router } = require("express");

const authContoller = require("../controllers/auth.controller");

const authMiddleware= require('../middleware/auth.middleware')

const authRouter = Router();

// Register New User
/**
 * @route POST /api/auth/register
 * @description Register a new user
 * @access Public
 */
authRouter.post("/register", authContoller.RegisterUserController);

// Login Existing User
/**
 * @route POST /api/auth/login
 * @description LOGIN an existing user
 * @access Public
 */
authRouter.post("/login", authContoller.LoginUserController);

// Logut Current User
/**
 * @route POST /api/auth/logout
 * @description Logout the current user
 * @access Private
 */
authRouter.post("/logout", authContoller.LogoutUserController);

// Get Current User
/**
 * @route GET /api/auth/getme
 * @description Get the currently authenticated user's information
 * @access Private
 */
authRouter.get("/getme", authMiddleware, authContoller.GetMeUserController);

module.exports = authRouter;
