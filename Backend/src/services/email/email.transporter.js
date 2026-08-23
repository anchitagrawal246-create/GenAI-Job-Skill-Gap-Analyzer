const nodemailer = require("nodemailer");

const { oauth2Client } = require("./email.oauth");

// =========================================================
// CREATE GMAIL TRANSPORTER
// =========================================================
//
// This file is responsible ONLY for creating
// the Nodemailer Gmail transporter.
//
// Used by:
// otp-email.service.js
// =========================================================

async function createGmailTransporter() {
  // =======================================================
  // GET GOOGLE ACCESS TOKEN
  // =======================================================

  const { token: accessToken } = await oauth2Client.getAccessToken();

  if (!accessToken) {
    throw new Error("Google access token was not generated");
  }

  // =======================================================
  // CREATE SMTP TRANSPORTER
  // =======================================================

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

  return transporter;
}

module.exports = {
  createGmailTransporter,
};
