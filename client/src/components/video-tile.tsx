import { useState, useRef, useEffect } from "react";
import { Play, ImageOff, Loader2 } from "lucide-react";
import type { VideoGeneration } from "@shared/schema";

interface VideoTileProps {
  video: VideoGeneration;
  onClick?: () => void;
  className?: string;
  showDuration?: boolean;
  autoPlayOnHover?: boolean;
}

type LoadState = "loading" | "loaded" | "error";

export function VideoTile({ 
  video, 
  onClick, 
  className = "", 
  showDuration = true,
  autoPlayOnHover = true 
}: VideoTileProps) {
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [isHovering, setIsHovering] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const retryCount = useRef(0);

  const isVideoFile = (url: string) => {
    if (!url) return false;
    const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov'];
    return videoExtensions.some(ext => url.toLowerCase().includes(ext)) || url.startsWith('blob:');
  };

  const isVideo = isVideoFile(video.videoUrl);

  useEffect(() => {
    setLoadState("loading");
    retryCount.current = 0;
  }, [video.videoUrl]);

  const handleLoad = () => {
    setLoadState("loaded");
  };

  const handleError = () => {
    if (retryCount.current < 2) {
      retryCount.current++;
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.load();
        }
      }, 1000);
    } else {
      setLoadState("error");
    }
  };

  const handleMouseEnter = () => {
    setIsHovering(true);
    if (autoPlayOnHover && videoRef.current && loadState === "loaded") {
      videoRef.current.play().catch(() => {});
    }
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  return (
    <div 
      className={`relative aspect-square overflow-hidden bg-black/40 backdrop-blur-sm cursor-pointer ${className}`}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {loadState === "loading" && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-card/80 to-card/40 animate-pulse">
          <Loader2 className="w-8 h-8 text-primary/50 animate-spin" />
        </div>
      )}

      {loadState === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-card/80 to-card/40 gap-2">
          <ImageOff className="w-8 h-8 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Failed to load</span>
        </div>
      )}

      {isVideo ? (
        <video
          ref={videoRef}
          src={video.videoUrl}
          className={`w-full h-full object-contain transition-opacity duration-300 ${loadState === "loaded" ? "opacity-100" : "opacity-0"}`}
          loop
          muted
          playsInline
          preload="metadata"
          onLoadedData={handleLoad}
          onError={handleError}
          data-testid={`video-tile-${video.id}`}
        />
      ) : (
        <img
          src={video.videoUrl}
          className={`w-full h-full object-contain transition-opacity duration-300 ${loadState === "loaded" ? "opacity-100" : "opacity-0"}`}
          alt={video.prompt}
          onLoad={handleLoad}
          onError={handleError}
          data-testid={`image-tile-${video.id}`}
        />
      )}

      {loadState === "loaded" && isVideo && (
        <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 bg-black/40 pointer-events-none ${isHovering ? "opacity-0" : "opacity-100"}`}>
          <Play className="w-8 h-8 text-white fill-white drop-shadow-md" />
        </div>
      )}

      {showDuration && loadState === "loaded" && (
        <div className="absolute top-2 left-2 z-20 px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-md border border-white/10">
          <span className="text-[10px] font-medium text-white">
            {video.length}s
          </span>
        </div>
      )}
    </div>
  );
}
