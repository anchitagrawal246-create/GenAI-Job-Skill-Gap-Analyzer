const UserModel = require("../model/user.model");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { redisClient } = require("../config/redis");

/**
 * @name RegisterUserController
 * @route POST /api/auth/register
 * @description Registers a new user, hashes the password, generates a JWT,
 *              and stores the JWT in an HTTP-only cookie.
 * @access Public
 *
 * @param {import("express").Request} req - Express request object
 * @param {import("express").Response} res - Express response object
 * @returns {Promise<import("express").Response>} HTTP response
 */
async function RegisterUserController(req, res) {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        message: "Please provide username, email and password",
      });
    }

    const isUserAlreadyExists = await UserModel.findOne({
      $or: [{ username }, { email }],
    });

    if (isUserAlreadyExists) {
      return res.status(400).json({
        message: "User already exists",
      });
    }

    const hash = await bcrypt.hash(password, 10);

    const user = await UserModel.create({
      username,
      email,
      password: hash,
    });

    const token = jwt.sign(
      {
        id: user._id,
        username: user.username,
      },
      process.env.JWT_SECRET_KEY,
      {
        expiresIn: "1d",
      },
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
    });

    return res.status(201).json({
      message: "User registered successfully",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
      },
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
}

/**
 * @name LoginUserController
 * @route POST /api/auth/login
 * @description Authenticates a user using email and password.
 *              Returns specific errors for an invalid email or password,
 *              generates a JWT, and stores it in an HTTP-only cookie.
 * @access Public
 *
 * @param {import("express").Request} req - Express request object
 * @param {import("express").Response} res - Express response object
 * @returns {Promise<import("express").Response>} HTTP response
 */
async function LoginUserController(req, res) {
  try {
    const { email, password } = req.body;

    // Check email
    const user = await UserModel.findOne({ email });

    if (!user) {
      return res.status(400).json({
        message: "Email is wrong",
      });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(400).json({
        message: "Password is wrong",
      });
    }

    // Generate JWT
    const token = jwt.sign(
      {
        id: user._id,
        username: user.username,
      },
      process.env.JWT_SECRET_KEY,
      {
        expiresIn: "1d",
      },
    );

    // Store JWT in HTTP-only cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
    });

    return res.status(200).json({
      message: "User LoggedIN successfully",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
      },
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
}

/**
 * @name LogoutUserController
 * @route POST /api/auth/logout
 * @description Logs out the current user by adding the JWT to the Redis
 *              blacklist and clearing the authentication cookie.
 * @access Private
 *
 * @param {import("express").Request} req - Express request object
 * @param {import("express").Response} res - Express response object
 * @returns {Promise<import("express").Response>} HTTP response
 */
async function LogoutUserController(req, res) {
  try {
    const token = req.cookies.token;

    if (!token) {
      return res.status(200).json({
        message: "User already logged out",
      });
    }

    // Add token to Redis blacklist
    await redisClient.set(`blacklist:${token}`, "true", {
      EX: 24 * 60 * 60,
    });

    // Remove token from browser
    res.clearCookie("token", {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
    });

    return res.status(200).json({
      message: "User logged out successfully",
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
}

/**
 * @name GetMeUserController
 * @route GET /api/auth/getme
 * @description Returns the currently authenticated user's information
 *              using the user ID stored in the verified JWT.
 * @access Private
 *
 * @param {import("express").Request} req - Express request object
 * @param {import("express").Response} res - Express response object
 * @returns {Promise<import("express").Response>} HTTP response
 */
async function GetMeUserController(req, res) {
  try {
    const user = await UserModel.findById(req.user.id).select("-password");

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    return res.status(200).json({
      message: "User fetched successfully",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
      },
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
}
module.exports = {
  RegisterUserController,
  LoginUserController,
  LogoutUserController,
  GetMeUserController
};
