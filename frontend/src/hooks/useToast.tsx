import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";

type Variant = "info" | "success" | "error";

function BaseToast({ t, message, variant }: { t: string | number; message: string; variant: Variant }) {
  const glow =
    variant === "success"
      ? "shadow-[0_0_8px_rgba(124,58,237,0.45)]"
      : variant === "error"
      ? "shadow-[0_0_8px_rgba(244,63,94,0.45)]"
      : "shadow-[0_0_8px_rgba(96,165,250,0.45)]";

  // Tint border based on variant so each toast has a subtle color accent.
  const borderTint =
    variant === "success"
      ? "rgba(124,58,237,0.5)"
      : variant === "error"
      ? "rgba(244,63,94,0.5)"
      : "rgba(96,165,250,0.5)";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 24, y: -6 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        exit={{ opacity: 0, x: 12, y: -12 }}
        transition={{ duration: 0.22 }}
        className={`rounded-xl ${glow} backdrop-blur-xl border w-[min(90vw,360px)]`}
        style={{
          // For light mode we intentionally render with a dark background so
          // the toast is visible against a white page — use near-black with high
          // opacity and light text. Border is tinted per variant.
          backgroundColor: "rgba(8,8,10,0.95)",
          borderColor: borderTint,
          color: "#f8fafc",
        }}
        data-theme="light"
      >
        <div className="px-4 py-3 text-sm">{message}</div>
      </motion.div>
    </AnimatePresence>
  );
}

function BaseToastDark({ t, message, variant }: { t: string | number; message: string; variant: Variant }) {
  const glow =
    variant === "success"
      ? "shadow-[0_0_8px_rgba(139,92,246,0.35)]"
      : variant === "error"
      ? "shadow-[0_0_8px_rgba(239,68,68,0.35)]"
      : "shadow-[0_0_8px_rgba(96,165,250,0.35)]";

  const borderTintDark =
    variant === "success"
      ? "rgba(139,92,246,0.35)"
      : variant === "error"
      ? "rgba(239,68,68,0.35)"
      : "rgba(96,165,250,0.35)";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 24, y: -6 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        exit={{ opacity: 0, x: 12, y: -12 }}
        transition={{ duration: 0.22 }}
        className={`rounded-xl ${glow} backdrop-blur-xl border w-[min(90vw,360px)]`}
        style={{
          // In dark mode, render a bright card so it stands out against the
          // dark background — border tinted by variant.
          backgroundColor: "rgba(255,255,255,0.98)",
          borderColor: borderTintDark,
          color: "#111827",
        }}
        data-theme="dark"
      >
        <div className="px-4 py-3 text-sm">{message}</div>
      </motion.div>
    </AnimatePresence>
  );
}

export function useToast() {
  function show(message: string, variant: Variant = "info") {
    const duration = 3000;
    // Re-evaluate theme at the time of showing the toast so toasts follow
    // the current UI theme (useful when the user toggles theme at runtime).
    const prefersDark = typeof document !== "undefined" && document.documentElement.classList.contains("dark");
    toast.custom((t) => (prefersDark ? <BaseToastDark t={t} message={message} variant={variant} /> : <BaseToast t={t} message={message} variant={variant} />), {
      duration,
    });
  }

  return {
    info: (msg: string) => show(msg, "info"),
    success: (msg: string) => show(msg, "success"),
    error: (msg: string) => show(msg, "error"),
  };
}
