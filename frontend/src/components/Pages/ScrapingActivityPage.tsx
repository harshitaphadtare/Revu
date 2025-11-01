import { useState, useEffect, useRef } from "react";
import { X, Trash2, Eye } from "lucide-react";
import { ProgressRing } from "@/components/utils/ProgressRing";
import { useToast } from "@/hooks/useToast";
import { apiScrapeStatus, apiCancelScrape, apiStartScrape, apiLockStatus, apiAnalyze, apiSaveAnalysis, type ScrapeStatusResponse } from "@/lib/api";
import { useNavigate } from "react-router-dom";

// Helper: convert hex color ("#rrggbb") to rgba() with given alpha
const hexToRgba = (hex?: string, alpha = 1) => {
  if (!hex) return `rgba(0,0,0,${alpha})`;
  const cleaned = hex.replace('#','');
  if (cleaned.length === 3) {
    const r = parseInt(cleaned[0] + cleaned[0], 16);
    const g = parseInt(cleaned[1] + cleaned[1], 16);
    const b = parseInt(cleaned[2] + cleaned[2], 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }
  const r = parseInt(cleaned.slice(0,2), 16);
  const g = parseInt(cleaned.slice(2,4), 16);
  const b = parseInt(cleaned.slice(4,6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
};


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

  // Load completed jobs from pending view storage (unviewed completed jobs)
  const loadCompletedJobs = () => {
    try {
      const pending = JSON.parse(localStorage.getItem("revu:pendingView") || "[]");
      const completed: ScrapeJob[] = pending.map((entry: any) => ({
        id: entry.job_id,
        productName: (entry.product && (entry.product.name || entry.product.title)) || "Product",
        productLink: entry.url || "",
        status: "completed" as const,
      }));
      setCompletedJobs(completed);
    } catch (err) {
      console.warn("Failed to load completed jobs from pending view", err);
      setCompletedJobs([]);
    }
  };

  // Return a cleaned/truncated URL for display (hostname + path), with full URL available via title
  const cleanUrl = (raw?: string, maxLen = 80) => {
    if (!raw) return "";
    try {
      const u = new URL(raw);
      const display = `${u.hostname}${u.pathname}${u.search || ""}`;
      if (display.length > maxLen) return display.slice(0, maxLen - 1) + "…";
      return display;
    } catch (e) {
      // not a valid URL; fall back to raw string truncated
      if (raw.length > maxLen) return raw.slice(0, maxLen - 1) + "…";
      return raw;
    }
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
        console.error("startNextIfPossible: failed to start next scrape", e);
        warning(e?.message || "Failed to start next scrape. Will retry shortly.");
        // Try again later
        startNextIfPossible(10000);
      }
    }, delayMs) as unknown as number;
  };

  // Seed from last started job, load queue, and begin polling
  useEffect(() => {
    loadQueued();
    loadCompletedJobs();
    const lastJobId = localStorage.getItem("revu:lastJobId");
    const lastURL = localStorage.getItem("revu:lastURL") || "";

    // Check if this job is already completed (in pendingView or history)
    if (lastJobId) {
      const pending = JSON.parse(localStorage.getItem("revu:pendingView") || "[]");
      const history = JSON.parse(localStorage.getItem("revu:history") || "[]");
      const isCompleted = [...pending, ...history].some((entry: any) => entry.job_id === lastJobId);

      if (isCompleted) {
        // Job is already completed, clear it from active
        localStorage.removeItem("revu:lastJobId");
        localStorage.removeItem("revu:lastURL");
        startNextIfPossible(500);
        return;
      }
    }

    if (!lastJobId) {
      // No active job; if queue exists, attempt to start immediately (after lock clears)
      startNextIfPossible(500);
      return;
    }

    // Verify with backend before showing an active-job placeholder to avoid stale local pointers
    if (!activeJob) {
      (async () => {
        try {
          const res: ScrapeStatusResponse = await apiScrapeStatus(lastJobId as string);
          const state = (res.state || "").toUpperCase();

          // Handle terminal states - job is done
          if (state === "SUCCESS" || state === "FAILURE" || state === "REVOKED") {
            localStorage.removeItem("revu:lastJobId");
            localStorage.removeItem("revu:lastURL");
            startNextIfPossible(500);
            return;
          }

          // Handle active states - show the job (PROGRESS, PENDING, QUEUED, STARTED, etc.)
          if (state === "PROGRESS" || state === "PENDING" || state === "QUEUED" || state === "STARTED") {
            const started = new Date().toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            });
            setActiveJob({
              id: lastJobId,
              productName: (res.product && (res.product.name || res.product.title)) || (lastURL ? new URL(lastURL).hostname : "Product"),
              productLink: lastURL,
              status: "processing",
              Progress: Number(res.progress ?? 0),
              statusText: state === "PROGRESS" ? "Processing..." : "Queued",
              dateStarted: started,
            });
          } else if (state) {
            // Unknown non-empty state - show it anyway but log a warning
            console.warn(`Unknown job state: ${state}, showing job anyway`);
            const started = new Date().toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            });
            setActiveJob({
              id: lastJobId,
              productName: (res.product && (res.product.name || res.product.title)) || (lastURL ? new URL(lastURL).hostname : "Product"),
              productLink: lastURL,
              status: "processing",
              Progress: Number(res.progress ?? 0),
              statusText: "Processing...",
              dateStarted: started,
            });
          } else {
            // Empty state - likely job doesn't exist, clear it
            localStorage.removeItem("revu:lastJobId");
            localStorage.removeItem("revu:lastURL");
            startNextIfPossible(500);
          }
        } catch (err) {
          // If backend check fails (transient error), fall back to showing a placeholder so the UI remains responsive.
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
      })();
    }

    let cancelled = false;
    let interval: any;
    let failureCount = 0; // Track consecutive failures

    const poll = async () => {
      try {
        const res: ScrapeStatusResponse = await apiScrapeStatus(lastJobId);
        if (cancelled) return;

        // Reset failure count on successful API call
        failureCount = 0;

        const state = (res.state || "").toUpperCase();

        // Handle active states - PROGRESS, PENDING, QUEUED, STARTED
        if (state === "PROGRESS" || state === "PENDING" || state === "QUEUED" || state === "STARTED") {
          setActiveJob((prev) =>
            prev
              ? {
                  ...prev,
                  Progress: Math.max(0, Math.min(100, Number(res.progress ?? 0))),
                  statusText: state === "PROGRESS" ? "Processing..." : "Queued",
                }
              : prev
          );
        } else if (state === "SUCCESS") {
          // build a completed job summary for UI
          const done: ScrapeJob = {
            id: res.job_id,
            productName: (res.product && (res.product.name || res.product.title)) || (activeJob?.productName || "Product"),
            productLink: activeJob?.productLink || "",
            status: "completed",
          };

          // Save to pending view (unviewed completed jobs) - NOT to history yet
          try {
            const pendingKey = "revu:pendingView";
            const existing = JSON.parse(localStorage.getItem(pendingKey) || "[]");
            const entry = {
              job_id: res.job_id,
              url: activeJob?.productLink || localStorage.getItem("revu:lastURL") || "",
              product: res.product || {},
              reviews: (res.result && Array.isArray(res.result)) ? res.result : (res.result?.reviews || []),
              analysis: (res.analysis ? res.analysis : (res.result?.analysis || undefined)),
              meta: {
                state: res.state,
                progress: res.progress,
                startedAt: activeJob?.dateStarted || null,
                finishedAt: new Date().toISOString(),
              },
            };
            existing.unshift(entry);
            localStorage.setItem(pendingKey, JSON.stringify(existing));
            // also keep a pointer to the last result for quick access
            localStorage.setItem("revu:lastResult", JSON.stringify(entry));
            // If backend didn't return analysis (older server), fallback to compute locally
            // Note: We DON'T save to database here - user must click "Save Data" button
            if (!entry.analysis) {
              try {
                const reviewsForAnalysis = entry.reviews.map((r: any) => ({
                  review_text: r.review_text,
                  rating: r.rating,
                  review_date: r.review_date,
                }));
                const analysis = await apiAnalyze({ reviews: reviewsForAnalysis });
                // update local entry with analysis, but don't save to database yet
                entry.analysis = analysis;
                localStorage.setItem(pendingKey, JSON.stringify([entry, ...existing.slice(1)]));
                localStorage.setItem("revu:lastResult", JSON.stringify(entry));
              } catch (persistErr) {
                console.warn("Analysis computation failed", persistErr);
              }
            }
          } catch (err) {
            // ignore storage errors
            console.warn("Failed to persist to pending view", err);
          }

          // Reload completed jobs from localStorage to stay in sync
          loadCompletedJobs();
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
        failureCount++;
        console.warn(`Failed to fetch scrape status (attempt ${failureCount}):`, e?.message || e);

        // After 3 consecutive failures, assume the job is gone/invalid
        if (failureCount >= 3) {
          info("Unable to fetch scrape status. Job may no longer exist.");
          setActiveJob(null);
          localStorage.removeItem("revu:lastJobId");
          localStorage.removeItem("revu:lastURL");
          clearInterval(interval);
          // Try to start next from queue if any
          startNextIfPossible(3000);
        }
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
      const errorMsg = e?.message || "Failed to cancel job";
      info(errorMsg);

      // If the error indicates the job doesn't exist, clear it immediately
      if (errorMsg.toLowerCase().includes("not found") || errorMsg.toLowerCase().includes("does not exist")) {
        setActiveJob(null);
        localStorage.removeItem("revu:lastJobId");
        localStorage.removeItem("revu:lastURL");
        info("Job no longer exists. Cleared from active jobs.");
      }
    }
  };

  const removeFromQueue = (id: string) => {
    const q = readQueue().filter((x) => x.id !== id);
    writeQueue(q);
    loadQueued();
  };

  // Handle viewing a completed job - remove from pending and navigate to dashboard
  const handleViewJob = (jobId: string) => {
    try {
      const pendingKey = "revu:pendingView";
      const pending = JSON.parse(localStorage.getItem(pendingKey) || "[]");
      // Remove this job from pending view
      const updated = pending.filter((entry: any) => entry.job_id !== jobId);
      localStorage.setItem(pendingKey, JSON.stringify(updated));
      // Reload completed jobs to reflect removal
      loadCompletedJobs();
      // Navigate to dashboard to view the job
      navigate(`/dashboard/${jobId}`);
    } catch (err) {
      console.warn("Failed to remove from pending view", err);
      // Still navigate even if removal fails
      navigate(`/dashboard/${jobId}`);
    }
  };

  // Keep queue and completed jobs UI in sync if other parts of the app modify localStorage
  useEffect(() => {
    const onStorage = (ev: StorageEvent) => {
      if (ev.key === "revu:scrapeQueue") loadQueued();
      if (ev.key === "revu:pendingView") loadCompletedJobs();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // derive a human-friendly status and color classes from progress percentage
  const getStatusFromProgress = (p?: number) => {
    const prog = typeof p === "number" ? p : 0;

    // Complete (100%)
    if (prog >= 100) {
      return {
        label: "Complete!",
        bgClass: "bg-emerald-50 dark:bg-emerald-900/20",
        borderClass: "border-emerald-300 dark:border-emerald-700/40",
        textClass: "text-emerald-700 dark:text-emerald-300",
        dotColor: "#10b981", // emerald-500
        useBreath: true,
      };
    }

    // Creating summary (81-99%)
    if (prog >= 81) {
      return {
        label: "Creating summary...",
        bgClass: "bg-indigo-50 dark:bg-indigo-900/20",
        borderClass: "border-indigo-300 dark:border-indigo-700/40",
        textClass: "text-indigo-700 dark:text-indigo-300",
        dotColor: "#6366f1", // indigo-500
        useBreath: true,
      };
    }

    // Extracting topics (61-80%)
    if (prog >= 61) {
      return {
        label: "Extracting topics...",
        bgClass: "bg-violet-50 dark:bg-violet-900/20",
        borderClass: "border-violet-300 dark:border-violet-700/40",
        textClass: "text-violet-700 dark:text-violet-300",
        dotColor: "#8b5cf6", // violet-500
        useBreath: true,
      };
    }

    // Analyzing sentiments (41-60%)
    if (prog >= 41) {
      return {
        label: "Analyzing sentiments...",
        bgClass: "bg-purple-50 dark:bg-purple-900/20",
        borderClass: "border-purple-300 dark:border-purple-700/40",
        textClass: "text-purple-700 dark:text-purple-300",
        dotColor: "#a855f7", // purple-500
        useBreath: true,
      };
    }

    // Preprocessing (21-40%)
    if (prog >= 21) {
      return {
        label: "Preprocessing...",
        bgClass: "bg-cyan-50 dark:bg-cyan-900/20",
        borderClass: "border-cyan-300 dark:border-cyan-700/40",
        textClass: "text-cyan-700 dark:text-cyan-300",
        dotColor: "#06b6d4", // cyan-500
        useBreath: true,
      };
    }

    // Scraping reviews (1-20%)
    if (prog >= 1) {
      return {
        label: "Scraping reviews...",
        bgClass: "bg-blue-50 dark:bg-blue-900/20",
        borderClass: "border-blue-300 dark:border-blue-700/40",
        textClass: "text-blue-700 dark:text-blue-300",
        dotColor: "#3b82f6", // blue-500
        useBreath: true,
      };
    }

    // Queued (0%)
    return {
      label: "Queued",
      bgClass: "bg-gray-50 dark:bg-zinc-900/40",
      borderClass: "border-gray-300 dark:border-zinc-700/40",
      textClass: "text-gray-700 dark:text-gray-300",
      dotColor: "#6b7280", // gray-500
      useBreath: true,
    };
  };

  return (
    <div className={isDark ? "dark" : ""}>
  <div className="min-h-screen bg-gray-50 dark:bg-black">
        {/* breathing animation styles */}
        <style>{`
          .breathing-ring {
            position: absolute;
            width: 48px;
            height: 48px;
            border-radius: 9999px;
            animation: breathRing 2.5s ease-in-out infinite;
            display: block;
          }

          .breathing-dot {
            position: relative;
            width: 12px;
            height: 12px;
            border-radius: 9999px;
            animation: breathDot 2.5s ease-in-out infinite;
            display: block;
            z-index: 1;
          }

          .breathing-dot-sm {
            position: relative;
            width: 6px;
            height: 6px;
            border-radius: 9999px;
            animation: breathDot 2.5s ease-in-out infinite;
            display: block;
            z-index: 1;
          }

          @keyframes breathRing {
            0%, 100% {
              transform: scale(0.85);
              opacity: 0.3;
            }
            50% {
              transform: scale(1.15);
              opacity: 0.6;
            }
          }

          @keyframes breathDot {
            0%, 100% {
              transform: scale(0.95);
              opacity: 0.85;
            }
            50% {
              transform: scale(1.05);
              opacity: 1;
              filter: brightness(1.2);
            }
          }
        `}</style>

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
                          Product URL
                        </p>
                        <p className="text-gray-500 dark:text-gray-400 truncate mt-1" style={{ fontSize: "12px" }} title={activeJob.productLink}>
                          {cleanUrl(activeJob.productLink)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Progress Status Banner - color-coded stage indicator with breathing animation */}
                      {(() => {
                        const status = getStatusFromProgress(activeJob?.Progress);
                        return (
                          <div
                            className={`rounded-xl p-4 border`}
                            style={{
                              background: hexToRgba(status.dotColor, 0.08),
                              borderColor: hexToRgba(status.dotColor, 0.18),
                            }}
                          >
                            <div className="flex items-center gap-3">
                              <div className="relative flex items-center justify-center" style={{ width: 48, height: 48 }}>
                                {status.useBreath ? (
                                  <>
                                    <span
                                      className="breathing-ring"
                                      aria-hidden
                                      style={{
                                        background: `radial-gradient(circle at center, ${status.dotColor}30, ${status.dotColor}15, transparent)`
                                      }}
                                    />
                                    <span
                                      className="breathing-dot"
                                      aria-hidden
                                      style={{
                                        background: status.dotColor,
                                        boxShadow: `0 0 0 0 ${status.dotColor}40`
                                      }}
                                    />
                                  </>
                                ) : (
                                  <span
                                    aria-hidden
                                    style={{
                                      display: 'inline-block',
                                      width: 14,
                                      height: 14,
                                      borderRadius: 9999,
                                      background: status.dotColor
                                    }}
                                  />
                                )}
                              </div>
                              <div className="flex-1">
                                <p className="text-gray-600 dark:text-gray-400 mb-0.5" style={{ fontSize: "12px" }}>
                                  Current Status
                                </p>
                                <p style={{ fontSize: "15px", fontWeight: 600, color: status.dotColor }}>
                                  {status.label}
                                </p>
                              </div>
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
                              {activeJob.productLink ? (
                                <a
                                  href={activeJob.productLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-gray-700 dark:text-gray-200 hover:underline truncate"
                                  style={{ fontSize: "12px", display: "inline-block" }}
                                  title={activeJob.productLink}
                                >
                                  {activeJob.productName || cleanUrl(activeJob.productLink)}
                                </a>
                              ) : (
                                <p className="text-gray-500 dark:text-gray-400 truncate" style={{ fontSize: "12px" }} title={activeJob.productLink}>
                                  {cleanUrl(activeJob.productLink)}
                                </p>
                              )}
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            {(() => {
                              const status = getStatusFromProgress(activeJob?.Progress);
                              return (
                                <div
                                  className={`inline-flex items-center gap-2 px-3 py-1.5 border rounded-lg`}
                                  style={{
                                    background: hexToRgba(status.dotColor, 0.08),
                                    borderColor: hexToRgba(status.dotColor, 0.18),
                                  }}
                                >
                                  {status.useBreath ? (
                                    <div className="relative flex items-center justify-center" style={{ width: 14, height: 14 }}>
                                      <span
                                        className="breathing-ring"
                                        aria-hidden
                                        style={{
                                          width: 24,
                                          height: 24,
                                          background: `radial-gradient(circle at center, ${status.dotColor}30, ${status.dotColor}15, transparent)`
                                        }}
                                      />
                                      <span
                                        className="breathing-dot-sm"
                                        aria-hidden
                                        style={{
                                          background: status.dotColor
                                        }}
                                      />
                                    </div>
                                  ) : (
                                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: status.dotColor }} />
                                  )}
                                  <span style={{ fontSize: "13px", fontWeight: 600, color: status.dotColor }}>
                                    {status.label}
                                  </span>
                                </div>
                              );
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
                                {job.productLink ? (
                                  <a
                                    href={job.productLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-gray-700 dark:text-gray-200 hover:underline truncate"
                                    style={{ fontSize: "12px", display: "inline-block" }}
                                    title={job.productLink}
                                  >
                                    {job.productName || cleanUrl(job.productLink)}
                                  </a>
                                ) : (
                                  <p className="text-gray-500 dark:text-gray-400 truncate" style={{ fontSize: "12px" }} title={job.productLink}>
                                    {cleanUrl(job.productLink)}
                                  </p>
                                )}
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-orange-50 border border-orange-200 rounded-lg dark:bg-orange-900/20 dark:border-orange-800/40">
                                <svg className="w-3 h-3 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className="text-orange-700 dark:text-orange-200" style={{ fontSize: "13px", fontWeight: 600 }}>
                                  Queued
                                </span>
                              </div>
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
                                {job.productLink ? (
                                  <a
                                    href={job.productLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-gray-700 dark:text-gray-200 hover:underline truncate"
                                    style={{ fontSize: "12px", display: "inline-block" }}
                                    title={job.productLink}
                                  >
                                    {job.productName || cleanUrl(job.productLink)}
                                  </a>
                                ) : (
                                  <p className="text-gray-500 dark:text-gray-400 truncate" style={{ fontSize: "12px" }} title={job.productLink}>
                                    {cleanUrl(job.productLink)}
                                  </p>
                                )}
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/40 rounded-lg">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                <span className="text-emerald-700 dark:text-emerald-200" style={{ fontSize: "13px", fontWeight: 600 }}>
                                  Completed
                                </span>
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              <button
                                className="p-2.5 hover:bg-gray-100 dark:hover:bg-zinc-900 rounded-lg transition-all border border-transparent hover:border-gray-200 dark:hover:border-white/10 group-hover:scale-110"
                                title="View details"
                                onClick={() => handleViewJob(job.id)}
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
