import { useState } from "react";
import { Sparkles, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { VideoGenerationResponse, ErrorResponse } from "@shared/schema";

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const generateVideoMutation = useMutation<VideoGenerationResponse, Error, { prompt: string }>({
    mutationFn: async (data) => {
      return await apiRequest("POST", "/api/generate", data);
    },
    onSuccess: (data) => {
      setVideoUrl(data.videoUrl);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setVideoUrl(null);
    generateVideoMutation.mutate({ prompt });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-card">
      <div className="w-full max-w-4xl mx-auto space-y-8 md:space-y-12">
        {/* Header Section */}
        <div className="text-center space-y-4">
          <h1 
            className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent animate-gradient"
            style={{
              backgroundSize: '200% 200%',
              animation: 'gradient 8s ease infinite'
            }}
            data-testid="text-title"
          >
            Lunara AI
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto flex items-center justify-center gap-2" data-testid="text-subtitle">
            <span>Type a prompt to generate a 10-second cosmic ASMR video</span>
            <Sparkles className="w-5 h-5 text-primary" />
          </p>
        </div>

        {/* Generation Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="prompt" className="sr-only">
                Video Prompt
              </Label>
              <Input
                id="prompt"
                type="text"
                placeholder="e.g. a glowing crystal peach sliced in slow motion"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                required
                disabled={generateVideoMutation.isPending}
                className="px-4 py-3 text-base md:text-lg h-auto focus:ring-2 focus:ring-primary transition-all"
                data-testid="input-prompt"
              />
            </div>
            <Button
              type="submit"
              size="lg"
              disabled={generateVideoMutation.isPending || !prompt.trim()}
              className="bg-gradient-to-r from-primary to-secondary text-primary-foreground font-semibold"
              data-testid="button-generate"
            >
              {generateVideoMutation.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Generate Video
                </>
              )}
            </Button>
          </div>
        </form>

        {/* Error State */}
        {generateVideoMutation.isError && (
          <div className="mt-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-3" data-testid="error-message">
            <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
            <p className="text-sm md:text-base text-destructive font-medium">
              {generateVideoMutation.error?.message || "Failed to generate video. Please try again."}
            </p>
          </div>
        )}

        {/* Loading State */}
        {generateVideoMutation.isPending && (
          <div className="mt-12 flex flex-col items-center justify-center space-y-6" data-testid="loading-state">
            <div className="relative">
              <div className="w-20 h-20 border-4 border-primary/20 rounded-full"></div>
              <div className="w-20 h-20 border-4 border-primary border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
            </div>
            <p className="text-lg text-muted-foreground animate-pulse">
              Creating your cosmic masterpiece...
            </p>
          </div>
        )}

        {/* Video Display */}
        {videoUrl && !generateVideoMutation.isPending && (
          <div className="mt-12 flex justify-center" data-testid="video-container">
            <div className="relative w-full max-w-2xl">
              <video
                src={videoUrl}
                controls
                autoPlay
                loop
                className="w-full rounded-xl border-2 border-primary/20 shadow-2xl"
                style={{
                  boxShadow: '0 25px 50px -12px rgba(255, 80, 225, 0.4)'
                }}
                data-testid="video-player"
              />
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
    </div>
  );
}
