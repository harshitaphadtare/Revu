import { useState, useEffect } from "react";
import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { HomePage } from "./components/Pages/HomePage";
import { SiteHeader } from "./components/utils/SiteHeader";
import { DashboardPage } from "./components/Pages/DashboardPage";
import { AuthPage } from "./components/Pages/AuthPage";
import { ProfilePage } from "./components/Pages/ProfilePage";
import { ScrapingActivityPage } from "./components/Pages/ScrapingActivityPage";
import { HistoryPage } from "./components/Pages/HistoryPage";
import { ProtectedRoute } from "./components/utils/ProtectedRoute";
import { clearAuth, isAuthenticated } from "./lib/auth";
import { apiStartScrape, apiLockStatus } from "./lib/api";
import { Toaster } from "./components/ui/sonner";
import { useToast } from "./hooks/useToast";
import { Footer } from "./components/utils/Footer";

export default function App() {
  const [isDark, setIsDark] = useState(false);
  const navigate = useNavigate();
  const { info, success, warning } = useToast();
  const [auth, setAuth] = useState<boolean>(isAuthenticated());

  // Listen for auth changes triggered by saveAuth/clearAuth
  useEffect(() => {
    const onAuth = () => setAuth(isAuthenticated());
    window.addEventListener("revu:auth-changed", onAuth);
    return () => window.removeEventListener("revu:auth-changed", onAuth);
  }, []);

  // Sync document root class with theme state so Tailwind dark mode works
  useEffect(() => {
    if (isDark) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, [isDark]);

  // Simple queue persistence helpers shared from App -> Activity page via localStorage
  const readQueue = (): Array<{ id: string; url: string; productName: string; productLink: string; addedAt: number }> => {
    try {
      return JSON.parse(localStorage.getItem("revu:scrapeQueue") || "[]");
    } catch {
      return [];
    }
  };
  const writeQueue = (q: any[]) => localStorage.setItem("revu:scrapeQueue", JSON.stringify(q));

  const enqueue = (url: string) => {
    const id = `q_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const productName = (() => {
      try { return new URL(url).hostname; } catch { return "Product"; }
    })();
    const job = { id, url, productName, productLink: url, addedAt: Date.now() };
    const q = readQueue();
    q.push(job);
    writeQueue(q);
    return { job, position: q.length };
  };

  const handleAnalyze = async (_url: string) => {
    if (!isAuthenticated()) {
      info("Please log in to continue analyzing reviews.");
      const redirect = encodeURIComponent("/scraping-activity");
      navigate(`/auth/login?redirect=${redirect}`);
      return;
    }
    if (!_url || !_url.startsWith("http")) {
      // Prefer a warning for missing/invalid URL so it stands out.
      warning("Please add an Amazon product URL.");
      return;
    }
    
    // Validate URL contains an Amazon product link
    const urlLower = _url.toLowerCase();
    const isAmazon = urlLower.includes("amazon");

    if (!isAmazon) {
      warning("⚠️ Only Amazon product URLs are supported. Please paste a valid Amazon product link.");
      return;
    }
    
    try {
      // If a scrape is already running, queue it instead of erroring out
      const lock = await apiLockStatus();
      if (lock.locked) {
        const { position } = enqueue(_url);
        warning(`A scraping job is already in progress. Added to queue (position ${position}).`);
        navigate("/scraping-activity");
        return;
      }

      const { job_id } = await apiStartScrape({ url: _url });
      localStorage.setItem("revu:lastJobId", job_id);
      localStorage.setItem("revu:lastURL", _url);
      success("Analysis initiated! Redirecting to activity page...");
      navigate("/scraping-activity");
    } catch (err: any) {
      const msg = String(err?.message || "");

      // Queue-on-lock behaviour
      if (/already in progress|busy|locked/i.test(msg)) {
        const { position } = enqueue(_url);
        warning(`A scraping job is already in progress. Added to queue (position ${position}).`);
        navigate("/scraping-activity");
        return;
      }

      // Friendly guidance for known external provider errors
      if (/external review provider/i.test(msg) || /unsupported/i.test(msg)) {
        info("Analysis failed: external provider rejected the request. Please try again later.");
        return;
      }

      // Generic fallback for other errors
      // Use error severity where appropriate
      info(msg || "Failed to start analysis");
    }
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

        {/* New Pages */}
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
      {/* Hide footer on auth Pages (login/signup) */}
      {!location.pathname.startsWith("/auth") && <Footer isDark={isDark} />}
    </div>
  );
}