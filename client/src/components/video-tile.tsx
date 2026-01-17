import { useState, useRef, useEffect } from "react";
import { Play, ImageOff, Loader2, VolumeX, RefreshCw } from "lucide-react";
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
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
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
    setAutoplayBlocked(false);
    retryCount.current = 0;
  }, [video.videoUrl, retryKey]);

  const handleLoad = () => {
    setLoadState("loaded");
  };

  const handleError = () => {
    if (retryCount.current < 1) {
      retryCount.current++;
      setTimeout(() => {
        setRetryKey(prev => prev + 1);
      }, 1000);
    } else {
      setLoadState("error");
    }
  };

  const handleRetry = (e: React.MouseEvent) => {
    e.stopPropagation();
    retryCount.current = 0;
    setRetryKey(prev => prev + 1);
    setLoadState("loading");
  };

  const handleMouseEnter = () => {
    setIsHovering(true);
    if (autoPlayOnHover && videoRef.current && loadState === "loaded") {
      videoRef.current.play().catch((err) => {
        if (err?.name === "NotAllowedError") {
          setAutoplayBlocked(true);
        }
      });
    }
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
    setAutoplayBlocked(false);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  const urlWithCacheBust = retryKey > 0 
    ? `${video.videoUrl}${video.videoUrl.includes('?') ? '&' : '?'}retry=${retryKey}` 
    : video.videoUrl;

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
          <button 
            onClick={handleRetry}
            className="flex items-center gap-1 text-xs text-primary hover:underline"
            data-testid="button-retry-video"
          >
            <RefreshCw className="w-3 h-3" />
            Retry
          </button>
        </div>
      )}

      {isVideo ? (
        <video
          key={retryKey}
          ref={videoRef}
          src={urlWithCacheBust}
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
          key={retryKey}
          src={urlWithCacheBust}
          className={`w-full h-full object-contain transition-opacity duration-300 ${loadState === "loaded" ? "opacity-100" : "opacity-0"}`}
          alt={video.prompt}
          onLoad={handleLoad}
          onError={handleError}
          data-testid={`image-tile-${video.id}`}
        />
      )}

      {loadState === "loaded" && isVideo && (
        <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 bg-black/40 pointer-events-none ${isHovering && !autoplayBlocked ? "opacity-0" : "opacity-100"}`}>
          {autoplayBlocked ? (
            <div className="flex flex-col items-center gap-1">
              <VolumeX className="w-6 h-6 text-white/80" />
              <span className="text-[10px] text-white/80">Tap to play</span>
            </div>
          ) : (
            <Play className="w-8 h-8 text-white fill-white drop-shadow-md" />
          )}
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
