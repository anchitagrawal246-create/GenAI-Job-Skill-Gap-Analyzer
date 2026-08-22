
import { createBrowserRouter } from "react-router-dom";

import Login from "./features/auth/pages/Login";
import Register from "./features/auth/pages/Register";
import Landing from "./features/home/landing";
import ForgotPassword from "./features/auth/pages/ForgotPassword";
import ResetPassword from "./features/auth/pages/ResetPassword";
import Success from "./features/auth/components/Dashboard";

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

  // =====================================================
  // SUCCESS / DASHBOARD
  // =====================================================

  {
    path: "/success",
    element: <Success />,
  },
]);

