import { motion } from "motion/react";
import { Package, Search, Download, Save, RotateCcw, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar } from "recharts";
import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiGetAnalysis, apiAnalyze, apiSaveAnalysis } from "@/lib/api";
import { useToast } from "@/hooks/useToast";

interface DashboardPageProps {
  onReset: () => void;
  onThemeToggle: () => void;
  onProfileClick: () => void;
  isDark: boolean;
}

// small helper
const cleanUrl = (raw?: string, maxLen = 80) => {
  if (!raw) return "";
  try {
    const u = new URL(raw);
    const display = `${u.hostname}${u.pathname}${u.search || ""}`;
    return display.length > maxLen ? display.slice(0, maxLen - 1) + "…" : display;
  } catch {
    return raw.length > maxLen ? raw.slice(0, maxLen - 1) + "…" : raw;
  }
};

export function DashboardPage({ onReset, onThemeToggle, onProfileClick, isDark }: DashboardPageProps) {
  const { jobId } = useParams<{ jobId?: string }>();
  const navigate = useNavigate();
  const { success, warning } = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sentimentFilter, setSentimentFilter] = useState("all");
  const [summaryType, setSummaryType] = useState<"short" | "detailed">("short");
  // Reviews pagination
  const [reviewsPage, setReviewsPage] = useState(0);
  const REVIEWS_PAGE_SIZE = 10;

  // Auto-redirect to scraping activity if no data found (MUST be before any conditional returns)
  useEffect(() => {
    if (!loading && error === "No analysis selected") {
      navigate("/scraping-activity", { replace: true });
    }
  }, [loading, error, navigate]);

  // Load analysis: PRIORITY is localStorage, then database as fallback
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        if (!jobId) {
          // No jobId: open last result from localStorage
          const last = JSON.parse(localStorage.getItem("revu:lastResult") || "null");
          if (last) setData({ job_id: last.job_id, url: last.url, product: last.product, reviews: last.reviews, analysis: last.analysis });
          else setError("No analysis selected");
        } else {
          // Has jobId: first check localStorage (pendingView and history)
          const history = JSON.parse(localStorage.getItem("revu:history") || "[]");
          const pending = JSON.parse(localStorage.getItem("revu:pendingView") || "[]");
          const allEntries = [...pending, ...history];
          const localEntry = allEntries.find((x: any) => x.job_id === jobId);

          if (localEntry) {
            // Found in localStorage - use it directly
            if (!localEntry.analysis) {
              // Compute analysis if missing, but DON'T save to database
              try {
                const reviews = (localEntry.reviews || []).map((r: any) => ({ review_text: r.review_text, rating: r.rating, review_date: r.review_date }));
                const analysis = await apiAnalyze({ reviews });
                if (mounted) setData({ job_id: jobId, url: localEntry.url, product: localEntry.product, reviews: analysis?.reviews || reviews, analysis });
              } catch (analyzeErr) {
                console.warn("Failed to compute analysis", analyzeErr);
                if (mounted) setData(localEntry);
              }
            } else {
              if (mounted) setData(localEntry);
            }
          } else {
            // Not in localStorage - try database as fallback
            try {
              const doc = await apiGetAnalysis(jobId);
              if (mounted) setData(doc);
            } catch (e: any) {
              setError("Analysis not found");
            }
          }
        }
      } catch (err: any) {
        setError(String(err?.message || "Failed to load analysis"));
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [jobId]);

  // Ensure the dashboard scrolls to top when opened for a job or when jobId changes
  useEffect(() => {
    try {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    } catch (e) {
      // ignore
    }
  }, [jobId]);

  // Save current analysis to history AND database
  const handleSaveData = async () => {
    if (!data) {
      warning("No data to save");
      return;
    }

    try {
      const historyKey = "revu:history";
      const history = JSON.parse(localStorage.getItem(historyKey) || "[]");

      // Check if this job is already saved to history
      const existingIndex = history.findIndex((entry: any) => entry.job_id === data.job_id);

      if (existingIndex >= 0) {
        warning("This analysis is already saved to history");
        return;
      }

      // Prepare the entry
      const entry = {
        job_id: data.job_id,
        url: data.url,
        product: data.product || {},
        reviews: data.reviews || [],
        analysis: data.analysis,
        meta: {
          savedAt: new Date().toISOString(),
        },
      };

      // Save to localStorage first
      history.unshift(entry);
      localStorage.setItem(historyKey, JSON.stringify(history));

      // Then save to database
      try {
        await apiSaveAnalysis({
          job_id: data.job_id,
          url: data.url,
          product: data.product || {},
          reviews: data.reviews || [],
          analysis: data.analysis,
        });
        success("Analysis saved to history and database!");
      } catch (dbErr: any) {
        console.error("Failed to save to database", dbErr);
        success("Analysis saved to local history (database save failed)");
      }
    } catch (err) {
      console.error("Failed to save to history", err);
      warning("Failed to save analysis");
    }
  };

  // Prefer top-level saved reviews, fall back to analysis.reviews when present
  const reviews = (data?.reviews as any[]) || (data?.analysis?.reviews as any[]) || [];
  const filteredReviews = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return reviews.filter((r: any) => {
      const txt = String(r.clean_text || r.review_text || "").toLowerCase();
      const sent = String(r.sentiment || "").toLowerCase();
      const okText = !q || txt.includes(q);
      const okSent = sentimentFilter === "all" || sent === sentimentFilter;
      return okText && okSent;
    });
  }, [reviews, searchQuery, sentimentFilter]);

  // Reset page when filters change
  useEffect(() => {
    setReviewsPage(0);
  }, [searchQuery, sentimentFilter, reviews.length]);

  const totalReviewPages = Math.max(1, Math.ceil(filteredReviews.length / REVIEWS_PAGE_SIZE));
  const pagedReviews = filteredReviews.slice(reviewsPage * REVIEWS_PAGE_SIZE, (reviewsPage + 1) * REVIEWS_PAGE_SIZE);

  const getSentimentBadgeClass = (sentiment: string) => {
    switch (sentiment.toLowerCase()) {
      case "positive":
        return "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20";
      case "neutral":
        return "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20";
      case "negative":
        return "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20";
      default:
        return "";
    }
  };

  const highlightQuery = (text: string, query: string) => {
    if (!query) return text;
    try {
      const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`(${escaped})`, "gi");
      return text.replace(regex, '<mark class="bg-blue-200 dark:bg-blue-500/30 text-blue-900 dark:text-blue-200 px-1 rounded">$1</mark>');
    } catch {
      return text;
    }
  };

  // Derived metrics
  const totalReviews = (data?.analysis?.total_reviews as number) || reviews.length || 0;
  const counts = data?.analysis?.sentiment_counts || { positive: 0, neutral: 0, negative: 0 };
  const avgConfidence = useMemo(() => {
    // If analysis supplies an average confidence, use it. Otherwise compute
    // an average from per-review confidence-like fields (robust to several names).
    const a = data?.analysis;
    if (!a && !reviews?.length) return undefined;
    // If analysis provided a precomputed average confidence, support multiple field names
    const avgField = a && (a.avg_confidence ?? a.avgConfidence ?? a.avg_confidence_pct ?? a.avgConfidencePct ?? a.avgConfidencePercent ?? a.avg_confidence_percent);
    if (typeof avgField === "number") {
      const v = avgField;
      const pct = v > 1 ? Math.round(v) : Math.round(v * 100);
      return `${pct}%`;
    }

    // Collect candidate confidence numbers from reviews
    const confs: number[] = [];
    for (const r of reviews || []) {
      if (!r) continue;
      const candidates: any[] = [];
      // common top-level fields
      candidates.push(r.confidence, r.sentiment_confidence, r.sentiment_score, r.conf, r.score, r.score_confidence, r.confidence_score, r.confidencePct, r.confidence_pct, r.confidencePercent);
      // nested under sentiment
      if (r.sentiment && typeof r.sentiment === "object") {
        candidates.push(r.sentiment.confidence, r.sentiment.score, r.sentiment.confidence_score, r.sentiment.confidencePct);
      }
      // try parse string numbers too
      for (const c of candidates) {
        if (c == null) continue;
        if (typeof c === "number") { confs.push(c); break; }
        if (typeof c === "string") {
          const num = parseFloat(c.replace('%',''));
          if (!Number.isNaN(num)) { confs.push(num); break; }
          if (!Number.isNaN(num)) { confs.push(num); break; }
        }
      }
    }
    if (!confs.length) {
      // Fallback: derive a confidence score from numeric ratings using the same
      // tiny heuristic used on the backend. This helps when analysis/reviews
      // don't include an explicit score/confidence field.
      const derived: number[] = [];
      for (const r of reviews || []) {
        const rating = r && (typeof r.rating === "number" ? r.rating : (typeof r.rating === "string" ? parseFloat(r.rating) : NaN));
        if (!Number.isFinite(rating)) continue;
        try {
          const rr = Number(rating);
          if (rr >= 3.75) {
            derived.push(Math.min(1.0, (rr - 3.0) / 2.0));
          } else if (rr <= 2.25) {
            derived.push(Math.min(1.0, (3.0 - rr) / 2.0));
          } else {
            derived.push(0.5);
          }
        } catch {
          continue;
        }
      }
      if (!derived.length) return undefined;
      const avgd = derived.reduce((s, v) => s + v, 0) / derived.length;
      const pctd = avgd > 1 ? Math.round(avgd) : Math.round(avgd * 100);
      return `${pctd}%`;
    }
    const avg = confs.reduce((s, v) => s + v, 0) / confs.length;
    const pct = avg > 1 ? Math.round(avg) : Math.round(avg * 100);
    return `${pct}%`;
  }, [data, reviews]);
  // Also expose some diagnostic counts so the UI can show why calculation may be empty
  const _confidenceDiagnostics = useMemo(() => {
    const a = data?.analysis;
    const source = (data?.reviews as any[]) || (a?.reviews as any[]) || [];
    const sample = source && source.length ? source[0] : null;
    return { foundReviews: source.length, sample };
  }, [data, reviews]);
  const avgRating = useMemo(() => {
    const rated = reviews.filter((r: any) => typeof r.rating === "number");
    if (!rated.length) return undefined;
    const sum = rated.reduce((a: number, r: any) => a + (r.rating || 0), 0);
    return (sum / rated.length).toFixed(2);
  }, [reviews]);

  const productName = data?.product?.name || data?.product?.title || "Product";
  const productUrl = data?.url || "";
  const reviewCountForCard = data?.product?.countReviews || totalReviews;

  // Prepare chart inputs
  const pieData = [
    { name: "Positive", value: totalReviews ? Math.round((counts.positive / totalReviews) * 100) : 0, color: "#10b981" },
    { name: "Neutral", value: totalReviews ? Math.round((counts.neutral / totalReviews) * 100) : 0, color: "#f59e0b" },
    { name: "Negative", value: totalReviews ? Math.round((counts.negative / totalReviews) * 100) : 0, color: "#ef4444" },
  ];

  // Aggregate trend by date and keep a 7-day window (fill missing days with zeros)
  // Prefer using analysis.trend_data when available; otherwise compute from analysis.reviews.
  const trendData = useMemo(() => {
    const map: Record<string, { date: string; positive: number; negative: number }> = {};

    // Helper to validate and parse dates
    const parseIsoDate = (dateStr: string | undefined | null) => {
      if (!dateStr) return null;
      const s = String(dateStr).trim();
      if (!s) return null;
      // Try to create a Date and return YYYY-MM-DD if valid
      const d = new Date(s);
      if (d instanceof Date && !isNaN(d.getTime())) return d.toISOString().slice(0, 10);
      // Try parsing only the first 10 chars
      const s10 = s.slice(0, 10);
      const d2 = new Date(s10);
      if (d2 instanceof Date && !isNaN(d2.getTime())) return d2.toISOString().slice(0, 10);
      return null;
    };

    // 1) Try using provided trend_data array (already one entry per review)
    const arr = (data?.analysis?.trend_data as any[]) || [];
    if (Array.isArray(arr) && arr.length) {
      for (const it of arr) {
        const d = parseIsoDate(it?.date || it?.day || it?.date_str);
        if (!d) continue;
        if (!map[d]) map[d] = { date: d, positive: 0, negative: 0 };
        map[d].positive += Number(it.positive || 0);
        map[d].negative += Number(it.negative || 0);
      }
    } else {
      // 2) Fallback: compute per-review from analysis.reviews (inspect sentiment fields)
      const reviewsArr = (data?.analysis?.reviews as any[]) || [];
      for (const r of reviewsArr) {
        const d = parseIsoDate(r?.review_date || r?.date || r?.timestamp);
        if (!d) continue;
        if (!map[d]) map[d] = { date: d, positive: 0, negative: 0 };
        const s = String((r?.sentiment) || "").toLowerCase();
        if (s === "positive") map[d].positive += 1;
        else if (s === "negative") map[d].negative += 1;
      }
    }

    // Build a 7-day window ending at the scrape's latest review date when available.
    const out: { date: string; positive: number; negative: number }[] = [];
    // Find candidate latest ISO date (YYYY-MM-DD)
    let latestIso: string | null = null;
    const keys = Object.keys(map);
    if (keys.length) {
      latestIso = keys.sort().reverse()[0];
    }
    if (!latestIso) {
      // Try looking through raw reviews if present
      try {
        const reviewDates = (data?.analysis?.reviews || []).map((r: any) => parseIsoDate(r?.review_date || r?.date || r?.timestamp)).filter(Boolean);
        if (reviewDates.length) {
          latestIso = (reviewDates as string[]).sort().reverse()[0];
        }
      } catch (e) {
        latestIso = null;
      }
    }
    const now = latestIso ? new Date(`${latestIso}T00:00:00`) : new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      if (isNaN(d.getTime())) continue;
      const iso = d.toISOString().slice(0, 10);
      const row = map[iso] || { date: iso, positive: 0, negative: 0 };
      out.push(row);
    }
    return out;
  }, [data]);

  // Compute a tight Y axis max for the trend chart (start at 0, end at max+1)
  const trendYMax = useMemo(() => {
    let max = 0;
    for (const r of trendData || []) {
      const p = Number(r.positive || 0);
      const n = Number(r.negative || 0);
      if (p > max) max = p;
      if (n > max) max = n;
    }
    // Ensure at least 1 so ticks render nicely when all zeros
    return Math.max(1, Math.ceil(max + 1));
  }, [trendData]);

  const rawPositiveThemes = (data?.analysis?.top_positive_themes as any[]) || [];
  const rawNegativeThemes = (data?.analysis?.top_negative_themes as any[]) || [];

  // Transform themes for bar chart (expects { label: string, value: number })
  const positiveThemes = rawPositiveThemes.slice(0, 5).map((t, i) => {
    if (typeof t === 'string') return { label: t, value: rawPositiveThemes.length - i };
    if (typeof t === 'object' && t !== null) {
      const label = t.label || t.keyword || t.key || t.name || t.term || String(t);
      const value = t.value ?? t.weight ?? t.count ?? t.score ?? (rawPositiveThemes.length - i);
      return { label: String(label), value: Number(value) || 1 };
    }
    return { label: String(t), value: 1 };
  });

  const negativeThemes = rawNegativeThemes.slice(0, 5).map((t, i) => {
    if (typeof t === 'string') return { label: t, value: rawNegativeThemes.length - i };
    if (typeof t === 'object' && t !== null) {
      const label = t.label || t.keyword || t.key || t.name || t.term || String(t);
      const value = t.value ?? t.weight ?? t.count ?? t.score ?? (rawNegativeThemes.length - i);
      return { label: String(label), value: Number(value) || 1 };
    }
    return { label: String(t), value: 1 };
  });


  const themeLabel = (t: any): string => {
    if (!t) return "";
    if (typeof t === "string") return t;
    if (typeof t === "number") return String(t);
    // Common shapes: {keyword}, {key}, {label}, {name}, {term}
    const cand = t.keyword || t.key || t.label || t.name || t.term || t.topic || t.theme;
    if (cand) return String(cand);
    // If array, join
    if (Array.isArray(t)) return t.map(themeLabel).filter(Boolean).join(", ");
    try { return JSON.stringify(t); } catch { return String(t); }
  };

  // Normalize theme array into [{ label, weight }] for word clouds
  const computeThemeList = (arr: any[]) => {
    if (!Array.isArray(arr)) return [];
    // Extract label and numeric weight when available
    const items = arr.map((t: any, i: number) => {
      let label = themeLabel(t);
      let weight: number | null = null;
      if (t == null) {
        weight = null;
      } else if (typeof t === "number") {
        weight = t;
      } else if (typeof t === "string") {
        weight = null;
      } else if (Array.isArray(t)) {
        // possible shape: [label, weight]
        const maybeNum = t.length > 1 ? Number(t[1]) : NaN;
        weight = Number.isFinite(maybeNum) ? maybeNum : null;
      } else if (typeof t === "object") {
        const cand = t.value ?? t.count ?? t.weight ?? t.score ?? t.freq ?? t.frequency ?? t.rank ?? t.n ?? t.val;
        const num = Number(cand);
        weight = Number.isFinite(num) ? num : null;
      }
      return { label, weight, raw: t, index: i };
    });

    // If no numeric weights exist, derive weights from position (higher index => lower weight)
    const anyWeights = items.some((it) => typeof it.weight === "number");
    if (!anyWeights) {
      return items.map((it, idx) => ({ ...it, weight: items.length - idx }));
    }

    // Replace null weights with smallest non-null value (or zero)
    const nonNull = items.map((it) => (typeof it.weight === "number" ? it.weight as number : NaN)).filter((v) => Number.isFinite(v));
    const minNonNull = nonNull.length ? Math.min(...nonNull) : 0;
    return items.map((it) => ({ ...it, weight: typeof it.weight === "number" ? it.weight : minNonNull }));
  };

  // Prepare normalized theme lists with derived weights for word clouds
  const positiveList = computeThemeList(rawPositiveThemes);
  const negativeList = computeThemeList(rawNegativeThemes);

  // helper to compute visual scale parameters
  const makeScale = (items: { label: string; weight: number; raw?: any; index?: number }[]) => {
    const weights = items.map((it) => Number(it.weight) || 0);
    const min = weights.length ? Math.min(...weights) : 0;
    const max = weights.length ? Math.max(...weights) : 0;
    const range = max - min || 1;
    return { min, max, range };
  };

  const posScale = makeScale(positiveList);
  const negScale = makeScale(negativeList);

  // Reconcile duplicates across positive/negative by keeping the side
  // with the higher weight. Tie-breaker: keep in positive, drop from negative.
  const reconcileThemeLists = (
    pos: { label: string; weight: number }[],
    neg: { label: string; weight: number }[],
  ) => {
    const posMap = new Map<string, { label: string; weight: number }>();
    const negMap = new Map<string, { label: string; weight: number }>();
    for (const it of pos) posMap.set(it.label.toLowerCase(), it);
    for (const it of neg) negMap.set(it.label.toLowerCase(), it);
    const overlap: string[] = [];
    for (const k of posMap.keys()) if (negMap.has(k)) overlap.push(k);
    const dropFromNeg = new Set<string>();
    const dropFromPos = new Set<string>();
    for (const k of overlap) {
      const p = posMap.get(k)!;
      const n = negMap.get(k)!;
      if (p.weight >= n.weight) {
        dropFromNeg.add(k);
      } else {
        dropFromPos.add(k);
      }
    }
    const newPos = pos.filter((it) => !dropFromPos.has(it.label.toLowerCase()));
    const newNeg = neg.filter((it) => !dropFromNeg.has(it.label.toLowerCase()));
    return { newPos, newNeg };
  };

  const { newPos: posNoDup, newNeg: negNoDup } = reconcileThemeLists(positiveList, negativeList);

  if (loading) {
    return (
      <div className="min-h-screen bg-background dark:bg-black flex items-center justify-center p-8">
        <div className="text-gray-700 dark:text-gray-200">Loading analysis…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background dark:bg-black flex flex-col items-center justify-center p-8 gap-4">
        <div className="text-red-600 dark:text-red-400">{error}</div>
        <Button variant="outline" onClick={() => navigate("/scraping-activity")}>Back to Activity</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background dark:bg-black">

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8" style={{ paddingTop: 72 }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Top Row - Product Overview & Sentiment Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Product Overview Card */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4 }}
              className="flex"
            >
              <Card className="p-5 rounded-2xl border-border dark:border-zinc-800 bg-white dark:bg-[#1A1A1A] flex-1 flex flex-col">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-blue-500/10 dark:bg-blue-500/20 rounded-lg">
                    <Package className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="flex-1 text-2xl font-semibold text-foreground dark:text-white">{productName}</h3>
                </div>

                {/* Stats Grid: Product Total Reviews, Average Rating, Price (may be empty) */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="p-2.5 bg-blue-50 dark:bg-blue-500/10 rounded-lg border border-blue-200 dark:border-blue-500/20">
                    <p className="text-xs text-blue-700 dark:text-blue-400 mb-1 uppercase tracking-wide">Total Reviews</p>
                    <p className="text-xl text-blue-900 dark:text-blue-300">{(data?.product?.countReviews ?? reviewCountForCard ?? 0).toLocaleString()}</p>
                  </div>
                  <div className="p-2.5 bg-amber-50 dark:bg-amber-500/10 rounded-lg border border-amber-200 dark:border-amber-500/20">
                    <p className="text-xs text-amber-700 dark:text-amber-400 mb-1 uppercase tracking-wide">Average Rating</p>
                    <p className="text-xl text-amber-900 dark:text-amber-300">{avgRating ?? "-"}</p>
                  </div>
                  <div className="p-2.5 bg-green-50 dark:bg-green-500/10 rounded-lg border border-green-200 dark:border-green-500/20">
                    <p className="text-xs text-green-700 dark:text-green-400 mb-1 uppercase tracking-wide">Price</p>
                    <p className="text-xl text-green-900 dark:text-green-300">{data?.product?.price ?? "-"}</p>
                  </div>
                </div>

                {/* Summary */}
                <div className="flex-1 flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm text-foreground dark:text-white">Summary</h4>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant={summaryType === "short" ? "default" : "outline"}
                        className={`h-7 px-3 rounded-lg text-xs ${
                          summaryType === "short" 
                            ? "bg-[#6366F1] hover:bg-[#5558E3] text-white" 
                            : ""
                        }`}
                        onClick={() => setSummaryType("short")}
                      >
                        Short
                      </Button>
                      <Button
                        size="sm"
                        variant={summaryType === "detailed" ? "default" : "outline"}
                        className={`h-7 px-3 rounded-lg text-xs ${
                          summaryType === "detailed" 
                            ? "bg-[#6366F1] hover:bg-[#5558E3] text-white" 
                            : ""
                        }`}
                        onClick={() => setSummaryType("detailed")}
                      >
                        Detailed
                      </Button>
                    </div>
                  </div>
                  <div className={
                    "flex-1 pr-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-gray-100 dark:[&::-webkit-scrollbar-track]:bg-zinc-800 [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-thumb]:bg-zinc-600 [&::-webkit-scrollbar-thumb]:rounded-full max-h-40 overflow-y-auto"
                  }>
                    <p className={"text-sm text-muted-foreground dark:text-gray-300 leading-relaxed"}>
                      {summaryType === "short"
                        ? (function getFirstSentenceText() {
                            const txt = data?.analysis?.summary_short || data?.analysis?.summary || "";
                            if (!txt) return "—";
                            const idx = txt.indexOf('.');
                            if (idx === -1) return txt.trim();
                            // Include the first full stop, then trim trailing spaces
                            return txt.slice(0, idx + 1).trim();
                          })()
                        : (data?.analysis?.summary || "—")
                      }
                    </p>
                  </div>
                </div>
              </Card>
            </motion.div>

            {/* Sentiment Distribution Card */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4 }}
              className="flex"
            >
              <Card className="p-5 rounded-2xl border-border dark:border-zinc-800 bg-white dark:bg-[#1A1A1A] flex-1 flex flex-col">
                <h3 className="mb-3 text-black dark:text-white">Sentiment Distribution</h3>
                
                <div className="flex items-center justify-center mb-3 flex-1">
                  <ResponsiveContainer width="100%" height={150}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: isDark ? "#1A1A1A" : "#FFFFFF",
                          border: isDark ? "1px solid #3f3f46" : "1px solid #e5e7eb",
                          borderRadius: "12px",
                          padding: "12px 16px",
                          boxShadow: isDark 
                            ? "0 10px 40px rgba(0, 0, 0, 0.5)" 
                            : "0 10px 40px rgba(0, 0, 0, 0.1)"
                        }}
                        itemStyle={{ 
                          color: isDark ? "#ffffff" : "#000000",
                          fontWeight: 600
                        }}
                        labelStyle={{ 
                          color: isDark ? "#ffffff" : "#374151",
                          fontWeight: 600,
                          marginBottom: "4px"
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Percentages */}
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div className="text-center">
                    <p className="text-xl text-green-600 dark:text-green-400 mb-1">{pieData[0].value}%</p>
                    <p className="text-xs text-green-600 dark:text-green-400">Positive</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl text-amber-600 dark:text-amber-400 mb-1">{pieData[1].value}%</p>
                    <p className="text-xs text-amber-600 dark:text-amber-400">Neutral</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl text-red-600 dark:text-red-400 mb-1">{pieData[2].value}%</p>
                    <p className="text-xs text-red-600 dark:text-red-400">Negative</p>
                  </div>
                </div>

                {/* Average Confidence */}
                <div className="text-center pt-3 border-t border-border dark:border-zinc-700">
                  <p className="text-xs text-muted-foreground dark:text-gray-400">
                    Avg. Confidence: {
                      avgConfidence ? (
                        <span className="text-foreground dark:text-white">{avgConfidence}</span>
                      ) : (
                        <span className="text-foreground dark:text-white">—</span>
                      )
                    }
                    {
                      !avgConfidence && (
                        <span className="ml-2 text-xs text-muted-foreground dark:text-gray-400">
                          (reviews: {_confidenceDiagnostics.foundReviews}{_confidenceDiagnostics.sample ? `, sample fields: ${Object.keys(_confidenceDiagnostics.sample).slice(0,5).join(', ')}` : ''})
                        </span>
                      )
                    }
                  </p>
                </div>
              </Card>
            </motion.div>
          </div>

          {/* Middle Row - Sentiment Trend & Word Clouds */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Word Clouds - Positive & Negative Themes - LEFT 1/3 */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="grid grid-rows-2 gap-6"
            >
              {/* Positive Themes Word Cloud */}
              <Card className="p-6 rounded-2xl border-border dark:border-zinc-800 bg-white dark:bg-[#1A1A1A]">
                <h3 className="mb-4 text-black dark:text-white">Positive Themes</h3>
                <div className="flex flex-wrap items-center justify-center gap-3 min-h-[100px]">
                  {posNoDup.map((it, index) => {
                    const minFont = 10; // px (smaller for less important)
                    const maxFont = 42; // px (slightly larger top weight)
                    const minOpacity = 0.2; // more translucent for least
                    const norm = posScale.range ? ((Number(it.weight) - posScale.min) / posScale.range) : 0;
                    const fontSize = Math.round(minFont + norm * (maxFont - minFont));
                    const opacity = Math.max(minOpacity, Math.min(1, Number((minOpacity + norm * (1 - minOpacity)).toFixed(2))));
                    return (
                      <motion.span
                        key={String(it.label) + index}
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.15 + index * 0.03 }}
                        className="cursor-default hover:scale-110 transition-transform"
                        style={{ fontSize: `${fontSize}px`, fontWeight: 700, opacity, margin: 6, lineHeight: 1 }}
                        title={`${it.label} — ${it.weight}`}
                        aria-label={`${it.label} (${it.weight})`}
                      >
                        <span className="text-green-600 dark:text-green-400">{it.label}</span>
                      </motion.span>
                    );
                  })}
                </div>
              </Card>

              {/* Negative Themes Word Cloud */}
              <Card className="p-6 rounded-2xl border-border dark:border-zinc-800 bg-white dark:bg-[#1A1A1A]">
                <h3 className="mb-4 text-black dark:text-white">Negative Themes</h3>
                <div className="flex flex-wrap items-center justify-center gap-3 min-h-[100px]">
                  {negNoDup.map((it, index) => {
                    const minFont = 10; // px
                    const maxFont = 42; // px
                    const minOpacity = 0.2;
                    const norm = negScale.range ? ((Number(it.weight) - negScale.min) / negScale.range) : 0;
                    const fontSize = Math.round(minFont + norm * (maxFont - minFont));
                    const opacity = Math.max(minOpacity, Math.min(1, Number((minOpacity + norm * (1 - minOpacity)).toFixed(2))));
                    return (
                      <motion.span
                        key={String(it.label) + index}
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.15 + index * 0.03 }}
                        className="cursor-default hover:scale-110 transition-transform"
                        style={{ fontSize: `${fontSize}px`, fontWeight: 700, opacity, margin: 6, lineHeight: 1 }}
                        title={`${it.label} — ${it.weight}`}
                        aria-label={`${it.label} (${it.weight})`}
                      >
                        <span className="text-red-600 dark:text-red-400">{it.label}</span>
                      </motion.span>
                    );
                  })}
                </div>
              </Card>
            </motion.div>

            {/* Sentiment Trend Over Time - RIGHT 2/3 */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="lg:col-span-2"
            >
              <Card className="p-6 rounded-2xl border-border dark:border-zinc-800 bg-white dark:bg-[#1A1A1A] h-full">
                <h3 className="mb-6 text-black dark:text-white">Sentiment Trend Over Time</h3>
                { (trendData || []).reduce((s, r) => s + (Number(r.positive||0) + Number(r.negative||0)), 0) > 0 ? (
                  <ResponsiveContainer width="100%" height={380}>
                    <LineChart data={trendData} margin={{ top: 8, right: 12, left: 0, bottom: 6 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-zinc-700" opacity={0.3} />
                    <XAxis 
                      dataKey="date" 
                      stroke="#6b7280" 
                      className="dark:stroke-gray-400"
                      tick={{ fill: '#6b7280' }}
                      tickFormatter={(val) => {
                        try {
                          const d = new Date(String(val));
                          return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                        } catch { return String(val); }
                      }}
                    />
                    <YAxis 
                      stroke="#6b7280" 
                      className="dark:stroke-gray-400"
                      tick={{ fill: '#6b7280' }}
                      domain={[0, trendYMax]}
                      allowDecimals={false}
                      tickCount={Math.min(5, trendYMax + 1)}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: isDark ? "#1A1A1A" : "#FFFFFF",
                        border: isDark ? "1px solid #3f3f46" : "1px solid #e5e7eb",
                        borderRadius: "12px",
                        padding: "12px 16px",
                        boxShadow: isDark 
                          ? "0 10px 40px rgba(0, 0, 0, 0.5)" 
                          : "0 10px 40px rgba(0, 0, 0, 0.1)"
                      }}
                      itemStyle={{ 
                        color: isDark ? "#ffffff" : "#000000",
                        fontWeight: 600
                      }}
                      labelStyle={{ 
                        color: isDark ? "#ffffff" : "#374151",
                        fontWeight: 600
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="positive"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={{ fill: "#10b981", r: 4 }}
                      activeDot={{ r: 6 }}
                      name="Positive"
                    />
                    <Line
                      type="monotone"
                      dataKey="negative"
                      stroke="#ef4444"
                      strokeWidth={2}
                      dot={{ fill: "#ef4444", r: 4 }}
                      activeDot={{ r: 6 }}
                      name="Negative"
                    />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="py-24 text-center text-muted-foreground dark:text-gray-400">No sentiment trend data available for this analysis.</div>
                  )}
                <div className="flex items-center justify-center gap-4 mt-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <span className="text-xs text-muted-foreground dark:text-gray-400">Negative</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <span className="text-xs text-muted-foreground dark:text-gray-400">Positive</span>
                  </div>
                </div>
              </Card>
            </motion.div>
          </div>

          {/* Bottom Row - Top 5 Positive & Negative Themes */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top 5 Positive Themes */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
            >
              <Card className="p-6 rounded-2xl border-border dark:border-zinc-800 bg-white dark:bg-[#1A1A1A]">
                <h3 className="mb-6 text-black dark:text-white">Top 5 Positive Themes</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={positiveThemes} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#3f3f46" : "#e5e7eb"} opacity={0.3} />
                    <XAxis 
                      type="number" 
                      stroke={isDark ? "#ffffff" : "#6b7280"} 
                      tick={{ fill: isDark ? "#ffffff" : "#6b7280", fontSize: 11 }} 
                    />
                    <YAxis 
                      type="category" 
                      dataKey="label" 
                      stroke={isDark ? "#ffffff" : "#6b7280"} 
                      tick={{ fill: isDark ? "#ffffff" : "#6b7280", fontSize: 11 }}
                      width={100}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: isDark ? "#1A1A1A" : "#FFFFFF",
                        border: isDark ? "1px solid #3f3f46" : "1px solid #e5e7eb",
                        borderRadius: "12px",
                        padding: "12px 16px",
                        boxShadow: isDark 
                          ? "0 10px 40px rgba(0, 0, 0, 0.5)" 
                          : "0 10px 40px rgba(0, 0, 0, 0.1)"
                      }}
                      itemStyle={{ 
                        color: isDark ? "#ffffff" : "#000000",
                        fontWeight: 600,
                        fontSize: 12
                      }}
                      labelStyle={{ 
                        color: isDark ? "#ffffff" : "#374151",
                        fontWeight: 600,
                        fontSize: 12
                      }}
                    />
                    <Bar dataKey="value" fill="#10b981" radius={[0, 8, 8, 0]} barSize={28} background={false} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </motion.div>

            {/* Top 5 Negative Themes */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
            >
              <Card className="p-6 rounded-2xl border-border dark:border-zinc-800 bg-white dark:bg-[#1A1A1A]">
                <h3 className="mb-6 text-black dark:text-white">Top 5 Negative Themes</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={negativeThemes} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#3f3f46" : "#e5e7eb"} opacity={0.3} />
                    <XAxis 
                      type="number" 
                      stroke={isDark ? "#ffffff" : "#6b7280"} 
                      tick={{ fill: isDark ? "#ffffff" : "#6b7280", fontSize: 11 }} 
                    />
                    <YAxis 
                      type="category" 
                      dataKey="label" 
                      stroke={isDark ? "#ffffff" : "#6b7280"} 
                      tick={{ fill: isDark ? "#ffffff" : "#6b7280", fontSize: 11 }}
                      width={100}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: isDark ? "#1A1A1A" : "#FFFFFF",
                        border: isDark ? "1px solid #3f3f46" : "1px solid #e5e7eb",
                        borderRadius: "12px",
                        padding: "12px 16px",
                        boxShadow: isDark 
                          ? "0 10px 40px rgba(0, 0, 0, 0.5)" 
                          : "0 10px 40px rgba(0, 0, 0, 0.1)"
                      }}
                      itemStyle={{ 
                        color: isDark ? "#ffffff" : "#000000",
                        fontWeight: 600,
                        fontSize: 12
                      }}
                      labelStyle={{ 
                        color: isDark ? "#ffffff" : "#374151",
                        fontWeight: 600,
                        fontSize: 12
                      }}
                    />
                    <Bar dataKey="value" fill="#ef4444" radius={[0, 8, 8, 0]} barSize={28} background={false} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </motion.div>
          </div>

          {/* Review Samples Table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            <Card className="p-6 rounded-2xl border-border dark:border-zinc-800 bg-white dark:bg-[#1A1A1A]">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-foreground dark:text-white">Review Samples</h3>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground dark:text-gray-400" />
                    <Input
                      placeholder="Search reviews..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 w-64 rounded-lg bg-background dark:bg-zinc-900 border-border dark:border-zinc-700 text-foreground dark:text-white"
                    />
                  </div>
                  <Select value={sentimentFilter} onValueChange={setSentimentFilter}>
                    <SelectTrigger className="w-40 rounded-lg bg-background dark:bg-zinc-900 border-border dark:border-zinc-700 text-foreground dark:text-white">
                      <SelectValue placeholder="Filter" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="positive">Positive</SelectItem>
                      <SelectItem value="neutral">Neutral</SelectItem>
                      <SelectItem value="negative">Negative</SelectItem>
                    </SelectContent>
                  </Select>
                  {/* Reviews pagination controls */}
                  <div className="ml-2 inline-flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setReviewsPage((p) => Math.max(0, p - 1))}
                      disabled={reviewsPage <= 0}
                      className="h-8 w-8 p-0"
                      aria-label="Previous reviews page"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <div className="text-sm text-muted-foreground dark:text-gray-400 px-2">
                      {reviewsPage + 1} / {Math.max(1, Math.ceil(filteredReviews.length / REVIEWS_PAGE_SIZE))}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setReviewsPage((p) => Math.min(p + 1, Math.max(0, Math.ceil(filteredReviews.length / REVIEWS_PAGE_SIZE) - 1)))}
                      disabled={filteredReviews.length <= (reviewsPage + 1) * REVIEWS_PAGE_SIZE}
                      className="h-8 w-8 p-0"
                      aria-label="Next reviews page"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
              
              <div className="rounded-lg border border-border dark:border-zinc-700 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 dark:bg-zinc-900/50 hover:bg-muted/50 dark:hover:bg-zinc-900/50">
                      <TableHead className="text-foreground dark:text-white">Review Text</TableHead>
                      <TableHead className="w-24 text-foreground dark:text-white">Rating</TableHead>
                      <TableHead className="w-32 text-foreground dark:text-white">Sentiment</TableHead>
                      <TableHead className="w-32 text-foreground dark:text-white">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagedReviews.map((review: any, index: number) => (
                      <TableRow 
                        key={index}
                        className="border-b border-border dark:border-zinc-700 hover:bg-accent/50 dark:hover:bg-zinc-800/50"
                      >
                        <TableCell className="max-w-md text-foreground dark:text-gray-200">
                          <p 
                            className="line-clamp-2" 
                            dangerouslySetInnerHTML={{ 
                              __html: highlightQuery(String(review.clean_text || review.review_text || ""), searchQuery) 
                            }}
                          />
                        </TableCell>
                        <TableCell className="text-foreground dark:text-gray-200">
                          <div className="flex items-center gap-1">
                            <span className="text-amber-500">★</span>
                            <span>{review.rating ?? "-"}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getSentimentBadgeClass(String(review.sentiment || ""))}>
                            {review.sentiment || "-"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground dark:text-gray-400">
                          {review.review_date ? new Date(review.review_date).toLocaleDateString() : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </motion.div>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.4 }}
            className="flex items-center justify-center gap-4 flex-wrap"
          >
            <Button 
              size="lg" 
              className="rounded-2xl px-10 py-6 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-sm hover:shadow-md transition-all duration-300"
            >
              <Download className="w-5 h-5 mr-2" />
              Export as PDF
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="rounded-2xl px-10 py-6 border-2 border-border dark:border-zinc-700 text-foreground dark:text-white hover:bg-accent/20 dark:hover:bg-zinc-800 shadow-xs hover:shadow-sm transition-all duration-300"
              onClick={handleSaveData}
            >
              <Save className="w-5 h-5 mr-2" />
              Save Data
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="rounded-2xl px-10 py-6 border-2 border-border dark:border-zinc-700 text-foreground dark:text-white hover:bg-accent/20 dark:hover:bg-zinc-800 shadow-xs hover:shadow-sm transition-all duration-300"
              onClick={onReset}
            >
              <RotateCcw className="w-5 h-5 mr-2" />
              New Analysis
            </Button>
          </motion.div>

        </motion.div>
      </main>
    </div>
  );
}