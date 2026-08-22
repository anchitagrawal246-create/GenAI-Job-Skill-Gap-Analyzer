import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:3000/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// REGISTER
export const registerUser = async (userData) => {
  const response = await API.post("/auth/register", userData);
  return response.data;
};

// LOGIN
export const loginUser = async (userData) => {
  const response = await API.post("/auth/login", userData);
  return response.data;
};

// ForgotPaasword
export const forgotPassword = async (data) => {
  const response = await axios.post("/api/auth/forgot-password", data);

  return response.data;
};
export default API;
