import { useCallback, useMemo } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import { X, Info, CheckCircle2, AlertCircle, AlertTriangle } from "lucide-react";

type Variant = "info" | "success" | "error" | "warning";
type Theme = "light" | "dark";

type ToastOptions = {
  progress?: number; // 0-100 for determinate; undefined for indeterminate
  duration?: number; // ms; defaults vary by variant
  description?: string;
};

const clampProgress = (value: number) => Math.max(0, Math.min(100, value));

function getColors(variant: Variant) {
  switch (variant) {
    case "success":
      return {
        accent: "#10B981", // emerald-500
        border: "rgba(16,185,129,0.25)",
        bar: "bg-emerald-500",
        bgLight: "#ffffff",
        bgDark: "#0f172a",
        icon: CheckCircle2,
      };
    case "error":
      return {
        accent: "#EF4444", // red-500
        border: "rgba(239,68,68,0.25)",
        bar: "bg-red-500",
        bgLight: "#ffffff",
        bgDark: "#111827",
        icon: AlertCircle,
      };
    case "warning":
      return {
        accent: "#F59E0B", // amber-500
        border: "rgba(245,158,11,0.25)",
        bar: "bg-amber-500",
        bgLight: "#ffffff",
        bgDark: "#0f172a",
        icon: AlertTriangle,
      };
    default:
      return {
        accent: "#3B82F6", // blue-500
        border: "rgba(59,130,246,0.25)",
        bar: "bg-blue-500",
        bgLight: "#ffffff",
        bgDark: "#0f172a",
        icon: Info,
      };
  }
}

function Card({
  t,
  message,
  description,
  variant,
  progress,
  theme,
}: {
  t: string | number;
  message: string;
  description?: string;
  variant: Variant;
  progress?: number;
  theme: Theme;
}) {
  const c = getColors(variant);
  const Icon = c.icon;
  const glow =
    theme === "dark" ? "shadow-[0_20px_36px_rgba(0,0,0,0.45)]" : "shadow-[0_4px_12px_rgba(0,0,0,0.08)]";
  const baseBg = theme === "dark" ? c.bgDark : c.bgLight;
  const textColor = theme === "dark" ? "#E5E7EB" : "#111827";
  const subText = theme === "dark" ? "#9CA3AF" : "#6B7280";
  const dividerColor = theme === "dark" ? "rgba(148,163,184,0.2)" : "rgba(229,231,235,1)";
  const trackColor = theme === "dark" ? "rgba(71,85,105,0.55)" : "#E5E7EB";

  const hasDeterminate = typeof progress === "number" && progress >= 0 && progress <= 100;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -12, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        className={`relative ${glow}`}
        style={{
          backgroundColor: baseBg,
          border: `1px solid ${c.border}`,
          borderRadius: "12px",
          minWidth: "320px",
          maxWidth: "min(90vw, 440px)",
          padding: "12px 40px 12px 16px",
        }}
      >
        <div className="flex items-center gap-3">
          <Icon
            className="flex-shrink-0"
            style={{
              width: 20,
              height: 20,
              color: c.accent,
              strokeWidth: 2,
            }}
          />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-normal" style={{ color: textColor }}>
              {message}
            </div>
            {description ? (
              <div className="mt-1 text-xs" style={{ color: subText }}>
                {description}
              </div>
            ) : null}
          </div>
        </div>

        <button
          aria-label="Dismiss"
          onClick={() => toast.dismiss(t)}
          className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-6 w-6 items-center justify-center rounded-md transition-colors hover:bg-gray-100 dark:hover:bg-slate-800/60"
          style={{
            color: subText,
            backgroundColor: "transparent",
          }}
        >
          <X className="h-4 w-4" />
        </button>

        {typeof progress === "number" && (
          <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${dividerColor}` }}>
            <div
              className="h-1 w-full overflow-hidden rounded-full"
              style={{ backgroundColor: trackColor }}
            >
              {hasDeterminate ? (
                <div className={`h-full ${c.bar}`} style={{ width: `${progress}%` }} />
              ) : (
                <div
                  className={`h-full ${c.bar} animate-[shimmer_1.2s_infinite] relative`}
                  style={{ width: "40%" }}
                />
              )}
            </div>
          </div>
        )}

        {typeof progress === "number" && (
          <style>{`
            @keyframes shimmer { 0%{ transform: translateX(-60%);} 100%{ transform: translateX(220%);} }
          `}</style>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

export function useToast() {
  const resolveTheme = useCallback<() => Theme>(() => {
    if (typeof document === "undefined") {
      return "light";
    }
    return document.documentElement.classList.contains("dark") ? "dark" : "light";
  }, []);

  const show = useCallback(
    (message: string, variant: Variant = "info", opts: ToastOptions = {}) => {
      const duration =
        typeof opts.progress === "number"
          ? 60000
          : opts.duration ??
            (variant === "error" ? 5000 : variant === "warning" ? 4500 : 3200);
      const theme = resolveTheme();
      toast.custom(
        (t) => (
          <Card
            t={t}
            message={message}
            description={opts.description}
            variant={variant}
            progress={opts.progress}
            theme={theme}
          />
        ),
        { duration }
      );
    },
    [resolveTheme]
  );

  const withProgress = useCallback(
    (message: string, variant: Variant = "info", initial = 0) => {
      const theme = resolveTheme();
      const id = toast.custom(
        (t) => (
          <Card
            t={t}
            message={message}
            variant={variant}
            progress={clampProgress(initial)}
            theme={theme}
          />
        ),
        { duration: 60000 }
      );

      return {
        id,
        update: (progress: number, msg?: string, opts: Omit<ToastOptions, "progress"> = {}) => {
          const nextTheme = resolveTheme();
          toast.custom(
            (t) => (
              <Card
                t={t}
                message={msg ?? message}
                description={opts.description}
                variant={variant}
                progress={clampProgress(progress)}
                theme={nextTheme}
              />
            ),
            { id, duration: opts.duration ?? 60000 }
          );
        },
        success: (msg?: string, opts?: ToastOptions) => show(msg ?? "Done", "success", opts),
        error: (msg?: string, opts?: ToastOptions) => show(msg ?? "Failed", "error", opts),
        warning: (msg?: string, opts?: ToastOptions) => show(msg ?? "Heads up", "warning", opts),
        dismiss: () => toast.dismiss(id),
      };
    },
    [resolveTheme, show]
  );

  return useMemo(
    () => ({
      info: (msg: string, opts?: ToastOptions) => show(msg, "info", opts),
      success: (msg: string, opts?: ToastOptions) => show(msg, "success", opts),
      error: (msg: string, opts?: ToastOptions) => show(msg, "error", opts),
      warning: (msg: string, opts?: ToastOptions) => show(msg, "warning", opts),
      progress: withProgress,
    }),
    [show, withProgress]
  );
}
