import { useState, useEffect } from "react";
import { Sun, Moon, User, X, Trash2 } from "lucide-react";
import { Input } from "./components/ui/input";
import { Progress } from "./components/ui/progress";
import { ProgressRing } from "./components/ProgressRing";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./components/ui/dropdown-menu";

interface ScrapeJob {
  id: string;
  productName: string;
  productLink: string;
  status: "processing" | "queued";
  progress?: number;
  statusText?: string;
  dateStarted?: string;
  queuePosition?: number;
}

export default function App() {
  const [isDark, setIsDark] = useState(true);
  const [productLink, setProductLink] = useState("");
  const [activeJob, setActiveJob] = useState<ScrapeJob>({
    id: "125A-01",
    productName: "Sony WH-1000XM5 Wireless Headphones",
    productLink: "https://amazon.com/sony-wh1000xm5",
    status: "processing",
    progress: 75,
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
  const [activeTab, setActiveTab] = useState<"scraping" | "home" | "history">("scraping");

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    
    if (newTheme) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

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

  return (
    <div className={isDark ? "dark" : ""}>
      <div className="min-h-screen bg-slate-50 dark:bg-black">
        {/* Navigation Bar */}
        <nav className="border-b border-slate-200 dark:border-white/10 bg-white dark:bg-black">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Logo */}
              <h1
                style={{
                  fontFamily: "Lexend, sans-serif",
                  fontSize: "24px",
                  fontWeight: 600,
                  letterSpacing: "-0.02em",
                }}
                className="text-black dark:text-white"
              >
                REVU
              </h1>

              {/* Center Navigation Links */}
              <div className="hidden md:flex items-center gap-8">
                <button
                  onClick={() => setActiveTab("home")}
                  className={`transition-colors ${
                    activeTab === "home"
                      ? "text-black dark:text-white"
                      : "text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white"
                  }`}
                  style={{ fontSize: "15px", fontWeight: 500 }}
                >
                  Home
                </button>
                <button
                  onClick={() => setActiveTab("scraping")}
                  className={`transition-colors ${
                    activeTab === "scraping"
                      ? "text-black dark:text-white"
                      : "text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white"
                  }`}
                  style={{ fontSize: "15px", fontWeight: 500 }}
                >
                  Scraping Activity
                </button>
                <button
                  onClick={() => setActiveTab("history")}
                  className={`transition-colors ${
                    activeTab === "history"
                      ? "text-black dark:text-white"
                      : "text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white"
                  }`}
                  style={{ fontSize: "15px", fontWeight: 500 }}
                >
                  History
                </button>
              </div>

              {/* Right side: Theme toggle + Profile */}
              <div className="flex items-center gap-3">
                <button
                  onClick={toggleTheme}
                  className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                >
                  {isDark ? (
                    <Sun className="w-5 h-5 text-slate-400" />
                  ) : (
                    <Moon className="w-5 h-5 text-slate-600" />
                  )}
                </button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
                      <User className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem>Profile</DropdownMenuItem>
                    <DropdownMenuItem>Settings</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-red-600">Logout</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Section 1: Current Scraping Process */}
          {activeJob && (
            <div className="bg-gradient-to-br from-white to-slate-50/50 dark:from-white/[0.02] dark:to-white/[0.01] border border-slate-200 dark:border-white/10 rounded-2xl p-8 mb-6 shadow-sm dark:shadow-none">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-black dark:text-white" style={{ fontSize: "24px", fontWeight: 600 }}>
                  Current Scraping Process
                </h2>
                <div className="px-3 py-1 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800/30 rounded-full">
                  <span className="text-green-700 dark:text-green-300" style={{ fontSize: "13px", fontWeight: 500 }}>
                    Active
                  </span>
                </div>
              </div>

              <div className="flex flex-col lg:flex-row items-center lg:items-start gap-8">
                {/* Progress Ring with enhanced background */}
                <div className="flex-shrink-0">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-100 to-blue-100 dark:from-purple-950/20 dark:to-blue-950/20 rounded-full blur-2xl opacity-60" />
                    <div className="relative bg-white dark:bg-white/5 p-6 rounded-full border border-slate-200 dark:border-white/10">
                      <ProgressRing progress={activeJob.progress || 0} size={200} strokeWidth={12} />
                    </div>
                  </div>
                </div>

                {/* Status Details */}
                <div className="flex-1 w-full space-y-4">
                  {/* Info Cards Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Job ID Card */}
                    <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-4 hover:shadow-md dark:hover:bg-white/[0.07] transition-all">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-100 dark:bg-white/10 rounded-lg flex items-center justify-center">
                          <svg className="w-5 h-5 text-slate-600 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <p className="text-slate-600 dark:text-slate-400 mb-0.5" style={{ fontSize: "12px" }}>
                            Job ID
                          </p>
                          <p className="text-black dark:text-white" style={{ fontSize: "16px", fontWeight: 600 }}>
                            {activeJob.id}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Date Started Card */}
                    <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-4 hover:shadow-md dark:hover:bg-white/[0.07] transition-all">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-100 dark:bg-white/10 rounded-lg flex items-center justify-center">
                          <svg className="w-5 h-5 text-slate-600 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <p className="text-slate-600 dark:text-slate-400 mb-0.5" style={{ fontSize: "12px" }}>
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
                  <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-4 hover:shadow-md dark:hover:bg-white/[0.07] transition-all">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-slate-100 dark:bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-slate-600 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-slate-600 dark:text-slate-400 mb-0.5" style={{ fontSize: "12px" }}>
                          Product
                        </p>
                        <p className="text-black dark:text-white truncate" style={{ fontSize: "16px", fontWeight: 600 }}>
                          {activeJob.productName}
                        </p>
                        <p className="text-slate-500 dark:text-slate-400 truncate mt-1" style={{ fontSize: "12px" }}>
                          {activeJob.productLink}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Progress Status Badge */}
                  <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/30 dark:to-blue-950/30 border border-purple-200 dark:border-purple-800/30 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                      <div className="relative flex items-center justify-center">
                        <div className="absolute w-8 h-8 bg-purple-400 dark:bg-purple-500 rounded-full animate-ping opacity-20" />
                        <div className="relative w-3 h-3 bg-purple-600 dark:bg-purple-400 rounded-full" />
                      </div>
                      <div className="flex-1">
                        <p className="text-slate-600 dark:text-slate-400 mb-0.5" style={{ fontSize: "12px" }}>
                          Current Status
                        </p>
                        <p className="text-purple-700 dark:text-purple-300" style={{ fontSize: "15px", fontWeight: 600 }}>
                          {activeJob.statusText}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="pt-2">
                    <button
                      onClick={cancelCurrentProcess}
                      className="w-full md:w-auto px-6 py-3 rounded-xl border-2 border-red-500 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-sm"
                      style={{ fontSize: "14px", fontWeight: 600 }}
                    >
                      <span className="flex items-center justify-center gap-2">
                        <X className="w-4 h-4" />
                        Cancel Process
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Section 2: Queue Another Scrape */}
          <div className="bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-2xl p-8 mb-6">
            <h2 className="text-black dark:text-white mb-2" style={{ fontSize: "24px", fontWeight: 600 }}>
              Queue Another Scrape
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mb-6" style={{ fontSize: "15px" }}>
              Add another product link to analyze while the current job is processing.
            </p>

            <div className="flex gap-3">
              <div className="flex-1">
                <Input
                  type="text"
                  placeholder="https://amazon.com/product/..."
                  value={productLink}
                  onChange={(e) => setProductLink(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleQueueAnalysis()}
                  className="h-12 px-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg focus:border-purple-500 dark:focus:border-purple-500 focus:ring-purple-500/20 dark:focus:ring-purple-500/30 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all text-slate-900 dark:text-white"
                />
              </div>
              <button
                onClick={handleQueueAnalysis}
                disabled={!productLink.trim()}
                className="h-12 px-6 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 text-white relative overflow-hidden group transition-all hover:shadow-2xl flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  boxShadow: productLink.trim()
                    ? `
                    0 4px 14px 0 rgba(124, 58, 237, 0.39),
                    0 8px 24px 0 rgba(59, 130, 246, 0.25),
                    0 16px 48px 0 rgba(124, 58, 237, 0.2)
                  `
                    : "none",
                  fontSize: "15px",
                  fontWeight: 500,
                }}
              >
                <span className="relative z-10">Queue Analysis</span>
                <div className="absolute inset-0 bg-gradient-to-r from-purple-700 to-blue-700 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            </div>
          </div>

          {/* Section 3: Scrape Management */}
          <div className="bg-gradient-to-br from-white to-slate-50/50 dark:from-white/[0.02] dark:to-white/[0.01] border border-slate-200 dark:border-white/10 rounded-2xl p-8 shadow-sm dark:shadow-none">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-black dark:text-white" style={{ fontSize: "24px", fontWeight: 600 }}>
                Scrape Management
              </h2>
              <div className="flex items-center gap-2">
                <div className="px-3 py-1 bg-slate-100 dark:bg-white/5 rounded-full">
                  <span className="text-slate-700 dark:text-slate-300" style={{ fontSize: "12px", fontWeight: 500 }}>
                    {activeJob ? 1 : 0} Active
                  </span>
                </div>
                <div className="px-3 py-1 bg-slate-100 dark:bg-white/5 rounded-full">
                  <span className="text-slate-700 dark:text-slate-300" style={{ fontSize: "12px", fontWeight: 500 }}>
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

              <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10">
                        <th className="text-left py-3 px-4 text-slate-600 dark:text-slate-400" style={{ fontSize: "12px", fontWeight: 600, letterSpacing: "0.05em" }}>
                          <div className="flex items-center gap-2">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                            </svg>
                            JOB ID
                          </div>
                        </th>
                        <th className="text-left py-3 px-4 text-slate-600 dark:text-slate-400" style={{ fontSize: "12px", fontWeight: 600, letterSpacing: "0.05em" }}>
                          <div className="flex items-center gap-2">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                            </svg>
                            PRODUCT
                          </div>
                        </th>
                        <th className="text-left py-3 px-4 text-slate-600 dark:text-slate-400" style={{ fontSize: "12px", fontWeight: 600, letterSpacing: "0.05em" }}>
                          <div className="flex items-center gap-2">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            STATUS
                          </div>
                        </th>
                        <th className="text-left py-3 px-4 text-slate-600 dark:text-slate-400" style={{ fontSize: "12px", fontWeight: 600, letterSpacing: "0.05em" }}>
                          <div className="flex items-center gap-2">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                            PROGRESS
                          </div>
                        </th>
                        <th className="text-left py-3 px-4 text-slate-600 dark:text-slate-400" style={{ fontSize: "12px", fontWeight: 600, letterSpacing: "0.05em" }}>
                          ACTION
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeJob ? (
                        <tr className="border-b border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 transition-all group">
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 bg-gradient-to-br from-purple-100 to-blue-100 dark:from-purple-950/30 dark:to-blue-950/30 rounded-lg flex items-center justify-center">
                                <span className="text-purple-700 dark:text-purple-300" style={{ fontSize: "11px", fontWeight: 700 }}>
                                  {activeJob.id.split('-')[1]}
                                </span>
                              </div>
                              <span className="text-slate-900 dark:text-white" style={{ fontSize: "13px", fontWeight: 600 }}>
                                {activeJob.id}
                              </span>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="max-w-xs">
                              <p className="text-slate-900 dark:text-white mb-0.5 truncate" style={{ fontSize: "14px", fontWeight: 600 }}>
                                {activeJob.productName}
                              </p>
                              <p className="text-slate-500 dark:text-slate-400 truncate" style={{ fontSize: "12px" }}>
                                {activeJob.productLink}
                              </p>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/30 rounded-lg">
                              <div className="w-1.5 h-1.5 bg-purple-600 dark:bg-purple-400 rounded-full animate-pulse" />
                              <span className="text-purple-700 dark:text-purple-300" style={{ fontSize: "13px", fontWeight: 600 }}>
                                {activeJob.statusText}
                              </span>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="w-40">
                              <div className="flex items-center justify-center">
                                <ProgressRing progress={activeJob.progress} size={60} strokeWidth={6} />
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
                              <div className="w-16 h-16 bg-slate-100 dark:bg-white/5 rounded-full flex items-center justify-center">
                                <svg className="w-8 h-8 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                                </svg>
                              </div>
                              <div>
                                <p className="text-slate-900 dark:text-white mb-1" style={{ fontSize: "14px", fontWeight: 600 }}>
                                  No active scraping process
                                </p>
                                <p className="text-slate-500 dark:text-slate-400" style={{ fontSize: "13px" }}>
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

            {/* Divider */}
            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200 dark:border-white/10" />
              </div>
              <div className="relative flex justify-center">
                <span className="px-4 bg-gradient-to-br from-white to-slate-50/50 dark:from-white/[0.02] dark:to-white/[0.01] text-slate-500 dark:text-slate-400" style={{ fontSize: "12px", fontWeight: 500 }}>
                  Queue
                </span>
              </div>
            </div>

            {/* Table B: Queued Scrapes */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-6 bg-gradient-to-b from-slate-400 to-slate-600 dark:from-slate-500 dark:to-slate-700 rounded-full" />
                <h3 className="text-black dark:text-white" style={{ fontSize: "18px", fontWeight: 600 }}>
                  In Queue
                </h3>
              </div>

              <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10">
                        <th className="text-left py-3 px-4 text-slate-600 dark:text-slate-400" style={{ fontSize: "12px", fontWeight: 600, letterSpacing: "0.05em" }}>
                          <div className="flex items-center gap-2">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
                            </svg>
                            POSITION
                          </div>
                        </th>
                        <th className="text-left py-3 px-4 text-slate-600 dark:text-slate-400" style={{ fontSize: "12px", fontWeight: 600, letterSpacing: "0.05em" }}>
                          <div className="flex items-center gap-2">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                            </svg>
                            JOB ID
                          </div>
                        </th>
                        <th className="text-left py-3 px-4 text-slate-600 dark:text-slate-400" style={{ fontSize: "12px", fontWeight: 600, letterSpacing: "0.05em" }}>
                          <div className="flex items-center gap-2">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                            </svg>
                            PRODUCT
                          </div>
                        </th>
                        <th className="text-left py-3 px-4 text-slate-600 dark:text-slate-400" style={{ fontSize: "12px", fontWeight: 600, letterSpacing: "0.05em" }}>
                          <div className="flex items-center gap-2">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            STATUS
                          </div>
                        </th>
                        <th className="text-left py-3 px-4 text-slate-600 dark:text-slate-400" style={{ fontSize: "12px", fontWeight: 600, letterSpacing: "0.05em" }}>
                          ACTION
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {queuedJobs.length > 0 ? (
                        queuedJobs.map((job, index) => (
                          <tr
                            key={job.id}
                            className="border-b border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 transition-all group last:border-0"
                          >
                            <td className="py-4 px-4">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800/50 dark:to-slate-900/50 rounded-lg flex items-center justify-center border border-slate-300 dark:border-slate-700">
                                  <span className="text-slate-700 dark:text-slate-300" style={{ fontSize: "13px", fontWeight: 700 }}>
                                    {job.queuePosition}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-slate-100 dark:bg-white/5 rounded-lg flex items-center justify-center">
                                  <span className="text-slate-700 dark:text-slate-300" style={{ fontSize: "11px", fontWeight: 700 }}>
                                    {job.id.split('-')[1]}
                                  </span>
                                </div>
                                <span className="text-slate-900 dark:text-white" style={{ fontSize: "13px", fontWeight: 600 }}>
                                  {job.id}
                                </span>
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              <div className="max-w-xs">
                                <p className="text-slate-900 dark:text-white mb-0.5 truncate" style={{ fontSize: "14px", fontWeight: 600 }}>
                                  {job.productName}
                                </p>
                                <p className="text-slate-500 dark:text-slate-400 truncate" style={{ fontSize: "12px" }}>
                                  {job.productLink}
                                </p>
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700 rounded-lg">
                                <svg className="w-3 h-3 text-slate-500 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className="text-slate-600 dark:text-slate-400" style={{ fontSize: "13px", fontWeight: 600 }}>
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
                          <td colSpan={5} className="py-12 text-center">
                            <div className="flex flex-col items-center gap-3">
                              <div className="w-16 h-16 bg-slate-100 dark:bg-white/5 rounded-full flex items-center justify-center">
                                <svg className="w-8 h-8 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                              </div>
                              <div>
                                <p className="text-slate-900 dark:text-white mb-1" style={{ fontSize: "14px", fontWeight: 600 }}>
                                  No jobs in queue
                                </p>
                                <p className="text-slate-500 dark:text-slate-400" style={{ fontSize: "13px" }}>
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
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-200 dark:border-white/10 mt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-slate-600 dark:text-slate-400" style={{ fontSize: "14px" }}>
                Engineered by{" "}
                <span className="text-slate-900 dark:text-white font-medium">REVU Team</span>
              </p>
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                style={{ fontSize: "14px" }}
              >
                Contribute on GitHub →
              </a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
