const app = require("./src/app");
const connectTodb = require("./src/db/database")
require("dotenv").config();
const port = process.env.PORT
app.listen(port, () => {
  console.log(`"THIS SERVER IS STARTED AT PORT ${port} "`);
});

connectTodb();
