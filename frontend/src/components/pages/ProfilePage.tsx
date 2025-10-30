import { motion } from "motion/react";
import { Camera, X, User, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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

// Review Analysis History moved to HistoryPage

export function ProfilePage({ onBack, onLogout, isDark }: ProfilePageProps) {
  // Removed history table state/logic

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black">

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
                  className="text-gray-700 border-2 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-xl"
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

          {/* Review Analysis History moved to HistoryPage */}

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