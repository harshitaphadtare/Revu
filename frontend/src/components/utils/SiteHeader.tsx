import { motion } from "motion/react";
import { NavLink } from "react-router-dom";
import { ThemeToggle } from "./ThemeToggle";
import { getUser } from "@/lib/auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

type SiteHeaderProps = {
  isDark: boolean;
  onThemeToggle: () => void;
  onGetStarted: () => void;
  isAuthed?: boolean;
  onProfile?: () => void;
  onLogout?: () => void;
};

export function SiteHeader({ isDark, onThemeToggle, onGetStarted, isAuthed, onProfile, onLogout }: SiteHeaderProps) {
  const navLinkClass = (isActive: boolean) =>
    [
      "relative text-sm transition-all duration-200",
      "after:content-[''] after:absolute after:left-0 after:-bottom-1 after:h-0.5 after:bg-current after:origin-left after:transition-transform after:duration-300",
      isActive ? "font-bold text-foreground after:scale-x-100" : "text-muted-foreground after:scale-x-0 hover:after:scale-x-100",
      isDark && !isActive ? "hover:text-white" : "hover:text-foreground",
    ].join(" ");

  return (
    <header
      className="relative z-20 border-b"
      style={{
        // Dark mode: deep, near-black bar with a subtle radial/linear glow. Light mode keeps the soft translucent bar.
        background: isDark
          ? "linear-gradient(180deg, rgba(10,10,10,0.98), rgba(6,6,6,0.98))"
          : "rgba(250, 250, 250, 0.6)",
        borderColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(228, 228, 231, 0.5)",
        boxShadow: isDark ? "0 1px 0 rgba(0,0,0,0.6) inset" : undefined,
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
        {isAuthed ? (
          <motion.nav
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="flex items-center justify-center gap-6"
          >
            <NavLink to="/" end className={({ isActive }) => navLinkClass(isActive)}>
              Home
            </NavLink>
            <NavLink to="/scraping-activity" className={({ isActive }) => navLinkClass(isActive)}>
              Scraping Activity
            </NavLink>
            <NavLink to="/history" className={({ isActive }) => navLinkClass(isActive)}>
              History
            </NavLink>
          </motion.nav>
        ) : (
          <div />
        )}

        {/* Right: Theme + CTA */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center justify-end gap-4"
        >
          <ThemeToggle isDark={isDark} onToggle={onThemeToggle} />
          {isAuthed ? (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={onProfile}
              className="relative overflow-hidden rounded-full px-6 py-2.5 transition-all duration-300 group flex items-center gap-2"
              style={{
                backgroundColor: isDark ? "#FFFFFF" : "#0a0a0a",
                color: isDark ? "#000000" : "#fafafa",
                border: "none",
                boxShadow: isDark
                  ? "0 1px 3px 0 rgba(255, 255, 255, 0.1)"
                  : "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
              }}
            >
              <span className="relative z-10 text-sm font-medium">
                {getUser()?.name || getUser()?.email}
              </span>
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
          ) : (
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
          )}
        </motion.div>
      </div>
    </header>
  );
}
