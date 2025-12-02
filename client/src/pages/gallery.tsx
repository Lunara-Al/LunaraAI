import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Download, Sparkles, Trash2, Loader2, Star, Play } from "lucide-react";
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

  const { data: videos, isLoading } = useQuery<VideoGeneration[]>({
    queryKey: ["/api/history", limit],
    queryFn: async () => {
      const response = await fetch(`/api/history?limit=${limit}`);
      return await response.json();
    },
  });

  // Separate creations from all videos
  const { creations, nonCreations } = useMemo(() => {
    if (!videos) return { creations: [], nonCreations: [] };
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
      a.download = `${prompt.slice(0, 30)}.mp4`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Download failed:", error);
      toast({
        variant: "destructive",
        title: "Download Error",
        description: "Failed to download video. Please try again.",
      });
    }
  };

  // Video Card Component
  const VideoCard = ({ video, isCreation }: { video: VideoGeneration; isCreation?: boolean }) => (
    <div
      key={video.id}
      className={`group relative bg-card rounded-lg overflow-hidden border transition-all hover-elevate ${isCreation ? "border-primary/40" : "border-card-border"}`}
      data-testid={isCreation ? `creation-item-${video.id}` : `gallery-item-${video.id}`}
    >
      {/* Video Container */}
      <div className="aspect-square relative bg-black/20">
        <video
          src={video.videoUrl}
          className="w-full h-full object-cover"
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

        {/* Play Icon Overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
          <Play className="w-12 h-12 text-white fill-white" />
        </div>

        {/* Star Badge for Creations */}
        {isCreation && (
          <div className="absolute top-3 right-3 bg-gradient-to-br from-primary to-secondary text-white rounded-full p-2 shadow-lg backdrop-blur-md z-10">
            <Star className="w-4 h-4 fill-white" />
          </div>
        )}
      </div>

      {/* Hover Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3 md:p-4 space-y-2 md:space-y-3 z-20">
        <p className="text-white text-xs md:text-sm line-clamp-2 font-medium" data-testid={isCreation ? `creation-prompt-${video.id}` : `prompt-${video.id}`}>
          {video.prompt}
        </p>

        {/* Button Row */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => handleDownload(video.videoUrl, video.prompt)}
            className="flex-1 text-xs md:text-sm"
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
          >
            {deleteVideoMutation.isPending ? (
              <Loader2 className="w-3 h-3 md:w-4 md:h-4 animate-spin" />
            ) : (
              <Trash2 className="w-3 h-3 md:w-4 md:h-4" />
            )}
          </Button>
        </div>

        {/* Metadata */}
        <span className="text-[10px] md:text-xs text-white/70">
          {video.length}s • {video.aspectRatio}
        </span>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-card dark:from-background dark:via-slate-950 dark:to-slate-900 px-4 py-6 md:p-8">
      <MoonMenu />

      <div className="max-w-7xl mx-auto space-y-8 md:space-y-12">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-card-border/40">
          <div className="space-y-1 md:space-y-2">
            <h1 
              className="text-3xl sm:text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent"
              data-testid="text-gallery-title"
            >
              My Gallery
            </h1>
            <p className="text-sm md:text-base text-muted-foreground" data-testid="text-gallery-subtitle">
              {videos?.length || 0} videos • {creations.length} creations
            </p>
          </div>
          <Link href="/">
            <Button size="lg" className="w-full sm:w-auto bg-gradient-to-r from-primary to-secondary text-primary-foreground whitespace-nowrap hover-elevate" data-testid="button-create-new">
              <Sparkles className="w-4 h-4 md:w-5 md:h-5 mr-2" />
              Create New
            </Button>
          </Link>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6" data-testid="loading-gallery">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="aspect-square bg-card rounded-lg animate-pulse border border-card-border/50" />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && (!videos || videos.length === 0) && (
          <div className="text-center py-16 md:py-24 space-y-6" data-testid="empty-gallery">
            <div className="flex justify-center">
              <Sparkles className="w-16 h-16 md:w-20 md:h-20 text-primary/30" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl md:text-3xl font-bold text-foreground">No videos yet</h3>
              <p className="text-base md:text-lg text-muted-foreground max-w-md mx-auto">
                Start creating your first cosmic ASMR video to build your gallery and showcase your creations
              </p>
            </div>
            <Link href="/">
              <Button size="lg" className="bg-gradient-to-r from-primary to-secondary text-primary-foreground hover-elevate" data-testid="button-start-creating">
                <Sparkles className="w-5 h-5 mr-2" />
                Start Creating
              </Button>
            </Link>
          </div>
        )}

        {/* My Creations Section */}
        {!isLoading && creations.length > 0 && (
          <div className="space-y-6" data-testid="creations-section">
            <div className="flex items-center gap-3 pb-4 border-b border-primary/20">
              <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-secondary/10">
                <Star className="w-5 h-5 md:w-6 md:h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  My Creations
                </h2>
                <p className="text-xs md:text-sm text-muted-foreground mt-1">
                  {creations.length} videos showcased
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6" data-testid="creations-grid">
              {creations.map((video) => (
                <VideoCard key={video.id} video={video} isCreation />
              ))}
            </div>
          </div>
        )}

        {/* All Videos Section */}
        {!isLoading && videos && videos.length > 0 && (
          <div className="space-y-6" data-testid="all-videos-section">
            <div className="flex items-center gap-3 pb-4 border-b border-secondary/20">
              <div className="p-2 rounded-lg bg-gradient-to-br from-secondary/20 to-primary/10">
                <Sparkles className="w-5 h-5 md:w-6 md:h-6 text-secondary" />
              </div>
              <div>
                <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-secondary to-primary bg-clip-text text-transparent">
                  All Videos
                </h2>
                <p className="text-xs md:text-sm text-muted-foreground mt-1">
                  {videos.length} total videos
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6" data-testid="gallery-grid">
              {videos.map((video) => (
                <VideoCard key={video.id} video={video} isCreation={false} />
              ))}
            </div>
          </div>
        )}

        {/* Load More Button */}
        {!isLoading && videos && videos.length >= limit && (
          <div className="flex justify-center pt-8" data-testid="load-more-container">
            <Button
              size="lg"
              variant="outline"
              onClick={() => setLimit(limit + VIDEOS_PER_PAGE)}
              className="px-8 hover-elevate"
              data-testid="button-load-more"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Load More
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
