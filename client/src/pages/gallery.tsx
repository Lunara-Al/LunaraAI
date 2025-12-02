import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Download, Sparkles, Trash2, Loader2, Eye, EyeOff, Star } from "lucide-react";
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
  const { creations, allVideos } = useMemo(() => {
    if (!videos) return { creations: [], allVideos: [] };
    return {
      creations: videos.filter((v) => v.displayOnProfile),
      allVideos: videos,
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
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-card dark:from-background dark:via-slate-950 dark:to-slate-900 px-4 py-6 md:p-8">
      <MoonMenu />

      <div className="max-w-7xl mx-auto space-y-6 md:space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1 md:space-y-2">
            <h1 
              className="text-3xl sm:text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent"
              data-testid="text-gallery-title"
            >
              Video Gallery
            </h1>
            <p className="text-sm md:text-base text-muted-foreground" data-testid="text-gallery-subtitle">
              Your cosmic video creations
            </p>
          </div>
          <Link href="/">
            <Button size="lg" className="w-full sm:w-auto bg-gradient-to-r from-primary to-secondary text-primary-foreground whitespace-nowrap" data-testid="button-create-new">
              <Sparkles className="w-4 h-4 md:w-5 md:h-5 mr-2" />
              Create New
            </Button>
          </Link>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6" data-testid="loading-gallery">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="aspect-square bg-card rounded-lg animate-pulse"></div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && (!videos || videos.length === 0) && (
          <div className="text-center py-12 md:py-16 space-y-3 md:space-y-4" data-testid="empty-gallery">
            <Sparkles className="w-12 h-12 md:w-16 md:h-16 mx-auto text-muted-foreground opacity-50" />
            <h3 className="text-lg md:text-xl font-semibold text-muted-foreground">No videos yet</h3>
            <p className="text-sm md:text-base text-muted-foreground">Generate your first cosmic video to get started</p>
            <Link href="/">
              <Button size="lg" className="bg-gradient-to-r from-primary to-secondary text-primary-foreground mt-2 md:mt-4" data-testid="button-start-creating">
                <Sparkles className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                Start Creating
              </Button>
            </Link>
          </div>
        )}

        {/* My Creations Section */}
        {!isLoading && creations.length > 0 && (
          <div className="space-y-4" data-testid="creations-section">
            <div className="flex items-center gap-3">
              <Star className="w-5 h-5 md:w-6 md:h-6 text-primary" />
              <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                My Creations
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6" data-testid="creations-grid">
              {creations.map((video) => (
                <div
                  key={video.id}
                  className="group relative bg-card rounded-lg overflow-hidden border border-primary/30 hover-elevate transition-all"
                  data-testid={`creation-item-${video.id}`}
                >
                  {/* Video */}
                  <div className="aspect-square">
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
                      data-testid={`creation-video-${video.id}`}
                    />
                  </div>

                  {/* Star Badge */}
                  <div className="absolute top-3 right-3 bg-gradient-to-br from-primary to-secondary text-white rounded-full p-2 shadow-lg backdrop-blur-md">
                    <Star className="w-4 h-4 fill-white" />
                  </div>

                  {/* Overlay on hover */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3 md:p-4 space-y-2 md:space-y-3">
                    <p className="text-white text-xs md:text-sm line-clamp-2" data-testid={`creation-prompt-${video.id}`}>
                      {video.prompt}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleDownload(video.videoUrl, video.prompt)}
                        className="flex-1 text-xs md:text-sm"
                        data-testid={`button-download-creation-${video.id}`}
                      >
                        <Download className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                        Download
                      </Button>
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => toggleCreationMutation.mutate({ id: video.id, display: false })}
                        disabled={toggleCreationMutation.isPending}
                        data-testid={`button-unstar-${video.id}`}
                        title="Remove from creations"
                      >
                        {toggleCreationMutation.isPending ? (
                          <Loader2 className="w-3 h-3 md:w-4 md:h-4 animate-spin" />
                        ) : (
                          <Star className="w-3 h-3 md:w-4 md:h-4 fill-white" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteVideoMutation.mutate(video.id)}
                        disabled={deleteVideoMutation.isPending}
                        data-testid={`button-delete-creation-${video.id}`}
                      >
                        {deleteVideoMutation.isPending ? (
                          <Loader2 className="w-3 h-3 md:w-4 md:h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-3 h-3 md:w-4 md:h-4" />
                        )}
                      </Button>
                    </div>
                    <span className="text-[10px] md:text-xs text-white/70">
                      {video.length}s • {video.aspectRatio}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* All Videos Section */}
        {!isLoading && allVideos && allVideos.length > 0 && (
          <div className="space-y-4" data-testid="all-videos-section">
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 md:w-6 md:h-6 text-secondary" />
              <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-secondary to-primary bg-clip-text text-transparent">
                All Videos
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6" data-testid="gallery-grid">
              {allVideos.map((video) => (
              <div
                key={video.id}
                className="group relative bg-card rounded-lg overflow-hidden border border-card-border hover-elevate transition-all"
                data-testid={`gallery-item-${video.id}`}
              >
                {/* Video */}
                <div className="aspect-square">
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
                    data-testid={`video-${video.id}`}
                  />
                </div>

                {/* Overlay on hover */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3 md:p-4 space-y-2 md:space-y-3">
                  <p className="text-white text-xs md:text-sm line-clamp-2" data-testid={`prompt-${video.id}`}>
                    {video.prompt}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleDownload(video.videoUrl, video.prompt)}
                      className="flex-1 text-xs md:text-sm"
                      data-testid={`button-download-${video.id}`}
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
                      data-testid={`button-delete-${video.id}`}
                    >
                      {deleteVideoMutation.isPending ? (
                        <Loader2 className="w-3 h-3 md:w-4 md:h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-3 h-3 md:w-4 md:h-4" />
                      )}
                    </Button>
                  </div>
                  <span className="text-[10px] md:text-xs text-white/70">
                    {video.length}s • {video.aspectRatio}
                  </span>
                </div>
              </div>
            ))}
            </div>
          </div>
        )}

        {/* Load More Button */}
        {!isLoading && allVideos && allVideos.length >= limit && (
          <div className="flex justify-center pt-4 md:pt-8" data-testid="load-more-container">
            <Button
              size="lg"
              variant="outline"
              onClick={() => setLimit(limit + VIDEOS_PER_PAGE)}
              className="w-full sm:w-auto"
              data-testid="button-load-more"
            >
              Load More
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
