import { useState, useEffect } from "react";
import { Sun, Moon, User, X, Trash2, Eye } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { ProgressRing } from "@/components/utils/ProgressRing";


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
  const [productLink, setProductLink] = useState("");
  const [activeJob, setActiveJob] = useState<ScrapeJob>({
    id: "125A-01",
    productName: "Sony WH-1000XM5 Wireless Headphones",
    productLink: "https://amazon.com/sony-wh1000xm5",
    status: "processing",
    Progress: 75,
    statusText: "Analyzing sentiments...",
    dateStarted: "23-Oct-2025",
  });
  const [queuedJobs, setQueuedJobs] = useState<ScrapeJob[]>([
    {
      id: "125A-02",
      productName: "Apple AirPods Pro (2nd Gen)",
      productLink: "https://amazon.com/airpods-pro",
      status: "queued",
      queuePosition: 1,
    },
    {
      id: "125A-03",
      productName: "Bose QuietComfort 45 Headphones",
      productLink: "https://flipkart.com/bose-qc45",
      status: "queued",
      queuePosition: 2,
    },
  ]);
  const [completedJobs, setCompletedJobs] = useState<ScrapeJob[]>([
    {
      id: "125A-04",
      productName: "Sennheiser HD 650 Headphones",
      productLink: "https://example.com/hd650",
      status: "completed",
    },
    {
      id: "125A-05",
      productName: "JBL Live 660NC",
      productLink: "https://example.com/jbl-660nc",
      status: "completed",
    },
  ]);
  const [activeTab, setActiveTab] = useState<"scraping" | "home" | "history">("scraping");

  // theme state is controlled by parent via props (isDark, onThemeToggle)

  const handleQueueAnalysis = () => {
    if (!productLink.trim()) return;

    const newJob: ScrapeJob = {
      id: `125A-${String(Date.now()).slice(-2)}`,
      productName: productLink.includes("amazon") ? "Amazon Product" : productLink.includes("flipkart") ? "Flipkart Product" : "Product",
      productLink: productLink,
      status: "queued",
      queuePosition: queuedJobs.length + 1,
    };

    setQueuedJobs([...queuedJobs, newJob]);
    setProductLink("");
  };

  const cancelCurrentProcess = () => {
    // Move to next queued job if available
    if (queuedJobs.length > 0) {
      const nextJob = {
        ...queuedJobs[0],
        status: "processing" as const,
        progress: 0,
        statusText: "Fetching data...",
        dateStarted: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
      };
      setActiveJob(nextJob);
      setQueuedJobs(queuedJobs.slice(1).map((job, index) => ({
        ...job,
        queuePosition: index + 1,
      })));
    } else {
      // No more jobs in queue
      setActiveJob(null as any);
    }
  };

  const removeFromQueue = (id: string) => {
    const updatedQueue = queuedJobs
      .filter(job => job.id !== id)
      .map((job, index) => ({
        ...job,
        queuePosition: index + 1,
      }));
    setQueuedJobs(updatedQueue);
  };

  // derive a human-friendly status and color classes from progress percentage
  const getStatusFromProgress = (p?: number) => {
    const prog = typeof p === "number" ? p : 0;
    if (prog >= 100) {
      return {
        label: "Complete",
        bgClass: "bg-green-50 dark:bg-emerald-900/20",
        borderClass: "border-green-200 dark:border-emerald-700/40",
        textClass: "text-green-700 dark:text-emerald-200",
        dotClass: "bg-green-500 dark:bg-emerald-400 animate-pulse",
        useBreath: false,
      };
    }
    if (prog >= 81) {
      return {
        label: "Summarizing results...",
        bgClass: "bg-violet-50 dark:bg-indigo-900/20",
        borderClass: "border-violet-200 dark:border-indigo-800/40",
        textClass: "text-indigo-700 dark:text-indigo-200",
        dotClass: "bg-indigo-500 dark:bg-indigo-400 animate-pulse",
        useBreath: false,
      };
    }
    if (prog >= 61) {
      return {
        label: "Analyzing sentiments...",
        // Soft purple gradient strip in light; deep subtle glow in dark
        bgClass: "bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-900/30 dark:via-indigo-900/20 dark:to-transparent",
        borderClass: "border-violet-200 dark:border-white/10",
        textClass: "text-indigo-700 dark:text-white",
        dotClass: "breathing-dot",
        useBreath: true,
      };
    }
    if (prog >= 31) {
      return {
        label: "Preprocessing data...",
        bgClass: "bg-blue-50 dark:bg-blue-900/20",
        borderClass: "border-blue-200 dark:border-blue-800/40",
        textClass: "text-blue-700 dark:text-blue-200",
        dotClass: "bg-blue-500 dark:bg-blue-400 animate-pulse",
        useBreath: false,
      };
    }
    if (prog >= 11) {
      return {
        label: "Fetching data...",
        bgClass: "bg-gray-50 dark:bg-zinc-900/40",
        borderClass: "border-gray-200 dark:border-white/10",
        textClass: "text-gray-700 dark:text-gray-300",
        dotClass: "bg-gray-300 dark:bg-zinc-600 animate-pulse",
        useBreath: false,
      };
    }
    return {
      label: "Queued",
      bgClass: "bg-gray-50 dark:bg-zinc-900/40",
      borderClass: "border-gray-200 dark:border-white/10",
      textClass: "text-gray-700 dark:text-gray-300",
      dotClass: "bg-gray-300 dark:bg-zinc-600 animate-pulse",
      useBreath: false,
    };
  };

  return (
    <div className={isDark ? "dark" : ""}>
  <div className="min-h-screen bg-gray-50 dark:bg-black">
        {/* breathing animation styles (scoped-ish) */}
        <style>{`
          .breathing-ring{position:absolute;width:48px;height:48px;border-radius:9999px;background:radial-gradient(circle at center, rgba(124,58,237,0.18), rgba(99,102,241,0.08), transparent);animation:breath 2000ms ease-in-out infinite;display:block}
          .breathing-dot{position:relative;width:12px;height:12px;border-radius:9999px; background:linear-gradient(135deg,#7c3aed,#6366f1); box-shadow:0 6px 18px rgba(99,102,241,0.12); display:block}
          .breathing-dot-sm{position:relative;width:6px;height:6px;border-radius:9999px;background:linear-gradient(135deg,#7c3aed,#6366f1);box-shadow:0 4px 8px rgba(99,102,241,0.08)}
          @keyframes breath{0%{transform:scale(.92);opacity:.75}50%{transform:scale(1.05);opacity:1}100%{transform:scale(.92);opacity:.75}}
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

                  {/* Progress Status Banner - gradient strip with animated dot to match mock */}
                      {(() => {
                        const status = getStatusFromProgress(activeJob?.Progress);
                        return (
                          <div className={`rounded-xl p-4 bg-violet-50 dark:bg-indigo-900/20 ${status.bgClass} ${status.borderClass} border`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="relative flex items-center justify-center" style={{ width: 48, height: 48 }}>
                                {status.useBreath ? (
                                  <>
                                    <span className="breathing-ring" aria-hidden />
                                    <span className="breathing-dot" aria-hidden />
                                  </>
                                ) : (
                                  <span className={`${status.dotClass} rounded-full w-3.5 h-3.5`} aria-hidden />
                                )}
                              </div>
                              <div className="flex-1">
                                <p className="text-gray-600 dark:text-gray-400 mb-0.5" style={{ fontSize: "12px" }}>
                                  Current Status
                                </p>
                                <p className={`${status.textClass}`} style={{ fontSize: "15px", fontWeight: 600 }}>
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
                              const status = getStatusFromProgress(activeJob?.Progress);
                              return (
                                <div className={`inline-flex items-center gap-2 px-3 py-1.5 ${status.bgClass} ${status.borderClass} rounded-lg`}>
                                  {status.useBreath ? (
                                    <div className="relative flex items-center justify-center" style={{ width: 14, height: 14 }}>
                                      <span className="breathing-ring" aria-hidden />
                                      <span className="breathing-dot" aria-hidden />
                                    </div>
                                  ) : (
                                    <div className={`w-1.5 h-1.5 rounded-full ${status.dotClass}`} />
                                  )}
                                  <span className={`${status.textClass}`} style={{ fontSize: "13px", fontWeight: 600 }}>
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
                                <p className="text-gray-900 dark:text-white mb-0.5 truncate" style={{ fontSize: "14px", fontWeight: 600 }}>
                                  {job.productName}
                                </p>
                                <p className="text-gray-500 dark:text-gray-400 truncate" style={{ fontSize: "12px" }}>
                                  {job.productLink}
                                </p>
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
                                <p className="text-gray-900 dark:text-white mb-0.5 truncate" style={{ fontSize: "14px", fontWeight: 600 }}>
                                  {job.productName}
                                </p>
                                <p className="text-gray-500 dark:text-gray-400 truncate" style={{ fontSize: "12px" }}>
                                  {job.productLink}
                                </p>
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
