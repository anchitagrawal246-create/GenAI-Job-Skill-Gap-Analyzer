import { createBrowserRouter } from "react-router-dom";

// =====================================================
// AUTH
// =====================================================
import Login from "./features/auth/pages/Login";
import Register from "./features/auth/pages/Register";
import ForgotPassword from "./features/auth/pages/ForgotPassword";
import ResetPassword from "./features/auth/pages/ResetPassword";
import ForgotUserId from "./features/auth/pages/ForgotUserId";

// =====================================================
// HOME
// =====================================================
import Landing from "./features/home/landing";
import Dashboard from "./features/home/dashboard";
import { Profile } from "./features/home/Profile";

// =====================================================
// INTERVIEW
// =====================================================
import InterviewAgent from "./features/home/InterviewAgent";

// =====================================================
// OTHER
// =====================================================
import Success from "./features/auth/components/Dashboard";

// =====================================================
// ROUTER
// =====================================================
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
