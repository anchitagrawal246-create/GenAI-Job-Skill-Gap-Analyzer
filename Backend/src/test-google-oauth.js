require("dotenv").config();

const { google } = require("googleapis");

async function testGoogleOAuth() {
  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI,
    );

    oauth2Client.setCredentials({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
    });

    const { token } = await oauth2Client.getAccessToken();

    console.log("Access token generated:", !!token);

    if (!token) {
      throw new Error("Google did not return an access token");
    }

    console.log("GOOGLE OAUTH IS WORKING");
  } catch (error) {
    console.error(
      "GOOGLE OAUTH FAILED:",
      error.response?.data || error.message,
    );
  }
}

testGoogleOAuth();
