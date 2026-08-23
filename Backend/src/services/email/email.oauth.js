const { google } = require("googleapis");

// =========================================================
// GOOGLE OAUTH2 CLIENT
// =========================================================
//
// This file is responsible ONLY for creating
// the Google OAuth2 client.
//
// Used by:
// otp-email.service.js
//
// Required .env variables:
//
// GOOGLE_CLIENT_ID
// GOOGLE_CLIENT_SECRET
// GOOGLE_REDIRECT_URI
// GOOGLE_REFRESH_TOKEN
// =========================================================

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI,
);

// Attach the refresh token.
//
// Google will use this refresh token to generate
// temporary access tokens.
oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
});

module.exports = {
  oauth2Client,
};
