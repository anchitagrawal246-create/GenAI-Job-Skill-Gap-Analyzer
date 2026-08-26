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
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
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

    // Access token expired / invalid
    if (status === 401) {
      console.warn("Access token expired or invalid. Logging out...");

      // Remove stored tokens
      localStorage.removeItem("accessToken");
      sessionStorage.removeItem("accessToken");

      // Optional: remove other auth-related data
      localStorage.removeItem("user");
      sessionStorage.removeItem("user");

      // Redirect to landing/login page
      window.location.href = "/login";
    }

    return Promise.reject(error);
  },
);

// ============================================================
// GET PROFILE
// ============================================================

export const getMyProfile = async () => {
  const response = await profileApi.get("/profile");

  return response.data;
};

// ============================================================
// UPDATE PROFILE
// ============================================================

export const updateProfile = async (formData) => {
  const response = await profileApi.put("/profile", formData);

  return response.data;
};

// ============================================================
// EXPORT
// ============================================================

export default profileApi;
