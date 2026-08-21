import {createBrowserRouter} from "react-router";
import Login from "./features/auth/pages/Login"
import Register from "./features/auth/pages/Register"
import Landing from "./features/landingpage/landing"

export const router = createBrowserRouter([
    {
        path:"/landing",
        element : <Landing/>
    },
    {
        path:"/login",
        element : <Login/>
    },
    {
        path:"/register",
        element:<Register/>
    }
])