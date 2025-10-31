import { motion } from "motion/react";
import { Package, Search, Download, Save, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar } from "recharts";
import { useState } from "react";

interface DashboardPageProps {
  onReset: () => void;
  onThemeToggle: () => void;
  onProfileClick: () => void;
  isDark: boolean;
}

// Mock Data - iPhone 15
const productData = {
  name: "Apple iPhone 15 (Black, 128 GB)",
  currentPrice: "$799",
  totalReviews: 24567,
  averageRating: 4.2,
  shortSummary: "Most customers love the display and build quality, but battery life is a common complaint.",
  detailedSummary: "Customers consistently praise the iPhone 15's exceptional display quality, premium build, and camera performance. The device's sleek design and iOS ecosystem integration receive high marks. However, battery life remains a significant concern for many users, with reports of faster-than-expected drain. Some users also mention issues with heating during intensive tasks and the high price point relative to competitors. Overall, the device maintains strong satisfaction ratings among Apple enthusiasts.",
  avgConfidence: 87.3
};

const sentimentData = [
  { name: "Positive", value: 62, color: "#10b981" },
  { name: "Neutral", value: 23, color: "#f59e0b" },
  { name: "Negative", value: 15, color: "#ef4444" }
];

const trendData = [
  { date: "Oct 1", positive: 140, negative: 40 },
  { date: "Oct 3", positive: 165, negative: 35 },
  { date: "Oct 5", positive: 185, negative: 50 },
  { date: "Oct 7", positive: 198, negative: 45 },
  { date: "Oct 9", positive: 225, negative: 60 },
  { date: "Oct 11", positive: 205, negative: 75 },
  { date: "Oct 13", positive: 230, negative: 65 },
  { date: "Oct 15", positive: 270, negative: 55 }
];

const positiveThemes = [
  { name: "Camera Quality", value: 3600, label: "Camera Quality" },
  { name: "Build Quality", value: 2700, label: "Build Quality" },
  { name: "Display", value: 1800, label: "Display" },
  { name: "Performance", value: 1500, label: "Performance" },
  { name: "Design", value: 900, label: "Design" }
];

const negativeThemes = [
  { name: "Battery Life", value: 2000, label: "Battery Life" },
  { name: "Slow Shipping", value: 1500, label: "Slow Shipping" },
  { name: "Overheating", value: 1000, label: "Overheating" },
  { name: "Price", value: 750, label: "Price" },
  { name: "Software Bugs", value: 500, label: "Software Bugs" }
];

const positiveWords = [
  { text: "camera", size: 3.5 },
  { text: "quality", size: 3 },
  { text: "display", size: 2.8 },
  { text: "fast", size: 2.2 },
  { text: "beautiful", size: 2 },
  { text: "excellent", size: 2.5 },
  { text: "love", size: 1.8 },
  { text: "perfect", size: 1.6 },
  { text: "great", size: 2.4 },
  { text: "amazing", size: 1.5 }
];

const negativeWords = [
  { text: "battery", size: 3.5 },
  { text: "slow", size: 2.5 },
  { text: "shipping", size: 2.2 },
  { text: "expensive", size: 2 },
  { text: "overheating", size: 2.3 },
  { text: "fragile", size: 1.6 },
  { text: "disappointing", size: 2.1 },
  { text: "heavy", size: 1.5 },
  { text: "poor", size: 1.8 },
  { text: "defective", size: 1.7 }
];

const reviewsData = [
  { 
    id: 1, 
    text: "The camera quality on this phone is absolutely stunning. Takes professional-grade photos even in low light.", 
    rating: 5, 
    sentiment: "Positive", 
    date: "2025-10-15",
    keywords: ["camera quality"]
  },
  { 
    id: 2, 
    text: "Display is gorgeous and the build feels premium, but the battery drains faster than my previous phone.", 
    rating: 4, 
    sentiment: "Neutral", 
    date: "2025-10-14",
    keywords: ["display", "battery"]
  },
  { 
    id: 3, 
    text: "Overpriced for what you get. Battery life is terrible and it gets hot during video calls.", 
    rating: 2, 
    sentiment: "Negative", 
    date: "2025-10-13",
    keywords: ["battery life"]
  },
  { 
    id: 4, 
    text: "Best iPhone yet! The photos are incredible and the performance is blazing fast.", 
    rating: 5, 
    sentiment: "Positive", 
    date: "2025-10-12",
    keywords: ["photos", "performance"]
  },
  { 
    id: 5, 
    text: "Good phone overall but shipping was delayed by 2 weeks. Frustrating experience.", 
    rating: 4, 
    sentiment: "Neutral", 
    date: "2025-10-11",
    keywords: ["shipping"]
  }
];

export function DashboardPage({ onReset, onThemeToggle, onProfileClick, isDark }: DashboardPageProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sentimentFilter, setSentimentFilter] = useState("all");
  const [summaryType, setSummaryType] = useState<"short" | "detailed">("short");

  const filteredReviews = reviewsData.filter(review => {
    const matchesSearch = review.text.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSentiment = sentimentFilter === "all" || review.sentiment.toLowerCase() === sentimentFilter;
    return matchesSearch && matchesSentiment;
  });

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

  const highlightKeywords = (text: string, keywords: string[]) => {
    let highlightedText = text;
    keywords.forEach(keyword => {
      const regex = new RegExp(`(${keyword})`, 'gi');
      highlightedText = highlightedText.replace(
        regex, 
        '<mark class="bg-blue-200 dark:bg-blue-500/30 text-blue-900 dark:text-blue-200 px-1 rounded">$1</mark>'
      );
    });
    return highlightedText;
  };

  return (
    <div className="min-h-screen bg-background dark:bg-black">

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
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
                <div className="flex items-start gap-3 mb-4">
                  <div className="p-2 bg-blue-500/10 dark:bg-blue-500/20 rounded-lg">
                    <Package className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="flex-1 text-foreground dark:text-white">{productData.name}</h3>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="p-2.5 bg-green-50 dark:bg-green-500/10 rounded-lg border border-green-200 dark:border-green-500/20">
                    <p className="text-xs text-green-700 dark:text-green-400 mb-1 uppercase tracking-wide">Current Price</p>
                    <p className="text-xl text-green-900 dark:text-green-300">{productData.currentPrice}</p>
                  </div>
                  <div className="p-2.5 bg-blue-50 dark:bg-blue-500/10 rounded-lg border border-blue-200 dark:border-blue-500/20">
                    <p className="text-xs text-blue-700 dark:text-blue-400 mb-1 uppercase tracking-wide">Total Reviews</p>
                    <p className="text-xl text-blue-900 dark:text-blue-300">{productData.totalReviews.toLocaleString()}</p>
                  </div>
                  <div className="p-2.5 bg-amber-50 dark:bg-amber-500/10 rounded-lg border border-amber-200 dark:border-amber-500/20">
                    <p className="text-xs text-amber-700 dark:text-amber-400 mb-1 uppercase tracking-wide">Average Rating</p>
                    <p className="text-xl text-amber-900 dark:text-amber-300">{productData.averageRating}</p>
                  </div>
                </div>

                {/* Auto-Generated Summary */}
                <div className="flex-1 flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm text-foreground dark:text-white">Auto-Generated Summary</h4>
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
                  <div className="flex-1 max-h-16 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-gray-100 dark:[&::-webkit-scrollbar-track]:bg-zinc-800 [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-thumb]:bg-zinc-600 [&::-webkit-scrollbar-thumb]:rounded-full">
                    <p className="text-sm text-muted-foreground dark:text-gray-300 leading-relaxed pr-2">
                      {summaryType === "short" ? productData.shortSummary : productData.detailedSummary}
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
                        data={sentimentData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {sentimentData.map((entry, index) => (
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
                    <p className="text-xl text-green-600 dark:text-green-400 mb-1">{sentimentData[0].value}%</p>
                    <p className="text-xs text-green-600 dark:text-green-400">Positive</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl text-amber-600 dark:text-amber-400 mb-1">{sentimentData[1].value}%</p>
                    <p className="text-xs text-amber-600 dark:text-amber-400">Neutral</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl text-red-600 dark:text-red-400 mb-1">{sentimentData[2].value}%</p>
                    <p className="text-xs text-red-600 dark:text-red-400">Negative</p>
                  </div>
                </div>

                {/* Legend */}
                <div className="flex items-center justify-center gap-4 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <span className="text-xs text-muted-foreground dark:text-gray-400">Negative</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-amber-500" />
                    <span className="text-xs text-muted-foreground dark:text-gray-400">Neutral</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <span className="text-xs text-muted-foreground dark:text-gray-400">Positive</span>
                  </div>
                </div>

                {/* Average Confidence */}
                <div className="text-center pt-3 border-t border-border dark:border-zinc-700">
                  <p className="text-xs text-muted-foreground dark:text-gray-400">
                    Avg. Confidence: <span className="text-foreground dark:text-white">{productData.avgConfidence}%</span>
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
                  {positiveWords.map((word, index) => (
                    <motion.span
                      key={index}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.2 + index * 0.05 }}
                      className="text-green-600 dark:text-green-400 cursor-default hover:scale-110 transition-transform"
                      style={{ 
                        fontSize: `${word.size * 0.6}rem`,
                        fontWeight: word.size > 2.5 ? 700 : word.size > 2 ? 600 : 400,
                        opacity: word.size > 2.5 ? 1 : word.size > 2 ? 0.9 : 0.7
                      }}
                    >
                      {word.text}
                    </motion.span>
                  ))}
                </div>
              </Card>

              {/* Negative Themes Word Cloud */}
              <Card className="p-6 rounded-2xl border-border dark:border-zinc-800 bg-white dark:bg-[#1A1A1A]">
                <h3 className="mb-4 text-black dark:text-white">Negative Themes</h3>
                <div className="flex flex-wrap items-center justify-center gap-3 min-h-[100px]">
                  {negativeWords.map((word, index) => (
                    <motion.span
                      key={index}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.2 + index * 0.05 }}
                      className="text-red-600 dark:text-red-400 cursor-default hover:scale-110 transition-transform"
                      style={{ 
                        fontSize: `${word.size * 0.6}rem`,
                        fontWeight: word.size > 2.5 ? 700 : word.size > 2 ? 600 : 400,
                        opacity: word.size > 2.5 ? 1 : word.size > 2 ? 0.9 : 0.7
                      }}
                    >
                      {word.text}
                    </motion.span>
                  ))}
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
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-zinc-700" opacity={0.3} />
                    <XAxis 
                      dataKey="date" 
                      stroke="#6b7280" 
                      className="dark:stroke-gray-400"
                      tick={{ fill: '#6b7280' }}
                    />
                    <YAxis 
                      stroke="#6b7280" 
                      className="dark:stroke-gray-400"
                      tick={{ fill: '#6b7280' }}
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
                    <Bar dataKey="value" fill="#10b981" radius={[0, 8, 8, 0]} barSize={28} />
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
                    <Bar dataKey="value" fill="#ef4444" radius={[0, 8, 8, 0]} barSize={28} />
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
                      className="pl-10 w-full sm:w-64 rounded-lg bg-background dark:bg-zinc-900 border-border dark:border-zinc-700 text-foreground dark:text-white"
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
                    {filteredReviews.map((review, index) => (
                      <TableRow 
                        key={review.id}
                        className="border-b border-border dark:border-zinc-700 hover:bg-accent/50 dark:hover:bg-zinc-800/50"
                      >
                        <TableCell className="max-w-md text-foreground dark:text-gray-200">
                          <p 
                            className="line-clamp-2" 
                            dangerouslySetInnerHTML={{ 
                              __html: highlightKeywords(review.text, review.keywords) 
                            }}
                          />
                        </TableCell>
                        <TableCell className="text-foreground dark:text-gray-200">
                          <div className="flex items-center gap-1">
                            <span className="text-amber-500">★</span>
                            <span>{review.rating}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getSentimentBadgeClass(review.sentiment)}>
                            {review.sentiment}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground dark:text-gray-400">
                          {new Date(review.date).toLocaleDateString()}
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