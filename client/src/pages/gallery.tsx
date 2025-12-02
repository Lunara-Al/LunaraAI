import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Download, Sparkles, Trash2, Loader2, Star, Play, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import MoonMenu from "@/components/moon-menu";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { VideoGeneration } from "@shared/schema";

const VIDEOS_PER_PAGE = 12;

export default function Gallery() {
  const { toast } = useToast();
  const [limit, setLimit] = useState(VIDEOS_PER_PAGE);

  const { data: videos, isLoading, error, isFetching } = useQuery<VideoGeneration[]>({
    queryKey: ["/api/history", limit],
    queryFn: async () => {
      const response = await fetch(`/api/history?limit=${limit}`);
      if (!response.ok) {
        throw new Error("Failed to fetch videos");
      }
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
  });

  // Separate creations from all videos
  const { creations, nonCreations } = useMemo(() => {
    if (!videos || !Array.isArray(videos)) return { creations: [], nonCreations: [] };
    return {
      creations: videos.filter((v) => v.displayOnProfile),
      nonCreations: videos.filter((v) => !v.displayOnProfile),
    };
  }, [videos]);

  const deleteVideoMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/history/${id}`);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/history", limit] });
      toast({
        title: "Video deleted",
        description: "The video has been removed from your gallery",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete video. Please try again.",
      });
    },
  });

  const toggleCreationMutation = useMutation({
    mutationFn: async ({ id, display }: { id: number; display: boolean }) => {
      const response = await apiRequest("PATCH", `/api/history/${id}/creation-toggle`, { display });
      return await response.json();
    },
    onSuccess: (_, { display }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/history", limit] });
      toast({
        title: display ? "Added to creations" : "Removed from creations",
        description: display
          ? "This video now appears in your creations showcase"
          : "This video has been removed from your creations showcase",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update creation status. Please try again.",
      });
    },
  });

  const handleDownload = async (videoUrl: string, prompt: string) => {
    try {
      const response = await fetch(videoUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `lunara-${prompt.slice(0, 20)}-${Date.now()}.mp4`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast({
        title: "Download started",
        description: "Your video is being downloaded",
      });
    } catch (error) {
      console.error("Download failed:", error);
      toast({
        variant: "destructive",
        title: "Download Error",
        description: "Failed to download video. Please try again.",
      });
    }
  };

  // Enhanced Video Card Component
  const VideoCard = ({ video, isCreation, index }: { video: VideoGeneration; isCreation?: boolean; index: number }) => (
    <div
      key={video.id}
      className={`group relative overflow-hidden rounded-xl transition-all duration-300 hover:scale-105 ${
        isCreation
          ? "bg-gradient-to-br from-primary/10 to-secondary/10 border border-primary/30 shadow-[0_8px_32px_rgba(107,91,255,0.15)]"
          : "bg-gradient-to-br from-card/80 to-card/40 border border-primary/10 shadow-[0_4px_20px_rgba(107,91,255,0.08)]"
      }`}
      style={{
        animation: `fadeInUp 0.5s ease-out ${index * 50}ms both`,
      }}
      data-testid={isCreation ? `creation-item-${video.id}` : `gallery-item-${video.id}`}
    >
      {/* Animated Background Glow */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5" />
      </div>

      {/* Video Container */}
      <div className="relative aspect-square overflow-hidden bg-black/40 backdrop-blur-sm">
        <video
          src={video.videoUrl}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
          loop
          muted
          onMouseEnter={(e) => (e.currentTarget as HTMLVideoElement).play()}
          onMouseLeave={(e) => {
            const vid = e.currentTarget as HTMLVideoElement;
            vid.pause();
            vid.currentTime = 0;
          }}
          data-testid={isCreation ? `creation-video-${video.id}` : `video-${video.id}`}
        />

        {/* Enhanced Play Icon Overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 bg-gradient-to-t from-black/60 via-black/30 to-transparent">
          <div className="relative flex items-center justify-center">
            <div className="absolute inset-0 bg-gradient-to-br from-primary to-secondary rounded-full opacity-20 blur-xl scale-0 group-hover:scale-100 transition-transform duration-500" />
            <Play className="w-14 h-14 text-white fill-white drop-shadow-lg relative z-10" />
          </div>
        </div>

        {/* Shine Effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-full group-hover:translate-x-0 transition-transform duration-500 opacity-0 group-hover:opacity-100" />

        {/* Star Badge for Creations */}
        {isCreation && (
          <div className="absolute top-3 right-3 z-20">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary to-secondary rounded-full blur-lg opacity-60 scale-150" />
              <div className="relative bg-gradient-to-br from-primary to-secondary text-white rounded-full p-2 shadow-2xl backdrop-blur-md border border-white/20">
                <Star className="w-4 h-4 fill-white" />
              </div>
            </div>
          </div>
        )}

        {/* Metadata Badge */}
        <div className="absolute bottom-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20 px-2 py-1 rounded-lg bg-black/60 backdrop-blur-md border border-white/20">
          <span className="text-xs font-semibold text-white">
            {video.length}s • {video.aspectRatio}
          </span>
        </div>
      </div>

      {/* Enhanced Hover Overlay with Actions */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-end p-4 md:p-5 space-y-3 z-30 backdrop-blur-sm">
        {/* Prompt */}
        <div className="space-y-2">
          <p className="text-white text-sm md:text-base line-clamp-2 font-semibold leading-tight" data-testid={isCreation ? `creation-prompt-${video.id}` : `prompt-${video.id}`}>
            {video.prompt}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-1">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => handleDownload(video.videoUrl, video.prompt)}
            className="flex-1 text-xs md:text-sm font-medium transition-all duration-200 hover:scale-105"
            data-testid={isCreation ? `button-download-creation-${video.id}` : `button-download-${video.id}`}
          >
            <Download className="w-3 h-3 md:w-4 md:h-4 mr-1" />
            Download
          </Button>

          <Button
            size="sm"
            variant={video.displayOnProfile ? "default" : "outline"}
            onClick={() => toggleCreationMutation.mutate({ id: video.id, display: !video.displayOnProfile })}
            disabled={toggleCreationMutation.isPending}
            data-testid={`button-toggle-creation-${video.id}`}
            title={video.displayOnProfile ? "Remove from creations" : "Add to creations"}
            className="transition-all duration-200 hover:scale-105"
          >
            {toggleCreationMutation.isPending ? (
              <Loader2 className="w-3 h-3 md:w-4 md:h-4 animate-spin" />
            ) : video.displayOnProfile ? (
              <Star className="w-3 h-3 md:w-4 md:h-4 fill-current" />
            ) : (
              <Star className="w-3 h-3 md:w-4 md:h-4" />
            )}
          </Button>

          <Button
            size="sm"
            variant="destructive"
            onClick={() => deleteVideoMutation.mutate(video.id)}
            disabled={deleteVideoMutation.isPending}
            data-testid={isCreation ? `button-delete-creation-${video.id}` : `button-delete-${video.id}`}
            className="transition-all duration-200 hover:scale-105"
          >
            {deleteVideoMutation.isPending ? (
              <Loader2 className="w-3 h-3 md:w-4 md:h-4 animate-spin" />
            ) : (
              <Trash2 className="w-3 h-3 md:w-4 md:h-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-card/50 dark:from-background dark:via-slate-950 dark:to-slate-900/50 relative overflow-hidden px-4 py-6 md:p-8">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 pointer-events-none opacity-30">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-secondary/20 rounded-full blur-3xl" />
      </div>

      <MoonMenu />

      <div className="max-w-7xl mx-auto space-y-10 md:space-y-16 relative z-10">
        {/* Enhanced Header Section */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-8 border-b border-gradient-to-r from-primary/30 via-transparent to-secondary/30">
          <div className="space-y-3 md:space-y-4 group">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-secondary/10 group-hover:from-primary/30 group-hover:to-secondary/20 transition-all duration-300">
                <Zap className="w-5 h-5 md:w-6 md:h-6 text-primary animate-pulse" />
              </div>
              <h1 
                className="text-4xl sm:text-5xl md:text-6xl font-black bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent drop-shadow-lg"
                data-testid="text-gallery-title"
              >
                My Gallery
              </h1>
            </div>
            <p className="text-base md:text-lg text-muted-foreground font-medium flex items-center gap-2" data-testid="text-gallery-subtitle">
              <Sparkles className="w-4 h-4 text-primary/50" />
              {videos?.length || 0} videos • {creations.length} creations
            </p>
          </div>
          <Link href="/">
            <Button 
              size="lg" 
              className="w-full sm:w-auto bg-gradient-to-r from-primary to-secondary text-primary-foreground whitespace-nowrap font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105" 
              data-testid="button-create-new"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Create New
            </Button>
          </Link>
        </div>

        {/* Loading State with Animated Skeletons */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8" data-testid="loading-gallery">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div 
                key={i} 
                className="aspect-square bg-gradient-to-br from-card to-card/50 rounded-xl animate-pulse border border-primary/10 shadow-lg"
                style={{
                  animation: `pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite`,
                  animationDelay: `${i * 100}ms`
                }}
              />
            ))}
          </div>
        )}

        {/* Error State */}
        {!isLoading && error && (
          <div className="text-center py-20 md:py-32 space-y-6 px-4" data-testid="error-gallery">
            <div className="flex justify-center mb-4">
              <div className="relative">
                <div className="absolute inset-0 bg-destructive/30 rounded-full blur-2xl scale-150" />
                <div className="relative p-4 rounded-full bg-gradient-to-br from-destructive/20 to-destructive/10 border border-destructive/30">
                  <Sparkles className="w-12 h-12 md:w-16 md:h-16 text-destructive/60" />
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <h3 className="text-3xl md:text-4xl font-bold text-foreground">Unable to load gallery</h3>
              <p className="text-lg text-muted-foreground max-w-md mx-auto">
                Something went wrong while loading your videos. Please try refreshing the page.
              </p>
            </div>
            <Button 
              size="lg" 
              variant="outline"
              onClick={() => window.location.reload()}
              data-testid="button-retry-gallery"
              className="hover:scale-105 transition-transform duration-200"
            >
              Refresh Page
            </Button>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && (!videos || videos.length === 0) && (
          <div className="text-center py-20 md:py-32 space-y-8 px-4" data-testid="empty-gallery">
            <div className="flex justify-center mb-4">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-secondary/30 rounded-full blur-3xl scale-150 animate-pulse" />
                <div className="relative p-4 rounded-full bg-gradient-to-br from-primary/20 to-secondary/10 border border-primary/30">
                  <Sparkles className="w-16 h-16 md:w-20 md:h-20 text-primary/70" />
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <h3 className="text-3xl md:text-4xl font-bold text-foreground">No cosmic videos yet</h3>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Start creating your first cosmic ASMR video to build your gallery and showcase your creations to the world
              </p>
            </div>
            <Link href="/">
              <Button size="lg" className="bg-gradient-to-r from-primary to-secondary text-primary-foreground font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105" data-testid="button-start-creating">
                <Sparkles className="w-5 h-5 mr-2" />
                Start Creating
              </Button>
            </Link>
          </div>
        )}

        {/* My Creations Section */}
        {!isLoading && !error && creations.length > 0 && (
          <div className="space-y-8" data-testid="creations-section">
            <div className="flex items-start gap-4 pb-6 border-b border-gradient-to-r from-primary/40 via-primary/20 to-transparent group">
              <div className="p-3 rounded-lg bg-gradient-to-br from-primary/30 to-secondary/20 shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110">
                <Star className="w-6 h-6 md:w-7 md:h-7 text-primary fill-primary" />
              </div>
              <div className="flex-1">
                <h2 className="text-3xl md:text-4xl font-black bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  My Creations
                </h2>
                <p className="text-sm md:text-base text-muted-foreground mt-2 font-medium">
                  {creations.length} {creations.length === 1 ? 'video' : 'videos'} showcased
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8" data-testid="creations-grid">
              {creations.map((video, index) => (
                <VideoCard key={video.id} video={video} isCreation index={index} />
              ))}
            </div>
          </div>
        )}

        {/* All Videos Section */}
        {!isLoading && !error && videos && videos.length > 0 && (
          <div className="space-y-8" data-testid="all-videos-section">
            <div className="flex items-start gap-4 pb-6 border-b border-gradient-to-r from-secondary/40 via-secondary/20 to-transparent group">
              <div className="p-3 rounded-lg bg-gradient-to-br from-secondary/30 to-primary/20 shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110">
                <Sparkles className="w-6 h-6 md:w-7 md:h-7 text-secondary fill-secondary/50" />
              </div>
              <div className="flex-1">
                <h2 className="text-3xl md:text-4xl font-black bg-gradient-to-r from-secondary to-primary bg-clip-text text-transparent">
                  All Videos
                </h2>
                <p className="text-sm md:text-base text-muted-foreground mt-2 font-medium">
                  {videos.length} {videos.length === 1 ? 'video' : 'videos'} in total
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8" data-testid="gallery-grid">
              {videos.map((video, index) => (
                <VideoCard key={video.id} video={video} isCreation={false} index={index} />
              ))}
            </div>
          </div>
        )}

        {/* Load More Button */}
        {!isLoading && !error && videos && videos.length >= limit && (
          <div className="flex justify-center pt-8 md:pt-12" data-testid="load-more-container">
            <Button
              size="lg"
              variant="outline"
              onClick={() => setLimit(limit + VIDEOS_PER_PAGE)}
              disabled={isFetching}
              className="px-8 md:px-10 font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 border-primary/40 hover:border-primary/60"
              data-testid="button-load-more"
            >
              {isFetching ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Load More Videos
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Add fadeInUp animation */}
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
    </div>
  );
}
