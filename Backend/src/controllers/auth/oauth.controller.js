const { google } = require("googleapis");

/**
 * Google OAuth2 Client
 */
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI,
);

/**
 * @name GoogleOAuthController
 * @route GET /auth/google
 * @description Redirects the user to Google's OAuth consent screen.
 * @access Public
 */
function GoogleOAuthController(req, res) {
  try {
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: ["https://mail.google.com/"],
    });

    return res.redirect(authUrl);
  } catch (error) {
    console.error("Google OAuth Error:", error);

    return res.status(500).json({
      message: "Failed to initialize Google OAuth",
    });
  }
}

/**
 * @name GoogleOAuthCallbackController
 * @route GET /auth/google/callback
 * @description Handles Google's OAuth callback and retrieves the refresh token.
 * @access Public
 */
async function GoogleOAuthCallbackController(req, res) {
  try {
    const { code, error } = req.query;

    // User denied permission
    if (error) {
      return res.status(400).json({
        message: "Google OAuth authorization was denied",
        error,
      });
    }

    // Authorization code missing
    if (!code) {
      return res.status(400).json({
        message: "Authorization code is missing",
      });
    }

    // Exchange authorization code for tokens
    const { tokens } = await oauth2Client.getToken(code);

    // Refresh token is required for Nodemailer
    if (!tokens.refresh_token) {
      return res.status(400).json({
        message:
          "Refresh token was not returned. Re-authorize the application with consent.",
      });
    }

    console.log("\n=================================");
    console.log("GOOGLE OAUTH SUCCESS");
    console.log("=================================");
    console.log("Refresh Token:");
    console.log(tokens.refresh_token);
    console.log("=================================\n");

    return res.status(200).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Google OAuth Success</title>
        </head>

        <body>
          <h2>Google OAuth Successful ✅</h2>

          <p>
            Your Gmail account has been successfully authorized.
          </p>

          <p>
            Check your backend terminal for the refresh token.
          </p>

          <p>
            You can now close this page.
          </p>
        </body>
      </html>
    `);
  } catch (error) {
    console.error(
      "Google OAuth Callback Error:",
      error.response?.data || error.message,
    );

    return res.status(500).json({
      message: "Google OAuth authentication failed",
    });
  }
}

module.exports = {
  GoogleOAuthController,
  GoogleOAuthCallbackController,
};
