import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { Layout } from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Home } from "./pages/Home";
import { Compress } from "./pages/Compress";
import { Login, Register } from "./pages/AuthPages";
import { Dashboard } from "./pages/Dashboard";
import { Pricing } from "./pages/Pricing";
import { Admin } from "./pages/Admin";
import { ForgotPassword, ResetPassword, VerifyEmail } from "./pages/AccountRecovery";
import { GuestRecovery } from "./pages/GuestRecovery";
import { Privacy, Terms } from "./pages/Legal";
import { NotFound } from "./pages/NotFound";
import "./index.css";

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: "/", element: <Home /> },
      { path: "/compress", element: <Compress /> },
      { path: "/login", element: <Login /> },
      { path: "/register", element: <Register /> },
      { path: "/forgot-password", element: <ForgotPassword /> },
      { path: "/reset-password", element: <ResetPassword /> },
      { path: "/verify-email", element: <VerifyEmail /> },
      { path: "/guest-recovery", element: <GuestRecovery /> },
      { path: "/pricing", element: <Pricing /> },
      { path: "/privacy", element: <Privacy /> },
      { path: "/terms", element: <Terms /> },
      { element: <ProtectedRoute />, children: [{ path: "/dashboard", element: <Dashboard /> }] },
      { element: <ProtectedRoute adminOnly />, children: [{ path: "/admin", element: <Admin /> }] },
      { path: "*", element: <NotFound /> }
    ]
  }
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>
);
