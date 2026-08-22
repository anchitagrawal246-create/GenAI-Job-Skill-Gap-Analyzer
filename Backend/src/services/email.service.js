
const nodemailer = require("nodemailer");
const { google } = require("googleapis");

// ==========================================
// GOOGLE OAUTH2 CLIENT
// ==========================================

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
});

// ==========================================
// SEND OTP EMAIL
// ==========================================

/**
 * @name sendOTPEmail
 * @description
 * Sends a professional OTP email using Gmail OAuth2.
 *
 * @param {Object} options
 * @param {string} options.email - Recipient email
 * @param {string|number} options.otp - OTP code
 * @param {string} options.purpose - OTP purpose
 *
 * @returns {Promise<boolean>}
 */
async function sendOTPEmail({ email, otp, purpose = "EMAIL_VERIFICATION" }) {
  try {
    // ==========================================
    // VALIDATE INPUT
    // ==========================================

    if (!email) {
      throw new Error("Recipient email is required");
    }

    if (!otp) {
      throw new Error("OTP is required");
    }

    // ==========================================
    // GET GOOGLE ACCESS TOKEN
    // ==========================================

    const { token: accessToken } =
      await oauth2Client.getAccessToken();

    if (!accessToken) {
      throw new Error(
        "Google access token was not generated"
      );
    }

    // ==========================================
    // CREATE SMTP TRANSPORTER
    // ==========================================

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,

      auth: {
        type: "OAuth2",

        user: process.env.EMAIL_USER,

        clientId: process.env.GOOGLE_CLIENT_ID,

        clientSecret: process.env.GOOGLE_CLIENT_SECRET,

        refreshToken: process.env.GOOGLE_REFRESH_TOKEN,

        accessToken,
      },
    });

    // ==========================================
    // VERIFY SMTP CONNECTION
    // ==========================================

    await transporter.verify();

    console.log("Gmail SMTP authentication successful");

    // ==========================================
    // EMAIL CONTENT
    // ==========================================

    let subject = "Verify Your Email Address";
    let heading = "Email Verification";
    let description =
      "Use the verification code below to complete your registration.";

    // ==========================================
    // FORGOT PASSWORD
    // ==========================================

    if (purpose === "FORGOT_PASSWORD") {
      subject = "Reset Your Password";
      heading = "Password Reset Request";

      description =
        "We received a request to reset the password associated with your account.";
    }

    // ==========================================
    // FORGOT USER ID
    // ==========================================

    if (purpose === "FORGOT_USER_ID") {
      subject = "Recover Your User ID";
      heading = "User ID Recovery";

      description =
        "We received a request to recover the User ID associated with your account.";
    }

    // ==========================================
    // SEND EMAIL
    // ==========================================

    await transporter.sendMail({
      from: `"GenAI Skill Gap Predictor" <${process.env.EMAIL_USER}>`,

      to: email,

      subject: `${subject} | GenAI Skill Gap Predictor`,

      html: `
<!DOCTYPE html>

<html lang="en">

<head>

  <meta charset="UTF-8" />

  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  />

  <title>${subject}</title>

</head>

<body
  style="
    margin: 0;
    padding: 0;
    background-color: #f1f5f9;
    font-family: Arial, Helvetica, sans-serif;
  "
>

<table
  width="100%"
  cellpadding="0"
  cellspacing="0"
  border="0"
  style="
    background-color: #f1f5f9;
    padding: 40px 15px;
  "
>

<tr>

<td align="center">

<!-- ====================================== -->
<!-- MAIN CARD -->
<!-- ====================================== -->

<table
  width="600"
  cellpadding="0"
  cellspacing="0"
  border="0"
  style="
    width: 100%;
    max-width: 600px;
    background-color: #ffffff;
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 10px 35px rgba(15, 23, 42, 0.08);
  "
>

<!-- ====================================== -->
<!-- HEADER -->
<!-- ====================================== -->

<tr>

<td
  align="center"
  style="
    background-color: #0f172a;
    padding: 32px 25px;
  "
>

<div
  style="
    width: 48px;
    height: 48px;
    line-height: 48px;
    margin: 0 auto 12px;
    background-color: #2563eb;
    color: #ffffff;
    border-radius: 12px;
    font-size: 20px;
    font-weight: 700;
  "
>
  AI
</div>

<div
  style="
    color: #ffffff;
    font-size: 21px;
    font-weight: 700;
  "
>
  GenAI Skill Gap Predictor
</div>

<div
  style="
    margin-top: 7px;
    color: #94a3b8;
    font-size: 12px;
  "
>
  Intelligent Career & Skill Analysis
</div>

</td>

</tr>

<!-- ====================================== -->
<!-- CONTENT -->
<!-- ====================================== -->

<tr>

<td
  style="
    padding: 40px 40px 30px;
  "
>

<!-- Small heading -->

<div
  style="
    color: #2563eb;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    margin-bottom: 10px;
  "
>
  ${heading}
</div>

<!-- Main heading -->

<h1
  style="
    margin: 0 0 16px;
    color: #0f172a;
    font-size: 27px;
    line-height: 1.3;
  "
>
  Your verification code
</h1>

<!-- Description -->

<p
  style="
    margin: 0 0 28px;
    color: #64748b;
    font-size: 15px;
    line-height: 1.7;
  "
>
  ${description}
</p>

<!-- ====================================== -->
<!-- OTP BOX -->
<!-- ====================================== -->

<table
  width="100%"
  cellpadding="0"
  cellspacing="0"
  border="0"
  style="
    margin-bottom: 28px;
  "
>

<tr>

<td align="center">

<div
  style="
    display: inline-block;
    min-width: 220px;
    padding: 20px 30px;
    background-color: #eff6ff;
    border: 1px solid #bfdbfe;
    border-radius: 12px;
  "
>

<div
  style="
    color: #64748b;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    margin-bottom: 10px;
  "
>
  One-Time Password
</div>

<div
  style="
    color: #1d4ed8;
    font-size: 32px;
    font-weight: 800;
    letter-spacing: 8px;
  "
>
  ${otp}
</div>

</div>

</td>

</tr>

</table>

<!-- ====================================== -->
<!-- EXPIRATION NOTICE -->
<!-- ====================================== -->

<table
  width="100%"
  cellpadding="0"
  cellspacing="0"
  border="0"
  style="
    margin-bottom: 25px;
    background-color: #fff7ed;
    border: 1px solid #fed7aa;
    border-radius: 10px;
  "
>

<tr>

<td
  style="
    padding: 14px 16px;
    color: #9a3412;
    font-size: 13px;
    line-height: 1.6;
  "
>

<strong>Security notice:</strong>

This verification code will expire in
<strong>5 minutes</strong>.

</td>

</tr>

</table>

<!-- ====================================== -->
<!-- SECURITY MESSAGE -->
<!-- ====================================== -->

<p
  style="
    margin: 0;
    color: #64748b;
    font-size: 13px;
    line-height: 1.7;
  "
>

If you did not request this verification code,
you can safely ignore this email.

<br />

For your security, never share this code with anyone.

</p>

</td>

</tr>

<!-- ====================================== -->
<!-- DIVIDER -->
<!-- ====================================== -->

<tr>

<td style="padding: 0 40px;">

<div
  style="
    height: 1px;
    background-color: #e2e8f0;
  "
></div>

</td>

</tr>

<!-- ====================================== -->
<!-- FOOTER -->
<!-- ====================================== -->

<tr>

<td
  align="center"
  style="
    padding: 25px 40px 30px;
  "
>

<p
  style="
    margin: 0 0 8px;
    color: #64748b;
    font-size: 12px;
  "
>
  This is an automated security email.
</p>

<p
  style="
    margin: 0;
    color: #94a3b8;
    font-size: 11px;
    line-height: 1.6;
  "
>
  © ${new Date().getFullYear()}
  GenAI Skill Gap Predictor.
  All rights reserved.
</p>

</td>

</tr>

</table>

<!-- ====================================== -->
<!-- OUTSIDE CARD -->
<!-- ====================================== -->

<p
  style="
    max-width: 600px;
    margin: 18px auto 0;
    text-align: center;
    color: #94a3b8;
    font-size: 11px;
    line-height: 1.5;
  "
>
  Please do not reply to this email.
  This mailbox is not monitored.
</p>

</td>

</tr>

</table>

</body>

</html>
      `,
    });

    console.log(
      `OTP email sent successfully to ${email}`
    );

    return true;
  } catch (error) {
    console.error("=================================");
    console.error("EMAIL ERROR");
    console.error("=================================");

    console.error("Code:", error.code);
    console.error("Message:", error.message);

    if (error.response) {
      console.error("Response:", error.response);
    }

    if (error.responseCode) {
      console.error(
        "Response Code:",
        error.responseCode
      );
    }

    if (error.command) {
      console.error("Command:", error.command);
    }

    console.error("=================================");

    throw error;
  }
}

// ==========================================
// EXPORT
// ==========================================

module.exports = {
  sendOTPEmail,
};

