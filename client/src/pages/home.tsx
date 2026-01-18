import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { Sparkles, AlertCircle, History, Loader2, Moon, Zap, Wand2, Copy, Check, Image as ImageIcon, X, Upload, Search, Crown, Star, Play, Cloud, Wind, ChevronRight, Bell } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Link, useLocation } from "wouter";
import MoonMenu from "@/components/moon-menu";
import { useConditionalToast } from "@/hooks/useConditionalToast";
import { VIDEO_LENGTHS, DEFAULT_VIDEO_LENGTH, MEMBERSHIP_TIERS, type VideoJobInitResponse, type VideoJobStatusResponse, type ErrorResponse, type FrontendUser, type MembershipTier } from "@shared/schema";
import { imageToBase64, compressImage, validateImageFile, formatFileSize } from "@/lib/imageUtils";
import { useWebNotifications } from "@/hooks/useWebNotifications";
import { CosmicNotification } from "@/components/cosmic-notification";


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
  const { permission, requestPermission, sendNotification, isSupported } = useWebNotifications();
  const [showCosmicNotify, setShowCosmicNotify] = useState(false);
  const [notifyConfig, setNotifyConfig] = useState({ title: "", description: "" });

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

  const [generationTimer, setGenerationTimer] = useState<number>(0);
  const [generationProgress, setGenerationProgress] = useState<number>(0);
  const [generationStatus, setGenerationStatus] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentJobId, setCurrentJobId] = useState<number | null>(null);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  const { data: user } = useQuery<FrontendUser>({
    queryKey: ["/api/auth/me"],
    queryFn: async () => {
      const response = await fetch("/api/auth/me");
      if (!response.ok) throw new Error("Not authenticated");
      return response.json();
    },
  });

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  }, []);

  const getStatusMessage = useCallback((status: string, progress: number): string => {
    switch (status) {
      case "pending": return "Initializing cosmic generator...";
      case "processing": return "Sending prompt to AI...";
      case "polling": return `Generating video... ${progress}%`;
      case "downloading": return "Downloading your cosmic creation...";
      case "completed": return "Video complete!";
      case "failed": return "Generation failed";
      default: return "Processing...";
    }
  }, []);

  const pollJobStatus = useCallback(async (jobId: number) => {
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
        
        // Custom animated notification
        setNotifyConfig({
          title: "Cosmic Vision Manifested!",
          description: "Your video has been successfully generated and is ready for viewing."
        });
        setShowCosmicNotify(true);

        // Phone notification
        sendNotification("Creation Complete!", {
          body: "Your cosmic video is ready to view on Lunara AI.",
          tag: "generation-complete",
        });

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
  }, [generationTimer, getStatusMessage, stopPolling, toast]);

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
  }, [pollJobStatus, isGenerating, videoUrl]);

  useEffect(() => {
    if (currentJobId) {
      localStorage.setItem("lunara_currentJobId", currentJobId.toString());
    } else {
      localStorage.removeItem("lunara_currentJobId");
    }
  }, [currentJobId]);

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
      
      <CosmicNotification
        show={showCosmicNotify}
        onClose={() => setShowCosmicNotify(false)}
        title={notifyConfig.title}
        description={notifyConfig.description}
        onAction={() => {
          if (videoUrl) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          } else {
            setLocation("/gallery");
          }
        }}
        actionText="View Now"
      />

      <div className="w-full max-w-3xl mx-auto space-y-6 md:space-y-10 pt-6 md:pt-12 animate-fade-in-up">
        {/* Notification Permission Request */}
        {isSupported && permission === "default" && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-primary" />
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Want to know when your video is ready? Enable notifications.
              </p>
            </div>
            <Button 
              size="sm" 
              onClick={requestPermission}
              className="bg-primary text-white font-bold rounded-xl"
            >
              Enable
            </Button>
          </motion.div>
        )}

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
                {creationResults.map((result, idx) => (
                  <button
                    key={result.id}
                    onClick={() => {
                      setVideoUrl(result.videoUrl);
                      setPrompt(result.prompt);
                      setShowSearchDropdown(false);
                      setSearchQuery("");
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors text-left ${
                      idx !== 0 ? "border-t border-slate-200/50 dark:border-slate-700/30" : ""
                    }`}
                    data-testid={`button-creation-search-result-${result.id}`}
                  >
                    <div className="w-12 h-12 rounded-lg bg-black/20 overflow-hidden flex-shrink-0 border border-primary/20">
                      {isVideo(result.videoUrl) ? (
                        <video src={result.videoUrl} className="w-full h-full object-cover" />
                      ) : (
                        <img src={result.videoUrl} className="w-full h-full object-cover" alt="" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground dark:text-white line-clamp-2">
                        {result.prompt}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 border-primary/30 text-primary">
                          {result.length}s
                        </Badge>
                        <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 border-secondary/30 text-secondary">
                          {result.aspectRatio}
                        </Badge>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Hero & Preview Section */}
        <div className="relative w-full max-w-2xl mx-auto">
          {isGenerating ? (
            <div className="relative aspect-video rounded-[2.5rem] bg-slate-900/40 backdrop-blur-xl border-4 border-white/10 dark:border-white/5 shadow-2xl flex flex-col items-center justify-center p-8 overflow-hidden moon-glow-lg group" data-testid="status-generating">
              {/* Dynamic light rays */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-secondary/10 opacity-30 group-hover:opacity-50 transition-opacity duration-1000" />
              
              <div className="relative z-10 flex flex-col items-center gap-6 w-full max-w-sm">
                <div className="relative w-24 h-24">
                  <div className="absolute inset-0 rounded-full border-4 border-primary/20 animate-ping" />
                  <div className="absolute inset-0 rounded-full border-4 border-secondary/30 animate-pulse delay-150" />
                  <div className="relative w-full h-full rounded-full bg-gradient-to-br from-primary via-secondary to-primary bg-animate flex items-center justify-center shadow-lg moon-glow">
                    <Loader2 className="w-10 h-10 text-white animate-spin" />
                  </div>
                </div>
                
                <div className="space-y-3 text-center w-full">
                  <h3 className="text-xl font-bold text-white tracking-wide" data-testid="text-generation-status">
                    {generationStatus || "Consulting the Stars..."}
                  </h3>
                  
                  <div className="w-full space-y-2">
                    <div className="flex justify-between text-[10px] uppercase tracking-widest font-bold text-white/50">
                      <span>Cosmic Progress</span>
                      <span>{progressPercent}%</span>
                    </div>
                    <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden border border-white/10 backdrop-blur-md">
                      <div 
                        className="h-full bg-gradient-to-r from-primary via-secondary to-primary bg-animate transition-all duration-1000 moon-glow"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>
                  
                  <p className="text-xs font-medium text-white/40 tracking-wider">
                    {generationTimer}s elapsed in the void
                  </p>
                </div>
              </div>

              {/* Decorative floating particles */}
              <div className="absolute top-10 left-10 w-2 h-2 bg-white/40 rounded-full animate-float blur-sm" />
              <div className="absolute bottom-20 right-15 w-3 h-3 bg-primary/30 rounded-full animate-float-slow blur-md" />
              <div className="absolute top-1/2 right-10 w-1.5 h-1.5 bg-secondary/40 rounded-full animate-float blur-sm" style={{ animationDelay: '1s' }} />
            </div>
          ) : videoUrl ? (
            <div className="relative aspect-video rounded-[2.5rem] bg-black shadow-2xl overflow-hidden border-4 border-white/20 dark:border-white/10 moon-glow-lg animate-fade-in group" data-testid="video-preview-container">
              {isVideo(videoUrl) ? (
                <video
                  src={videoUrl}
                  className="w-full h-full object-contain"
                  autoPlay
                  loop
                  controls
                  playsInline
                  data-testid="video-preview"
                />
              ) : (
                <img
                  src={videoUrl}
                  className="w-full h-full object-contain"
                  alt="Generated content"
                  data-testid="image-preview"
                />
              )}
              
              {/* Action overlay - appears on hover */}
              <div className="absolute top-6 right-6 flex gap-3 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-500">
                <Button 
                  size="icon" 
                  variant="secondary"
                  className="rounded-full w-12 h-12 bg-white/20 hover:bg-white/40 backdrop-blur-xl border border-white/30 transition-all hover-elevate active-elevate-2 shadow-xl"
                  onClick={() => handleDownload(videoUrl, prompt)}
                  title="Download Video"
                  data-testid="button-download"
                >
                  <Upload className="w-5 h-5 text-white -rotate-180" />
                </Button>
                <Button 
                  size="icon" 
                  variant="secondary"
                  className="rounded-full w-12 h-12 bg-white/20 hover:bg-white/40 backdrop-blur-xl border border-white/30 transition-all hover-elevate active-elevate-2 shadow-xl"
                  onClick={() => setVideoUrl(null)}
                  title="Close Preview"
                  data-testid="button-close-preview"
                >
                  <X className="w-5 h-5 text-white" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="relative aspect-video rounded-[2.5rem] bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border-4 border-white/10 dark:border-white/5 shadow-2xl flex flex-col items-center justify-center p-8 overflow-hidden moon-glow-lg group cursor-pointer" onClick={() => document.getElementById('cosmic-input')?.focus()}>
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent opacity-50" />
              
              {/* Animated stars in background */}
              <div className="absolute inset-0 opacity-30 pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-1 h-1 bg-white rounded-full animate-ping" />
                <div className="absolute top-3/4 left-2/3 w-0.5 h-0.5 bg-white rounded-full animate-ping delay-300" />
                <div className="absolute top-1/2 left-1/2 w-1.5 h-1.5 bg-primary rounded-full animate-pulse blur-sm" />
              </div>

              <div className="relative z-10 flex flex-col items-center gap-6 text-center max-w-md">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 via-white/10 to-secondary/20 backdrop-blur-md flex items-center justify-center border border-white/20 group-hover:scale-110 transition-transform duration-700 shadow-inner">
                  <Sparkles className="w-10 h-10 text-primary animate-pulse" />
                </div>
                <div className="space-y-3">
                  <h2 className="text-3xl font-bold text-white tracking-tight">Cosmic Generator</h2>
                  <p className="text-sm text-white/50 leading-relaxed font-medium">
                    Your vision is but a prompt away.<br />
                    Enter your cosmic dreams below to begin.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input Section */}
        <div className="space-y-6 md:space-y-8">
          <Card className="p-6 md:p-8 rounded-[2.5rem] bg-white/70 dark:bg-slate-950/40 backdrop-blur-3xl border-2 border-white/50 dark:border-white/5 shadow-2xl animate-fade-in-up moon-glow-sm">
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <Label htmlFor="cosmic-input" className="text-base font-bold text-foreground flex items-center gap-2">
                    <Zap className="w-4 h-4 text-primary" />
                    Cosmic Vision
                  </Label>
                  <div className="flex items-center gap-2">
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setShowPresets(!showPresets)}
                      className="text-xs font-bold text-primary hover:bg-primary/10 rounded-full"
                      data-testid="button-toggle-presets"
                    >
                      {showPresets ? "Hide Presets" : "Show Presets"}
                    </Button>
                  </div>
                </div>

                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-primary/30 to-secondary/30 rounded-[1.5rem] blur-lg opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
                  <Input
                    id="cosmic-input"
                    placeholder="Describe a celestial ASMR scene..."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="relative text-base md:text-lg bg-white/80 dark:bg-slate-900/60 border-2 border-slate-200/50 dark:border-slate-800/50 rounded-2xl h-16 px-6 focus:border-primary/50 transition-all duration-300 font-medium"
                    disabled={isGenerating}
                    data-testid="input-cosmic-prompt"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    {prompt && (
                      <button 
                        type="button"
                        onClick={() => setPrompt("")}
                        className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Preset Prompts Dropdown */}
                {showPresets && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
                    {PRESET_PROMPTS.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handlePresetClick(preset)}
                        className="p-3 text-left text-xs font-medium bg-white/50 dark:bg-slate-800/30 hover:bg-primary/10 border border-slate-200/40 dark:border-slate-700/40 rounded-xl transition-all hover-elevate group flex items-center gap-2"
                        data-testid={`button-preset-${idx}`}
                      >
                        <Star className={`w-3 h-3 text-primary transition-all ${copiedPreset === preset ? "fill-primary scale-125" : "opacity-40"}`} />
                        <span className="flex-1 truncate">{preset}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Advanced Controls Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                <div className="space-y-6">
                  <Label className="text-sm font-bold text-foreground flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-primary" />
                    Visual Guidance
                  </Label>
                  
                  {!imagePreview ? (
                    <div 
                      className={`relative aspect-video rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 flex flex-col items-center justify-center gap-3 transition-all duration-300 hover:border-primary/50 group cursor-pointer ${isProcessingImage ? 'opacity-50 pointer-events-none' : ''}`}
                      onClick={() => document.getElementById('image-upload')?.click()}
                      data-testid="image-upload-zone"
                    >
                      <div className="p-4 rounded-full bg-white dark:bg-slate-800 shadow-md group-hover:scale-110 transition-transform duration-500">
                        {isProcessingImage ? (
                          <Loader2 className="w-6 h-6 text-primary animate-spin" />
                        ) : (
                          <ImageIcon className="w-6 h-6 text-slate-400 group-hover:text-primary transition-colors" />
                        )}
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-bold text-slate-600 dark:text-slate-400">Reference Image</p>
                        <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">Optional guide</p>
                      </div>
                      <input 
                        id="image-upload" 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={handleImageSelect}
                        disabled={isGenerating || isProcessingImage}
                      />
                    </div>
                  ) : (
                    <div className="relative aspect-video rounded-3xl overflow-hidden border-2 border-primary/30 group animate-in zoom-in-95 duration-300">
                      <img src={imagePreview} className="w-full h-full object-cover" alt="Preview" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                        <Button 
                          type="button" 
                          variant="destructive" 
                          size="icon" 
                          className="rounded-full w-12 h-12 shadow-xl hover-elevate"
                          onClick={handleRemoveImage}
                          data-testid="button-remove-image"
                        >
                          <X className="w-6 h-6" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-6">
                  <Label className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Wand2 className="w-4 h-4 text-primary" />
                    Cosmic Parameters
                  </Label>
                  
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Duration</p>
                      <div className="grid grid-cols-2 gap-3" data-testid="length-selection">
                        {VIDEO_LENGTHS.map((len) => (
                          <button
                            key={len}
                            type="button"
                            onClick={() => setLength(len)}
                            disabled={isGenerating}
                            className={`py-3 px-4 rounded-xl text-sm font-bold transition-all duration-300 border-2 ${
                              length === len 
                                ? "bg-primary text-white border-primary shadow-lg moon-glow" 
                                : "bg-white/50 dark:bg-slate-900/40 text-slate-600 dark:text-slate-400 border-slate-200/50 dark:border-slate-800/50 hover:border-primary/30"
                            } ${isGenerating ? 'opacity-50' : 'hover-elevate active-elevate-2'}`}
                            data-testid={`button-length-${len}`}
                          >
                            {len} Seconds
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Format</p>
                      <div className="grid grid-cols-2 gap-3" data-testid="aspect-ratio-selection">
                        {["16:9", "9:16"].map((ratio) => (
                          <button
                            key={ratio}
                            type="button"
                            onClick={() => setAspectRatio(ratio)}
                            disabled={isGenerating}
                            className={`py-3 px-4 rounded-xl text-sm font-bold transition-all duration-300 border-2 ${
                              aspectRatio === ratio 
                                ? "bg-secondary text-white border-secondary shadow-lg moon-glow-secondary" 
                                : "bg-white/50 dark:bg-slate-900/40 text-slate-600 dark:text-slate-400 border-slate-200/50 dark:border-slate-800/50 hover:border-secondary/30"
                            } ${isGenerating ? 'opacity-50' : 'hover-elevate active-elevate-2'}`}
                            data-testid={`button-aspect-ratio-${ratio}`}
                          >
                            <div className="flex flex-col items-center gap-1">
                              <span>{ratio === "16:9" ? "YouTube" : "TikTok"}</span>
                              <span className="text-[10px] opacity-70 uppercase tracking-widest font-medium">
                                {ratio} {ratio === "16:9" ? "Landscape" : "Portrait"}
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-6">
                <Button
                  type="submit"
                  disabled={isGenerating || !prompt.trim()}
                  className="w-full h-16 rounded-2xl text-lg font-bold bg-gradient-to-r from-primary via-secondary to-primary bg-animate text-white shadow-2xl hover:shadow-primary/30 dark:hover:shadow-primary/50 transition-all duration-500 hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50 disabled:scale-100 moon-glow group overflow-hidden relative"
                  data-testid="button-generate"
                >
                  <div className="relative z-10 flex items-center justify-center gap-3">
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-6 h-6 animate-spin" />
                        Consulting the Void...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-6 h-6 group-hover:animate-pulse" />
                        Manifest Cosmic Vision
                      </>
                    )}
                  </div>
                  {/* Internal button shine */}
                  <div className="absolute top-0 -left-[100%] w-1/2 h-full bg-white/20 skew-x-[45deg] group-hover:left-[150%] transition-all duration-1000 ease-in-out pointer-events-none" />
                </Button>
              </div>
            </form>
          </Card>
        </div>

        {/* User Stats Card - Integrated at bottom of input area */}
        {user && (
          <div className="animate-fade-in-up" style={{ animationDelay: '400ms' }}>
            <Card className="px-6 py-4 rounded-3xl bg-white/50 dark:bg-slate-950/20 backdrop-blur-xl border border-white/40 dark:border-white/5 flex items-center justify-between group hover:border-primary/30 transition-all duration-300">
              <div className="flex items-center gap-4">
                <Avatar className="w-10 h-10 border-2 border-primary/20 group-hover:border-primary/50 transition-colors">
                  <AvatarImage src={user.profileImageUrl || undefined} alt={user.username || 'User'} />
                  <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white text-xs font-bold">
                    {user.username?.slice(0, 2).toUpperCase() || 'LU'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-bold text-foreground dark:text-white">Welcome back, {user.firstName || user.username}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge className={`px-2 py-0 text-[10px] font-bold tracking-wider uppercase ${
                      user.membershipTier === 'premium' ? 'bg-gradient-to-r from-primary to-secondary' : 
                      user.membershipTier === 'pro' ? 'bg-primary/80' : 'bg-slate-400/50'
                    }`}>
                      {user.membershipTier}
                    </Badge>
                  </div>
                </div>
              </div>
              <Link 
                href="/membership"
                className="flex items-center h-8 px-3 text-xs font-bold text-primary hover:bg-primary/10 rounded-xl transition-colors group/btn"
              >
                Upgrade Plan
                <ChevronRight className="w-3 h-3 ml-1 group-hover/btn:translate-x-1 transition-transform" />
              </Link>
            </Card>
          </div>
        )}

        {/* Featured Gallery Section */}
        <div className="pt-12 md:pt-20 space-y-12 animate-fade-in-up" style={{ animationDelay: '500ms' }}>
          <div className="text-center space-y-3">
            <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent inline-block">Cosmic Inspiration</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm md:text-base font-medium">Behold creations from the Lunara collective</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10">
            {EXAMPLE_VIDEOS.map((example, idx) => (
              <Card key={example.id} className="group relative bg-slate-900/5 dark:bg-slate-900/20 rounded-[2rem] overflow-hidden border-2 border-white/40 dark:border-white/5 hover:border-primary/40 transition-all duration-500 hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-2 animate-fade-in-up" style={{ animationDelay: `${600 + (idx * 100)}ms` }}>
                <div className="aspect-[4/5] relative bg-slate-950 overflow-hidden">
                  <video
                    src={example.videoUrl}
                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-700"
                    loop
                    muted
                    playsInline
                    autoPlay
                  />
                  
                  {/* Top Badge */}
                  <div className="absolute top-4 left-4 z-10">
                    <Badge className="bg-black/40 backdrop-blur-md border border-white/20 text-white font-bold text-[10px] uppercase tracking-widest px-3 py-1">
                      {example.title}
                    </Badge>
                  </div>

                  {/* Play Indicator - appears on hover */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                    <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-xl border border-white/30 flex items-center justify-center shadow-2xl scale-75 group-hover:scale-100 transition-transform duration-500">
                      <Play className="w-6 h-6 text-white fill-white ml-1" />
                    </div>
                  </div>

                  {/* Bottom Content Overlay */}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/40 to-transparent p-6 translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                    <div className="space-y-4">
                      <p className="text-white text-xs md:text-sm font-medium leading-relaxed line-clamp-2 opacity-0 group-hover:opacity-90 transition-opacity duration-700">
                        {example.description}
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`p-2 rounded-xl bg-gradient-to-br ${example.gradient} shadow-lg`}>
                            <example.icon className="w-3 h-3 text-white" />
                          </div>
                          <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest">ASMR Vibes</span>
                        </div>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className="h-8 px-4 rounded-xl text-[10px] font-bold uppercase tracking-widest bg-white/10 hover:bg-white/20 text-white border border-white/20"
                        >
                          Create
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center pt-10 pb-20 space-y-4 opacity-50">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">Powered by Lunara AI Cosmic Engine v2.0</p>
          <div className="flex items-center justify-center gap-6">
            <Link href="/contact" className="text-xs font-bold text-slate-500 hover:text-primary transition-colors">Support</Link>
            <Link href="/membership" className="text-xs font-bold text-slate-500 hover:text-primary transition-colors">Pricing</Link>
            <Link href="/settings" className="text-xs font-bold text-slate-500 hover:text-primary transition-colors">Privacy</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
