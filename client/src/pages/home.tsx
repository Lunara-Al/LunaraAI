import { useState, useRef, useEffect, useMemo } from "react";
import { Sparkles, AlertCircle, History, Loader2, Moon, Zap, Wand2, Copy, Check, Image as ImageIcon, X, Upload, Search, Crown, Star, Play, Cloud, Wind, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Link, useLocation } from "wouter";
import MoonMenu from "@/components/moon-menu";
import { useConditionalToast } from "@/hooks/useConditionalToast";
import { VIDEO_LENGTHS, DEFAULT_VIDEO_LENGTH, MEMBERSHIP_TIERS, type VideoJobInitResponse, type VideoJobStatusResponse, type ErrorResponse, type FrontendUser, type MembershipTier } from "@shared/schema";
import { imageToBase64, compressImage, validateImageFile, formatFileSize } from "@/lib/imageUtils";


const PRESET_PROMPTS = [
  "A glowing crystal peach sliced in slow motion with cosmic dust",
  "Ethereal purple nebula clouds flowing through space",
  "Liquid mercury forming geometric patterns in 4K",
  "Golden particles dancing in a spiral vortex",
  "Bioluminescent jellyfish floating through deep space",
  "Holographic aurora borealis over digital mountains",
];

import video1 from "@assets/2025-11-07_07:40:28_1766940615530.mp4";
import video2 from "@assets/2025-11-04_21:45:47_1766940615530.mp4";
import video3 from "@assets/2025-11-01_11:16:38_1766940615530.mp4";

const EXAMPLE_VIDEOS = [
  {
    id: "example-1",
    title: "Celestial Petals",
    description: "Ethereal flowers blooming in a zero-gravity cosmic garden with crystalline textures",
    icon: Cloud,
    videoUrl: video1,
    gradient: "from-blue-600 via-purple-600 to-blue-700",
    accentGradient: "from-blue-500 to-cyan-500",
  },
  {
    id: "example-2",
    title: "Nebula Flow",
    description: "Swirling violet mists and star-dusted clouds forming mystical patterns in the void",
    icon: Moon,
    videoUrl: video2,
    gradient: "from-purple-600 via-pink-600 to-purple-700",
    accentGradient: "from-purple-500 to-pink-500",
  },
  {
    id: "example-3",
    title: "Cosmic Ripples",
    description: "Golden energy waves undulating across a liquid space-time surface",
    icon: Wind,
    videoUrl: video3,
    gradient: "from-indigo-600 via-purple-600 to-pink-600",
    accentGradient: "from-indigo-500 to-purple-500",
  },
];

type SearchResult = {
  id: string;
  username: string;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  membershipTier: string;
  createdAt: string | null;
};

type CreationSearchResult = {
  id: number;
  prompt: string;
  videoUrl: string;
  length: number;
  aspectRatio: string;
  userId: string | null;
};

export default function Home() {
  const { toast } = useConditionalToast();
  const [, setLocation] = useLocation();
  const [prompt, setPrompt] = useState(() => localStorage.getItem("lunara_prompt") || "");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [length, setLength] = useState(() => Number(localStorage.getItem("lunara_length")) || DEFAULT_VIDEO_LENGTH);
  const [aspectRatio, setAspectRatio] = useState(() => localStorage.getItem("lunara_aspectRatio") || "16:9");
  const [style, setStyle] = useState<string>(() => localStorage.getItem("lunara_style") || "");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(() => localStorage.getItem("lunara_imageBase64") || null);
  const [copiedPreset, setCopiedPreset] = useState<string | null>(null);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [creationResults, setCreationResults] = useState<CreationSearchResult[]>([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [searchTab, setSearchTab] = useState<"users" | "creations">("users");
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Auto-save settings to localStorage
  useEffect(() => {
    localStorage.setItem("lunara_prompt", prompt);
    localStorage.setItem("lunara_length", length.toString());
    localStorage.setItem("lunara_aspectRatio", aspectRatio);
    localStorage.setItem("lunara_style", style);
    if (imageBase64) {
      localStorage.setItem("lunara_imageBase64", imageBase64);
    } else {
      localStorage.removeItem("lunara_imageBase64");
    }
  }, [prompt, length, aspectRatio, style, imageBase64]);

  // Recover image preview from base64 if it exists
  useEffect(() => {
    if (imageBase64 && !imagePreview) {
      setImagePreview(imageBase64);
    }
  }, [imageBase64, imagePreview]);

  // Persistence for video generation status
  useEffect(() => {
    const savedJobId = localStorage.getItem("lunara_currentJobId");
    if (savedJobId && !isGenerating && !videoUrl) {
      const jobId = parseInt(savedJobId);
      setCurrentJobId(jobId);
      setIsGenerating(true);
      setGenerationStatus("Resuming generation...");
      
      // Start polling
      pollIntervalRef.current = setInterval(() => {
        pollJobStatus(jobId);
      }, 4000);
      
      pollJobStatus(jobId);
    }
  }, []);

  useEffect(() => {
    if (currentJobId) {
      localStorage.setItem("lunara_currentJobId", currentJobId.toString());
    } else {
      localStorage.removeItem("lunara_currentJobId");
    }
  }, [currentJobId]);
  
  // Fetch user data to check tier
  const { data: user } = useQuery<FrontendUser>({
    queryKey: ["/api/auth/me"],
    queryFn: async () => {
      const response = await fetch("/api/auth/me");
      if (!response.ok) throw new Error("Not authenticated");
      return response.json();
    },
  });

  // Handle search with debounce
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!searchQuery.trim()) {
      setSearchResults([]);
      setCreationResults([]);
      setShowSearchDropdown(false);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        if (searchTab === "users") {
          const response = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}`);
          if (response.ok) {
            const results = await response.json();
            setSearchResults(results);
            setCreationResults([]);
            setShowSearchDropdown(true);
          }
        } else {
          const response = await fetch(`/api/creations/search?q=${encodeURIComponent(searchQuery)}`);
          if (response.ok) {
            const results = await response.json();
            setCreationResults(results);
            setSearchResults([]);
            setShowSearchDropdown(true);
          }
        }
      } catch (error) {
        console.error("Search error:", error);
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchQuery, searchTab]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSearchDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const [generationTimer, setGenerationTimer] = useState<number>(0);
  const [generationProgress, setGenerationProgress] = useState<number>(0);
  const [generationStatus, setGenerationStatus] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentJobId, setCurrentJobId] = useState<number | null>(null);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  };

  const getStatusMessage = (status: string, progress: number): string => {
    switch (status) {
      case "pending": return "Initializing cosmic generator...";
      case "processing": return "Sending prompt to AI...";
      case "polling": return `Generating video... ${progress}%`;
      case "downloading": return "Downloading your cosmic creation...";
      case "completed": return "Video complete!";
      case "failed": return "Generation failed";
      default: return "Processing...";
    }
  };

  const pollJobStatus = async (jobId: number) => {
    try {
      const response = await fetch(`/api/generate/status/${jobId}`);
      if (!response.ok) {
        console.error("Status check failed:", response.status);
        return;
      }
      const status: VideoJobStatusResponse = await response.json();
      
      setGenerationProgress(status.progress);
      setGenerationStatus(getStatusMessage(status.status, status.progress));

      if (status.status === "completed" && status.videoUrl) {
        stopPolling();
        setIsGenerating(false);
        setVideoUrl(status.videoUrl);
        setCurrentJobId(null);
        toast({
          title: "Success!",
          description: `Your cosmic video has been created in ${generationTimer}s and saved to your gallery.`,
        });
      } else if (status.status === "failed") {
        stopPolling();
        setIsGenerating(false);
        setCurrentJobId(null);
        
        // Show specific error from job if available
        const errorMsg = status.errorMessage || "Unable to generate video. Please try again.";
        console.error("Generation failed:", errorMsg, status.errorCode);
        
        toast({
          variant: "destructive",
          title: "Generation Failed",
          description: errorMsg,
        });
        
        // Update mutation state manually since it's used for error display
        // We'll use setGenerationStatus to show error in UI
        setGenerationStatus(`Error: ${errorMsg}`);
      }
    } catch (error) {
      console.error("Polling error:", error);
    }
  };

  const generateVideoMutation = useMutation<VideoJobInitResponse, any, { prompt: string; length: number; aspectRatio: string; style?: string; imageBase64?: string }>({
    mutationFn: async (data) => {
      setGenerationTimer(0);
      setGenerationProgress(0);
      setGenerationStatus("Starting generation...");
      setIsGenerating(true);
      setVideoUrl(null);
      
      stopPolling();
      
      timerIntervalRef.current = setInterval(() => {
        setGenerationTimer(prev => {
          // Stop timer if it exceeds 10 minutes (600s) as a safety measure
          if (prev >= 600) {
            stopPolling();
            setIsGenerating(false);
            toast({
              variant: "destructive",
              title: "Generation Timeout",
              description: "The cosmic generator timed out. Please try again with a different prompt.",
            });
            return prev;
          }
          return prev + 1;
        });
      }, 1000);

      const response = await apiRequest("POST", "/api/generate", data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to start video generation");
      }
      return await response.json();
    },
    onSuccess: (data) => {
      setCurrentJobId(data.jobId);
      setGenerationStatus("Video generation started...");
      setGenerationProgress(5);
      
      pollIntervalRef.current = setInterval(() => {
        pollJobStatus(data.jobId);
      }, 4000);
      
      setTimeout(() => pollJobStatus(data.jobId), 1000);
    },
    onError: (error: any) => {
      stopPolling();
      setIsGenerating(false);
      setCurrentJobId(null);
      toast({
        variant: "destructive",
        title: "Generation Failed",
        description: error.message || "Unable to start video generation. Please try again.",
      });
    },
  });

  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, []);

  const progressPercent = generationProgress;


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


  const handleDownload = async (videoUrl: string, prompt: string) => {
    try {
      const response = await fetch(videoUrl);
      if (!response.ok) throw new Error("Failed to fetch video");
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = 'none';
      a.href = url;
      
      const safePrompt = prompt.slice(0, 30).replace(/[^a-z0-9]/gi, '-').toLowerCase();
      const filename = `lunara-${safePrompt}-${Date.now()}.mp4`;
      a.download = filename;
      
      document.body.appendChild(a);
      a.click();
      
      setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }, 2000);
      
      toast({
        title: "Download started",
        description: "Your cosmic video is being saved to your device.",
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

  const isVideo = (url: string) => {
    const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov'];
    return videoExtensions.some(ext => url.toLowerCase().includes(ext)) || url.startsWith('blob:');
  };

  return (
    <div className="min-h-screen px-4 py-8 md:p-4 bg-gradient-to-br from-background via-background to-accent/30 dark:from-background dark:via-slate-950 dark:to-slate-900 transition-colors duration-300">
      <MoonMenu />

      <div className="w-full max-w-3xl mx-auto space-y-6 md:space-y-10 pt-6 md:pt-12 animate-fade-in-up">
        {/* Search Section with Integrated Tabs */}
        <div className="relative group" ref={searchContainerRef}>
          {/* Cosmic glow effect - enhanced */}
          <div className="absolute -inset-2 bg-gradient-to-r from-primary/40 via-secondary/30 to-primary/40 rounded-2xl blur-2xl opacity-0 group-hover:opacity-70 group-focus-within:opacity-70 transition-all duration-500" />
          
          {/* Main Container */}
          <div className="relative space-y-2">
            {/* Search Tabs - Segment Control Style */}
            <div className="flex gap-1.5 px-1.5 py-1.5 bg-white/30 dark:bg-slate-900/30 backdrop-blur-md rounded-xl border border-white/40 dark:border-slate-700/40 w-fit" data-testid="search-tabs">
              <button
                type="button"
                onClick={() => {
                  setSearchTab("users");
                  setCreationResults([]);
                }}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all duration-200 flex items-center gap-1.5 ${
                  searchTab === "users"
                    ? "bg-gradient-to-r from-primary to-secondary text-white shadow-lg shadow-primary/50 scale-105"
                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/20 dark:hover:bg-slate-700/30"
                }`}
                data-testid="button-search-tab-users"
              >
                <Search className="w-3 h-3" />
                Users
              </button>
              <button
                type="button"
                onClick={() => {
                  setSearchTab("creations");
                  setSearchResults([]);
                }}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all duration-200 flex items-center gap-1.5 ${
                  searchTab === "creations"
                    ? "bg-gradient-to-r from-primary to-secondary text-white shadow-lg shadow-primary/50 scale-105"
                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/20 dark:hover:bg-slate-700/30"
                }`}
                data-testid="button-search-tab-creations"
              >
                <Search className="w-3 h-3" />
                Creations
              </button>
            </div>

            {/* Search Input Bar */}
            <div className="relative flex items-center gap-3 px-5 py-3 md:py-4 bg-white/60 dark:bg-slate-900/50 backdrop-blur-3xl border border-white/50 dark:border-slate-700/50 rounded-2xl shadow-xl hover:shadow-2xl hover:shadow-primary/20 dark:hover:shadow-primary/30 transition-all duration-300 group-hover:border-primary/70 dark:group-hover:border-primary/60">
              <Search className="w-5 h-5 text-primary dark:text-secondary flex-shrink-0 opacity-70" />
              <input
                type="text"
                placeholder={searchTab === "users" ? "Find users by username..." : "Discover creations by prompt..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => searchQuery && ((searchTab === "users" && searchResults.length > 0) || (searchTab === "creations" && creationResults.length > 0)) && setShowSearchDropdown(true)}
                className="flex-1 bg-transparent border-none outline-none text-sm md:text-base text-foreground dark:text-white placeholder-slate-400 dark:placeholder-slate-500 font-medium transition-all [&:-webkit-autofill]:[background-color:transparent!important] [&:-webkit-autofill]:[box-shadow:0_0_0_1000px_transparent_inset!important]"
                data-testid="input-search-bar"
                aria-label={searchTab === "users" ? "Search users by username" : "Search creations by prompt"}
                autoComplete="off"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setSearchResults([]);
                    setCreationResults([]);
                    setShowSearchDropdown(false);
                  }}
                  className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700/50 rounded-full transition-all duration-200 hover-elevate"
                  data-testid="button-clear-search"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                </button>
              )}
            </div>
          </div>

          {/* Search Results Dropdown - Users */}
          {showSearchDropdown && searchTab === "users" && searchResults.length > 0 && (
            <div className="absolute top-full mt-3 left-0 right-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-3xl border border-white/50 dark:border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="max-h-96 overflow-y-auto">
                {searchResults.map((result, idx) => {
                  const initials = `${result.firstName?.[0] || ""}${result.lastName?.[0] || ""}`.toUpperCase() || "LU";
                  return (
                    <button
                      key={result.id}
                      onClick={() => {
                        setLocation(`/user/${result.username}`);
                        setSearchQuery("");
                        setSearchResults([]);
                        setShowSearchDropdown(false);
                      }}
                      className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors text-left ${
                        idx !== 0 ? "border-t border-slate-200/50 dark:border-slate-700/30" : ""
                      }`}
                      data-testid={`button-search-result-${result.username}`}
                    >
                      <Avatar className="w-10 h-10 ring-2 ring-primary/30 flex-shrink-0">
                        <AvatarImage src={result.profileImageUrl || ""} alt={result.username} />
                        <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white text-xs font-bold">
                          {initials}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-foreground dark:text-white truncate">
                            {`${result.firstName || ""} ${result.lastName || ""}`.trim() || "User"}
                          </p>
                          {result.membershipTier !== "free" && (
                            <Badge className="px-2 py-0.5 h-auto bg-gradient-to-r from-primary/20 to-secondary/20 text-primary dark:text-secondary text-xs font-bold border-primary/40">
                              <Crown className="w-3 h-3 mr-1" />
                              {result.membershipTier}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
                          @{result.username}
                        </p>
                      </div>

                      <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Search Results Dropdown - Creations */}
          {showSearchDropdown && searchTab === "creations" && creationResults.length > 0 && (
            <div className="absolute top-full mt-3 left-0 right-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-3xl border border-white/50 dark:border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="max-h-96 overflow-y-auto">
                <div className="grid grid-cols-2 gap-1">
                  {creationResults.map((creation) => (
                    <button
                      key={creation.id}
                      onClick={() => {
                        setSearchQuery("");
                        setCreationResults([]);
                        setShowSearchDropdown(false);
                      }}
                      className="group relative aspect-square overflow-hidden hover:opacity-80 transition-opacity"
                      data-testid={`button-creation-result-${creation.id}`}
                    >
                      {isVideo(creation.videoUrl) ? (
                        <video
                          src={creation.videoUrl}
                          className="w-full h-full object-cover"
                          muted
                        />
                      ) : (
                        <img
                          src={creation.videoUrl}
                          className="w-full h-full object-cover"
                          alt={creation.prompt}
                        />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-xs line-clamp-1 font-semibold">
                            {creation.prompt}
                          </p>
                          <p className="text-white/70 text-[10px]">
                            {creation.length}s • {creation.aspectRatio}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* No Results Message */}
          {showSearchDropdown && searchQuery && searchResults.length === 0 && creationResults.length === 0 && (
            <div className="absolute top-full mt-3 left-0 right-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-3xl border border-white/50 dark:border-slate-700/50 rounded-2xl shadow-2xl p-6 text-center text-sm text-slate-600 dark:text-slate-400 animate-in fade-in slide-in-from-top-2 duration-200 space-y-2">
              <Sparkles className="w-8 h-8 mx-auto text-primary/40" />
              <p className="font-medium">No {searchTab === "users" ? "users" : "creations"} found</p>
              <p className="text-xs opacity-70">Try a different search query</p>
            </div>
          )}
        </div>
        {/* Header Section */}
        <div className="text-center space-y-3 md:space-y-4">
          <h1 
            className="text-4xl sm:text-5xl md:text-6xl font-bold bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent animate-text-gradient drop-shadow-sm"
            style={{
              backgroundSize: '200% 200%',
            }}
            data-testid="text-title"
          >
            Lunara AI
          </h1>
          <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto px-4 animate-fade-in-up" style={{ animationDelay: '100ms' }} data-testid="text-subtitle">
            <span className="inline-flex items-center gap-2 flex-wrap justify-center">
              <span>Write your prompt and use a reference image to guide your cosmic video</span>
              <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-primary animate-pulse-glow" />
            </span>
          </p>
        </div>

        {/* Generation Form with Glass Card */}
        <Card className="p-6 md:p-8 glass-card hover-shadow animate-fade-in-scale" style={{ animationDelay: '150ms' }}>
          <form onSubmit={handleSubmit} className="space-y-5 md:space-y-6">
            {/* Image Upload Section */}
            <div className="space-y-3 relative">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-secondary transition-transform hover:scale-110" />
                Reference Image
              </Label>
              <p className="text-xs text-muted-foreground">Upload an image to blend with your prompt for more consistent visual style</p>
              
              {!imagePreview ? (
                <label className={`flex items-center justify-center w-full p-6 border-2 border-dashed border-primary/30 dark:border-primary/40 rounded-lg bg-primary/5 dark:bg-primary/15 hover:border-primary/50 dark:hover:border-primary/60 hover:bg-primary/10 dark:hover:bg-primary/20 transition-all cursor-pointer group`}>
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
                <div className={`relative rounded-lg overflow-hidden border-2 border-primary/30 dark:border-primary/40 bg-primary/5 dark:bg-primary/15 p-3`}>
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
                <Moon className="w-4 h-4 text-primary animate-float-slow" />
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
                className="text-base h-12 transition-all duration-200 focus:ring-2 focus:ring-primary/30 focus:border-primary/50"
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
                  {VIDEO_LENGTHS.map((len) => {
                    const tierMaxLength = user?.membershipTier 
                      ? MEMBERSHIP_TIERS[user.membershipTier as MembershipTier].maxLength 
                      : MEMBERSHIP_TIERS.free.maxLength;
                    const isLocked = len > tierMaxLength;
                    return (
                      <Button
                        key={len}
                        type="button"
                        size="sm"
                        variant={length === len ? "default" : "outline"}
                        onClick={() => setLength(len)}
                        disabled={generateVideoMutation.isPending || isLocked}
                        className={`flex-1 ${length === len ? "moon-glow" : ""}`}
                        data-testid={`button-length-${len}`}
                        title={isLocked ? `Upgrade to unlock ${len}s videos` : ""}
                      >
                        {len}s
                        {isLocked && <Zap className="w-3 h-3 ml-1" />}
                      </Button>
                    );
                  })}
                </div>
              </div>

              {/* Style */}
              <div className="space-y-3 relative">
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
              <div className="grid grid-cols-2 gap-3">
                {[
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
              disabled={isGenerating || !prompt.trim() || isProcessingImage}
              className="w-full relative overflow-hidden h-12 md:h-14 bg-gradient-to-r from-primary to-secondary moon-glow text-white transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] flex flex-col items-center justify-center"
              data-testid="button-generate"
            >
              {isGenerating ? (
                <div className="flex flex-col items-center justify-center w-full space-y-1">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="animate-pulse">{generationStatus || `Generating... (${generationTimer}s)`}</span>
                  </div>
                  <div className="w-48 h-1 bg-white/20 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-white transition-all duration-500 ease-out"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <p className="text-[10px] opacity-70">{progressPercent}% complete</p>
                </div>
              ) : isProcessingImage ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Processing image...
                </>
              ) : (
                <>
                  <Wand2 className="w-5 h-5 mr-2 transition-transform group-hover:rotate-12" />
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
        {(generateVideoMutation.isError || (generationStatus.startsWith("Error:") && !isGenerating)) && (
          <div className="mt-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-3 animate-in" data-testid="error-message">
            <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm md:text-base text-destructive font-medium">
                Failed to generate video
              </p>
              <p className="text-xs md:text-sm text-destructive/80 mt-1">
                {generationStatus.startsWith("Error:") 
                  ? generationStatus.replace("Error: ", "") 
                  : (generateVideoMutation.error?.message || "Please check your input and try again.")}
              </p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isGenerating && (
          <div className="mt-12 flex flex-col items-center justify-center space-y-6 animate-fade-in-up" data-testid="loading-state">
            <div className="relative">
              <div className="w-20 h-20 border-4 border-primary/20 dark:border-primary/30 rounded-full animate-pulse-glow"></div>
              <div className="w-20 h-20 border-4 border-primary border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Moon className="w-8 h-8 text-primary/60 animate-float" />
              </div>
            </div>
            <div className="text-center space-y-2">
              <p className="text-lg text-muted-foreground font-medium">
                {generationStatus || "Creating your cosmic masterpiece..."}
              </p>
              <p className="text-sm text-muted-foreground/70">
                {generationTimer}s elapsed • {progressPercent}% complete
              </p>
            </div>
            <div className="w-64 h-2 bg-primary/20 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-500 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex gap-1">
              <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 rounded-full bg-secondary animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}

        {/* Video Display */}
        {videoUrl && !isGenerating && (
          <div className="mt-12 flex justify-center animate-fade-in-scale" data-testid="video-container">
            <div className="relative w-full max-w-2xl space-y-4">
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-primary/30 via-secondary/20 to-primary/30 rounded-2xl blur-lg opacity-60 group-hover:opacity-80 transition-opacity duration-300" />
                <div className="relative overflow-hidden rounded-xl border-2 border-primary/20 dark:border-primary/30 shadow-2xl bg-black aspect-video">
                  {isVideo(videoUrl) ? (
                    <video
                      src={videoUrl}
                      controls
                      autoPlay
                      loop
                      className="w-full h-full object-contain"
                      data-testid="video-player"
                    />
                  ) : (
                    <img
                      src={videoUrl}
                      className="w-full h-full object-contain"
                      alt="Generated cosmic vision"
                    />
                  )}
                  {/* Lunara Watermark - Always show on generated results */}
                </div>
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
        <div className="w-full max-w-3xl mx-auto mt-12 md:mt-16 px-4 space-y-12">
          <div className="space-y-4">
            <button
              onClick={() => setShowPresets(!showPresets)}
              className="flex items-center justify-between w-full group p-3 -m-3 rounded-xl hover:bg-accent/50 dark:hover:bg-accent/30 transition-all duration-200"
              data-testid="button-toggle-presets"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary group-hover:animate-wiggle transition-transform" />
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
                    className="text-left p-3.5 rounded-xl bg-card/80 dark:bg-card border border-card-border/80 dark:border-card-border hover:border-primary/40 dark:hover:border-primary/50 hover:bg-card hover:shadow-md dark:hover:shadow-lg transition-all duration-200 disabled:opacity-50 animate-fade-in-up group/preset"
                    style={{ animationDelay: `${index * 60}ms` }}
                    data-testid="button-preset-prompt"
                  >
                    <p className="text-xs md:text-sm text-foreground line-clamp-2 group-hover/preset:text-primary/90 dark:group-hover/preset:text-primary transition-colors">
                      {presetPrompt}
                    </p>
                    {copiedPreset === presetPrompt ? (
                      <div className="flex items-center gap-1.5 mt-2.5 text-primary">
                        <Check className="w-3.5 h-3.5 animate-scale-pulse" />
                        <span className="text-xs font-medium">Loaded</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 mt-2.5 text-muted-foreground group-hover/preset:text-primary/70 transition-colors">
                        <Copy className="w-3 h-3 group-hover/preset:scale-110 transition-transform" />
                        <span className="text-xs">Click to use</span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Featured Examples Section */}
          <div className="space-y-5 border-t border-primary/20 dark:border-primary/30 pt-8">
            <div className="flex items-start gap-3 group animate-fade-in-up" style={{ animationDelay: '200ms' }}>
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/15 dark:from-primary/30 dark:to-secondary/20 shadow-md group-hover:shadow-lg transition-all duration-300 group-hover:scale-110 flex-shrink-0 animate-float-slow">
                <Sparkles className="w-5 h-5 md:w-6 md:h-6 text-primary fill-primary/30 dark:fill-primary/40" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent">
                  Featured ASMR Examples
                </h2>
                <p className="text-xs md:text-sm text-muted-foreground mt-1 font-medium">
                  Explore these cosmic soundscapes to inspire your creations
                </p>
              </div>
            </div>

            {/* Example Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
              {EXAMPLE_VIDEOS.map((example, index) => {
                const IconComponent = example.icon;
                return (
                  <div
                    key={example.id}
                    className="group relative h-64 overflow-hidden rounded-xl transition-all duration-300 hover:scale-105 cursor-pointer border border-white/20 dark:border-white/10"
                    style={{
                      animation: `fadeInUp 0.6s ease-out ${index * 120}ms both`,
                    }}
                    data-testid={`example-video-${example.id}`}
                  >
                    {/* Video Background */}
                    <div className="absolute inset-0 z-0">
                      <video
                        src={example.videoUrl}
                        autoPlay
                        muted
                        loop
                        playsInline
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Background Overlay */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${example.gradient} opacity-40 group-hover:opacity-30 transition-opacity duration-300 z-10`} />
                    
                    {/* Animated Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent group-hover:from-black/95 transition-all duration-300 z-20" />

                    {/* Shine Effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-full group-hover:translate-x-0 transition-transform duration-700 opacity-0 group-hover:opacity-100 z-30" />

                    {/* Content */}
                    <div className="relative h-full flex flex-col justify-between p-5 md:p-6 z-40">
                      <div className="flex items-start justify-between gap-3">
                        <div className="p-3 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 group-hover:bg-white/20 transition-all duration-300 shadow-xl flex-shrink-0">
                          <IconComponent className="w-5 h-5 md:w-6 md:h-6 text-white drop-shadow-lg" />
                        </div>
                        <div className={`px-2.5 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-[10px] font-bold uppercase tracking-wider shadow-lg flex-shrink-0`}>
                          Featured
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <h3 className="text-lg md:text-xl font-bold text-white drop-shadow-lg leading-tight line-clamp-1">
                          {example.title}
                        </h3>
                        <p className="text-[10px] md:text-xs text-white/80 line-clamp-2 drop-shadow-md leading-relaxed font-medium">
                          {example.description}
                        </p>
                      </div>

                      {/* Play Indicator */}
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-0.5 bg-white/20 rounded-full overflow-hidden">
                          <div className="h-full bg-white/60 w-1/3 animate-shimmer" />
                        </div>
                        <Play className="w-4 h-4 text-white fill-white drop-shadow-lg" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}


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
