import {createBrowserRouter} from "react-router-dom";
import Login from "./features/auth/pages/Login"
import Register from "./features/auth/pages/Register"
import Landing from "./features/home/landing"
import ForgotPassword from "./features/auth/pages/ForgotPassword"
import Success from "./features/auth/components/Dashboard"


export const router = createBrowserRouter([
  {
    path: "/",
    element: <Landing />,
  },
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/register",
    element: <Register />,
  },
 
  {
    path: "/success",
    element: <Success />,
  },
  {
    path: "/forgot-password",
    element: <ForgotPassword />,
  },
]);