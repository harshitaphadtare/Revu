import { useState, useEffect } from "react";
import { Search, Eye, Trash2, Download } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface HistoryPageProps {
  isDark: boolean;
  onThemeToggle: () => void;
  onGetStarted: () => void;
}

const analysisHistory = [
  { id: 1, date: "2024-01-15", productName: "SuperWidget X", price: "$199.99", rating: 4.2, totalReviews: 2345, sentiment: "Positive" },
  { id: 2, date: "2023-12-01", productName: "EcoGadget Pro", price: "$149.99", rating: 3.7, totalReviews: 1200, sentiment: "Neutral" },
  { id: 3, date: "2024-02-10", productName: "SmartHome Hub 2.0", price: "$299.99", rating: 4.8, totalReviews: 3421, sentiment: "Positive" },
  { id: 4, date: "2023-11-20", productName: "TechGear Premium", price: "$89.99", rating: 2.9, totalReviews: 892, sentiment: "Negative" },
  { id: 5, date: "2024-03-05", productName: "AudioMax Wireless", price: "$249.99", rating: 4.5, totalReviews: 1876, sentiment: "Positive" },
  { id: 6, date: "2024-04-12", productName: "Nordic Soundbar S1", price: "$179.50", rating: 4.1, totalReviews: 1540, sentiment: "Positive" },
  { id: 7, date: "2023-10-08", productName: "HomeCam Pro", price: "$129.00", rating: 3.5, totalReviews: 760, sentiment: "Neutral" },
  { id: 8, date: "2024-05-22", productName: "FitBand Elite", price: "$89.99", rating: 4.0, totalReviews: 2043, sentiment: "Positive" },
  { id: 9, date: "2023-09-30", productName: "KitchenMaster 3000", price: "$349.00", rating: 2.8, totalReviews: 624, sentiment: "Negative" },
  { id: 10, date: "2024-06-11", productName: "PureBuds Pro", price: "$199.00", rating: 4.6, totalReviews: 4120, sentiment: "Positive" },
  { id: 11, date: "2024-07-02", productName: "AirCool Tower Fan", price: "$69.99", rating: 3.9, totalReviews: 980, sentiment: "Neutral" },
  { id: 12, date: "2024-07-22", productName: "GlowLight Desk Lamp", price: "$39.99", rating: 4.3, totalReviews: 540, sentiment: "Positive" },
  { id: 13, date: "2023-08-18", productName: "TravelCharge 20000mAh", price: "$59.99", rating: 4.0, totalReviews: 1832, sentiment: "Positive" },
  { id: 14, date: "2024-02-28", productName: "SoundBlaze Mini", price: "$49.99", rating: 2.6, totalReviews: 312, sentiment: "Negative" },
  { id: 15, date: "2024-08-14", productName: "UltraBlend Mixer", price: "$129.99", rating: 4.4, totalReviews: 2200, sentiment: "Positive" },
];

export function HistoryPage({ isDark, onThemeToggle, onGetStarted }: HistoryPageProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [sentimentFilter, setSentimentFilter] = useState("all");
  const ITEMS_PER_PAGE = 10;
  const [page, setPage] = useState(1);

  const filteredHistory = analysisHistory.filter((item) => {
    const matchesSearch = item.productName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSentiment = sentimentFilter === "all" || item.sentiment.toLowerCase() === sentimentFilter;
    const matchesDate = dateFilter === "all" || item.date.startsWith(dateFilter);
    return matchesSearch && matchesSentiment && matchesDate;
  });

  // Reset to first page whenever filters change
  useEffect(() => {
    setPage(1);
  }, [searchQuery, dateFilter, sentimentFilter]);

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
          <div className="rounded-xl border border-gray-200 dark:border-zinc-700 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 dark:bg-zinc-900/50 hover:bg-gray-50 dark:hover:bg-zinc-900/50">
                  <TableHead className="text-gray-700 dark:text-gray-300">ID</TableHead>
                  <TableHead className="text-gray-700 dark:text-gray-300">Date</TableHead>
                  <TableHead className="text-gray-700 dark:text-gray-300">Product Name</TableHead>
                  <TableHead className="text-gray-700 dark:text-gray-300">Price</TableHead>
                  <TableHead className="text-gray-700 dark:text-gray-300">Rating</TableHead>
                  <TableHead className="text-gray-700 dark:text-gray-300">Total Reviews</TableHead>
                  <TableHead className="text-gray-700 dark:text-gray-300">Sentiment</TableHead>
                  <TableHead className="text-gray-700 dark:text-gray-300 text-center">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedHistory.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-gray-500 dark:text-gray-400">
                      No results found
                    </TableCell>
                  </TableRow>
                )}
                {paginatedHistory.map((item) => (
                  <TableRow
                    key={item.id}
                    className="border-b border-gray-200 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-800/50"
                  >
                    <TableCell className="text-gray-900 dark:text-gray-200">{item.id}</TableCell>
                    <TableCell className="text-gray-900 dark:text-gray-200">{item.date}</TableCell>
                    <TableCell className="text-gray-900 dark:text-gray-200">{item.productName}</TableCell>
                    <TableCell className="text-gray-900 dark:text-gray-200">{item.price}</TableCell>
                    <TableCell className="text-gray-900 dark:text-gray-200">
                      <div className="flex items-center gap-1">
                        <span className="text-blue-500">★</span>
                        <span>{item.rating}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-900 dark:text-gray-200">
                      {item.totalReviews.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge className={getSentimentBadgeClass(item.sentiment)}>
                        {item.sentiment}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-500/10"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
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
