import { motion } from "motion/react";
import { useState, useEffect } from "react";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { apiSignin, apiSignup } from "@/lib/api";
import { useNavigate, useLocation } from "react-router-dom";
import { useToast } from "@/hooks/useToast";

interface AuthPageProps {
  onBack: () => void;
  isDark: boolean;
  mode?: "login" | "signup"; // optional override from route
}

export function AuthPage({ onBack, isDark, mode: routeMode }: AuthPageProps) {
  const [mode, setMode] = useState<"login" | "signup">(routeMode || "login");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  // keep local mode in sync if routeMode changes (e.g., navigating between /auth/login and /auth/signup)
  useEffect(() => {
    setMode(routeMode || "login");
  }, [routeMode]);
  const { success } = useToast();
  const searchParams = new URLSearchParams(location.search);
  
  // Form states
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === "login") {
        await apiSignin({ email, password });
        success("Login Successful!");
      } else {
        await apiSignup({ name: fullName || undefined, email, password });
        success("Account created!");
      }
  const redirect = searchParams.get("redirect");
  // If redirect points to profile, send user to home instead.
  // Keep other redirects (e.g., /scraping-activity) working as-is.
  const target = redirect && !/^\/?profile(\b|\/|\?|#)/i.test(redirect) ? redirect : "/";
  navigate(target);
    } catch (err: any) {
      setError(err?.message || "Authentication failed");
    } finally {
      setSubmitting(false);
    }
  };

  // Light mode colors (matching the design exactly)
  const lightColors = {
    background: "#F7F8FA",
    cardBg: "#FFFFFF",
    text: "#000000",
    subtext: "#6B7280",
    inputBg: "#F3F4F6",
    inputBorder: "#E5E7EB",
    inputText: "#9CA3AF",
    buttonText: "#FFFFFF",
    oauthBg: "#FFFFFF",
    oauthBorder: "#E5E7EB",
    oauthText: "#374151",
    dividerText: "#9CA3AF",
    linkText: "#000000",
  };

  // Dark mode colors (matching the design exactly)
  const darkColors = {
    background: "#000000",
    cardBg: "#1A1A1A",
    text: "#FFFFFF",
    subtext: "#9CA3AF",
    inputBg: "#0F0F0F",
    inputBorder: "#2A2A2A",
    inputText: "#6B7280",
    buttonText: "#FFFFFF",
    oauthBg: "#0F0F0F",
    oauthBorder: "#2A2A2A",
    oauthText: "#E5E7EB",
    dividerText: "#6B7280",
    linkText: "#FFFFFF",
  };

  const colors = isDark ? darkColors : lightColors;

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center p-3"
      style={{ backgroundColor: colors.background }}
    >
      {/* Auth Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full"
        style={{ width: 'min(90vw, 400px)' }}
      >
        <div 
          className="rounded-3xl shadow-md p-5 md:p-5 max-h-[calc(100vh-3rem)] overflow-auto relative"
          style={{ 
            backgroundColor: colors.cardBg,
            border: `1px solid ${colors.inputBorder}`
          }}
        >
          {/* Header with back button */}
          <div className="mb-4">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onBack}
              className="w-8 h-8 rounded-md flex items-center justify-center transition-colors"
              style={{ 
                backgroundColor: isDark ? "#2A2A2A" : "#F3F4F6",
                color: colors.text 
              }}
            >
              <ArrowLeft className="w-4 h-4" />
            </motion.button>
          </div>

          {/* Logo and Title */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-center mb-8"
          >
            <h1
              className="text-xl mb-2"
              style={{
                fontFamily: "Lexend, sans-serif",
                fontWeight: 700,
                color: colors.text,
                letterSpacing: "0.03em",
              }}
            >
              REVU
            </h1>
            <p className="text-sm" style={{ color: colors.subtext }}>
              {mode === "login" 
                ? "Welcome back! Log in to continue." 
                : "Create your account to start analyzing reviews."}
            </p>
          </motion.div>

          {/* Form */}
          <motion.form
            key={mode}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            onSubmit={handleSubmit}
            className="space-y-3 mb-4"
          >
            {mode === "signup" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
              >
                <input
                  type="text"
                  placeholder="Full Name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-2 py-1.5 rounded-md transition-all text-sm placeholder-opacity-100 h-9"
                  style={{
                    backgroundColor: colors.inputBg,
                    border: `1px solid ${colors.inputBorder}`,
                    color: colors.text,
                    outline: 'none',
                  }}
                />
                <style>{`
                  input::placeholder {
                    color: ${colors.inputText};
                  }
                `}</style>
              </motion.div>
            )}

            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-2 py-1.5 rounded-md transition-all text-sm h-9"
              style={{
                backgroundColor: colors.inputBg,
                border: `1px solid ${colors.inputBorder}`,
                color: colors.text,
                outline: 'none',
              }}
            />

            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-2 py-1.5 rounded-md transition-all text-sm pr-9 h-9"
                style={{
                  backgroundColor: colors.inputBg,
                  border: `1px solid ${colors.inputBorder}`,
                  color: colors.text,
                  outline: 'none',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 transition-colors"
                style={{ color: colors.inputText }}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>

            <style>{`
              input::placeholder {
                color: ${colors.inputText};
              }
            `}</style>

            {mode === "login" && (
              <div className="text-right">
                <button
                  type="button"
                  className="text-xs transition-colors hover:opacity-80"
                  style={{ color: colors.subtext }}
                >
                  Forgot Password?
                </button>
              </div>
            )}

            {error && (
              <div
                className="text-xs rounded-md px-3 py-2"
                style={{ backgroundColor: isDark ? "#2A1B1B" : "#FEE2E2", color: isDark ? "#FCA5A5" : "#991B1B", border: `1px solid ${isDark ? "#7F1D1D" : "#FCA5A5"}` }}
              >
                {error}
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                className="relative w-full px-4 py-2 rounded-md text-white transition-all duration-200 flex items-center justify-center text-sm"
                style={{
                  background: "linear-gradient(90deg, #7C3AED, #3B82F6)",
                  boxShadow: isDark ? '0 6px 18px rgba(59,130,246,0.06)' : '0 6px 18px rgba(124,58,237,0.12)'
                }}
                onClick={(e) => e.currentTarget.blur()}
              >
                <span className="relative z-10">
                  {submitting ? (mode === "login" ? "Logging in..." : "Creating account...") : (mode === "login" ? "Login" : "Create Account")}
                </span>
              </button>
            </div>
          </motion.form>

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div 
                className="w-full border-t" 
                style={{ borderColor: colors.inputBorder }}
              ></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span 
                className="px-4" 
                style={{ 
                  backgroundColor: colors.cardBg,
                  color: colors.dividerText 
                }}
              >
                or
              </span>
            </div>
          </div>

          {/* OAuth Buttons */}
          <div className="space-y-3 mb-6">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              className="w-full px-3 py-2 rounded-md transition-all duration-200 flex items-center justify-center gap-3 text-sm"
              style={{
                backgroundColor: colors.oauthBg,
                border: `1px solid ${colors.oauthBorder}`,
                color: colors.oauthText,
              }}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <span>Continue with Google</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              className="w-full px-3 py-2 rounded-md transition-all duration-200 flex items-center justify-center gap-3 text-sm"
              style={{
                backgroundColor: colors.oauthBg,
                border: `1px solid ${colors.oauthBorder}`,
                color: colors.oauthText,
              }}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              <span>Continue with GitHub</span>
            </motion.button>
          </div>

          {/* Toggle between login/signup */}
          <div className="text-center text-sm">
            <span style={{ color: colors.subtext }}>
              {mode === "login" ? "Don't have an account? " : "Already have an account? "}
            </span>
            <button
              type="button"
              onClick={() => {
                const base = mode === "login" ? "/auth/signup" : "/auth/login";
                const redirect = searchParams.get("redirect");
                navigate(redirect ? `${base}?redirect=${encodeURIComponent(redirect)}` : base);
              }}
              className="transition-all hover:underline"
              style={{ 
                color: colors.linkText,
                fontWeight: 500
              }}
            >
              {mode === "login" ? "Sign up" : "Log in"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}