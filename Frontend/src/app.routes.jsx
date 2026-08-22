import {createBrowserRouter} from "react-router-dom";
import Login from "./features/auth/pages/Login"
import Register from "./features/auth/pages/Register"
import Landing from "./features/home/landing"
import ForgotPassword from "./features/auth/pages/ForgotPassword"

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
 
//   {
//     path: "/dashboard",
//     element: <Dashboard />,
//   },
  {
    path: "/forgot-password",
    element: <ForgotPassword />,
  },
]);