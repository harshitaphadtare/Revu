import { useState } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { HomePage } from "./components/HomePage";
import { DashboardPage } from "./components/DashboardPage";
import { AuthPage } from "./components/AuthPage";
import { ProfilePage } from "./components/ProfilePage";
import { ScrapingActivityPage } from "./components/ScrapingActivityPage";
import { HistoryPage } from "./components/HistoryPage";

export default function App() {
  const [isDark, setIsDark] = useState(false);
  const navigate = useNavigate();

  const handleAnalyze = (_url: string) => {
    // Route to scraping activity to show progress
    navigate("/scraping-activity");
  };

  const handleReset = () => {
    navigate("/");
  };

  const handleGetStarted = () => {
    navigate("/auth");
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
    navigate("/");
  };

  return (
    <div
      className={`size-full ${isDark ? "dark" : ""}`}
      style={{ fontFamily: "Inter, system-ui, sans-serif" }}
    >
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

        {/* Existing pages kept for compatibility */}
        <Route
          path="/auth"
          element={<AuthPage onBack={handleBackToHome} isDark={isDark} />}
        />
        <Route
          path="/profile"
          element={<ProfilePage onBack={handleBackToDashboard} onLogout={handleLogout} isDark={isDark} />}
        />
        <Route
          path="/dashboard"
          element={<DashboardPage onReset={handleReset} onThemeToggle={handleThemeToggle} onProfileClick={handleGoToProfile} isDark={isDark} />}
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}