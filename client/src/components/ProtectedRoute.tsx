import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { Spinner } from "./ui";

export default function ProtectedRoute() {
  const { user, loading } = useAuth();
  if (loading) return <Spinner label="Checking your session..." />;
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}
