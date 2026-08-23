const { Router } = require("express");

const authController = require("../controllers/auth.controller");
const authMiddleware = require("../middleware/auth.middleware");

const {
  CheckUsernameController,
} = require("../controllers/checkUsername.controller");

const {
  ForgotUserIdController,
  VerifyUserIdController,
} = require("../controllers/forgotUserId.controller");

const {
  VerifyRegistrationController,
} = require("../controllers/verifyRegistration.controller");

const {
  ForgotPasswordController,
  VerifyPasswordOTPController,
  ResetPasswordController,
} = require("../controllers/forgotPassword.controller");

const authRouter = Router();

// ==========================================
// REGISTER
// ==========================================

authRouter.post("/register", authController.RegisterUserController);

authRouter.get("/check-username", CheckUsernameController);

authRouter.get("/check-email", authController.CheckEmailController);

authRouter.post("/verify-registration", VerifyRegistrationController);

// ==========================================
// LOGIN
// ==========================================

authRouter.post("/login", authController.LoginUserController);

// ==========================================
// LOGOUT
// ==========================================

authRouter.post("/logout", authMiddleware, authController.LogoutUserController);

// ==========================================
// GET CURRENT USER
// ==========================================

authRouter.get("/getme", authMiddleware, authController.GetMeUserController);

// ==========================================
// FORGOT USER ID
// ==========================================

authRouter.post("/forgot-user-id", ForgotUserIdController);

authRouter.post("/verify-user-id", VerifyUserIdController);

// ==========================================
// FORGOT PASSWORD
// ==========================================

authRouter.post("/forgot-password", ForgotPasswordController);

authRouter.post("/verify-password-otp", VerifyPasswordOTPController);

authRouter.post("/reset-password", ResetPasswordController);

module.exports = authRouter;
