import { useState, useEffect, useRef, type ReactNode } from "react";
import { X, Trash2, Eye } from "lucide-react";
import { ProgressRing } from "@/components/utils/ProgressRing";
import { useToast } from "@/hooks/useToast";
import { apiScrapeStatus, apiCancelScrape, apiStartScrape, apiLockStatus, type ScrapeStatusResponse } from "@/lib/api";
import { useNavigate } from "react-router-dom";


interface ScrapeJob {
  id: string;
  productName: string;
  productLink: string;
  status: "processing" | "queued" | "completed";
  Progress?: number;
  statusText?: string;
  dateStarted?: string;
  queuePosition?: number;
}
interface ScrapingActivityPageProps {
  isDark: boolean;
  onThemeToggle: () => void;
  onGetStarted: () => void;
}

type StatusVariant = "queued" | "fetching" | "processing" | "analyzing" | "summarizing" | "completed" | "cancelled" | "failed";

type StatusState = {
  variant: StatusVariant;
  label: string;
  helper: string;
  pulse?: boolean;
};

const STATUS_VARIANTS: Record<StatusVariant, { wrapper: string; text: string; dot: string }> = {
  queued: {
    wrapper: "bg-amber-50 dark:bg-amber-900/25 border-amber-200 dark:border-amber-800/40",
    text: "text-amber-700 dark:text-amber-200",
    dot: "bg-amber-500 dark:bg-amber-300",
  },
  fetching: {
    wrapper: "bg-slate-100 dark:bg-zinc-900/40 border-slate-200 dark:border-zinc-700/50",
    text: "text-slate-700 dark:text-slate-200",
    dot: "bg-slate-500 dark:bg-zinc-400",
  },
  processing: {
    wrapper: "bg-sky-50 dark:bg-sky-900/25 border-sky-200 dark:border-sky-800/40",
    text: "text-sky-700 dark:text-sky-200",
    dot: "bg-sky-500 dark:bg-sky-300",
  },
  analyzing: {
    wrapper: "bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-800/50",
    text: "text-indigo-700 dark:text-indigo-200",
    dot: "bg-indigo-500 dark:bg-indigo-300",
  },
  summarizing: {
    wrapper: "bg-purple-50 dark:bg-purple-900/30 border-purple-200 dark:border-purple-800/40",
    text: "text-purple-700 dark:text-purple-200",
    dot: "bg-purple-500 dark:bg-purple-300",
  },
  completed: {
    wrapper: "bg-emerald-50 dark:bg-emerald-900/25 border-emerald-200 dark:border-emerald-800/40",
    text: "text-emerald-700 dark:text-emerald-200",
    dot: "bg-emerald-500 dark:bg-emerald-300",
  },
  cancelled: {
    wrapper: "bg-rose-50 dark:bg-rose-900/25 border-rose-200 dark:border-rose-800/50",
    text: "text-rose-700 dark:text-rose-200",
    dot: "bg-rose-500 dark:bg-rose-300",
  },
  failed: {
    wrapper: "bg-rose-100 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/60",
    text: "text-rose-700 dark:text-rose-200",
    dot: "bg-rose-500 dark:bg-rose-300",
  },
};

const STATUS_PANEL_VARIANTS: Record<StatusVariant, string> = {
  queued: "bg-gradient-to-r from-amber-50/70 via-white to-white dark:from-amber-950/40 dark:via-transparent dark:to-transparent border border-amber-200/60 dark:border-amber-900/40",
  fetching: "bg-gradient-to-r from-slate-100/70 via-white to-white dark:from-zinc-900/40 dark:via-transparent dark:to-transparent border border-slate-200/60 dark:border-zinc-800/40",
  processing: "bg-gradient-to-r from-sky-50/70 via-white to-white dark:from-sky-950/35 dark:via-transparent dark:to-transparent border border-sky-200/60 dark:border-sky-900/40",
  analyzing: "bg-gradient-to-r from-indigo-50/70 via-white to-white dark:from-indigo-950/35 dark:via-transparent dark:to-transparent border border-indigo-200/60 dark:border-indigo-900/40",
  summarizing: "bg-gradient-to-r from-purple-50/70 via-white to-white dark:from-purple-950/35 dark:via-transparent dark:to-transparent border border-purple-200/60 dark:border-purple-900/40",
  completed: "bg-gradient-to-r from-emerald-50/70 via-white to-white dark:from-emerald-950/35 dark:via-transparent dark:to-transparent border border-emerald-200/60 dark:border-emerald-900/40",
  cancelled: "bg-gradient-to-r from-rose-50/70 via-white to-white dark:from-rose-950/35 dark:via-transparent dark:to-transparent border border-rose-200/60 dark:border-rose-900/40",
  failed: "bg-gradient-to-r from-rose-100/70 via-white to-white dark:from-rose-950/40 dark:via-transparent dark:to-transparent border border-rose-200/70 dark:border-rose-900/50",
};

function StatusBadge({
  variant,
  label,
  pulse = false,
  icon,
  className = "",
}: {
  variant: StatusVariant;
  label: string;
  pulse?: boolean;
  icon?: ReactNode;
  className?: string;
}) {
  const preset = STATUS_VARIANTS[variant];
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide ${preset.wrapper} ${className}`.trim()}
    >
      {icon ? (
        <span className="flex h-4 w-4 items-center justify-center" aria-hidden>
          {icon}
        </span>
      ) : pulse ? (
        <span className="relative flex h-2.5 w-2.5 items-center justify-center" aria-hidden>
          <span className={`absolute inline-flex h-2.5 w-2.5 rounded-full opacity-60 animate-ping ${preset.dot}`} />
          <span className={`relative inline-flex h-2 w-2 rounded-full ${preset.dot}`} />
        </span>
      ) : (
        <span className={`inline-flex h-2 w-2 rounded-full ${preset.dot}`} aria-hidden />
      )}
      <span className={preset.text}>{label}</span>
    </span>
  );
}

export function ScrapingActivityPage({ isDark, onThemeToggle, onGetStarted }: ScrapingActivityPageProps) {
  const { info, success, warning } = useToast();
  const navigate = useNavigate();
  const [activeJob, setActiveJob] = useState<ScrapeJob | null>(null);
  const [queuedJobs, setQueuedJobs] = useState<ScrapeJob[]>([]);
  const [completedJobs, setCompletedJobs] = useState<ScrapeJob[]>([]);
  const [activeTab, setActiveTab] = useState<"scraping" | "home" | "history">("scraping");
  const startNextTimer = useRef<number | null>(null);

  // theme state is controlled by parent via props (isDark, onThemeToggle)

  // Queue helpers
  const readQueue = (): Array<{ id: string; url: string; productName: string; productLink: string; addedAt: number }> => {
    try { return JSON.parse(localStorage.getItem("revu:scrapeQueue") || "[]"); } catch { return []; }
  };
  const writeQueue = (q: any[]) => localStorage.setItem("revu:scrapeQueue", JSON.stringify(q));
  const loadQueued = () => {
    const q = readQueue();
    const mapped: ScrapeJob[] = q.map((x, i) => ({ id: x.id, productName: x.productName, productLink: x.productLink, status: "queued", queuePosition: i + 1 }));
    setQueuedJobs(mapped);
  };

  // Start next queued scrape after a brief pause and when lock is free
  const startNextIfPossible = async (delayMs = 8000) => {
    if (startNextTimer.current) return; // avoid multiple timers
    if (activeJob) return;
    const q = readQueue();
    if (q.length === 0) return;
    startNextTimer.current = window.setTimeout(async () => {
      startNextTimer.current = null;
      // wait until lock is released
      for (let tries = 0; tries < 20; tries++) {
        const lock = await apiLockStatus();
        if (!lock.locked) break;
        await new Promise((r) => setTimeout(r, 1500));
      }
      const next = readQueue()[0];
      if (!next) return; // queue might have changed
      try {
        const { job_id } = await apiStartScrape({ url: next.url });
        // persist active job info
        localStorage.setItem("revu:lastJobId", String(job_id));
        localStorage.setItem("revu:lastURL", next.url);
        // set optimistic active job card
        const started = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
        setActiveJob({ id: job_id, productName: next.productName, productLink: next.productLink, status: "processing", Progress: 0, statusText: "Queued", dateStarted: started });
        // remove from queue
        const rest = readQueue().slice(1);
        writeQueue(rest);
        loadQueued();
        info("Starting next queued scrape...");
      } catch (e: any) {
        warning(e?.message || "Failed to start next scrape. Will retry shortly.");
        // Try again later
        startNextIfPossible(10000);
      }
    }, delayMs) as unknown as number;
  };

  // Seed from last started job, load queue, and begin polling
  useEffect(() => {
    loadQueued();
    const lastJobId = localStorage.getItem("revu:lastJobId");
    const lastURL = localStorage.getItem("revu:lastURL") || "";
    if (!lastJobId) {
      // No active job; if queue exists, attempt to start immediately (after lock clears)
      startNextIfPossible(500);
      return;
    }

    // Initialize an active job placeholder so UI shows immediately
    if (!activeJob) {
      const started = new Date().toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
      setActiveJob({
        id: lastJobId,
        productName: lastURL ? new URL(lastURL).hostname : "Product",
        productLink: lastURL,
        status: "processing",
        Progress: 0,
        statusText: "Queued",
        dateStarted: started,
      });
    }

    let cancelled = false;
    let interval: any;

    const poll = async () => {
      try {
        const res: ScrapeStatusResponse = await apiScrapeStatus(lastJobId);
        if (cancelled) return;
        const state = (res.state || "").toUpperCase();
        if (state === "PROGRESS") {
          setActiveJob((prev) =>
            prev
              ? {
                  ...prev,
                  Progress: Math.max(0, Math.min(100, Number(res.progress ?? 0))),
                  statusText: "Processing...",
                }
              : prev
          );
        } else if (state === "PENDING") {
          setActiveJob((prev) => (prev ? { ...prev, Progress: 0, statusText: "Queued" } : prev));
        } else if (state === "SUCCESS") {
          setCompletedJobs((list) => {
            // Add completed job summary
            const done: ScrapeJob = {
              id: res.job_id,
              productName:
                (res.product && (res.product.name || res.product.title)) ||
                (activeJob?.productName || "Product"),
              productLink: activeJob?.productLink || "",
              status: "completed",
            };
            return [done, ...list];
          });
          setActiveJob(null);
          success("Scrape completed.");
          // clear lastJobId so page doesn't keep polling a finished job
          localStorage.removeItem("revu:lastJobId");
          clearInterval(interval);
          // After a short pause, start next from queue if any
          startNextIfPossible(8000);
        } else if (state === "FAILURE" || state === "REVOKED") {
          const cancelled = state === "REVOKED" || (String(res.error || "").toLowerCase().includes("cancel"));
          info(cancelled ? "Scrape was cancelled." : "Scrape failed.");
          setActiveJob(null);
          localStorage.removeItem("revu:lastJobId");
          clearInterval(interval);
          // If there is a queue, try to start next after a pause
          startNextIfPossible(8000);
        }
      } catch (e: any) {
        info(e?.message || "Unable to fetch scrape status.");
      }
    };

    // initial poll immediately
    poll();
    // then interval
    interval = setInterval(poll, 3000);

    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cancelCurrentProcess = async () => {
    if (!activeJob) return;
    try {
      await apiCancelScrape(activeJob.id);
      info("Cancel requested. Finishing current step...");
      // We keep the job displayed while backend revokes it; polling loop will
      // detect REVOKED and clear UI accordingly.
      setActiveJob((prev) => (prev ? { ...prev, statusText: "Cancelling..." } : prev));
    } catch (e: any) {
      info(e?.message || "Failed to cancel job");
    }
  };

  const removeFromQueue = (id: string) => {
    const q = readQueue().filter((x) => x.id !== id);
    writeQueue(q);
    loadQueued();
  };

  // Keep queue UI in sync if other parts of the app modify localStorage
  useEffect(() => {
    const onStorage = (ev: StorageEvent) => {
      if (ev.key === "revu:scrapeQueue") loadQueued();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // derive a human-friendly status state from progress percentage
  const getStatusFromProgress = (p?: number): StatusState => {
    const prog = typeof p === "number" ? p : 0;
    if (prog >= 100) {
      return {
        variant: "completed",
        label: "Complete",
        helper: "Scrape finished and ready to review.",
        pulse: false,
      };
    }
    if (prog >= 81) {
      return {
        variant: "summarizing",
        label: "Summarizing results",
        helper: "Highlighting key findings and packaging insights.",
        pulse: true,
      };
    }
    if (prog >= 61) {
      return {
        variant: "analyzing",
        label: "Analyzing sentiments",
        helper: "Running classifiers and sentiment models over the data.",
        pulse: true,
      };
    }
    if (prog >= 31) {
      return {
        variant: "processing",
        label: "Processing data",
        helper: "Normalizing reviews and extracting entities.",
        pulse: true,
      };
    }
    if (prog >= 11) {
      return {
        variant: "fetching",
        label: "Fetching data",
        helper: "Collecting reviews from the source.",
        pulse: false,
      };
    }
    return {
      variant: "queued",
      label: "Queued",
      helper: "Waiting for the next scraper slot.",
      pulse: false,
    };
  };

  const resolveStatusVariant = (statusText: string | undefined, fallback: StatusVariant): StatusVariant => {
    const normalized = (statusText || "").toLowerCase();
    if (normalized.includes("cancel")) return "cancelled";
    if (normalized.includes("fail") || normalized.includes("error")) return "failed";
    if (normalized.includes("complete")) return "completed";
    return fallback;
  };

  return (
    <div className={isDark ? "dark" : ""}>
  <div className="min-h-screen bg-gray-50 dark:bg-black">
        {/* Main Content */}
        <main className="max-w-full mx-auto px-10 sm:px-6 lg:px-8 py-8">
          {/* Section 1: Current Scraping Process */}
          {activeJob && (
            <div className="relative overflow-hidden bg-white dark:bg-zinc-900/50 border border-gray-200 dark:border-white/10 rounded-2xl p-8 mb-6 shadow-sm dark:shadow-none">
              {/* subtle diagonal texture (like mock) */}
              <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-gradient-to-br from-purple-100 to-blue-100 opacity-40 blur-2xl dark:from-purple-900/10 dark:to-blue-900/10" />
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-black dark:text-white" style={{ fontSize: "24px", fontWeight: 600 }}>
                  Current Scraping Process
                </h2>
                <div className="px-3 py-1 rounded-full bg-green-50 border border-green-200 text-green-700 dark:bg-emerald-900/30 dark:border-emerald-800/40 dark:text-emerald-200">
                  <span className="" style={{ fontSize: "13px", fontWeight: 500 }}>
                    Active
                  </span>
                </div>
              </div>
              <div className="flex flex-row lg:flex-row items-center lg:items-start gap-8">
                {/* Progress Ring with enhanced background */}
                <div className="flex-shrink-0">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-100 to-blue-100 dark:from-purple-950/20 dark:to-blue-950/20 rounded-full blur-2xl opacity-60" />
                    <div className="relative bg-white dark:bg-zinc-900/50 p-6 rounded-full border border-gray-200 dark:border-white/10">
                      <ProgressRing progress={activeJob.Progress || 0} size={200} strokeWidth={12} />
                    </div>
                  </div>
                </div>

                {/* Status Details */}
                <div className="flex-1 w-auto space-y-4">
                  {/* Info Cards Grid - ensure Job ID and Date Started sit on the same row */}
                  <div className="flex w-full gap-4 flex-wrap md:flex-nowrap">
                    {/* Job ID Card */}
                    <div className="w-full md:w-1/2 bg-white dark:bg-zinc-900/50 border border-gray-200 dark:border-white/10 rounded-xl p-4 hover:shadow-md transition-all">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-100 dark:bg-zinc-900/50 rounded-lg flex items-center justify-center border border-gray-200 dark:border-white/10">
                          <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <p className="text-gray-600 dark:text-gray-400 mb-0.5" style={{ fontSize: "12px" }}>
                            Job ID
                          </p>
                          <p className="text-black dark:text-white" style={{ fontSize: "16px", fontWeight: 600 }}>
                            {activeJob.id}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Date Started Card */}
                    <div className="w-full md:w-1/2 bg-white dark:bg-zinc-900/50 border border-gray-200 dark:border-white/10 rounded-xl p-4 hover:shadow-md transition-all">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-100 dark:bg-zinc-900/50 rounded-lg flex items-center justify-center border border-gray-200 dark:border-white/10">
                          <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <p className="text-gray-600 dark:text-gray-400 mb-0.5" style={{ fontSize: "12px" }}>
                            Date Started
                          </p>
                          <p className="text-black dark:text-white" style={{ fontSize: "16px", fontWeight: 600 }}>
                            {activeJob.dateStarted}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Product Card */}
                  <div className="bg-white dark:bg-zinc-900/50 border border-gray-200 dark:border-white/10 rounded-xl p-4 hover:shadow-md transition-all">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-gray-100 dark:bg-zinc-900/50 rounded-lg flex items-center justify-center flex-shrink-0 border border-gray-200 dark:border-white/10">
                        <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-600 dark:text-gray-400 mb-0.5" style={{ fontSize: "12px" }}>
                          Product
                        </p>
                        <p className="text-black dark:text-white truncate" style={{ fontSize: "16px", fontWeight: 600 }}>
                          {activeJob.productName}
                        </p>
                        <p className="text-gray-500 dark:text-gray-400 truncate mt-1" style={{ fontSize: "12px" }}>
                          {activeJob.productLink}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Progress Status Banner */}
                  {(() => {
                    const state = getStatusFromProgress(activeJob?.Progress);
                    const variant = resolveStatusVariant(activeJob?.statusText, state.variant);
                    const label = activeJob?.statusText || state.label;
                    const containerClasses =
                      STATUS_PANEL_VARIANTS[variant] || "bg-white dark:bg-zinc-900/50 border border-gray-200 dark:border-white/10";
                    const shouldPulse = state.pulse && !["cancelled", "failed", "completed"].includes(variant);
                    return (
                      <div className={`rounded-xl p-4 ${containerClasses}`}>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex flex-col gap-1">
                            <span className="text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400">
                              Current Status
                            </span>
                            <StatusBadge variant={variant} label={label} pulse={shouldPulse} />
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 sm:max-w-md sm:text-right">{state.helper}</p>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Action Button */}
                    <div className="pt-2">
                      <button
                        onClick={cancelCurrentProcess}
                        className="inline-flex items-center gap-3 px-6 py-3 rounded-lg border text-red-600 bg-white border-red-200 hover:bg-red-50 transition-transform active:scale-[0.98] dark:bg-transparent dark:text-red-400 dark:border-red-500/40 dark:hover:bg-red-500/10"
                        style={{ fontSize: "14px", fontWeight: 600 }}
                        aria-label="Cancel Process"
                      >
                        <span className="inline-flex items-center justify-center w-6 h-6 bg-red-50 dark:bg-red-500/10 dark:border-red-500/30">
                          <X className="w-4 h-4 text-red-600 dark:text-red-400" />
                        </span>
                        Cancel Process
                      </button>
                    </div>
                </div>
              </div>
            </div>
          )}

          {/* Section 2: Scrape Management */}
          <div className="bg-white dark:bg-zinc-900/50 border border-gray-200 dark:border-white/10 rounded-2xl p-8 shadow-sm dark:shadow-none">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-black dark:text-white" style={{ fontSize: "24px", fontWeight: 600 }}>
                Scrape Management
              </h2>
              <div className="flex items-center gap-2">
                <div className="px-3 py-1 rounded-full bg-orange-50 border border-orange-200 dark:bg-orange-900/20 dark:border-orange-800/40">
                  <span className="text-orange-700 dark:text-orange-200" style={{ fontSize: "12px", fontWeight: 500 }}>
                    {activeJob ? 1 : 0} Active
                  </span>
                </div>
                <div className="px-3 py-1 rounded-full bg-blue-50 border border-blue-200 dark:bg-blue-900/20 dark:border-blue-800/40">
                  <span className="text-blue-700 dark:text-blue-200" style={{ fontSize: "12px", fontWeight: 500 }}>
                    {queuedJobs.length} Queued
                  </span>
                </div>
              </div>
            </div>

            {/* Table A: In Process */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-6 bg-gradient-to-b from-purple-600 to-blue-600 rounded-full" />
                <h3 className="text-black dark:text-white" style={{ fontSize: "18px", fontWeight: 600 }}>
                  In Process
                </h3>
              </div>

              <div className="bg-white dark:bg-zinc-900/50 border border-gray-200 dark:border-white/10 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-zinc-900/50 border-b border-gray-200 dark:border-white/10">
                        <th className="text-left py-3 px-4 text-gray-600 dark:text-gray-400" style={{ fontSize: "12px", fontWeight: 600, letterSpacing: "0.05em" }}>
                          <div className="flex items-center gap-2">
                            <svg width="14" height="14" className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                            </svg>
                            JOB ID
                          </div>
                        </th>
                        <th className="text-left py-3 px-4 text-gray-600 dark:text-gray-400" style={{ fontSize: "12px", fontWeight: 600, letterSpacing: "0.05em" }}>
                          <div className="flex items-center gap-2">
                            <svg width="14" height="14" className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                            </svg>
                            PRODUCT
                          </div>
                        </th>
                        <th className="text-left py-3 px-4 text-gray-600 dark:text-gray-400" style={{ fontSize: "12px", fontWeight: 600, letterSpacing: "0.05em" }}>
                          <div className="flex items-center gap-2">
                            <svg width="14" height="14" className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            STATUS
                          </div>
                        </th>
                        <th className="text-left py-3 px-4 text-gray-600 dark:text-gray-400" style={{ fontSize: "12px", fontWeight: 600, letterSpacing: "0.05em" }}>
                          <div className="flex items-center gap-2">
                            <svg width="14" height="14" className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                            PROGRESS
                          </div>
                        </th>
                        <th className="text-left py-3 px-4 text-gray-600 dark:text-gray-400" style={{ fontSize: "12px", fontWeight: 600, letterSpacing: "0.05em" }}>
                          ACTION
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeJob ? (
                        <tr className="border-b border-gray-200 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-zinc-900/50 transition-all group">
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2">
                              <span className="text-gray-900 dark:text-white" style={{ fontSize: "13px", fontWeight: 600 }}>
                                {activeJob.id}
                              </span>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="max-w-xs">
                              <p className="text-gray-900 dark:text-white mb-0.5 truncate" style={{ fontSize: "14px", fontWeight: 600 }}>
                                {activeJob.productName}
                              </p>
                              <p className="text-gray-500 dark:text-gray-400 truncate" style={{ fontSize: "12px" }}>
                                {activeJob.productLink}
                              </p>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            {(() => {
                              const state = getStatusFromProgress(activeJob?.Progress);
                              const variant = resolveStatusVariant(activeJob?.statusText, state.variant);
                              const label = activeJob?.statusText || state.label;
                              const shouldPulse = state.pulse && !["cancelled", "failed", "completed"].includes(variant);
                              return <StatusBadge variant={variant} label={label} pulse={shouldPulse} />;
                            })()}
                          </td>
                          <td className="py-4 px-4">
                            <div className="w-40">
                              <div className="flex items-center justify-center">
                                <span className="text-gray-900 dark:text-white" style={{ fontSize: "14px", fontWeight: 700 }}>
                                  {(activeJob?.Progress ?? 0)}%
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <button
                              onClick={cancelCurrentProcess}
                              className="p-2.5 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-all border border-transparent hover:border-red-200 dark:hover:border-red-800/30 group-hover:scale-110"
                              title="Cancel Process"
                            >
                              <X className="w-4 h-4 text-red-600 dark:text-red-400" />
                            </button>
                          </td>
                        </tr>
                      ) : (
                        <tr>
                          <td colSpan={5} className="py-12 text-center">
                            <div className="flex flex-col items-center gap-3">
                              <div className="w-16 h-16 bg-gray-100 dark:bg-zinc-900/50 rounded-full flex items-center justify-center">
                                <svg className="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                                </svg>
                              </div>
                              <div>
                                <p className="text-gray-900 dark:text-white mb-1" style={{ fontSize: "14px", fontWeight: 600 }}>
                                  No active scraping process
                                </p>
                                <p className="text-gray-500 dark:text-gray-400" style={{ fontSize: "13px" }}>
                                  Start a new analysis to see it here
                                </p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Table B: Queued Scrapes */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-6 bg-gray-300 rounded-full" />
                <h3 className="text-black dark:text-white" style={{ fontSize: "18px", fontWeight: 600 }}>
                  In Queue
                </h3>
              </div>

              <div className="bg-white dark:bg-zinc-900/50 border border-gray-200 dark:border-white/10 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-zinc-900/50 border-b border-gray-200 dark:border-white/10">
                        <th className="text-left py-3 px-4 text-gray-600 dark:text-gray-400" style={{ fontSize: "12px", fontWeight: 600, letterSpacing: "0.05em" }}>
                          <div className="flex items-center gap-2">
                            <svg width="14" height="14" className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                            </svg>
                            JOB ID
                          </div>
                        </th>
                        <th className="text-left py-3 px-4 text-gray-600 dark:text-gray-400" style={{ fontSize: "12px", fontWeight: 600, letterSpacing: "0.05em" }}>
                          <div className="flex items-center gap-2">
                            <svg width="14" height="14" className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                            </svg>
                            PRODUCT
                          </div>
                        </th>
                        <th className="text-left py-3 px-4 text-gray-600 dark:text-gray-400" style={{ fontSize: "12px", fontWeight: 600, letterSpacing: "0.05em" }}>
                          <div className="flex items-center gap-2">
                            <svg width="14" height="14" className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            STATUS
                          </div>
                        </th>
                        <th className="text-left py-3 px-4 text-gray-600 dark:text-gray-400" style={{ fontSize: "12px", fontWeight: 600, letterSpacing: "0.05em" }}>
                          ACTION
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {queuedJobs.length > 0 ? (
                        queuedJobs.map((job, index) => (
                          <tr
                            key={job.id}
                            className="border-b border-gray-200 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-zinc-900/50 transition-all group last:border-0"
                          >
                            <td className="py-4 px-4">
                              <div className="flex items-center gap-2">
                                <span className="text-gray-900 dark:text-white" style={{ fontSize: "13px", fontWeight: 600 }}>
                                  {job.id}
                                </span>
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              <div className="max-w-xs">
                                <p className="text-gray-900 dark:text-white mb-0.5 truncate" style={{ fontSize: "14px", fontWeight: 600 }}>
                                  {job.productName}
                                </p>
                                <p className="text-gray-500 dark:text-gray-400 truncate" style={{ fontSize: "12px" }}>
                                  {job.productLink}
                                </p>
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              <StatusBadge variant="queued" label="Queued" />
                            </td>
                            <td className="py-4 px-4">
                              <button
                                onClick={() => removeFromQueue(job.id)}
                                className="p-2.5 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-all border border-transparent hover:border-red-200 dark:hover:border-red-800/30 group-hover:scale-110"
                                title="Remove from Queue"
                              >
                                <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="py-12 text-center">
                            <div className="flex flex-col items-center gap-3">
                              <div className="w-16 h-16 bg-gray-100 dark:bg-zinc-900/50 rounded-full flex items-center justify-center">
                                <svg className="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                              </div>
                              <div>
                                <p className="text-gray-900 dark:text-white mb-1" style={{ fontSize: "14px", fontWeight: 600 }}>
                                  No jobs in queue
                                </p>
                                <p className="text-gray-500 dark:text-gray-400" style={{ fontSize: "13px" }}>
                                  Queue another scrape to see it here
                                </p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Table C: Completed */}
            <div className="mt-8 pt-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-6 bg-emerald-500 rounded-full" />
                <h3 className="text-black dark:text-white" style={{ fontSize: "18px", fontWeight: 600 }}>
                  Completed
                </h3>
              </div>

              <div className="bg-white dark:bg-zinc-900/50 border border-gray-200 dark:border-white/10 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-zinc-900/50 border-b border-gray-200 dark:border-white/10">
                        <th className="text-left py-3 px-4 text-gray-600 dark:text-gray-400" style={{ fontSize: "12px", fontWeight: 600, letterSpacing: "0.05em" }}>
                          <div className="flex items-center gap-2">
                            <svg width="14" height="14" className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                            </svg>
                            JOB ID
                          </div>
                        </th>
                        <th className="text-left py-3 px-4 text-gray-600 dark:text-gray-400" style={{ fontSize: "12px", fontWeight: 600, letterSpacing: "0.05em" }}>
                          <div className="flex items-center gap-2">
                            <svg width="14" height="14" className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                            </svg>
                            PRODUCT
                          </div>
                        </th>
                        <th className="text-left py-3 px-4 text-gray-600 dark:text-gray-400" style={{ fontSize: "12px", fontWeight: 600, letterSpacing: "0.05em" }}>
                          <div className="flex items-center gap-2">
                            <svg width="14" height="14" className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            STATUS
                          </div>
                        </th>
                        <th className="text-left py-3 px-4 text-gray-600 dark:text-gray-400" style={{ fontSize: "12px", fontWeight: 600, letterSpacing: "0.05em" }}>
                          ACTION
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {completedJobs.length > 0 ? (
                        completedJobs.map((job) => (
                          <tr key={job.id} className="border-b border-gray-200 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-zinc-900/50 transition-all group last:border-0">
                            <td className="py-4 px-4">
                              <span className="text-gray-900 dark:text-white" style={{ fontSize: "13px", fontWeight: 600 }}>
                                {job.id}
                              </span>
                            </td>
                            <td className="py-4 px-4">
                              <div className="max-w-xs">
                                <p className="text-gray-900 dark:text-white mb-0.5 truncate" style={{ fontSize: "14px", fontWeight: 600 }}>
                                  {job.productName}
                                </p>
                                <p className="text-gray-500 dark:text-gray-400 truncate" style={{ fontSize: "12px" }}>
                                  {job.productLink}
                                </p>
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              <StatusBadge variant="completed" label="Completed" />
                            </td>
                            <td className="py-4 px-4">
                              <button
                                className="p-2.5 hover:bg-gray-100 dark:hover:bg-zinc-900 rounded-lg transition-all border border-transparent hover:border-gray-200 dark:hover:border-white/10 group-hover:scale-110"
                                title="View details"
                                onClick={() => navigate("/dashboard")}
                              >
                                <Eye className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="py-12 text-center">
                            <div className="flex flex-col items-center gap-3">
                              <div className="w-16 h-16 bg-gray-100 dark:bg-zinc-900/50 rounded-full flex items-center justify-center">
                                <svg className="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                                </svg>
                              </div>
                              <div>
                                <p className="text-gray-900 dark:text-white mb-1" style={{ fontSize: "14px", fontWeight: 600 }}>
                                  No completed jobs
                                </p>
                                <p className="text-gray-500 dark:text-gray-400" style={{ fontSize: "13px" }}>
                                  Completed jobs will appear here
                                </p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
