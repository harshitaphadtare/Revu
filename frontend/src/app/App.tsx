import React, { useState } from "react";
import { HomePage } from "../pages/HomePage";
import { DashboardPage } from "../pages/DashboardPage";

export default function App() {
  const [currentPage, setCurrentPage] = useState<"home" | "dashboard">("home");

  const handleAnalyze = (url: string) => {
    console.log("Analyzing URL:", url);
    // Simulate analysis and navigate to dashboard
    setTimeout(() => {
      setCurrentPage("dashboard");
    }, 500);
  };

  const handleReset = () => {
    setCurrentPage("home");
  };

  return (
    <div className="size-full" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
      {currentPage === "home" ? (
        <HomePage onAnalyze={handleAnalyze} />
      ) : (
        <DashboardPage onReset={handleReset} />
      )}
    </div>
  );
}
