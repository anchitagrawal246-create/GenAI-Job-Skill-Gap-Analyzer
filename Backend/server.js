require("dotenv").config();
const app = require("./src/app");
const connectToDB = require("./src/config/database");
const { connectRedis } = require("./src/config/redis");
console.log("JWT_SECRET_KEY:", process.env.JWT_SECRET_KEY);

const port = process.env.PORT || 3000;

async function startServer() {
  try {
    await connectToDB();
    await connectRedis();

    app.listen(port, () => {
      console.log(`THIS SERVER IS STARTED AT PORT ${port}`);
    });
  } catch (error) {
    console.error("Server startup error:", error);
    process.exit(1);
  }
}

startServer();
