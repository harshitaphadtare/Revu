import { motion, AnimatePresence } from "motion/react";
import { ThemeToggle } from "./ThemeToggle";
import { Button } from "./ui/button";
import { AnalysisLoader } from "./AnalysisLoader";
import { useState, useRef } from "react";

interface HomePageProps {
  onAnalyze: (url: string) => void;
  onGetStarted: () => void;
  onThemeToggle: () => void;
  isDark: boolean;
}

interface RippleType {
  x: number;
  y: number;
  id: number;
}

export function HomePage({ onAnalyze, onGetStarted, onThemeToggle, isDark }: HomePageProps) {
  const [url, setUrl] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [ripples, setRipples] = useState<RippleType[]>([]);
  const rippleIdRef = useRef(0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAnalyzing) {
      setIsAnalyzing(true);
      // Show loader for ~5 seconds (matching the progress animation)
      setTimeout(() => {
        onAnalyze(url || "https://example.com/product");
        setIsAnalyzing(false);
      }, 5000);
    }
  };

  const createRipple = (e: React.MouseEvent<HTMLButtonElement>) => {
    const button = e.currentTarget;
    const rect = button.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const newRipple = {
      x,
      y,
      id: rippleIdRef.current++
    };
    
    setRipples(prev => [...prev, newRipple]);
    
    // Remove ripple after animation
    setTimeout(() => {
      setRipples(prev => prev.filter(r => r.id !== newRipple.id));
    }, 600);
  };

  return (
    <>
      {/* Show Analysis Loader when analyzing */}
      {isAnalyzing && <AnalysisLoader isDark={isDark} />}
      
      <div 
        className="min-h-screen flex flex-col"
        style={{
          background: isDark 
            ? "linear-gradient(to bottom right, #000000, #0a0a0a, #000000)"
            : undefined
        }}
        {...(!isDark && {
          className: "min-h-screen bg-gradient-to-br from-background via-background to-accent/20 flex flex-col"
        })}
      >
        {/* Animated background elements */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              opacity: isDark ? [0.06, 0.12, 0.06] : [0.03, 0.06, 0.03],
              x: [0, 50, 0],
              y: [0, 30, 0],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute top-1/4 -left-1/4 w-1/2 h-1/2 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full blur-3xl"
          />
          <motion.div
            animate={{
              scale: [1, 1.3, 1],
              opacity: isDark ? [0.06, 0.1, 0.06] : [0.03, 0.05, 0.03],
              x: [0, -30, 0],
              y: [0, 50, 0],
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1,
            }}
            className="absolute bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-gradient-to-br from-teal-500 to-blue-500 rounded-full blur-3xl"
          />
          <motion.div
            animate={{
              scale: [1, 1.1, 1],
              opacity: isDark ? [0.04, 0.08, 0.04] : [0.02, 0.04, 0.02],
              rotate: [0, 90, 0],
            }}
            transition={{
              duration: 15,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 2,
            }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1/3 h-1/3 bg-gradient-to-br from-pink-500 to-purple-500 rounded-full blur-3xl"
          />
        </div>

        {/* Header */}
        <header 
          className="relative z-50 backdrop-blur-xl border-b"
          style={{
            backgroundColor: isDark ? "rgba(0, 0, 0, 0.6)" : "rgba(250, 250, 250, 0.6)",
            borderColor: isDark ? "rgba(42, 42, 42, 0.5)" : "rgba(228, 228, 231, 0.5)"
          }}
        >
          <div className="container mx-auto px-6 py-4 flex items-center justify-between">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <span 
                className="text-2xl tracking-wider" 
                style={{ 
                  fontFamily: "Lexend, sans-serif", 
                  fontWeight: 700,
                  color: isDark ? "#FFFFFF" : undefined
                }}
              >
                REVU
              </span>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              className="flex items-center gap-4"
            >
              <ThemeToggle isDark={isDark} onToggle={onThemeToggle} />
              <motion.button
                whileHover={{ scale: 1.02 }} 
                whileTap={{ scale: 0.97 }}
                onClick={onGetStarted}
                className="relative overflow-hidden rounded-full px-6 py-2.5 transition-all duration-300 group"
                style={{
                  backgroundColor: isDark ? "#FFFFFF" : "#0a0a0a",
                  color: isDark ? "#000000" : "#fafafa",
                  border: "none",
                  boxShadow: isDark 
                    ? "0 1px 3px 0 rgba(255, 255, 255, 0.1)" 
                    : "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)"
                }}
              >
                <span className="relative z-10">Get Started</span>
                {/* Shimmer effect */}
                <motion.div
                  className="absolute inset-0 w-full h-full opacity-0 group-hover:opacity-100"
                  style={{
                    background: isDark 
                      ? "linear-gradient(90deg, transparent, rgba(0,0,0,0.1), transparent)"
                      : "linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)"
                  }}
                  animate={{
                    x: ["-100%", "200%"]
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    repeatDelay: 0.5,
                    ease: "easeInOut"
                  }}
                />
              </motion.button>
            </motion.div>
          </div>
        </header>

        {/* Hero Section */}
        <main className="relative flex-1 flex items-center justify-center">
          <div className="container mx-auto px-6 py-12">
            <div className="max-w-4xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="text-center mb-10"
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  whileHover={{ scale: 1.05 }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-sm border mb-6 cursor-default"
                  style={{
                    backgroundColor: isDark ? "rgba(26, 26, 26, 0.5)" : "rgba(244, 244, 245, 0.5)",
                    borderColor: isDark ? "rgba(42, 42, 42, 0.5)" : "rgba(228, 228, 231, 0.5)"
                  }}
                >
                  <motion.div
                    animate={{ 
                      scale: [1, 1.2, 1],
                      boxShadow: [
                        "0 0 0 0 rgba(34, 197, 94, 0.7)",
                        "0 0 0 4px rgba(34, 197, 94, 0)",
                        "0 0 0 0 rgba(34, 197, 94, 0)"
                      ]
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="w-2 h-2 rounded-full bg-green-500"
                  />
                  <span 
                    className="text-sm"
                    style={{ color: isDark ? "#9CA3AF" : undefined }}
                    {...(!isDark && { className: "text-sm text-muted-foreground" })}
                  >
                    AI-Powered Review Analysis
                  </span>
                </motion.div>
                
                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className="text-4xl md:text-5xl mb-6"
                  style={{ 
                    fontWeight: 700, 
                    lineHeight: 1.3,
                    color: isDark ? "#FFFFFF" : undefined
                  }}
                >
                  {isDark ? (
                    <span>
                      Analyze product reviews and
                      <br />
                      uncover what customers really feel
                    </span>
                  ) : (
                    <motion.span
                      className="inline-block bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent"
                      animate={{
                        backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
                      }}
                      transition={{
                        duration: 8,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                      style={{
                        backgroundSize: "200% 200%",
                      }}
                    >
                      Analyze product reviews and
                      <br />
                      uncover what customers really feel
                    </motion.span>
                  )}
                </motion.h1>
                
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                  className="text-sm max-w-2xl mx-auto mb-10"
                  style={{ color: isDark ? "#9CA3AF" : undefined }}
                  {...(!isDark && { className: "text-sm text-muted-foreground max-w-2xl mx-auto mb-10" })}
                >
                  Get instant insights from thousands of reviews with advanced sentiment analysis
                </motion.p>
              </motion.div>

              {/* Input Section */}
              <motion.form
                onSubmit={handleSubmit}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="relative"
              >
                <motion.div
                  className="relative group"
                  whileHover={{ scale: 1.01 }}
                  transition={{ duration: 0.2 }}
                >
                  <motion.div
                    animate={{
                      opacity: isDark ? [0.3, 0.4, 0.3] : [0.2, 0.3, 0.2],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                    className="absolute -inset-1 bg-gradient-to-r from-purple-500 via-blue-500 to-teal-500 rounded-2xl blur transition duration-500"
                    style={{ opacity: isDark ? 0.3 : 0.2 }}
                  />
                  <div 
                    className="relative rounded-2xl shadow-2xl border overflow-hidden backdrop-blur-xl"
                    style={{
                      backgroundColor: isDark ? "#1A1A1A" : "#FFFFFF",
                      borderColor: isDark ? "rgba(42, 42, 42, 0.5)" : "rgba(228, 228, 231, 0.5)"
                    }}
                  >
                    <input
                      type="url"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="Paste a product link (Amazon, Flipkart, etc.)"
                      className="w-full px-6 py-4 bg-transparent focus:outline-none transition-all duration-300 placeholder:text-sm"
                      style={{ 
                        fontFamily: "Inter, sans-serif",
                        color: isDark ? "#FFFFFF" : undefined
                      }}
                    />
                    <style>{`
                      input::placeholder {
                        color: ${isDark ? "#6B7280" : "#9CA3AF"};
                      }
                    `}</style>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="mt-6 flex flex-col items-center gap-4"
                >
                  <motion.div 
                    className="relative group"
                    whileHover={{ 
                      y: -4,
                      transition: { duration: 0.3 }
                    }}
                  >
                    <motion.div
                      className="absolute -inset-1 bg-gradient-to-r from-purple-600 via-blue-600 to-teal-600 rounded-xl blur opacity-40 transition duration-300"
                      initial={{ opacity: 0.4 }}
                      whileHover={{ 
                        opacity: 0.7,
                        scale: 1.05,
                      }}
                      animate={{
                        backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
                      }}
                      transition={{
                        backgroundPosition: {
                          duration: 3,
                          repeat: Infinity,
                          ease: "linear",
                        }
                      }}
                      style={{
                        backgroundSize: "200% 200%",
                      }}
                    />
                    <Button
                      type="submit"
                      disabled={isAnalyzing}
                      onClick={createRipple}
                      className="relative overflow-hidden px-10 py-6 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white border-0 shadow-xl transition-all duration-300 disabled:opacity-90"
                    >
                      {/* Ripple effects */}
                      <AnimatePresence>
                        {ripples.map((ripple) => (
                          <motion.span
                            key={ripple.id}
                            className="absolute rounded-full bg-white"
                            style={{
                              left: ripple.x,
                              top: ripple.y,
                              width: 20,
                              height: 20,
                            }}
                            initial={{ scale: 0, opacity: 0.6 }}
                            animate={{ scale: 4, opacity: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.6, ease: "easeOut" }}
                          />
                        ))}
                      </AnimatePresence>

                      {/* Gradient flow animation on hover */}
                      <motion.div
                        className="absolute inset-0 opacity-0 group-hover:opacity-100"
                        style={{
                          background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)"
                        }}
                        animate={{
                          x: ["-100%", "200%"]
                        }}
                        transition={{
                          duration: 1.5,
                          repeat: Infinity,
                          ease: "linear"
                        }}
                      />

                      {/* Button content */}
                      <span className="relative z-10 flex items-center gap-2">
                        {isAnalyzing ? (
                          <>
                            Analyzing
                            <span className="flex gap-1">
                              <motion.span
                                animate={{ opacity: [0.3, 1, 0.3] }}
                                transition={{ duration: 1, repeat: Infinity, delay: 0 }}
                              >
                                .
                              </motion.span>
                              <motion.span
                                animate={{ opacity: [0.3, 1, 0.3] }}
                                transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
                              >
                                .
                              </motion.span>
                              <motion.span
                                animate={{ opacity: [0.3, 1, 0.3] }}
                                transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
                              >
                                .
                              </motion.span>
                            </span>
                          </>
                        ) : (
                          "Analyze Reviews"
                        )}
                      </span>

                      {/* Intensify background on click */}
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-purple-500 to-blue-500"
                        initial={{ opacity: 0 }}
                        whileTap={{ opacity: [0, 0.3, 0] }}
                        transition={{ duration: 0.3 }}
                      />
                    </Button>
                  </motion.div>
                </motion.div>
              </motion.form>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}