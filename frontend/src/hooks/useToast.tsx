import { useCallback, useMemo } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import { X, Info, CheckCircle2, AlertCircle, AlertTriangle } from "lucide-react";

type Variant = "info" | "success" | "error" | "warning";

type ToastOptions = {
  progress?: number; // 0-100 for determinate; undefined for indeterminate
  duration?: number; // ms; defaults vary by variant
  description?: string;
};

function getColors(variant: Variant) {
  switch (variant) {
    case "success":
      return {
        accent: "#10B981", // emerald-500
        border: "rgba(16,185,129,0.2)",
        text: "#065F46",
        bar: "bg-emerald-500",
        bgLight: "#ffffff",
        bgDark: "#0b0e12",
        icon: CheckCircle2,
      };
    case "error":
      return {
        accent: "#EF4444", // red-500
        border: "rgba(239,68,68,0.2)",
        text: "#7F1D1D",
        bar: "bg-red-500",
        bgLight: "#ffffff",
        bgDark: "#0b0e12",
        icon: AlertCircle,
      };
    case "warning":
      return {
        accent: "#F59E0B", // amber-500
        border: "rgba(245,158,11,0.2)",
        text: "#92400E",
        bar: "bg-amber-500",
        bgLight: "#ffffff",
        bgDark: "#0b0e12",
        icon: AlertTriangle,
      };
    default:
      return {
        accent: "#3B82F6", // blue-500
        border: "rgba(59,130,246,0.2)",
        text: "#1E3A8A",
        bar: "bg-blue-500",
        bgLight: "#ffffff",
        bgDark: "#0b0e12",
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
  theme: "light" | "dark";
}) {
  const c = getColors(variant);
  const Icon = c.icon;
  const glow = `shadow-[0_4px_12px_rgba(0,0,0,0.08)]`;
  const baseBg = "#ffffff";
  const textColor = "#111827";
  const subText = "#6B7280";
  const borderColor = "rgba(229, 231, 235, 1)";

  // progress styles
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
          border: `1px solid ${borderColor}`,
          borderRadius: '12px',
          minWidth: '320px',
          maxWidth: 'min(90vw, 440px)',
          padding: '12px 40px 12px 16px'
        }}
      >
        <div className="flex items-center gap-3">
          {/* icon */}
          <Icon 
            className="flex-shrink-0"
            style={{ 
              width: 20, 
              height: 20,
              color: c.accent,
              strokeWidth: 2
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
        
        {/* close button */}
        <button
          aria-label="Dismiss"
          onClick={() => toast.dismiss(t)}
          className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-6 w-6 items-center justify-center rounded-md hover:bg-gray-100 transition-colors"
          style={{ color: subText }}
        >
          <X className="h-4 w-4" />
        </button>

        {/* progress bar - only show when progress is defined */}
        {typeof progress === "number" && (
          <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${borderColor}` }}>
            <div className="h-1 w-full overflow-hidden rounded-full bg-gray-200">
              {hasDeterminate ? (
                <div className={`h-full ${c.bar}`} style={{ width: `${progress}%` }} />
              ) : (
                <div className={`h-full ${c.bar} animate-[shimmer_1.2s_infinite] relative`}
                     style={{ width: "40%" }} />
              )}
            </div>
          </div>
        )}

        {/* shimmer keyframes */}
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
  const show = useCallback((message: string, variant: Variant = "info") => {
    const duration = 3000;
    const prefersDark =
      typeof document !== "undefined" && document.documentElement.classList.contains("dark");
    toast.custom(
      (t) =>
        prefersDark ? (
          <BaseToastDark t={t} message={message} variant={variant} />
        ) : (
          <BaseToast t={t} message={message} variant={variant} />
        ),
      { duration }
    );
  }, []);

  const info = useCallback((msg: string) => show(msg, "info"), [show]);
  const success = useCallback((msg: string) => show(msg, "success"), [show]);
  const error = useCallback((msg: string) => show(msg, "error"), [show]);

  return useMemo(
    () => ({
      info,
      success,
      error,
    }),
    [info, success, error]
  );
}
