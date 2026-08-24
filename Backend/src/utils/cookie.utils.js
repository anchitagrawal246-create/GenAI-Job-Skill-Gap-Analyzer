// =========================================================
// COOKIE CONFIGURATION
// =========================================================

const ACCESS_COOKIE_MAX_AGE =
  Number(process.env.ACCESS_TOKEN_COOKIE_MAX_AGE) || 15 * 60 * 1000; // 15 minutes

const REFRESH_COOKIE_MAX_AGE =
  Number(process.env.REFRESH_TOKEN_COOKIE_MAX_AGE) || 7 * 24 * 60 * 60 * 1000; // 7 days

// =========================================================
// COMMON COOKIE OPTIONS
// =========================================================

function getCookieBaseOptions() {
  const isProduction = process.env.NODE_ENV === "production";

  return {
    httpOnly: true,

    // HTTPS is required when secure=true.
    secure: isProduction,

    /*
     * Development:
     *   lax works well for localhost.
     *
     * Production:
     *   none is required when frontend/backend
     *   are on genuinely different sites.
     *
     * IMPORTANT:
     * SameSite=None requires Secure=true.
     */
    sameSite: isProduction ? "none" : "lax",

    path: "/",
  };
}

// =========================================================
// ACCESS TOKEN COOKIE
// =========================================================

/**
 * Set short-lived access token.
 *
 * Cookie:
 *   accessToken
 *
 * Security:
 *   - HttpOnly
 *   - Secure in production
 *   - Short lifetime
 */
function setAccessTokenCookie(res, accessToken) {
  if (!accessToken) {
    throw new Error("Access token is required");
  }

  res.cookie("accessToken", accessToken, {
    ...getCookieBaseOptions(),
    maxAge: ACCESS_COOKIE_MAX_AGE,
  });
}

// =========================================================
// REFRESH TOKEN COOKIE
// =========================================================

/**
 * Set long-lived refresh token.
 *
 * The raw refresh token is only sent to the browser.
 * Redis stores only its SHA-256 hash.
 */
function setRefreshTokenCookie(res, refreshToken) {
  if (!refreshToken) {
    throw new Error("Refresh token is required");
  }

  res.cookie("refreshToken", refreshToken, {
    ...getCookieBaseOptions(),
    maxAge: REFRESH_COOKIE_MAX_AGE,
  });
}

// =========================================================
// SESSION ID COOKIE
// =========================================================

/**
 * Set Redis session ID.
 *
 * The session ID itself is not a secret equivalent
 * to the refresh token, but it is still authentication
 * related and therefore remains HttpOnly.
 */
function setSessionCookie(res, sessionId) {
  if (!sessionId) {
    throw new Error("Session ID is required");
  }

  res.cookie("sessionId", sessionId, {
    ...getCookieBaseOptions(),
    maxAge: REFRESH_COOKIE_MAX_AGE,
  });
}

// =========================================================
// SET ALL AUTH COOKIES
// =========================================================

/**
 * Set complete authentication cookie set.
 *
 * Cookies:
 *   1. accessToken
 *   2. refreshToken
 *   3. sessionId
 */
function setAuthCookies(res, accessToken, refreshToken, sessionId) {
  setAccessTokenCookie(res, accessToken);
  setRefreshTokenCookie(res, refreshToken);
  setSessionCookie(res, sessionId);
}

// =========================================================
// CLEAR ACCESS TOKEN COOKIE
// =========================================================

function clearAccessTokenCookie(res) {
  res.clearCookie("accessToken", getCookieBaseOptions());
}

// =========================================================
// CLEAR REFRESH TOKEN COOKIE
// =========================================================

function clearRefreshTokenCookie(res) {
  res.clearCookie("refreshToken", getCookieBaseOptions());
}

// =========================================================
// CLEAR SESSION COOKIE
// =========================================================

function clearSessionCookie(res) {
  res.clearCookie("sessionId", getCookieBaseOptions());
}

// =========================================================
// CLEAR ALL AUTH COOKIES
// =========================================================

/**
 * Remove every authentication cookie.
 *
 * Also removes the old "token" cookie in case
 * an older authentication implementation created it.
 */
function clearAuthCookies(res) {
  const options = getCookieBaseOptions();

  res.clearCookie("accessToken", options);
  res.clearCookie("refreshToken", options);
  res.clearCookie("sessionId", options);

  // Legacy cookie from previous authentication system.
  res.clearCookie("token", options);
}

// =========================================================
// EXPORT
// =========================================================

module.exports = {
  ACCESS_COOKIE_MAX_AGE,
  REFRESH_COOKIE_MAX_AGE,

  setAuthCookies,
  setAccessTokenCookie,
  setRefreshTokenCookie,
  setSessionCookie,

  clearAccessTokenCookie,
  clearRefreshTokenCookie,
  clearSessionCookie,
  clearAuthCookies,
};
