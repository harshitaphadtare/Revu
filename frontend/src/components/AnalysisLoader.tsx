import { motion } from "motion/react";
import { Loader } from "./Loader";
import { Progress } from "./ui/progress";
import { useEffect, useState } from "react";

interface AnalysisLoaderProps {
  isDark: boolean;
}

export function AnalysisLoader({ isDark }: AnalysisLoaderProps) {
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("Initializing analysis...");

  useEffect(() => {
    // Simulate analysis progress
    const stages = [
      { progress: 0, text: "Initializing analysis..." },
      { progress: 15, text: "Fetching product data..." },
      { progress: 30, text: "Extracting reviews..." },
      { progress: 50, text: "Analyzing sentiments..." },
      { progress: 70, text: "Processing insights..." },
      { progress: 85, text: "Generating visualizations..." },
      { progress: 95, text: "Finalizing results..." },
      { progress: 100, text: "Complete!" }
    ];

    let currentStage = 0;

    const interval = setInterval(() => {
      if (currentStage < stages.length) {
        setProgress(stages[currentStage].progress);
        setStatusText(stages[currentStage].text);
        currentStage++;
      } else {
        clearInterval(interval);
      }
    }, 600);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white dark:bg-black">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-8 px-8"
      >
        {/* Loader */}
        <Loader />

        {/* REVU Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center shadow-lg">
            <span className="text-xl text-white" style={{ fontFamily: "Lexend, sans-serif" }}>R</span>
          </div>
          <h1 
            className="text-3xl bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent"
            style={{ fontFamily: "Lexend, sans-serif" }}
          >
            REVU
          </h1>
        </div>

        {/* Status Text */}
        <motion.p
          key={statusText}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-lg text-gray-700 dark:text-gray-300"
        >
          {statusText}
        </motion.p>

        {/* Progress Bar */}
        <div className="w-full max-w-md space-y-3">
          <div className="relative h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-zinc-800">
            <div 
              className="h-full transition-all duration-300 ease-out bg-gradient-to-r from-purple-600 to-blue-600"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Progress</span>
            <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              {progress}%
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}