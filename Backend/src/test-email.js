require("dotenv").config();

const { sendOTPEmail } = require("./services/email.service");

(async () => {
  try {
    await sendOTPEmail("YOUR_TEST_EMAIL@gmail.com", "123456");

    console.log("EMAIL TEST SUCCESS");
  } catch (error) {
    console.error("EMAIL TEST FAILED");
  }
})();
