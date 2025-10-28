interface ProgressRingProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
}

export function ProgressRing({ progress, size = 200, strokeWidth = 12 }: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  // Adjust font sizes based on ring size
  const isSmall = size < 100;
  const percentFontSize = isSmall ? size * 0.25 : 36;
  const labelFontSize = isSmall ? size * 0.12 : 14;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          /* ensure light mode ring is visible even if utility class is missing */
          strokeWidth={strokeWidth}
          /* presentation attr for light mode; overridden by class in dark mode */
          stroke="var(--color-gray-300)"
          className="dark:stroke-zinc-700"
        />
        {/* Progress circle with gradient */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#gradient)"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#9333ea" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
        </defs>
      </svg>
      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-black dark:text-white" style={{ fontSize: `${percentFontSize}px`, fontWeight: 600 }}>
          {progress}%
        </span>
        {!isSmall && (
          <span className="text-gray-600 dark:text-gray-400" style={{ fontSize: `${labelFontSize}px` }}>
            Complete
          </span>
        )}
      </div>
    </div>
  );
}
