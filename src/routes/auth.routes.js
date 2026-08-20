const { Router } = require("express");
const authContoller = require('../controllers/auth.controller')
const authRouter = Router();

/**
 * @routes POST  /api/auth/register
 * @description Register a new user
 * @access Public
 */

authRouter.post("/register", authContoller.RegisterUserController)

module.exports = authRouter;
