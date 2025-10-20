import { Moon, Sun } from "lucide-react";
import { motion } from "motion/react";

interface ThemeToggleProps {
  isDark: boolean;
  onToggle: () => void;
}

export function ThemeToggle({ isDark, onToggle }: ThemeToggleProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onToggle}
      className="w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-300"
      style={{
        backgroundColor: isDark ? "#2A2A2A" : "#F3F4F6",
        color: isDark ? "#E5E7EB" : "#0a0a0a",
        border: isDark ? "1px solid #3A3A3A" : "1px solid #E5E7EB"
      }}
      aria-label="Toggle theme"
    >
      {isDark ? (
        <Sun className="w-4 h-4" />
      ) : (
        <Moon className="w-4 h-4" />
      )}
    </motion.button>
  );
}