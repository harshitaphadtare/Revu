import { useState, useEffect } from "react";
import { ArrowLeft, Sun, Moon, Eye, EyeOff } from "lucide-react";
import { Input } from "./components/ui/input";

export default function App() {
  const [isLogin, setIsLogin] = useState(true);
  const [isDark, setIsDark] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    // Set initial dark mode
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    
    if (newTheme) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission
  };

  return (
    <div className={isDark ? "dark" : ""}>
      {/* Clean Background */}
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-black">
        {/* Form Container */}
        <div className="w-full max-w-[440px] mx-4">
          {/* Form Card - Everything inside */}
          <div className="bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-2xl p-8 shadow-sm dark:shadow-none">
            {/* Header Navigation */}
            <div className="flex items-center justify-between mb-8">
              {/* Left side: Back button */}
              <button
                className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                onClick={() => window.history.back()}
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              {/* Right side: Theme toggle */}
              <button
                onClick={toggleTheme}
                className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
              >
                {isDark ? (
                  <Sun className="w-5 h-5 text-slate-400" />
                ) : (
                  <Moon className="w-5 h-5 text-slate-600" />
                )}
              </button>
            </div>

            {/* Centered Logo and Description */}
            <div className="text-center mb-10">
              <h1
                className="mb-2 text-black dark:text-white"
                style={{
                  fontFamily: "Lexend, sans-serif",
                  fontSize: "32px",
                  fontWeight: 600,
                  letterSpacing: "-0.02em",
                }}
              >
                REVU
              </h1>
              <p className="text-slate-600 dark:text-slate-400" style={{ fontSize: "15px" }}>
                {isLogin
                  ? "Welcome back! Log in to continue."
                  : "Create your account to start analyzing reviews."}
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name field (only for signup) */}
              {!isLogin && (
                <div>
                  <Input
                    type="text"
                    placeholder="Full Name"
                    className="w-full h-11 px-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg focus:border-slate-400 dark:focus:border-white/20 focus:ring-0 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-colors text-slate-900 dark:text-white"
                  />
                </div>
              )}

              {/* Email field */}
              <div>
                <Input
                  type="email"
                  placeholder="Email"
                  className="w-full h-11 px-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg focus:border-slate-400 dark:focus:border-white/20 focus:ring-0 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-colors text-slate-900 dark:text-white"
                />
              </div>

              {/* Password field */}
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  className="w-full h-11 px-4 pr-11 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg focus:border-slate-400 dark:focus:border-white/20 focus:ring-0 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-colors text-slate-900 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>

              {/* Forgot Password - Only show on login */}
              {isLogin && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                    style={{ fontSize: "13px" }}
                  >
                    Forgot Password?
                  </button>
                </div>
              )}

              {/* Primary Button with Gradient Glow */}
              <button
                type="submit"
                className="w-full h-11 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 text-white relative overflow-hidden group transition-all hover:shadow-2xl flex items-center justify-center mt-6"
                style={{
                  boxShadow: `
                    0 4px 14px 0 rgba(124, 58, 237, 0.39),
                    0 8px 24px 0 rgba(59, 130, 246, 0.25),
                    0 16px 48px 0 rgba(124, 58, 237, 0.2)
                  `,
                  fontSize: "15px",
                  fontWeight: 500,
                }}
              >
                <span className="relative z-10">
                  {isLogin ? "Login" : "Create Account"}
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-purple-700 to-blue-700 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3 pt-4 pb-2">
                <div className="flex-1 h-[1px] bg-slate-200 dark:bg-white/10" />
                <span className="text-slate-500 dark:text-slate-400" style={{ fontSize: "13px" }}>
                  or
                </span>
                <div className="flex-1 h-[1px] bg-slate-200 dark:bg-white/10" />
              </div>

              {/* Social Auth Buttons - Stacked */}
              <div className="space-y-3">
                <button
                  type="button"
                  className="w-full h-11 flex items-center justify-center gap-2 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                >
                  <svg className="w-5 h-5 text-slate-700 dark:text-slate-300" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  <span className="text-slate-700 dark:text-slate-300" style={{ fontSize: "14px", fontWeight: 500 }}>
                    Continue with Google
                  </span>
                </button>

                <button
                  type="button"
                  className="w-full h-11 flex items-center justify-center gap-2 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                >
                  <svg
                    className="w-5 h-5 text-slate-700 dark:text-slate-300"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                  </svg>
                  <span className="text-slate-700 dark:text-slate-300" style={{ fontSize: "14px", fontWeight: 500 }}>
                    Continue with GitHub
                  </span>
                </button>
              </div>
            </form>

            {/* Toggle between Login/Signup */}
            <div className="mt-8 text-center">
              <p className="text-slate-600 dark:text-slate-400" style={{ fontSize: "14px" }}>
                {isLogin ? "Don't have an account? " : "Already have an account? "}
                <button
                  onClick={() => setIsLogin(!isLogin)}
                  className="text-slate-900 dark:text-white hover:underline transition-all"
                  style={{ fontWeight: 500 }}
                >
                  {isLogin ? "Sign up" : "Log in"}
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
