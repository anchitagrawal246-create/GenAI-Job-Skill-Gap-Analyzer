import { configureStore } from "@reduxjs/toolkit";

import authReducer from "../features/auth/authSlice";
import resumeReducer from "../features/resume/resumeSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    resume: resumeReducer,
  },
});
