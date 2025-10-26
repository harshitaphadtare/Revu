import { Rocket, Github } from "lucide-react";

type FooterProps = {
  isDark?: boolean;
};

export function Footer({ isDark: isDarkProp }: FooterProps) {
  // Prefer prop from App (keeps header/footer in sync). If absent, fall
  // back to DOM class detection for flexibility in other contexts.
  const isDark = typeof isDarkProp !== "undefined" ? isDarkProp : (typeof document !== "undefined" && document.documentElement.classList.contains("dark"));

  const background = isDark
    ? "linear-gradient(180deg, rgba(10,10,10,0.98), rgba(6,6,6,0.98))"
    : "rgba(250, 250, 250, 0.6)";
  const borderColor = isDark ? "rgba(255,255,255,0.03)" : "rgba(228, 228, 231, 0.5)";

  return (
    <footer
      className="relative z-10 mt-12 border-t"
      style={{
        background,
        borderColor,
        // Match SiteHeader's inset border shadow in dark mode so the footer
        // reads like the same surface.
        boxShadow: isDark ? "0 -1px 0 rgba(0,0,0,0.6) inset" : undefined,
      }}
    >
      <div className="w-full">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 text-sm" style={{ color: isDark ? "#e5e7eb" : "#4b5563" }}>
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full">
              <Rocket className="w-5 h-5" aria-hidden />
            </span>
            <span>
              Engineered by{' '}
              <a
                href="https://www.linkedin.com/in/harshitaphadtare/"
                target="_blank"
                rel="noreferrer"
                className="font-medium hover:underline"
                style={{ color: isDark ? "#60a5fa" : "#8F26FB" }}
              >
                Harshita Phadtare
              </a>
            </span>
          </div>

          <div className="flex items-center gap-1 text-sm" style={{ color: isDark ? "#e5e7eb" : "#374151" }}>
            <Github className="w-4 h-4" aria-hidden />
            <span>Contribute on</span>
            <a
              href="https://github.com/harshitaphadtare/Revu"
              target="_blank"
              rel="noreferrer"
              className="ml-1 hover:underline"
              style={{ color: isDark ? "#e5e7eb" : "#374151" }}
            >
              GitHub
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
