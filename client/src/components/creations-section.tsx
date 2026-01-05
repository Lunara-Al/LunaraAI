import { useQuery } from "@tanstack/react-query";
import { Sparkles, Star } from "lucide-react";
import type { VideoGeneration } from "@shared/schema";

interface CreationsSectionProps {
  userId: string;
}

export function CreationsSection({ userId }: CreationsSectionProps) {
  const { data: creations, isLoading } = useQuery<VideoGeneration[]>({
    queryKey: ["/api/history/creations", userId],
    queryFn: async () => {
      const response = await fetch(`/api/history/creations/${userId}`);
      if (!response.ok) throw new Error("Failed to fetch creations");
      return response.json();
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Star className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Featured Creations
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="aspect-square bg-card rounded-3xl animate-pulse border border-primary/20"
            />
          ))}
        </div>
      </div>
    );
  }

  if (!creations || creations.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Star className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Featured Creations
          </h2>
        </div>
        <div className="text-center py-12 space-y-3 bg-card/50 rounded-3xl border border-primary/10 backdrop-blur-md">
          <Sparkles className="w-12 h-12 mx-auto text-muted-foreground opacity-50" />
          <p className="text-muted-foreground">
            Mark your favorite videos as creations to showcase them here
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Star className="w-6 h-6 text-primary" />
        <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          Featured Creations
        </h2>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {creations.map((video, index) => {
          const isVideo = (url: string) => {
            const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov'];
            return videoExtensions.some(ext => url.toLowerCase().includes(ext)) || url.startsWith('blob:');
          };
          const isActuallyVideo = isVideo(video.videoUrl);

          return (
            <div
              key={video.id}
              className="group relative bg-card rounded-3xl overflow-hidden border border-primary/20 hover-elevate transition-all duration-300 animate-in fade-in duration-300"
              style={{ animationDelay: `${index * 50}ms` }}
              data-testid={`creation-card-${video.id}`}
            >
              {/* Media Container */}
              <div className="aspect-square relative bg-black/40 backdrop-blur-sm overflow-hidden">
                {isActuallyVideo ? (
                  <video
                    src={video.videoUrl}
                    className="w-full h-full object-contain"
                    loop
                    muted
                    preload="metadata"
                    onMouseEnter={(e) => (e.currentTarget as HTMLVideoElement).play()}
                    onMouseLeave={(e) => {
                      const vid = e.currentTarget as HTMLVideoElement;
                      vid.pause();
                      vid.currentTime = 0;
                    }}
                    data-testid={`creation-video-${video.id}`}
                  />
                ) : (
                  <img
                    src={video.videoUrl}
                    className="w-full h-full object-cover"
                    alt={video.prompt}
                    data-testid={`creation-image-${video.id}`}
                  />
                )}

                {/* Star Badge - Always visible */}
                <div className="absolute top-3 right-3 bg-gradient-to-br from-primary to-secondary text-white rounded-full p-2 shadow-lg backdrop-blur-md">
                  <Star className="w-4 h-4 fill-white" />
                </div>

                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3 md:p-4 pointer-events-none">
                  <p className="text-white text-xs md:text-sm line-clamp-2 font-medium" data-testid={`creation-prompt-${video.id}`}>
                    {video.prompt}
                  </p>
                  <div className="text-[10px] md:text-xs text-white/70 mt-2">
                    {video.length}s • {video.aspectRatio}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
