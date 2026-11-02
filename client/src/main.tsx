import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { MotionConfig } from "framer-motion";
import { Toaster } from "sonner";
import "./index.css";
import App from "./App";
import { AuthProvider } from "./context/AuthProvider";

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MotionConfig reducedMotion="user">
      <BrowserRouter>
        <AuthProvider>
          <App />
          <Toaster richColors position="top-right" closeButton />
        </AuthProvider>
      </BrowserRouter>
    </MotionConfig>
  </StrictMode>,
)
