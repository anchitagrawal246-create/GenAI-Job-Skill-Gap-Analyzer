const { Router } = require("express");

const authContoller = require("../controllers/auth.controller");

const authMiddleware= require('../middleware/auth.middleware')

const authRouter = Router();

/**
 * @route POST /api/auth/register
 * @description Register a new user
 * @access Public
 */
authRouter.post("/register", authContoller.RegisterUserController);

/**
 * @route POST /api/auth/login
 * @description LOGIN an existing user
 * @access Public
 */
authRouter.post("/login", authContoller.LoginUserController);

/**
 * @route POST /api/auth/logout
 * @description Logout the current user
 * @access Public
 */
authRouter.post("/logout", authMiddleware, authContoller.LogoutUserController);

module.exports = authRouter;
