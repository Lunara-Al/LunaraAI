import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Download, Sparkles, Trash2, Loader2, Star, Play, Zap, Share2, List, Grid3x3, AlertTriangle, X, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import MoonMenu from "@/components/moon-menu";
import { ShareModal } from "@/components/share-modal";
import { VideoWatermark } from "@/components/video-watermark";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import type { VideoGeneration, UserSettings } from "@shared/schema";

const VIDEOS_PER_PAGE = 12;

export default function Gallery() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [limit, setLimit] = useState(VIDEOS_PER_PAGE);
  const [shareModalVideo, setShareModalVideo] = useState<VideoGeneration | null>(null);
  const [previewVideo, setPreviewVideo] = useState<VideoGeneration | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");

  const { data: settings } = useQuery<UserSettings>({
    queryKey: ["/api/settings"],
  });
  
  const isPremiumUser = user?.membershipTier === "pro" || user?.membershipTier === "premium";
  // Default to showing watermark; only hide when settings explicitly set showWatermark to 0
  const shouldShowWatermark = !isPremiumUser || settings?.showWatermark !== 0;

  useEffect(() => {
    if (settings?.galleryView) {
      setViewMode(settings.galleryView as "grid" | "list");
    }
  }, [settings]);

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

  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  const handleDownload = async (id: number, videoUrl: string, prompt: string) => {
    if (downloadingId) return;
    
    setDownloadingId(id);
    try {
      const response = await fetch(videoUrl);
      if (!response.ok) throw new Error("Failed to fetch video");
      
      const reader = response.body?.getReader();
      const contentLength = +(response.headers.get("Content-Length") ?? 0);
      
      let receivedLength = 0;
      const chunks = [];
      
      if (reader) {
        while(true) {
          const {done, value} = await reader.read();
          if (done) break;
          chunks.push(value);
          receivedLength += value.length;
        }
      }

      const blob = new Blob(chunks, { type: 'video/mp4' });

      // Desktop & Fallback: Traditional Download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = 'none';
      a.href = url;
      // Sanitize prompt for filename and add timestamp for uniqueness
      const safePrompt = prompt.slice(0, 30).replace(/[^a-z0-9]/gi, '-').toLowerCase();
      const filename = `lunara-${safePrompt}-${Date.now()}.mp4`;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }, 100);
      
      toast({
        title: "Download complete",
        description: `Saved as ${filename}`,
      });
    } catch (error) {
      console.error("Download failed:", error);
      toast({
        variant: "destructive",
        title: "Download Error",
        description: "Failed to download video. Please try again.",
      });
    } finally {
      setDownloadingId(null);
    }
  };

  // Enhanced Video Card Component
  const VideoCard = ({ video, isCreation, index }: { video: VideoGeneration; isCreation?: boolean; index: number }) => (
    <div
      key={video.id}
      className={`group relative overflow-hidden rounded-xl transition-all duration-300 hover:scale-[1.02] ${
        isCreation
          ? "bg-gradient-to-br from-primary/8 to-secondary/8 dark:from-primary/10 dark:to-secondary/10 border border-primary/25 dark:border-primary/30 shadow-md"
          : "bg-gradient-to-br from-card/90 to-card/60 dark:from-card/80 dark:to-card/40 border border-primary/8 dark:border-primary/10 shadow-sm"
      }`}
      style={{
        animation: `fadeInUp 0.5s ease-out ${index * 40}ms both`,
      }}
      data-testid={isCreation ? `creation-item-${video.id}` : `gallery-item-${video.id}`}
    >
      {/* Animated Background Glow */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5" />
      </div>

      {/* Video Container */}
      <div className="relative aspect-square overflow-hidden bg-black/40 backdrop-blur-sm">
        {(() => {
          const isVideo = (url: string) => {
            const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov'];
            return videoExtensions.some(ext => url.toLowerCase().includes(ext)) || url.startsWith('blob:');
          };
          const isActuallyVideo = isVideo(video.videoUrl);
          
          return isActuallyVideo ? (
            <video
              src={video.videoUrl}
              className="w-full h-full object-contain cursor-pointer"
              loop
              muted
              onClick={() => setPreviewVideo(video)}
              onMouseEnter={(e) => (e.currentTarget as HTMLVideoElement).play()}
              onMouseLeave={(e) => {
                const vid = e.currentTarget as HTMLVideoElement;
                vid.pause();
                vid.currentTime = 0;
              }}
              data-testid={isCreation ? `creation-video-${video.id}` : `video-${video.id}`}
            />
          ) : (
            <img
              src={video.videoUrl}
              className="w-full h-full object-contain cursor-pointer"
              alt={video.prompt}
              onClick={() => setPreviewVideo(video)}
              data-testid={isCreation ? `creation-image-${video.id}` : `image-${video.id}`}
            />
          );
        })()}

        {/* Enhanced Play Icon Overlay - Slimmed down */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 bg-black/40 pointer-events-none">
          <Play className="w-8 h-8 text-white fill-white drop-shadow-md" />
        </div>

        {/* Metadata Badge - Slimmed down */}
        <div className="absolute top-2 left-2 z-20 px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-md border border-white/10">
          <span className="text-[10px] font-medium text-white">
            {video.length}s
          </span>
        </div>

        {/* Star Badge for Creations */}
        {isCreation && (
          <div className="absolute top-2 right-2 z-20">
            <div className="bg-gradient-to-br from-primary to-secondary text-white rounded-full p-1.5 shadow-lg border border-white/20">
              <Star className="w-3 h-3 fill-white" />
            </div>
          </div>
        )}
        
        {/* Lunara Watermark */}
        <VideoWatermark showWatermark={shouldShowWatermark} size="sm" position="bottom-right" />
      </div>

      {/* Action Overlay - Slimmed down */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-200 flex flex-col justify-end p-2 z-30 backdrop-blur-[2px]">
        <div className="flex items-center justify-center gap-1.5 bg-black/40 p-1.5 rounded-lg border border-white/10 translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => handleDownload(video.id, video.videoUrl, video.prompt)}
            disabled={downloadingId === video.id}
            className="h-8 w-8 text-white hover:bg-white/20 relative"
            data-testid={isCreation ? `button-download-creation-${video.id}` : `button-download-${video.id}`}
          >
            {downloadingId === video.id ? (
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
            ) : (
              <Download className="w-4 h-4 transition-transform group-active:scale-95" />
            )}
            {downloadingId === video.id && (
              <span className="absolute -inset-1 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            )}
          </Button>

          <Button
            size="icon"
            variant="ghost"
            onClick={() => toggleCreationMutation.mutate({ id: video.id, display: !video.displayOnProfile })}
            disabled={toggleCreationMutation.isPending}
            className={`h-8 w-8 ${video.displayOnProfile ? "text-primary" : "text-white"} hover:bg-white/20`}
            data-testid={`button-toggle-creation-${video.id}`}
          >
            <Star className={`w-4 h-4 ${video.displayOnProfile ? "fill-current" : ""}`} />
          </Button>

          <Button
            size="icon"
            variant="ghost"
            onClick={() => setShareModalVideo(video)}
            className="h-8 w-8 text-white hover:bg-white/20"
            data-testid={isCreation ? `button-share-creation-${video.id}` : `button-share-${video.id}`}
          >
            <Share2 className="w-4 h-4" />
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-destructive hover:bg-destructive/20"
                data-testid={isCreation ? `button-delete-creation-${video.id}` : `button-delete-${video.id}`}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="glass-card border-destructive/20">
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="w-5 h-5" />
                  Delete Video?
                </AlertDialogTitle>
                <AlertDialogDescription className="text-muted-foreground">
                  This action cannot be undone. This will permanently delete your cosmic video
                  and any associated share links.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="bg-white/10 hover:bg-white/20 border-white/10">Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => deleteVideoMutation.mutate(video.id)}
                  className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                >
                  {deleteVideoMutation.isPending ? "Deleting..." : "Delete"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/30 dark:from-background dark:via-slate-950 dark:to-slate-900/50 relative overflow-hidden px-4 py-6 md:p-8 transition-colors duration-300">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 pointer-events-none opacity-20 dark:opacity-30">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/25 dark:bg-primary/20 rounded-full blur-3xl animate-float-slow" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-secondary/20 dark:bg-secondary/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
      </div>

      <MoonMenu />

      <div className="max-w-7xl mx-auto space-y-10 md:space-y-16 relative z-10 animate-fade-in-up">
        {/* Enhanced Header Section */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-8 border-b border-primary/15 dark:border-primary/30">
          <div className="space-y-3 md:space-y-4 group">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/15 to-secondary/10 dark:from-primary/20 dark:to-secondary/10 group-hover:from-primary/25 group-hover:to-secondary/15 transition-all duration-300 shadow-sm group-hover:shadow-md">
                <Zap className="w-5 h-5 md:w-6 md:h-6 text-primary animate-icon-glow" />
              </div>
              <h1 
                className="text-4xl sm:text-5xl md:text-6xl font-black bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent animate-text-gradient"
                style={{ backgroundSize: '200% 200%' }}
                data-testid="text-gallery-title"
              >
                My Gallery
              </h1>
            </div>
            <p className="text-base md:text-lg text-muted-foreground font-medium flex items-center gap-2" data-testid="text-gallery-subtitle">
              <Sparkles className="w-4 h-4 text-primary/60 dark:text-primary/50 animate-pulse-glow" />
              {videos?.length || 0} videos • {creations.length} creations
            </p>
          </div>
          <Link href="/">
            <Button 
              size="lg" 
              className="w-full sm:w-auto bg-gradient-to-r from-primary to-secondary text-primary-foreground whitespace-nowrap font-semibold shadow-md hover:shadow-lg dark:shadow-lg dark:hover:shadow-xl transition-all duration-300 hover:scale-[1.03] active:scale-[0.98] ripple" 
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
                className="aspect-square rounded-xl border border-primary/10 dark:border-primary/20 shadow-md dark:shadow-lg skeleton overflow-hidden"
                style={{
                  animationDelay: `${i * 100}ms`
                }}
              >
                <div className="w-full h-full bg-gradient-to-br from-card/80 to-card/40 dark:from-card dark:to-card/50" />
              </div>
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
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/">
                <Button size="lg" className="bg-gradient-to-r from-primary to-secondary text-primary-foreground font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105" data-testid="button-start-creating">
                  <Sparkles className="w-5 h-5 mr-2" />
                  Start Creating
                </Button>
              </Link>
            </div>
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

            {viewMode === "grid" ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 md:gap-4" data-testid="creations-grid">
                {creations.map((video, index) => (
                  <VideoCard key={video.id} video={video} isCreation index={index} />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4" data-testid="creations-list">
                {creations.map((video, index) => (
                  <div
                    key={video.id}
                    className="group relative flex gap-3 p-2 rounded-xl bg-gradient-to-br from-primary/10 to-secondary/10 border border-primary/30 shadow-md hover:shadow-lg transition-all duration-300"
                    style={{ animation: `fadeInUp 0.5s ease-out ${index * 40}ms both` }}
                  >
                    <div 
                      key={`list-media-${video.id}`}
                      className="relative w-32 md:w-40 aspect-video overflow-hidden rounded-lg bg-black/40 flex-shrink-0 cursor-pointer"
                      onClick={() => setPreviewVideo(video)}
                    >
                      {(() => {
                        const isVideo = (url: string) => {
                          const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov'];
                          return videoExtensions.some(ext => url.toLowerCase().includes(ext)) || url.startsWith('blob:');
                        };
                        return isVideo(video.videoUrl) ? (
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
                          />
                        ) : (
                          <img
                            src={video.videoUrl}
                            className="w-full h-full object-cover"
                            alt={video.prompt}
                          />
                        );
                      })()}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/40">
                        <Play className="w-6 h-6 text-white fill-white" />
                      </div>
                      <VideoWatermark showWatermark={shouldShowWatermark} size="sm" position="bottom-right" />
                    </div>

                    <div className="flex-1 flex flex-col justify-between py-0.5">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-primary/30">
                            {video.length}s
                          </Badge>
                          <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-secondary/30">
                            {video.aspectRatio}
                          </Badge>
                          <span className="text-[9px] text-muted-foreground">
                            {new Date(video.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-foreground text-xs font-medium line-clamp-1">
                          {video.prompt}
                        </p>
                      </div>

                      <div className="flex items-center gap-1">
                          <Button
                            size="icon"
                            variant="secondary"
                            onClick={() => handleDownload(video.id, video.videoUrl, video.prompt)}
                            disabled={downloadingId === video.id}
                            className="h-7 w-7 relative"
                            title="Download"
                          >
                            {downloadingId === video.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Download className="w-3.5 h-3.5" />
                            )}
                          </Button>
                        <Button
                          size="icon"
                          variant="default"
                          onClick={() => toggleCreationMutation.mutate({ id: video.id, display: !video.displayOnProfile })}
                          disabled={toggleCreationMutation.isPending}
                          className="h-7 w-7"
                          title="Remove from Creations"
                        >
                          <Star className="w-3.5 h-3.5 fill-current" />
                        </Button>
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => setShareModalVideo(video)}
                          className="h-7 w-7"
                          title="Share"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-destructive hover:bg-destructive/10 ml-auto"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="glass-card border-destructive/20">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="flex items-center gap-2 text-destructive text-base">
                                <AlertTriangle className="w-4 h-4" />
                                Delete Video?
                              </AlertDialogTitle>
                              <AlertDialogDescription className="text-xs text-muted-foreground">
                                Permanently remove this video and all associated share links.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="gap-2">
                              <AlertDialogCancel className="h-8 text-xs bg-white/10 hover:bg-white/20 border-white/10">Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteVideoMutation.mutate(video.id)}
                                className="h-8 text-xs bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                              >
                                {deleteVideoMutation.isPending ? "Deleting..." : "Delete"}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* View Mode Toggle & All Videos Section */}
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

            {viewMode === "grid" ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 md:gap-4" data-testid="gallery-grid">
                {videos.map((video, index) => (
                  <VideoCard key={video.id} video={video} isCreation={false} index={index} />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4" data-testid="gallery-list">
                {videos.map((video, index) => (
                  <div
                    key={video.id}
                    className="group relative flex gap-3 p-2 rounded-xl bg-gradient-to-br from-card/90 to-card/60 dark:from-card/80 dark:to-card/40 border border-primary/10 shadow-sm hover:shadow-md transition-all duration-300"
                    style={{ animation: `fadeInUp 0.5s ease-out ${index * 40}ms both` }}
                  >
                    <div 
                      key={`list-media-${video.id}`}
                      className="relative w-32 md:w-40 aspect-video overflow-hidden rounded-lg bg-black/40 flex-shrink-0 cursor-pointer"
                      onClick={() => setPreviewVideo(video)}
                    >
                      {(() => {
                        const isVideo = (url: string) => {
                          const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov'];
                          return videoExtensions.some(ext => url.toLowerCase().includes(ext)) || url.startsWith('blob:');
                        };
                        return isVideo(video.videoUrl) ? (
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
                          />
                        ) : (
                          <img
                            src={video.videoUrl}
                            className="w-full h-full object-cover"
                            alt={video.prompt}
                          />
                        );
                      })()}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/40">
                        <Play className="w-6 h-6 text-white fill-white" />
                      </div>
                      <VideoWatermark showWatermark={shouldShowWatermark} size="sm" position="bottom-right" />
                    </div>

                    <div className="flex-1 flex flex-col justify-between py-0.5">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-primary/30">
                            {video.length}s
                          </Badge>
                          <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-secondary/30">
                            {video.aspectRatio}
                          </Badge>
                          <span className="text-[9px] text-muted-foreground">
                            {new Date(video.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-foreground text-xs font-medium line-clamp-1">
                          {video.prompt}
                        </p>
                      </div>

                      <div className="flex items-center gap-1">
                          <Button
                            size="icon"
                            variant="secondary"
                            onClick={() => handleDownload(video.id, video.videoUrl, video.prompt)}
                            disabled={downloadingId === video.id}
                            className="h-7 w-7 relative"
                            title="Download"
                          >
                            {downloadingId === video.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Download className="w-3.5 h-3.5" />
                            )}
                          </Button>
                        <Button
                          size="icon"
                          variant={video.displayOnProfile ? "default" : "outline"}
                          onClick={() => toggleCreationMutation.mutate({ id: video.id, display: !video.displayOnProfile })}
                          disabled={toggleCreationMutation.isPending}
                          className="h-7 w-7"
                          title="Creations"
                        >
                          <Star className={`w-3.5 h-3.5 ${video.displayOnProfile ? "fill-current" : ""}`} />
                        </Button>
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => setShareModalVideo(video)}
                          className="h-7 w-7"
                          title="Share"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-destructive hover:bg-destructive/10 ml-auto"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="glass-card border-destructive/20">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="flex items-center gap-2 text-destructive text-base">
                                <AlertTriangle className="w-4 h-4" />
                                Delete Video?
                              </AlertDialogTitle>
                              <AlertDialogDescription className="text-xs text-muted-foreground">
                                Permanently remove this video and all associated share links.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="gap-2">
                              <AlertDialogCancel className="h-8 text-xs bg-white/10 hover:bg-white/20 border-white/10">Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteVideoMutation.mutate(video.id)}
                                className="h-8 text-xs bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                              >
                                {deleteVideoMutation.isPending ? "Deleting..." : "Delete"}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
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

      {/* Share Modal */}
      {shareModalVideo && (
        <ShareModal
          video={shareModalVideo}
          isOpen={!!shareModalVideo}
          onClose={() => setShareModalVideo(null)}
        />
      )}

      {/* Fullscreen Preview Modal */}
      <Dialog open={!!previewVideo} onOpenChange={(open) => !open && setPreviewVideo(null)}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] w-auto h-auto p-0 border-none bg-black/95 backdrop-blur-2xl overflow-hidden rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)]">
          <DialogHeader className="sr-only">
            <DialogTitle>Video Preview</DialogTitle>
            <DialogDescription>Full screen cosmic video preview</DialogDescription>
          </DialogHeader>
          <div className="relative w-full h-full flex items-center justify-center group/preview">
            <Button
              size="icon"
              variant="ghost"
              className="absolute top-4 right-4 z-50 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-md transition-all duration-300 hover:rotate-90"
              onClick={() => setPreviewVideo(null)}
              data-testid="button-close-preview"
            >
              <X className="w-5 h-5" />
            </Button>

            {previewVideo && (
              <div className="relative flex items-center justify-center p-4 md:p-8">
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] bg-gradient-to-br from-primary/20 via-transparent to-secondary/20 blur-[120px] animate-pulse" style={{ animationDuration: '4s' }} />
                </div>

                <div className="relative">
                  {(() => {
                    const isVideo = (url: string) => {
                      const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov'];
                      return videoExtensions.some(ext => url.toLowerCase().includes(ext)) || url.startsWith('blob:');
                    };
                    const aspectClass = previewVideo.aspectRatio === "9:16" ? "max-h-[80vh] w-auto" : "max-w-[90vw] h-auto";
                    return isVideo(previewVideo.videoUrl) ? (
                      <video
                        src={previewVideo.videoUrl}
                        className={`${aspectClass} rounded-2xl shadow-2xl object-contain animate-in zoom-in-95 duration-500`}
                        controls
                        autoPlay
                        loop
                        data-testid="preview-video"
                      />
                    ) : (
                      <img
                        src={previewVideo.videoUrl}
                        className={`${aspectClass} rounded-2xl shadow-2xl object-contain animate-in zoom-in-95 duration-500`}
                        alt={previewVideo.prompt}
                        data-testid="preview-image"
                      />
                    );
                  })()}
                  <VideoWatermark showWatermark={shouldShowWatermark} size="md" position="bottom-right" />
                </div>

                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-full max-w-2xl px-6 opacity-0 group-hover/preview:opacity-100 transition-opacity duration-300">
                  <div className="glass-card p-4 rounded-2xl border-white/10 backdrop-blur-xl bg-black/40">
                    <p className="text-white text-sm md:text-base font-medium line-clamp-2 text-center drop-shadow-sm">
                      {previewVideo.prompt}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

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
