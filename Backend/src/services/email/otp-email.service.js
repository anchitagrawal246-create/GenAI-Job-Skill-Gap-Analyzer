const { createGmailTransporter } = require("./email.transporter");

const { getOTPEmailTemplate } = require("./email.templates");

// =========================================================
// SEND OTP EMAIL
// =========================================================
//
// This file controls the OTP email process.
//
// Flow:
//
// Controller
//     ↓
// sendOTPEmail()
//     ↓
// Create Gmail transporter
//     ↓
// Determine email purpose
//     ↓
// Generate HTML
//     ↓
// Send email
// =========================================================

async function sendOTPEmail({ email, otp, purpose = "EMAIL_VERIFICATION" }) {
  try {
    // =======================================================
    // VALIDATE INPUT
    // =======================================================

    if (!email) {
      throw new Error("Recipient email is required");
    }

    if (!otp) {
      throw new Error("OTP is required");
    }

    // =======================================================
    // CREATE GMAIL TRANSPORTER
    // =======================================================

    const transporter = await createGmailTransporter();

    // =======================================================
    // VERIFY SMTP CONNECTION
    // =======================================================

    await transporter.verify();

    console.log("Gmail SMTP authentication successful");

    // =======================================================
    // DEFAULT EMAIL CONTENT
    // =======================================================

    let subject = "Verify Your Email Address";

    let heading = "Email Verification";

    let description =
      "Use the verification code below to complete your registration.";

    // =======================================================
    // FORGOT PASSWORD
    // =======================================================

    if (purpose === "FORGOT_PASSWORD") {
      subject = "Reset Your Password";

      heading = "Password Reset Request";

      description =
        "We received a request to reset the password associated with your AI Interview account.";
    }

    // =======================================================
    // FORGOT USER ID
    // =======================================================

    if (purpose === "FORGOT_USER_ID") {
      subject = "Recover Your User ID";

      heading = "User ID Recovery";

      description =
        "We received a request to recover the User ID associated with your AI Interview account.";
    }

    // =======================================================
    // GENERATE HTML
    // =======================================================

    const html = getOTPEmailTemplate({
      otp,
      subject,
      heading,
      description,
    });

    // =======================================================
    // SEND EMAIL
    // =======================================================

    await transporter.sendMail({
      from: `"AI Interview" <${process.env.EMAIL_USER}>`,

      to: email,

      subject: `${subject} | AI Interview`,

      html,
    });

    // =======================================================
    // SUCCESS
    // =======================================================

    console.log(`OTP email sent successfully to ${email}`);

    return true;
  } catch (error) {
    // =======================================================
    // ERROR
    // =======================================================

    console.error("=================================");

    console.error("EMAIL ERROR");

    console.error("=================================");

    console.error("Code:", error.code);

    console.error("Message:", error.message);

    if (error.response) {
      console.error("Response:", error.response);
    }

    if (error.responseCode) {
      console.error("Response Code:", error.responseCode);
    }

    if (error.command) {
      console.error("Command:", error.command);
    }

    console.error("=================================");

    throw error;
  }
}

module.exports = {
  sendOTPEmail,
};
