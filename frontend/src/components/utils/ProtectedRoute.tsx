import { Navigate, useLocation } from "react-router-dom";
import { isAuthenticated } from "@/lib/auth";
import type { ReactElement } from "react";

export function ProtectedRoute({ children }: { children: ReactElement }) {
  const location = useLocation();
  if (!isAuthenticated()) {
    const redirect = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/auth/login?redirect=${redirect}`} replace />;
  }
  return children;
}
