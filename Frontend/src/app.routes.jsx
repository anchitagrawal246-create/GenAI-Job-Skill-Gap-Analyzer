import { createBrowserRouter } from "react-router-dom";

import Login from "./features/auth/pages/Login";
import Register from "./features/auth/pages/Register";
import Landing from "./features/home/landing";
import ForgotPassword from "./features/auth/pages/ForgotPassword";
import ResetPassword from "./features/auth/pages/ResetPassword";
import Success from "./features/auth/components/Dashboard";
import ForgotUserId from "./features/auth/pages/ForgotUserId";

import Dashboard from "./features/home/dashboard";
import { Profile } from "./features/home/Profile";
import InterviewAgent from "./features/home/InterviewAgent";

export const router = createBrowserRouter([
  // =====================================================
  // HOME
  // =====================================================
  {
    path: "/",
    element: <Landing />,
  },

  // =====================================================
  // AUTH
  // =====================================================
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/register",
    element: <Register />,
  },
  {
    path: "/forgot-password",
    element: <ForgotPassword />,
  },
  {
    path: "/reset-password",
    element: <ResetPassword />,
  },
  {
    path: "/forgot-user-id",
    element: <ForgotUserId />,
  },

  // =====================================================
  // DASHBOARD
  // =====================================================
  {
    path: "/success",
    element: <Success />,
  },
  {
    path: "/dashboard",
    element: <Dashboard />,
  },

  // =====================================================
  // PROFILE
  // =====================================================
  {
    path: "/profile",
    element: <Profile />,
  },

  // =====================================================
  // AI INTERVIEW
  // =====================================================
  {
    path: "/interviews/:id",
    element: <InterviewAgent />,
  },
]);
