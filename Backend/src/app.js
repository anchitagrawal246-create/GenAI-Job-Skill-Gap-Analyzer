const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
/* require all the routes here */
app.post("/test-body", (req, res) => {
  console.log("TEST BODY:", req.body);
  
  return res.status(200).json({
    received: req.body,
  });
});
const authRouter = require("./routes/auth.routes");

app.use(cookieParser());

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  }),
);

/* using all the routes here */
app.use("/api/auth", authRouter);

module.exports = app;
