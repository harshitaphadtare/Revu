import { motion } from "motion/react";
import { ArrowLeft, Download, Share2, Star, TrendingUp, AlertCircle, Sparkles, Search } from "lucide-react";
import { ThemeToggle } from "../components/shared/ThemeToggle";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Area, AreaChart, BarChart, Bar } from "recharts";
import { ImageWithFallback } from "../components/shared/ImageWithFallback";
import { useState } from "react";

interface DashboardPageProps {
  onReset: () => void;
}

// Mock Data
const productData = {
  name: "Sony WH-1000XM5 Wireless Headphones",
  image: "https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=150&h=150&fit=crop",
  totalReviews: 2847,
  averageRating: 4.6,
  summary: "Customers love the superior noise cancellation and comfort, though some report connectivity issues with multiple devices. Battery life exceeds expectations."
};

const sentimentData = [
  { name: "Positive", value: 68, color: "#10b981" },
  { name: "Neutral", value: 22, color: "#f59e0b" },
  { name: "Negative", value: 10, color: "#ef4444" }
];

const trendData = [
  { date: "Jan", positive: 65, neutral: 25, negative: 10 },
  { date: "Feb", positive: 62, neutral: 26, negative: 12 },
  { date: "Mar", positive: 70, neutral: 20, negative: 10 },
  { date: "Apr", positive: 68, neutral: 22, negative: 10 },
  { date: "May", positive: 71, neutral: 20, negative: 9 },
  { date: "Jun", positive: 68, neutral: 22, negative: 10 }
];

const positiveThemes = [
  { name: "Noise Cancellation", value: 89 },
  { name: "Comfort", value: 85 },
  { name: "Sound Quality", value: 82 },
  { name: "Battery Life", value: 78 }
];

const negativeThemes = [
  { name: "Price", value: 45 },
  { name: "Connectivity", value: 38 },
  { name: "Touch Controls", value: 32 },
  { name: "Call Quality", value: 28 }
];

const reviewsData = [
  { id: 1, text: "Amazing noise cancellation! Best headphones I've ever owned.", rating: 5, sentiment: "Positive", date: "2025-10-10" },
  { id: 2, text: "Sound quality is great but had some Bluetooth connectivity issues.", rating: 4, sentiment: "Neutral", date: "2025-10-09" },
  { id: 3, text: "Too expensive for what you get. Expected better build quality.", rating: 2, sentiment: "Negative", date: "2025-10-08" },
  { id: 4, text: "Comfortable for long flights. Battery lasts forever!", rating: 5, sentiment: "Positive", date: "2025-10-07" },
  { id: 5, text: "Great product overall. Minor issues with touch controls.", rating: 4, sentiment: "Neutral", date: "2025-10-06" },
  { id: 6, text: "Exceptional audio quality and premium feel.", rating: 5, sentiment: "Positive", date: "2025-10-05" }
];

export function DashboardPage({ onReset }: DashboardPageProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sentimentFilter, setSentimentFilter] = useState("all");

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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-4"
          >
            <ImageWithFallback
              src={productData.image}
              alt={productData.name}
              className="w-12 h-12 rounded-lg object-cover shadow-md"
            />
            <div>
              <h2 className="text-sm text-muted-foreground">Analysis Results</h2>
              <h1 className="max-w-md truncate">{productData.name}</h1>
            </div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-4"
          >
            <Button
              variant="outline"
              onClick={onReset}
              className="rounded-lg transition-all duration-300 hover:scale-105"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Re-analyze
            </Button>
            <ThemeToggle />
          </motion.div>
        </div>
      </header>

      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            scale: [1, 1.15, 1],
            opacity: [0.02, 0.04, 0.02],
            x: [0, 30, 0],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute top-20 -left-1/4 w-1/3 h-1/3 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.02, 0.03, 0.02],
            x: [0, -40, 0],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2,
          }}
          className="absolute bottom-20 -right-1/4 w-1/3 h-1/3 bg-gradient-to-br from-teal-500 to-blue-500 rounded-full blur-3xl"
        />
      </div>

      {/* Dashboard Content */}
      <main className="relative container mx-auto px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Overview Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Card className="p-8 rounded-2xl shadow-lg border-border/50 bg-gradient-to-br from-card via-card to-accent/5">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                >
                  <p className="text-sm text-muted-foreground mb-1">Total Reviews</p>
                  <p className="text-3xl">{productData.totalReviews.toLocaleString()}</p>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: 0.2 }}
                >
                  <p className="text-sm text-muted-foreground mb-1">Average Rating</p>
                  <div className="flex items-center gap-2">
                    <p className="text-3xl">{productData.averageRating}</p>
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-5 h-5 ${
                            i < Math.floor(productData.averageRating)
                              ? "fill-yellow-500 text-yellow-500"
                              : "text-muted"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: 0.3 }}
                  className="md:col-span-2"
                >
                  <p className="text-sm text-muted-foreground mb-2">AI Summary</p>
                  <div className="p-4 rounded-xl bg-accent/30 border border-border/50">
                    <p className="text-sm leading-relaxed">{productData.summary}</p>
                  </div>
                </motion.div>
              </div>
            </Card>
          </motion.div>

          {/* Sentiment Overview & Insights */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Sentiment Chart */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
            >
              <Card className="p-6 rounded-2xl shadow-lg border-border/50 lg:col-span-1">
              <h3 className="mb-6 flex items-center gap-2">
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                >
                  <Sparkles className="w-5 h-5 text-purple-500" />
                </motion.div>
                Sentiment Distribution
              </h3>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={sentimentData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {sentimentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-4 space-y-2">
                {sentimentData.map((item, index) => (
                  <motion.div
                    key={item.name}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + index * 0.1 }}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <motion.div
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 2, repeat: Infinity, delay: index * 0.3 }}
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-sm">{item.name}</span>
                    </div>
                    <span className="text-sm">{item.value}%</span>
                  </motion.div>
                ))}
              </div>
            </Card>
            </motion.div>

            {/* Key Insights */}
            <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.3 }}
                whileHover={{ scale: 1.02 }}
              >
                <Card className="p-6 rounded-2xl shadow-lg border-border/50 bg-gradient-to-br from-green-500/5 to-transparent border-green-500/20">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="flex items-center gap-2">
                    <span className="text-2xl">🔥</span>
                    Most Praised
                  </h3>
                </div>
                <p className="text-2xl mb-2">Noise Cancellation</p>
                <p className="text-sm text-muted-foreground">
                  Mentioned in 89% of positive reviews
                </p>
                <div className="mt-4 h-2 bg-accent rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: "89%" }}
                    transition={{ duration: 1.5, delay: 0.5, ease: "easeOut" }}
                    className="h-full bg-green-500 rounded-full"
                  />
                </div>
              </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.4 }}
                whileHover={{ scale: 1.02 }}
              >
                <Card className="p-6 rounded-2xl shadow-lg border-border/50 bg-gradient-to-br from-red-500/5 to-transparent border-red-500/20">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="flex items-center gap-2">
                    <span className="text-2xl">⚠️</span>
                    Common Complaint
                  </h3>
                </div>
                <p className="text-2xl mb-2">Price</p>
                <p className="text-sm text-muted-foreground">
                  Mentioned in 45% of negative reviews
                </p>
                <div className="mt-4 h-2 bg-accent rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: "45%" }}
                    transition={{ duration: 1.5, delay: 0.6, ease: "easeOut" }}
                    className="h-full bg-red-500 rounded-full"
                  />
                </div>
              </Card>
              </motion.div>
            </div>
          </div>

          {/* Theme Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.5 }}
            >
              <Card className="p-6 rounded-2xl shadow-lg border-border/50">
              <h3 className="mb-6 text-green-600 dark:text-green-400">Top Positive Themes</h3>
              <div className="space-y-4">
                {positiveThemes.map((theme, index) => (
                  <motion.div
                    key={theme.name}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 + index * 0.1 }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm">{theme.name}</span>
                      <span className="text-sm text-muted-foreground">{theme.value}%</span>
                    </div>
                    <div className="h-2 bg-accent rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${theme.value}%` }}
                        transition={{ duration: 1, delay: 0.6 + index * 0.1, ease: "easeOut" }}
                        className="h-full bg-green-500 rounded-full"
                      />
                    </div>
                  </motion.div>
                ))}
              </div>
            </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.5 }}
            >
              <Card className="p-6 rounded-2xl shadow-lg border-border/50">
              <h3 className="mb-6 text-red-600 dark:text-red-400">Top Negative Themes</h3>
              <div className="space-y-4">
                {negativeThemes.map((theme, index) => (
                  <motion.div
                    key={theme.name}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 + index * 0.1 }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm">{theme.name}</span>
                      <span className="text-sm text-muted-foreground">{theme.value}%</span>
                    </div>
                    <div className="h-2 bg-accent rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${theme.value}%` }}
                        transition={{ duration: 1, delay: 0.6 + index * 0.1, ease: "easeOut" }}
                        className="h-full bg-red-500 rounded-full"
                      />
                    </div>
                  </motion.div>
                ))}
              </div>
            </Card>
            </motion.div>
          </div>

          {/* Trend Analysis */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.6 }}
          >
            <Card className="p-6 rounded-2xl shadow-lg border-border/50">
            <h3 className="mb-6 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              Sentiment Trend Over Time
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="colorPositive" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px"
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="positive"
                  stroke="#10b981"
                  fillOpacity={1}
                  fill="url(#colorPositive)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
          </motion.div>

          {/* Reviews Table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.7 }}
          >
            <Card className="p-6 rounded-2xl shadow-lg border-border/50">
            <div className="flex items-center justify-between mb-6">
              <h3>Recent Reviews</h3>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search reviews..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 w-64 rounded-lg"
                  />
                </div>
                <Select value={sentimentFilter} onValueChange={setSentimentFilter}>
                  <SelectTrigger className="w-40 rounded-lg">
                    <SelectValue placeholder="Filter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sentiments</SelectItem>
                    <SelectItem value="positive">Positive</SelectItem>
                    <SelectItem value="neutral">Neutral</SelectItem>
                    <SelectItem value="negative">Negative</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Review</TableHead>
                    <TableHead className="w-24">Rating</TableHead>
                    <TableHead className="w-32">Sentiment</TableHead>
                    <TableHead className="w-32">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReviews.map((review, index) => (
                    <motion.tr
                      key={review.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.8 + index * 0.05 }}
                      className="border-b border-border hover:bg-accent/50 transition-colors"
                    >
                      <TableCell className="max-w-md">
                        <p className="line-clamp-2">{review.text}</p>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {review.rating}
                          <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getSentimentBadgeClass(review.sentiment)}>
                          {review.sentiment}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(review.date).toLocaleDateString()}
                      </TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
          </motion.div>

          {/* Export Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.8 }}
            className="flex items-center justify-center gap-4 flex-wrap"
          >
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button size="lg" className="rounded-xl px-8 shadow-lg">
                <Download className="w-4 h-4 mr-2" />
                Download Report (PDF)
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button size="lg" variant="outline" className="rounded-xl px-8">
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button size="lg" variant="outline" className="rounded-xl px-8">
                <Share2 className="w-4 h-4 mr-2" />
                Share Dashboard
              </Button>
            </motion.div>
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
}
