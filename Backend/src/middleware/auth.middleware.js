const jwt = require("jsonwebtoken");
const { redisClient } = require("../config/redis");

async function authMiddleware(req, res, next) {
  try {
    const token = req.cookies.token;

    if (!token) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    // Check whether token was logged out
    const isBlacklisted = await redisClient.get(`blacklist:${token}`);

    if (isBlacklisted) {
      return res.status(401).json({
        message: "Token expired. Please login again.",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

    req.user = decoded;

    next();
  } catch (error) {
    return res.status(401).json({
      message: "Invalid User",
    });
  }
}

module.exports = authMiddleware;
