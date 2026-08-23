const REFRESH_COOKIE_MAX_AGE =
  Number(process.env.REFRESH_TOKEN_COOKIE_MAX_AGE) || 7 * 24 * 60 * 60 * 1000;

/**
 * Common authentication cookie configuration.
 */
function getCookieBaseOptions() {
  const isProduction = process.env.NODE_ENV === "production";

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    path: "/",
  };
}

/**
 * Set short-lived access token cookie.
 */
function setAccessTokenCookie(res, token) {
  res.cookie("accessToken", token, {
    ...getCookieBaseOptions(),
    maxAge: 15 * 60 * 1000,
  });
}

/**
 * Set refresh token cookie.
 */
function setRefreshTokenCookie(res, refreshToken) {
  res.cookie("refreshToken", refreshToken, {
    ...getCookieBaseOptions(),
    maxAge: REFRESH_COOKIE_MAX_AGE,
  });
}

/**
 * Set Redis session ID cookie.
 */
function setSessionCookie(res, sessionId) {
  res.cookie("sessionId", sessionId, {
    ...getCookieBaseOptions(),
    maxAge: REFRESH_COOKIE_MAX_AGE,
  });
}

/**
 * Set all authentication cookies.
 */
function setAuthCookies(res, accessToken, refreshToken, sessionId) {
  setAccessTokenCookie(res, accessToken);
  setRefreshTokenCookie(res, refreshToken);
  setSessionCookie(res, sessionId);
}

/**
 * Clear all authentication cookies.
 */
function clearAuthCookies(res) {
  const options = getCookieBaseOptions();

  res.clearCookie("accessToken", options);
  res.clearCookie("refreshToken", options);
  res.clearCookie("sessionId", options);

  // Remove old cookie from previous authentication system.
  res.clearCookie("token", options);
}

module.exports = {
  setAuthCookies,
  setAccessTokenCookie,
  setRefreshTokenCookie,
  setSessionCookie,
  clearAuthCookies,
};
