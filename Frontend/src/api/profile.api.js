
import axios from "axios";

const API_URL = "http://localhost:3000/api";

const profileApi = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

// ============================================================
// REQUEST INTERCEPTOR
// ============================================================

profileApi.interceptors.request.use(
  (config) => {
    const token =
      localStorage.getItem("accessToken") ||
      sessionStorage.getItem("accessToken");

    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },

  (error) => {
    return Promise.reject(error);
  }
);

// ============================================================
// RESPONSE INTERCEPTOR
// HANDLE EXPIRED / INVALID ACCESS TOKEN
// ============================================================

profileApi.interceptors.response.use(
  (response) => {
    return response;
  },

  (error) => {
    const status = error?.response?.status;

    if (status === 401) {
      console.warn(
        "Access token expired or invalid. Logging out..."
      );

      // ------------------------------------------------------
      // REMOVE ACCESS TOKENS
      // ------------------------------------------------------

      localStorage.removeItem("accessToken");
      sessionStorage.removeItem("accessToken");

      // ------------------------------------------------------
      // REMOVE STORED USER DATA
      // ------------------------------------------------------

      localStorage.removeItem("user");
      sessionStorage.removeItem("user");

      // ------------------------------------------------------
      // REDIRECT ONLY IF NOT ALREADY ON LOGIN
      // ------------------------------------------------------

      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

// ============================================================
// GET MY PROFILE
// GET /api/profile
// ============================================================

export const getMyProfile = async () => {
  const response = await profileApi.get("/profile");

  return response.data;
};

// ============================================================
// UPDATE PROFILE
// PUT /api/profile
// ============================================================

export const updateProfile = async (formData) => {
  const response = await profileApi.put(
    "/profile",
    formData
  );

  return response.data;
};

// ============================================================
// EXPORT
// ============================================================

export default profileApi;
