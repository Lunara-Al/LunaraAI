import { motion } from "framer-motion";

interface VideoWatermarkProps {
  showWatermark: boolean;
  position?: "bottom-right" | "bottom-left" | "top-right" | "top-left";
  size?: "sm" | "md" | "lg";
  opacity?: number;
}

export function VideoWatermark({
  showWatermark,
  position = "bottom-right",
  size = "md",
  opacity = 0.7,
}: VideoWatermarkProps) {
  if (!showWatermark) return null;

  const positionClasses = {
    "bottom-right": "bottom-3 right-3",
    "bottom-left": "bottom-3 left-3",
    "top-right": "top-3 right-3",
    "top-left": "top-3 left-3",
  };

  const sizeClasses = {
    sm: "text-xs gap-1",
    md: "text-sm gap-1.5",
    lg: "text-base gap-2",
  };

  const logoSizes = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.3, duration: 0.4 }}
      className={`absolute ${positionClasses[position]} z-20 pointer-events-none`}
      style={{ opacity }}
      data-testid="video-watermark"
    >
      <div className={`flex items-center ${sizeClasses[size]} px-2 py-1 rounded-lg bg-black/30 backdrop-blur-sm border border-white/10`}>
        <LunaraMiniLogo className={logoSizes[size]} />
        <span className="font-semibold text-white/90 drop-shadow-md tracking-wide">
          Lunara
        </span>
      </div>
    </motion.div>
  );
}

function LunaraMiniLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="watermarkGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#a855f7" />
          <stop offset="50%" stopColor="#ec4899" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
      <circle
        cx="12"
        cy="12"
        r="10"
        fill="url(#watermarkGradient)"
        opacity="0.9"
      />
      <path
        d="M12 4C8 4 5 7 5 12C5 17 8 20 12 20C12 20 10 17 10 12C10 7 12 4 12 4Z"
        fill="white"
        opacity="0.8"
      />
      <circle cx="16" cy="8" r="1.5" fill="white" opacity="0.9" />
      <circle cx="14" cy="6" r="0.8" fill="white" opacity="0.7" />
      <circle cx="18" cy="10" r="0.6" fill="white" opacity="0.6" />
    </svg>
  );
}

export default VideoWatermark;
