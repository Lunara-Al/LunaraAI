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
    "bottom-right": "bottom-4 right-4",
    "bottom-left": "bottom-4 left-4",
    "top-right": "top-4 right-4",
    "top-left": "top-4 left-4",
  };

  const sizeClasses = {
    sm: "text-[10px] gap-1 px-2 py-0.5",
    md: "text-xs gap-1.25 px-2.5 py-1",
    lg: "text-sm gap-2 px-3 py-1.5",
  };

  const logoSizes = {
    sm: "w-3 h-3",
    md: "w-3.5 h-3.5",
    lg: "w-4.5 h-4.5",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className={`absolute ${positionClasses[position]} z-30 pointer-events-none`}
      data-testid="video-watermark"
    >
      <motion.div 
        animate={{ 
          boxShadow: [
            "0 0 0px rgba(168, 85, 247, 0)",
            "0 0 15px rgba(168, 85, 247, 0.4)",
            "0 0 0px rgba(168, 85, 247, 0)"
          ],
          borderColor: [
            "rgba(255, 255, 255, 0.1)",
            "rgba(168, 85, 247, 0.4)",
            "rgba(255, 255, 255, 0.1)"
          ]
        }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className={`flex items-center ${sizeClasses[size]} rounded-full bg-black/40 backdrop-blur-md border shadow-2xl overflow-hidden relative`}
      >
        {/* Shimmering Cosmic Beam */}
        <motion.div 
          animate={{ x: ["-100%", "200%"] }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear", repeatDelay: 2 }}
          className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/20 to-transparent w-1/2 skew-x-12"
        />
        
        <LunaraMiniLogo className={`${logoSizes[size]} relative z-10 drop-shadow-[0_0_8px_rgba(168,85,247,0.8)]`} />
        <span className="font-bold text-white/90 tracking-[0.1em] relative z-10 uppercase drop-shadow-md">
          Lunara
        </span>
      </motion.div>
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
