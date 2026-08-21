const app = require("../src/app");
const connectTodb = require("../src/config/database");
const { connectRedis } = require("../src/config/redis");
require("dotenv").config();
const port = process.env.PORT;
async function startServer() {
  try {
    await connectRedis();

    app.listen(port, () => {
      console.log(`"THIS SERVER IS STARTED AT PORT ${port} "`);
    });
  } catch (error) {
    console.error(error);
  }
}

startServer();

connectTodb();
