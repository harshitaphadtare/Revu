import { motion } from "motion/react";
import { ArrowLeft, Camera, X, Eye, Trash2, Download, Search, User, LogOut } from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { useState } from "react";

interface ProfilePageProps {
  onBack: () => void;
  onLogout: () => void;
  isDark: boolean;
}

// Mock user data
const userData = {
  fullName: "John Anderson",
  email: "john.anderson@example.com",
  password: "••••••••••",
  avatar: null // null means no avatar uploaded
};

// Mock analysis history data
const analysisHistory = [
  {
    id: 1,
    date: "2024-01-15",
    productName: "SuperWidget X",
    price: "$199.99",
    rating: 4.2,
    totalReviews: 2345,
    sentiment: "Positive"
  },
  {
    id: 2,
    date: "2023-12-01",
    productName: "EcoGadget Pro",
    price: "$149.99",
    rating: 3.7,
    totalReviews: 1200,
    sentiment: "Neutral"
  },
  {
    id: 3,
    date: "2024-02-10",
    productName: "SmartHome Hub 2.0",
    price: "$299.99",
    rating: 4.8,
    totalReviews: 3421,
    sentiment: "Positive"
  },
  {
    id: 4,
    date: "2023-11-20",
    productName: "TechGear Premium",
    price: "$89.99",
    rating: 2.9,
    totalReviews: 892,
    sentiment: "Negative"
  },
  {
    id: 5,
    date: "2024-03-05",
    productName: "AudioMax Wireless",
    price: "$249.99",
    rating: 4.5,
    totalReviews: 1876,
    sentiment: "Positive"
  }
];

export function ProfilePage({ onBack, onLogout, isDark }: ProfilePageProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [sentimentFilter, setSentimentFilter] = useState("all");

  const filteredHistory = analysisHistory.filter(item => {
    const matchesSearch = item.productName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSentiment = sentimentFilter === "all" || item.sentiment.toLowerCase() === sentimentFilter;
    return matchesSearch && matchesSentiment;
  });

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
      {/* Header */}
      <header className="bg-white dark:bg-[#0a0a0a] border-b border-gray-200 dark:border-zinc-800">
        <div className="container mx-auto px-6 py-4">
          <Button
            variant="ghost"
            onClick={onBack}
            className="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white -ml-2"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8 max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          {/* Profile Picture Section */}
          <div className="flex flex-col items-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center"
            >
              {/* Avatar */}
              <div className="w-32 h-32 rounded-full bg-gray-100 dark:bg-zinc-800 border-4 border-white dark:border-zinc-700 flex items-center justify-center mb-6 shadow-lg">
                <User className="w-16 h-16 text-gray-400 dark:text-zinc-500" />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 mb-3">
                <Button
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-xl px-6"
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Change Photo
                </Button>
                <Button
                  variant="ghost"
                  className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-xl"
                >
                  <X className="w-4 h-4 mr-2" />
                  Remove Photo
                </Button>
              </div>

              {/* Helper Text */}
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                We accept JPG, PNG, and GIF images up to 5MB.
              </p>
            </motion.div>
          </div>

          {/* User Information Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <Card className="p-8 rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-[#1A1A1A]">
              <h2 className="text-xl mb-6 text-gray-900 dark:text-white">User Information</h2>
              
              <div className="space-y-6">
                {/* Full Name */}
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">
                    Full Name
                  </label>
                  <Input
                    value={userData.fullName}
                    readOnly
                    className="bg-gray-50 dark:bg-zinc-900 border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-white rounded-xl"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">
                    Email
                  </label>
                  <Input
                    value={userData.email}
                    readOnly
                    className="bg-gray-50 dark:bg-zinc-900 border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-white rounded-xl"
                  />
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">
                    Password
                  </label>
                  <div className="flex gap-3">
                    <Input
                      value={userData.password}
                      readOnly
                      type="password"
                      className="flex-1 bg-gray-50 dark:bg-zinc-900 border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-white rounded-xl"
                    />
                    <Button
                      variant="outline"
                      className="rounded-xl border-gray-300 dark:border-zinc-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800 px-6"
                    >
                      Change Password
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Review Analysis History Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
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
                    {filteredHistory.map((item) => (
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
            </Card>
          </motion.div>

          {/* Logout Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
            className="flex justify-end pt-4"
          >
            <Button
              onClick={onLogout}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-xl px-8 py-6 shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <LogOut className="w-5 h-5 mr-2" />
              Logout
            </Button>
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
}