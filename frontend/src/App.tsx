import { useState, useEffect } from "react";
import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { HomePage } from "@/components/pages/HomePage";
import { SiteHeader } from "@/components/utils/SiteHeader";
import { DashboardPage } from "@/components/pages/DashboardPage";
import { AuthPage } from "@/components/pages/AuthPage";
import { ProfilePage } from "@/components/pages/ProfilePage";
import { ScrapingActivityPage } from "@/components/pages/ScrapingActivityPage";
import { HistoryPage } from "@/components/pages/HistoryPage";
import { ProtectedRoute } from "@/components/utils/ProtectedRoute";
import { clearAuth, isAuthenticated, getUser } from "@/lib/auth";
import { Toaster } from "@/components/ui/sonner";
import { useToast } from "@/hooks/useToast";
import { Footer } from "@/components/utils/Footer";

export default function App() {
  const [isDark, setIsDark] = useState(false);
  const navigate = useNavigate();
  const { info, success } = useToast();
  const [auth, setAuth] = useState<boolean>(isAuthenticated());

  // Listen for auth changes triggered by saveAuth/clearAuth
  useEffect(() => {
    const onAuth = () => setAuth(isAuthenticated());
    window.addEventListener("revu:auth-changed", onAuth);
    return () => window.removeEventListener("revu:auth-changed", onAuth);
  }, []);

  const handleAnalyze = (_url: string) => {
    if (!isAuthenticated()) {
      info("Please log in to continue analyzing reviews.");
      const redirect = encodeURIComponent("/scraping-activity");
      navigate(`/auth/login?redirect=${redirect}`);
      return;
    }
    navigate("/scraping-activity");
  };

  const handleReset = () => {
    navigate("/");
  };

  const handleGetStarted = () => {
    if (isAuthenticated()) navigate("/dashboard");
    else navigate("/auth/login");
  };

  const handleBackToHome = () => {
    navigate("/");
  };

  const handleThemeToggle = () => {
    setIsDark((v) => !v);
  };

  const handleGoToProfile = () => {
    navigate("/profile");
  };

  const handleBackToDashboard = () => {
    navigate("/dashboard");
  };

  const handleLogout = () => {
    clearAuth();
    success("Signed out successfully");
    navigate("/");
  };

  const location = useLocation();

  return (
    <div
      className={`size-full ${isDark ? "dark" : ""}`}
      style={{ fontFamily: "Inter, system-ui, sans-serif" }}
    >
  {/* Global Toaster (top-right) */}
  <Toaster />
      {/* Global Site Header (shown on every page) */}
      <SiteHeader
        isDark={isDark}
        onThemeToggle={handleThemeToggle}
        onGetStarted={handleGetStarted}
        isAuthed={auth}
        onProfile={handleGoToProfile}
        onLogout={handleLogout}
      />
      <Routes>
        {/* Home at / and /home */}
        <Route
          path="/"
          element={
            <HomePage
              onAnalyze={handleAnalyze}
              onGetStarted={handleGetStarted}
              onThemeToggle={handleThemeToggle}
              isDark={isDark}
            />
          }
        />
        <Route
          path="/home"
          element={
            <HomePage
              onAnalyze={handleAnalyze}
              onGetStarted={handleGetStarted}
              onThemeToggle={handleThemeToggle}
              isDark={isDark}
            />
          }
        />

        {/* New pages */}
        <Route
          path="/scraping-activity"
          element={
            <ScrapingActivityPage
              isDark={isDark}
              onThemeToggle={handleThemeToggle}
              onGetStarted={handleGetStarted}
            />
          }
        />
        <Route
          path="/history"
          element={
            <HistoryPage
              isDark={isDark}
              onThemeToggle={handleThemeToggle}
              onGetStarted={handleGetStarted}
            />
          }
        />

        {/* Auth routes */}
        <Route
          path="/auth/login"
          element={<AuthPage onBack={handleBackToHome} isDark={isDark} mode="login" />}
        />
        <Route
          path="/auth/signup"
          element={<AuthPage onBack={handleBackToHome} isDark={isDark} mode="signup" />}
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage onBack={handleBackToDashboard} onLogout={handleLogout} isDark={isDark} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage onReset={handleReset} onThemeToggle={handleThemeToggle} onProfileClick={handleGoToProfile} isDark={isDark} />
            </ProtectedRoute>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {/* Hide footer on auth pages (login/signup) */}
      {!location.pathname.startsWith("/auth") && <Footer isDark={isDark} />}
    </div>
  );
}