import { useState } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { HomePage } from "./components/HomePage";
import { DashboardPage } from "./components/DashboardPage";
import { AuthPage } from "./components/AuthPage";
import { ProfilePage } from "./components/ProfilePage";

export default function App() {
  const navigate = useNavigate();
  const [isDark, setIsDark] = useState(false);

  const handleAnalyze = (url: string) => {
    console.log("Analyzing URL:", url);
  };

  const handleThemeToggle = () => {
    setIsDark(!isDark);
  };

  const handleLogout = () => {
    // implement auth clear if needed
  };

  return (
      <div
        className={`size-full ${isDark ? "dark" : ""}`}
        style={{ fontFamily: "Inter, system-ui, sans-serif" }}
      >
        <Routes>
          <Route
            path="/"
            element={
              <HomePage
                onAnalyze={handleAnalyze}
                onGetStarted={() => navigate("/signin")}
                onThemeToggle={handleThemeToggle}
                isDark={isDark}
              />
            }
          />
          <Route
            path="/signin"
            element={<AuthPage onBack={() => navigate("/")} isDark={isDark} />}
          />
          <Route
            path="/dashboard"
            element={
              <DashboardPage
                onReset={() => navigate("/")}
                onThemeToggle={handleThemeToggle}
                onProfileClick={() => navigate("/profile")}
                isDark={isDark}
              />
            }
          />
          <Route
            path="/profile"
            element={<ProfilePage onBack={() => navigate("/dashboard")} onLogout={handleLogout} isDark={isDark} />}
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
  );
}