import { useState, useEffect } from "react";
import { Search, Eye, Trash2, Download } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { apiGetAllAnalyses, apiGetAnalysis, apiDeleteAnalysis } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/useToast";

interface HistoryPageProps {
  isDark: boolean;
  onThemeToggle: () => void;
  onGetStarted: () => void;
}

// analyses will be fetched from the backend (MongoDB)


export function HistoryPage({ isDark, onThemeToggle, onGetStarted }: HistoryPageProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [sentimentFilter, setSentimentFilter] = useState("all");
  const ITEMS_PER_PAGE = 10;
  const [page, setPage] = useState(1);

  const navigate = useNavigate();
  const [analyses, setAnalyses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { success, error, info, warning } = useToast();

  // Load analyses from backend
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const list = await apiGetAllAnalyses();
        if (!mounted) return;
        setAnalyses(Array.isArray(list) ? list : []);
      } catch (err: any) {
        console.error("Failed to load analyses", err);
        // If the API request failed, fall back to local history. Differentiate between
        // authentication errors (401/403) and network/server errors so the warning message
        // is accurate when the user is signed in but the backend is unreachable.
        try {
          const local = JSON.parse(localStorage.getItem("revu:history") || "[]");
          if (mounted && Array.isArray(local) && local.length) {
            // Normalize shape to look like server docs
            setAnalyses(local.map((entry: any) => ({
              job_id: entry.job_id,
              _id: entry.job_id,
              product: entry.product || {},
              url: entry.url,
              analysis: entry.analysis,
              meta: entry.meta || {},
              savedAt: entry.meta?.savedAt || null,
            })));
            if (err?.status === 401 || err?.status === 403) {
              // When the user is unauthenticated, surface a hint to sign in
              warning("Loaded local history (sign in to view server-saved analyses)");
            } else {
              // Server/network fallback: keep silent and load local history without a toast
            }
            return;
          }
        } catch (e) {
          console.error("Failed to read local history", e);
        }
        if (mounted) setAnalyses([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  // Build filtered list from analyses
  const filteredHistory = analyses.filter((item) => {
    const pname = (item.product?.summary || item.product?.name || item.product?.title || item.url || "").toString();
    const matchesSearch = pname.toLowerCase().includes(searchQuery.toLowerCase());
    const counts = item.analysis?.sentiment_counts || {};
    const topSent = item.analysis?.top_sentiment || (counts.positive >= (counts.negative || 0) ? "positive" : "negative");
    const matchesSentiment = sentimentFilter === "all" || String(topSent).toLowerCase() === sentimentFilter;
  const dateStr = item.meta?.savedAt || item.savedAt || item.createdAt || item.updatedAt || item.created_at || item.analysis?.scrape_date || item.analysis?.date || "";
    const matchesDate = dateFilter === "all" || String(dateStr).startsWith(dateFilter);
    return matchesSearch && matchesSentiment && matchesDate;
  });

  // Reset to first page whenever filters change
  useEffect(() => { setPage(1); }, [searchQuery, dateFilter, sentimentFilter, analyses.length]);

  const totalPages = Math.max(1, Math.ceil(filteredHistory.length / ITEMS_PER_PAGE));
  const startIndex = (page - 1) * ITEMS_PER_PAGE;
  const endIndex = Math.min(filteredHistory.length, page * ITEMS_PER_PAGE);
  const paginatedHistory = filteredHistory.slice(startIndex, endIndex);

  const getSentimentBadgeClass = (sentiment: string) => {
    switch (sentiment.toLowerCase()) {
      case "positive":
        return "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400 border-0";
      case "neutral":
        return "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400 border-0";
      case "negative":
        return "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400 border-0";
      default:
        return "";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black">
      <main className="container mx-auto px-6 py-8 max-w-full">
        <Card className="p-8 rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-[#1A1A1A]">
          <h2 className="text-xl mb-6 text-gray-900 dark:text-white">Review Analysis History</h2>

          {/* Search and Filters */}
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
              <Input
                placeholder="Search by product name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-gray-50 dark:bg-zinc-900 border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-white rounded-xl"
              />
            </div>
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-40 bg-gray-50 dark:bg-zinc-900 border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-white rounded-xl">
                <SelectValue placeholder="All Dates" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Dates</SelectItem>
                <SelectItem value="2024">2024</SelectItem>
                <SelectItem value="2023">2023</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sentimentFilter} onValueChange={setSentimentFilter}>
              <SelectTrigger className="w-48 bg-gray-50 dark:bg-zinc-900 border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-white rounded-xl">
                <SelectValue placeholder="All Sentiments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sentiments</SelectItem>
                <SelectItem value="positive">Positive</SelectItem>
                <SelectItem value="neutral">Neutral</SelectItem>
                <SelectItem value="negative">Negative</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* History Table */}
          <div className="rounded-xl border border-border dark:border-zinc-700 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 dark:bg-zinc-900/50 hover:bg-muted/50 dark:hover:bg-zinc-900/50">
                  <TableHead className="text-foreground dark:text-white">S.No</TableHead>
                  <TableHead className="text-foreground dark:text-white">Date</TableHead>
                  <TableHead className="text-foreground dark:text-white">Product Name</TableHead>
                  <TableHead className="text-foreground dark:text-white">Rating</TableHead>
                  <TableHead className="text-foreground dark:text-white">Total Reviews</TableHead>
                  <TableHead className="text-foreground dark:text-white">Top Sentiment</TableHead>
                  <TableHead className="text-foreground dark:text-white text-center">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedHistory.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground dark:text-gray-400">
                      {loading ? "Loading…" : "No results found"}
                    </TableCell>
                  </TableRow>
                )}
                  {paginatedHistory.map((item: any, localIndex: number) => {
                  const jobId = item.job_id || item._id || item.id;
                  const dateStr = item.meta?.savedAt || item.savedAt || item.createdAt || item.updatedAt || item.created_at || item.analysis?.scrape_date || item.analysis?.date || "";
                  const dateDisplay = dateStr ? (new Date(dateStr).toLocaleDateString()) : "-";
                  const pname = (item.product?.summary || item.product?.name || item.product?.title || item.url || "").toString();
                    const totalReviews = item.product?.countReviews ?? item.analysis?.total_reviews ?? 0;
                  const counts = item.analysis?.sentiment_counts || {};
                  const topSent = item.analysis?.top_sentiment || (counts.positive >= (counts.negative || 0) ? "Positive" : "Negative");

                    // compute serial number (1-based across filtered list)
                    const serial = startIndex + localIndex + 1;

                    const computeRating = (it: any) => {
                      // 1) prefer explicit product.rating
                      const pRating = it?.product?.rating;
                      if (typeof pRating === "number") return Math.round(pRating*10)/10;
                      if (typeof pRating === "string" && pRating.trim()) {
                        const n = parseFloat(pRating.replace('%',''));
                        if (!Number.isNaN(n)) return Math.round(n*10)/10;
                      }
                      // 2) try analysis avg-like fields
                      const a = it?.analysis;
                      const cand = a?.avg_rating ?? a?.avgRating ?? a?.avg_confidence ?? undefined;
                      if (typeof cand === "number") return Math.round(cand*10)/10;
                      if (typeof cand === "string" && cand.trim()) {
                        const n = parseFloat(String(cand).replace('%',''));
                        if (!Number.isNaN(n)) return Math.round(n*10)/10;
                      }
                      // 3) compute average from reviews arrays (product-level or analysis.reviews)
                      const reviewsArr = (it?.product?.reviews) || (it?.reviews) || (a?.reviews) || [];
                      const nums: number[] = [];
                      for (const r of reviewsArr || []) {
                        if (!r) continue;
                        const rv = r.rating ?? r.score ?? r.stars ?? r.reviewRating ?? (r.rating_value || r.rate);
                        if (typeof rv === 'number') nums.push(rv);
                        else if (typeof rv === 'string') {
                          const m = rv.match(/(\d+(?:[\.,]\d+)?)/);
                          if (m) {
                            const val = parseFloat(m[1].replace(',','.'));
                            if (!Number.isNaN(val)) nums.push(val);
                          }
                        }
                      }
                      if (nums.length) {
                        const avg = nums.reduce((s,v) => s+v, 0)/nums.length;
                        return Math.round(avg*10)/10;
                      }
                      return null;
                    };

                    const displayRating = computeRating(item);

                    return (
                    <TableRow
                      key={String(jobId)}
                      className="border-b border-border dark:border-zinc-700 hover:bg-accent/50 dark:hover:bg-zinc-800/50"
                    >
                      <TableCell className="text-foreground dark:text-gray-200 font-medium">{serial}</TableCell>
                      <TableCell className="text-foreground dark:text-gray-200">{dateDisplay}</TableCell>
                      <TableCell className="text-foreground dark:text-gray-200">{pname}</TableCell>
                      <TableCell className="text-foreground dark:text-gray-200">
                        <div className="flex items-center gap-1">
                          <span className="text-blue-500">★</span>
                          <span>{displayRating ?? "-"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-foreground dark:text-gray-200">{Number(totalReviews).toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge className={getSentimentBadgeClass(String(topSent || ""))}>
                          {String(topSent || "-")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate(`/dashboard/${encodeURIComponent(jobId)}`, { state: { fromHistory: true } })}
                            className="h-8 w-8 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10"
                            title="View"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={async () => {
                              try {
                                if (!confirm("Delete this analysis from the database? This cannot be undone.")) return;
                                await apiDeleteAnalysis(String(jobId));
                                // remove locally
                                setAnalyses((s) => s.filter((a: any) => (a.job_id || a._id || a.id) !== jobId));
                                success("Analysis deleted");
                              } catch (err) {
                                console.error("Failed to delete analysis (server)", err);
                                // Fallback: try to delete from localStorage history if present
                                try {
                                  const local = JSON.parse(localStorage.getItem("revu:history") || "[]");
                                  const filtered = (local || []).filter((entry: any) => (entry.job_id || entry.id) !== jobId);
                                  localStorage.setItem("revu:history", JSON.stringify(filtered));
                                  setAnalyses((s) => s.filter((a: any) => (a.job_id || a._id || a.id) !== jobId));
                                  success("Analysis deleted (local)");
                                  return;
                                } catch (le) {
                                  console.error("Failed to delete analysis locally", le);
                                }
                                error("Failed to delete analysis");
                              }
                            }}
                            className="h-8 w-8 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              // Download not implemented yet — inform the user
                              info("Download not implemented yet");
                            }}
                            className="h-8 w-8 text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-500/10"
                            title="Download"
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Showing {filteredHistory.length === 0 ? 0 : startIndex + 1}–{endIndex} of {filteredHistory.length}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="rounded-xl border-gray-300 dark:border-zinc-700"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                className="rounded-xl"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
}
