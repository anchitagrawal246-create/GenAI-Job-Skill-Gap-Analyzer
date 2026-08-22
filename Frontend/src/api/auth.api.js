
import axios from "axios";

// =====================================================
// AXIOS INSTANCE
// =====================================================

const API = axios.create({
  baseURL: "http://localhost:3000/api",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

// =====================================================
// REGISTER
// =====================================================

export const registerUser = async (userData) => {
  const response = await API.post("/auth/register", userData);
  return response.data;
};

// =====================================================
// VERIFY REGISTRATION OTP
// =====================================================

export const verifyOTP = async ({
  email,
  otp,
  purpose = "register",
}) => {
  const response = await API.post("/auth/verify-registration", {
    email,
    otp,
    purpose,
  });

  return response.data;
};

// =====================================================
// RESEND OTP
// =====================================================

export const resendOTP = async ({
  email,
  purpose = "register",
}) => {
  const response = await API.post("/auth/resend-otp", {
    email,
    purpose,
  });

  return response.data;
};

// =====================================================
// LOGIN
// =====================================================

export const loginUser = async (userData) => {
  const response = await API.post("/auth/login", userData);
  return response.data;
};

// =====================================================
// FORGOT PASSWORD
// =====================================================

export const forgotPassword = async ({ username }) => {
  const response = await API.post("/auth/forgot-password", {
    username,
  });

  return response.data;
};

// =====================================================
// VERIFY PASSWORD RESET OTP
// =====================================================

export const verifyPasswordOTP = async ({
  username,
  otp,
}) => {
  const response = await API.post("/auth/verify-password-otp", {
    username,
    otp,
  });

  return response.data;
};


// =====================================================
// RESET PASSWORD
// =====================================================

export const resetPassword = async ({
  resetToken,
  newPassword,
  confirmPassword,
}) => {
  console.log("RESET PASSWORD REQUEST:", {
    resetToken,
    newPassword,
    confirmPassword,
  });

  const response = await API.post("/auth/reset-password", {
    resetToken,
    newPassword,
    confirmPassword,
  });

  return response.data;
};



// =====================================================
// CHECK USERNAME
// =====================================================

export const checkUsername = async (username) => {
  const response = await API.get("/auth/check-username", {
    params: {
      username,
    },
  });

  return response.data;
};

// =====================================================
// DEFAULT EXPORT
// =====================================================

export default API;

