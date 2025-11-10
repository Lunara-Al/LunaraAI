import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Download, Sparkles, Trash2, Loader2, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Link } from "wouter";
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-card p-4 md:p-8">
      {/* Moon Icon - Top Right */}
      <div className="fixed top-4 right-4 z-10">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" data-testid="button-moon-menu-gallery">
              <Moon className="w-6 h-6 text-primary" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-80">
            <SheetHeader>
              <SheetTitle className="text-2xl bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Lunara AI
              </SheetTitle>
              <SheetDescription>
                Cosmic ASMR Video Generation
              </SheetDescription>
            </SheetHeader>
            <div className="mt-6 space-y-4">
              <div className="space-y-2">
                <h3 className="font-semibold text-sm">About</h3>
                <p className="text-sm text-muted-foreground">
                  Generate stunning 10-second cosmic ASMR videos from text prompts using AI-powered video generation.
                </p>
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold text-sm">Features</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Customizable video length (5s or 10s)</li>
                  <li>• Multiple aspect ratios</li>
                  <li>• Style customization</li>
                  <li>• Video gallery & downloads</li>
                  <li>• Curated prompt suggestions</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold text-sm">Gallery Tips</h3>
                <p className="text-sm text-muted-foreground">
                  Hover over videos to preview them. Click download to save, or delete to remove from your gallery.
                </p>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h1 
              className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent"
              data-testid="text-gallery-title"
            >
              Video Gallery
            </h1>
            <p className="text-muted-foreground" data-testid="text-gallery-subtitle">
              Your cosmic video creations
            </p>
          </div>
          <Link href="/">
            <Button size="lg" className="bg-gradient-to-r from-primary to-secondary text-primary-foreground" data-testid="button-create-new">
              <Sparkles className="w-5 h-5 mr-2" />
              Create New
            </Button>
          </Link>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="loading-gallery">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="aspect-square bg-card rounded-lg animate-pulse"></div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && (!videos || videos.length === 0) && (
          <div className="text-center py-16 space-y-4" data-testid="empty-gallery">
            <Sparkles className="w-16 h-16 mx-auto text-muted-foreground opacity-50" />
            <h3 className="text-xl font-semibold text-muted-foreground">No videos yet</h3>
            <p className="text-muted-foreground">Generate your first cosmic video to get started</p>
            <Link href="/">
              <Button size="lg" className="bg-gradient-to-r from-primary to-secondary text-primary-foreground mt-4" data-testid="button-start-creating">
                <Sparkles className="w-5 h-5 mr-2" />
                Start Creating
              </Button>
            </Link>
          </div>
        )}

        {/* Gallery Grid */}
        {!isLoading && videos && videos.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="gallery-grid">
            {videos.map((video) => (
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
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4 space-y-3">
                  <p className="text-white text-sm line-clamp-2" data-testid={`prompt-${video.id}`}>
                    {video.prompt}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleDownload(video.videoUrl, video.prompt)}
                      className="flex-1"
                      data-testid={`button-download-${video.id}`}
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Download
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => deleteVideoMutation.mutate(video.id)}
                      disabled={deleteVideoMutation.isPending}
                      data-testid={`button-delete-${video.id}`}
                    >
                      {deleteVideoMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                  <span className="text-xs text-white/70">
                    {video.length}s • {video.aspectRatio}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Load More Button */}
        {!isLoading && videos && videos.length >= limit && (
          <div className="flex justify-center pt-8" data-testid="load-more-container">
            <Button
              size="lg"
              variant="outline"
              onClick={() => setLimit(limit + VIDEOS_PER_PAGE)}
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
