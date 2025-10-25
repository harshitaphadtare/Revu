import { motion } from "motion/react";
import { NavLink } from "react-router-dom";
import { ThemeToggle } from "./ThemeToggle";

type SiteHeaderProps = {
  isDark: boolean;
  onThemeToggle: () => void;
  onGetStarted: () => void;
};

export function SiteHeader({ isDark, onThemeToggle, onGetStarted }: SiteHeaderProps) {
  const navLinkClass = (isActive: boolean) =>
    [
      "relative text-sm transition-all duration-200",
      "after:content-[''] after:absolute after:left-0 after:-bottom-1 after:h-0.5 after:bg-current after:origin-left after:transition-transform after:duration-300",
      isActive ? "font-bold text-foreground after:scale-x-100" : "text-muted-foreground after:scale-x-0 hover:after:scale-x-100",
      isDark && !isActive ? "hover:text-white" : "hover:text-foreground",
    ].join(" ");

  return (
    <header
      className="relative z-20 backdrop-blur-xl border-b"
      style={{
        backgroundColor: isDark ? "rgba(0, 0, 0, 0.6)" : "rgba(250, 250, 250, 0.6)",
        borderColor: isDark ? "rgba(42, 42, 42, 0.5)" : "rgba(228, 228, 231, 0.5)",
      }}
    >
      <div className="container mx-auto px-6 py-4 grid grid-cols-3 items-center">
        {/* Left: Logo */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <span
            className="text-2xl tracking-wider"
            style={{ fontFamily: "Lexend, sans-serif", fontWeight: 700, color: isDark ? "#FFFFFF" : undefined }}
          >
            REVU
          </span>
        </motion.div>

        {/* Center: Nav */}
        <nav className="flex items-center justify-center gap-6">
          <NavLink to="/" end className={({ isActive }) => navLinkClass(isActive)}>
            Home
          </NavLink>
          <NavLink to="/scraping-activity" className={({ isActive }) => navLinkClass(isActive)}>
            Scraping Activity
          </NavLink>
          <NavLink to="/history" className={({ isActive }) => navLinkClass(isActive)}>
            History
          </NavLink>
        </nav>

        {/* Right: Theme + CTA */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center justify-end gap-4"
        >
          <ThemeToggle isDark={isDark} onToggle={onThemeToggle} />
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={onGetStarted}
            className="relative overflow-hidden rounded-full px-6 py-2.5 transition-all duration-300 group"
            style={{
              backgroundColor: isDark ? "#FFFFFF" : "#0a0a0a",
              color: isDark ? "#000000" : "#fafafa",
              border: "none",
              boxShadow: isDark
                ? "0 1px 3px 0 rgba(255, 255, 255, 0.1)"
                : "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
            }}
          >
            <span className="relative z-10">Get Started</span>
            <motion.div
              className="absolute inset-0 w-full h-full opacity-0 group-hover:opacity-100"
              style={{
                background: isDark
                  ? "linear-gradient(90deg, transparent, rgba(0,0,0,0.1), transparent)"
                  : "linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)",
              }}
              animate={{ x: ["-100%", "200%"] }}
              transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 0.5, ease: "easeInOut" }}
            />
          </motion.button>
        </motion.div>
      </div>
    </header>
  );
}
