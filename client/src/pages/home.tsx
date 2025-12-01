import { useState } from "react";
import { Sparkles, AlertCircle, History, Loader2, Moon, Zap, Wand2, Copy, Check, Image as ImageIcon, X, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import MoonMenu from "@/components/moon-menu";
import { useConditionalToast } from "@/hooks/useConditionalToast";
import type { VideoGenerationResponse, ErrorResponse, FrontendUser } from "@shared/schema";
import { imageToBase64, compressImage, validateImageFile, formatFileSize } from "@/lib/imageUtils";

// Advertisement Images
import aiTech1 from "@assets/stock_images/futuristic_ai_techno_780c4237.jpg";
import aiTech2 from "@assets/stock_images/futuristic_ai_techno_2bbcd194.jpg";
import aiTech3 from "@assets/stock_images/futuristic_ai_techno_50511b21.jpg";
import meditation1 from "@assets/stock_images/peaceful_meditation__f0b4b6f6.jpg";
import meditation2 from "@assets/stock_images/peaceful_meditation__b7f215c8.jpg";
import meditation3 from "@assets/stock_images/peaceful_meditation__45257c38.jpg";

const PRESET_PROMPTS = [
  "A glowing crystal peach sliced in slow motion with cosmic dust",
  "Ethereal purple nebula clouds flowing through space",
  "Liquid mercury forming geometric patterns in 4K",
  "Golden particles dancing in a spiral vortex",
  "Bioluminescent jellyfish floating through deep space",
  "Holographic aurora borealis over digital mountains",
];

export default function Home() {
  const { toast } = useConditionalToast();
  const [prompt, setPrompt] = useState("");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [length, setLength] = useState(10);
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [style, setStyle] = useState<string>("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [copiedPreset, setCopiedPreset] = useState<string | null>(null);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  
  // Fetch user data to check tier
  const { data: user } = useQuery<FrontendUser>({
    queryKey: ["/api/auth/me"],
    queryFn: async () => {
      const response = await fetch("/api/auth/me");
      if (!response.ok) throw new Error("Not authenticated");
      return response.json();
    },
  });

  const generateVideoMutation = useMutation<VideoGenerationResponse, any, { prompt: string; length: number; aspectRatio: string; style?: string; imageBase64?: string }>({
    mutationFn: async (data) => {
      const response = await apiRequest("POST", "/api/generate", data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to generate video");
      }
      return await response.json();
    },
    onSuccess: (data) => {
      setVideoUrl(data.videoUrl);
      toast({
        title: "Success!",
        description: "Your cosmic video has been created and saved to your gallery.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Generation Failed",
        description: error.message || "Unable to generate video. Please try again.",
      });
    },
  });

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate image
    const validation = validateImageFile(file);
    if (!validation.valid) {
      toast({
        variant: "destructive",
        title: "Invalid Image",
        description: validation.error,
      });
      return;
    }

    setIsProcessingImage(true);
    try {
      // Compress image
      const compressed = await compressImage(file);
      const compressedFile = new File([compressed], file.name, { type: 'image/jpeg' });

      // Convert to base64
      const base64 = await imageToBase64(compressedFile);
      setImageBase64(base64);
      
      // Create preview
      const preview = URL.createObjectURL(compressedFile);
      setImagePreview(preview);
      setSelectedImage(compressedFile);

      toast({
        title: "Image Added",
        description: "Your reference image is ready to guide video generation.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to process image. Please try again.",
      });
    } finally {
      setIsProcessingImage(false);
    }

    // Reset input
    e.target.value = '';
  };

  const handleRemoveImage = () => {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    setSelectedImage(null);
    setImagePreview(null);
    setImageBase64(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) {
      toast({
        variant: "destructive",
        title: "Empty Prompt",
        description: "Please enter a cosmic vision to generate a video.",
      });
      return;
    }
    setVideoUrl(null);
    generateVideoMutation.mutate({ 
      prompt, 
      length, 
      aspectRatio,
      ...(style && { style }),
      ...(imageBase64 && { imageBase64 })
    });
  };
  
  const handlePresetClick = (presetPrompt: string) => {
    setPrompt(presetPrompt);
    setCopiedPreset(presetPrompt);
    setTimeout(() => setCopiedPreset(null), 2000);
    toast({
      title: "Prompt loaded",
      description: "Ready to generate with this preset prompt.",
    });
  };

  const showcaseVideos = [
    { 
      image: aiTech1, 
      title: "Futuristic AI Dreams", 
      description: "Holographic neural networks",
      videoUrl: "https://example.com/video1.mp4" // Replace with actual video URL
    },
    { 
      image: meditation1, 
      title: "Cosmic Meditation", 
      description: "Journey through space",
      videoUrl: "https://example.com/video2.mp4" // Replace with actual video URL
    },
    { 
      image: aiTech2, 
      title: "Digital Harmony", 
      description: "AI-powered visuals",
      videoUrl: "https://example.com/video3.mp4" // Replace with actual video URL
    },
    { 
      image: meditation2, 
      title: "Zen Universe", 
      description: "Peaceful cosmic flow",
      videoUrl: "https://example.com/video4.mp4" // Replace with actual video URL
    },
    { 
      image: aiTech3, 
      title: "Tech Aurora", 
      description: "Glowing data streams",
      videoUrl: "https://example.com/video5.mp4" // Replace with actual video URL
    },
    { 
      image: meditation3, 
      title: "Stellar Peace", 
      description: "Tranquil star fields",
      videoUrl: "https://example.com/video6.mp4" // Replace with actual video URL
    },
  ];

  return (
    <div className="min-h-screen px-4 py-8 md:p-4 bg-gradient-to-br from-background via-background to-card dark:from-background dark:via-slate-950 dark:to-slate-900">
      <MoonMenu />

      <div className="w-full max-w-3xl mx-auto space-y-6 md:space-y-10 pt-6 md:pt-12">
        {/* Header Section */}
        <div className="text-center space-y-3 md:space-y-4">
          <h1 
            className="text-4xl sm:text-5xl md:text-6xl font-bold bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent animate-gradient"
            style={{
              backgroundSize: '200% 200%',
              animation: 'gradient 8s ease infinite'
            }}
            data-testid="text-title"
          >
            Lunara AI
          </h1>
          <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto px-4" data-testid="text-subtitle">
            <span className="inline-flex items-center gap-2 flex-wrap justify-center">
              <span>Write your prompt and add a reference image to guide your cosmic video</span>
              <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-primary" />
            </span>
          </p>
        </div>

        {/* Generation Form with Glass Card */}
        <Card className="p-6 md:p-8">
          <form onSubmit={handleSubmit} className="space-y-5 md:space-y-6">
            {/* Image Upload Section */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-secondary" />
                Reference Image (Recommended)
              </Label>
              <p className="text-xs text-muted-foreground">Upload an image to blend with your prompt for more consistent visual style</p>
              
              {!imagePreview ? (
                <label className="flex items-center justify-center w-full p-6 border-2 border-dashed border-primary/30 dark:border-primary/40 rounded-lg bg-primary/5 dark:bg-primary/15 hover:border-primary/50 dark:hover:border-primary/60 hover:bg-primary/10 dark:hover:bg-primary/20 transition-all cursor-pointer group">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <Upload className="w-6 h-6 text-primary/60 dark:text-primary/50 group-hover:text-primary dark:group-hover:text-primary/80 transition-colors" />
                    <div className="text-center">
                      <p className="text-sm font-medium text-foreground dark:text-white">Click to upload or drag and drop</p>
                      <p className="text-xs text-muted-foreground">JPEG, PNG, WebP, GIF, BMP, SVG or TIFF (up to 500MB)</p>
                    </div>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    disabled={generateVideoMutation.isPending || isProcessingImage}
                    className="hidden"
                    data-testid="input-image"
                  />
                </label>
              ) : (
                <div className="relative rounded-lg overflow-hidden border-2 border-primary/30 dark:border-primary/40 bg-primary/5 dark:bg-primary/15 p-3">
                  <img 
                    src={imagePreview} 
                    alt="Reference" 
                    className="w-full h-48 object-cover rounded-md"
                    data-testid="image-preview"
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="destructive"
                    onClick={handleRemoveImage}
                    disabled={generateVideoMutation.isPending}
                    className="absolute top-2 right-2 h-8 w-8"
                    data-testid="button-remove-image"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                  <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/50 dark:bg-black/70 px-2 py-1 rounded text-xs text-white dark:text-white/90">
                    <Check className="w-3 h-3 text-green-400 dark:text-green-300" />
                    Will be used in generation
                  </div>
                </div>
              )}
            </div>

            {/* Prompt Input */}
            <div className="space-y-3">
              <Label htmlFor="prompt" className="text-sm font-semibold flex items-center gap-2">
                <Moon className="w-4 h-4 text-primary" />
                Your Cosmic Vision
              </Label>
              <Input
                id="prompt"
                type="text"
                placeholder="e.g. a glowing crystal peach sliced in slow motion"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                required
                disabled={generateVideoMutation.isPending}
                className="text-base h-12"
                data-testid="input-prompt"
              />
            </div>

            {/* Parameters in Glass Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Length */}
              <div className="space-y-3">
                <Label className="text-xs font-semibold text-muted-foreground">
                  Video Length
                </Label>
                <div className="flex gap-2">
                  {[5, 10, 15].map((len) => (
                    <Button
                      key={len}
                      type="button"
                      size="sm"
                      variant={length === len ? "default" : "outline"}
                      onClick={() => setLength(len)}
                      disabled={generateVideoMutation.isPending || (len === 15 && user?.membershipTier === 'free')}
                      className={`flex-1 ${length === len ? "moon-glow" : ""}`}
                      data-testid={`button-length-${len}`}
                      title={len === 15 && user?.membershipTier === 'free' ? "Upgrade to Pro or Premium for 15s videos" : ""}
                    >
                      {len}s
                      {len === 15 && <Zap className="w-3 h-3 ml-1" />}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Style */}
              <div className="space-y-3">
                <Label htmlFor="style" className="text-xs font-semibold text-muted-foreground">
                  Style (Optional)
                </Label>
                <Input
                  id="style"
                  type="text"
                  placeholder="e.g. cinematic"
                  value={style}
                  onChange={(e) => setStyle(e.target.value)}
                  disabled={generateVideoMutation.isPending}
                  data-testid="input-style"
                />
              </div>
            </div>

            {/* Aspect Ratio */}
            <div className="space-y-3">
              <Label className="text-xs font-semibold text-muted-foreground">
                Aspect Ratio
              </Label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { ratio: "1:1", label: "1:1", platform: "Instagram" },
                  { ratio: "16:9", label: "16:9", platform: "YouTube" },
                  { ratio: "9:16", label: "9:16", platform: "TikTok" }
                ].map(({ ratio, label, platform }) => (
                  <Button
                    key={ratio}
                    type="button"
                    variant={aspectRatio === ratio ? "default" : "outline"}
                    onClick={() => setAspectRatio(ratio)}
                    disabled={generateVideoMutation.isPending}
                    className={`flex flex-col items-center justify-center h-auto py-3 ${aspectRatio === ratio ? "moon-glow" : ""}`}
                    data-testid={`button-ratio-${ratio.replace(':', '-')}`}
                  >
                    <span className="text-sm font-bold">{label}</span>
                    <span className="text-xs opacity-70">{platform}</span>
                  </Button>
                ))}
              </div>
            </div>

            {/* Generate Button */}
            <Button
              type="submit"
              size="lg"
              disabled={generateVideoMutation.isPending || !prompt.trim() || isProcessingImage}
              className="w-full bg-gradient-to-r from-primary to-secondary moon-glow text-white"
              data-testid="button-generate"
            >
              {generateVideoMutation.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Generating your masterpiece... (This may take a moment)
                </>
              ) : isProcessingImage ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Processing image...
                </>
              ) : (
                <>
                  <Wand2 className="w-5 h-5 mr-2" />
                  Generate Cosmic Video
                </>
              )}
            </Button>

            {/* Gallery Button */}
            <Link href="/gallery" className="block">
              <Button variant="outline" size="lg" className="w-full" data-testid="button-view-gallery">
                <History className="w-5 h-5 mr-2" />
                View Gallery
              </Button>
            </Link>
          </form>
        </Card>

        {/* Error State */}
        {generateVideoMutation.isError && (
          <div className="mt-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-3 animate-in" data-testid="error-message">
            <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm md:text-base text-destructive font-medium">
                Failed to generate video
              </p>
              <p className="text-xs md:text-sm text-destructive/80 mt-1">
                {generateVideoMutation.error?.message || "Please check your input and try again. Ensure you have Pika API key configured."}
              </p>
            </div>
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
            <div className="relative w-full max-w-2xl space-y-4">
              <div className="relative">
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
              <div className="flex gap-3">
                <Button
                  type="button"
                  size="lg"
                  variant="outline"
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                  className="flex-1"
                  data-testid="button-create-another"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Create Another
                </Button>
                <Link href="/gallery" className="flex-1">
                  <Button size="lg" variant="secondary" className="w-full" data-testid="button-view-gallery-video">
                    <History className="w-4 h-4 mr-2" />
                    View Gallery
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Preset Prompts Section - Collapsible */}
      {!videoUrl && (
        <div className="w-full max-w-3xl mx-auto mt-12 md:mt-16 px-4">
          <div className="space-y-4">
            <button
              onClick={() => setShowPresets(!showPresets)}
              className="flex items-center justify-between w-full group"
              data-testid="button-toggle-presets"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <h3 className="text-sm md:text-base font-semibold text-muted-foreground group-hover:text-foreground transition-colors">
                  Quick Start - Try These Prompts
                </h3>
              </div>
              <div className="text-muted-foreground group-hover:text-foreground transition-colors">
                {showPresets ? (
                  <svg className="w-4 h-4 md:w-5 md:h-5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 md:w-5 md:h-5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </div>
            </button>
            {showPresets && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                {PRESET_PROMPTS.map((presetPrompt, index) => (
                  <button
                    key={presetPrompt}
                    onClick={() => handlePresetClick(presetPrompt)}
                    disabled={generateVideoMutation.isPending}
                    className="text-left p-3 rounded-lg bg-card border border-card-border hover-elevate transition-all disabled:opacity-50 animate-in fade-in slide-in-from-bottom-2 duration-300"
                    style={{ animationDelay: `${index * 50}ms` }}
                    data-testid="button-preset-prompt"
                  >
                    <p className="text-xs md:text-sm text-foreground line-clamp-2">
                      {presetPrompt}
                    </p>
                    {copiedPreset === presetPrompt ? (
                      <div className="flex items-center gap-1 mt-2 text-primary">
                        <Check className="w-3 h-3" />
                        <span className="text-xs">Loaded</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 mt-2 text-muted-foreground">
                        <Copy className="w-3 h-3" />
                        <span className="text-xs">Click to use</span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Advertisement Showcase Section */}
      <div className="w-full max-w-6xl mx-auto mt-16 md:mt-24 px-4 pb-16">
        <div className="text-center space-y-3 mb-8 md:mb-12">
          <Badge variant="secondary" className="mb-2">
            Showcase
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent">
            AI ASMR Examples
          </h2>
          <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto">
            Experience the mesmerizing fusion of artificial intelligence and ASMR visuals
          </p>
        </div>

        {/* Showcase Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {showcaseVideos.map((video, index) => (
            <div
              key={index}
              className="group relative bg-card rounded-lg overflow-hidden border border-card-border hover-elevate transition-all"
              data-testid={`showcase-${index}`}
            >
              <div className="aspect-video relative overflow-hidden">
                <video
                  poster={video.image}
                  controls
                  loop
                  preload="metadata"
                  className="w-full h-full object-cover"
                  data-testid={`showcase-video-${index}`}
                >
                  <source src={video.videoUrl} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              </div>

              {/* Content */}
              <div className="p-3 md:p-4">
                <h3 className="text-sm md:text-base font-semibold mb-1">{video.title}</h3>
                <p className="text-xs md:text-sm text-muted-foreground">{video.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center mt-8 md:mt-12">
          <p className="text-sm md:text-base text-muted-foreground mb-4">
            Ready to create your own cosmic ASMR masterpiece?
          </p>
          <Button
            size="lg"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="bg-gradient-to-r from-primary to-secondary text-primary-foreground"
          >
            <Sparkles className="w-4 h-4 md:w-5 md:h-5 mr-2" />
            Start Creating
          </Button>
        </div>
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
