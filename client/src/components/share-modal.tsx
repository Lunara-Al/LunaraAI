import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { VideoWatermark } from "@/components/video-watermark";
import type { UserSettings } from "@shared/schema";
import { 
  Share2, 
  Copy, 
  Check, 
  Download, 
  Loader2,
  Eye,
  X,
  Sparkles,
  Link2,
  Upload,
  Unlink,
  CheckCircle2,
  AlertCircle,
  Crown,
  Hash,
  Plus,
  Moon
} from "lucide-react";
import { SiX, SiFacebook, SiLinkedin, SiReddit, SiWhatsapp, SiTelegram, SiTiktok, SiInstagram, SiYoutube, SiSnapchat } from "react-icons/si";
import type { VideoGeneration, SocialPlatform } from "@shared/schema";
import { Link } from "wouter";

type FrontendUser = {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  membershipTier: string;
};

type ShareModalProps = {
  video: VideoGeneration;
  isOpen: boolean;
  onClose: () => void;
};

type ShareResponse = {
  shareUrl: string;
  token: string;
  videoUrl: string;
  downloadUrl: string;
  platformShareUrls: {
    twitter: string;
    facebook: string;
    linkedin: string;
    reddit: string;
    whatsapp: string;
    telegram: string;
  };
  viewCount: number;
  createdAt: string;
};

type SocialAccount = {
  id: number;
  platform: string;
  displayName: string | null;
  profileImageUrl: string | null;
  isActive: boolean;
  createdAt: string;
};

type UploadState = {
  platform: SocialPlatform;
  status: "idle" | "connecting" | "uploading" | "success" | "error";
  caption: string;
  hashtags: string[];
  jobId?: number;
  postUrl?: string;
  error?: string;
};

const SUGGESTED_HASHTAGS = [
  "ASMR", "CosmicASMR", "LunaraAI", "AIGenerated", "Relaxation",
  "SleepSounds", "Satisfying", "Meditation", "Calming", "Soothing"
];

function CosmicLoader() {
  return (
    <div className="relative flex flex-col items-center justify-center py-16 gap-6">
      <div className="absolute inset-0 overflow-hidden rounded-lg">
        <div className="absolute top-4 left-8 w-2 h-2 rounded-full bg-purple-400/60 animate-pulse" style={{ animationDelay: '0s' }} />
        <div className="absolute top-12 right-12 w-1.5 h-1.5 rounded-full bg-pink-400/50 animate-pulse" style={{ animationDelay: '0.3s' }} />
        <div className="absolute bottom-8 left-16 w-1 h-1 rounded-full bg-purple-300/40 animate-pulse" style={{ animationDelay: '0.6s' }} />
        <div className="absolute top-20 left-1/3 w-1.5 h-1.5 rounded-full bg-pink-300/50 animate-pulse" style={{ animationDelay: '0.9s' }} />
        <div className="absolute bottom-16 right-8 w-2 h-2 rounded-full bg-purple-500/40 animate-pulse" style={{ animationDelay: '1.2s' }} />
        
        <div 
          className="absolute top-6 right-1/4 w-8 h-8 rounded-full opacity-20"
          style={{
            background: 'radial-gradient(circle, rgba(107, 91, 255, 0.4) 0%, transparent 70%)',
            animation: 'cosmicFloat 4s ease-in-out infinite'
          }}
        />
        <div 
          className="absolute bottom-10 left-1/4 w-6 h-6 rounded-full opacity-15"
          style={{
            background: 'radial-gradient(circle, rgba(255, 107, 204, 0.4) 0%, transparent 70%)',
            animation: 'cosmicFloat 5s ease-in-out infinite reverse'
          }}
        />
      </div>
      
      <div className="relative">
        <div 
          className="absolute inset-0 rounded-full opacity-40"
          style={{
            background: 'radial-gradient(circle, rgba(107, 91, 255, 0.6) 0%, rgba(255, 107, 204, 0.3) 50%, transparent 70%)',
            filter: 'blur(12px)',
            animation: 'pulse 2s ease-in-out infinite'
          }}
        />
        <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-sm border border-purple-400/30 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
        </div>
      </div>
      
      <div className="text-center space-y-2">
        <p className="text-foreground font-medium">Creating cosmic share link...</p>
        <p className="text-muted-foreground text-sm">Preparing your video for the universe</p>
      </div>
      
      <style>{`
        @keyframes cosmicFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
      `}</style>
    </div>
  );
}

function CosmicDivider() {
  return (
    <div className="relative flex items-center gap-4 py-2">
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-purple-400/30 to-transparent" />
      <div className="flex items-center gap-2">
        <Sparkles className="w-3 h-3 text-purple-400/60" />
        <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Direct Upload</span>
        <Sparkles className="w-3 h-3 text-pink-400/60" />
      </div>
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-pink-400/30 to-transparent" />
    </div>
  );
}

type PlatformCardProps = {
  platform: SocialPlatform;
  icon: typeof SiTiktok;
  label: string;
  isConnected: boolean;
  isPro: boolean;
  account?: SocialAccount;
  uploadState: UploadState;
  onConnect: () => void;
  onDisconnect: () => void;
  onUpload: () => void;
  onCaptionChange: (caption: string) => void;
  onHashtagsChange: (hashtags: string[]) => void;
  gradientFrom: string;
  gradientTo: string;
  iconColor: string;
  glowColor: string;
};

function PlatformCard({
  platform,
  icon: Icon,
  label,
  isConnected,
  isPro,
  account,
  uploadState,
  onConnect,
  onDisconnect,
  onUpload,
  onCaptionChange,
  onHashtagsChange,
  gradientFrom,
  gradientTo,
  iconColor,
  glowColor,
}: PlatformCardProps) {
  const [showCaption, setShowCaption] = useState(false);
  const [showHashtags, setShowHashtags] = useState(false);
  const [newHashtag, setNewHashtag] = useState("");
  const isLoading = uploadState.status === "connecting" || uploadState.status === "uploading";
  const isSuccess = uploadState.status === "success";
  const isError = uploadState.status === "error";

  const handleAddHashtag = () => {
    const tag = newHashtag.trim().replace(/^#/, "");
    if (tag && !uploadState.hashtags.includes(tag)) {
      onHashtagsChange([...uploadState.hashtags, tag]);
      setNewHashtag("");
    }
  };

  const handleRemoveHashtag = (tag: string) => {
    onHashtagsChange(uploadState.hashtags.filter(t => t !== tag));
  };

  const handleAddSuggested = (tag: string) => {
    if (!uploadState.hashtags.includes(tag)) {
      onHashtagsChange([...uploadState.hashtags, tag]);
    }
  };

  if (!isPro) {
    return (
      <div 
        className="relative p-4 rounded-xl border bg-muted/20 border-muted-foreground/10"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-muted">
              <Icon className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <p className="font-semibold text-sm text-muted-foreground">{label}</p>
              <p className="text-xs text-muted-foreground/70">Pro feature</p>
            </div>
          </div>
          <Badge variant="outline" className="gap-1 text-xs bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-400/30">
            <Crown className="w-3 h-3 text-purple-500" />
            Pro
          </Badge>
        </div>
        <Link href="/membership">
          <Button
            variant="outline"
            size="sm"
            className="w-full mt-3 text-xs border-purple-400/30 hover:bg-purple-500/10"
            data-testid={`button-upgrade-${platform}`}
          >
            <Crown className="w-3 h-3 mr-1.5 text-purple-500" />
            Upgrade to Pro
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div 
      className={`relative p-4 rounded-xl border transition-all duration-300 ${
        isConnected 
          ? `bg-gradient-to-br ${gradientFrom} ${gradientTo} border-primary/30 dark:border-primary/40` 
          : 'bg-muted/30 border-muted-foreground/20'
      }`}
      style={isConnected ? { boxShadow: `0 0 20px ${glowColor}` } : undefined}
    >
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${isConnected ? 'bg-white/20' : 'bg-muted'}`}>
            <Icon className={`w-5 h-5 ${isConnected ? iconColor : 'text-muted-foreground'}`} />
          </div>
          <div>
            <p className={`font-semibold text-sm ${isConnected ? 'text-foreground' : 'text-muted-foreground'}`}>
              {label}
            </p>
            {isConnected && account?.displayName && (
              <p className="text-xs text-muted-foreground truncate max-w-[120px]">
                {account.displayName}
              </p>
            )}
          </div>
        </div>

        {isConnected ? (
          <Badge 
            variant="secondary" 
            className="gap-1 text-xs bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30"
          >
            <CheckCircle2 className="w-3 h-3" />
            Connected
          </Badge>
        ) : (
          <Badge variant="outline" className="text-xs text-muted-foreground">
            Not connected
          </Badge>
        )}
      </div>

      {isConnected ? (
        <div className="space-y-3">
          {showCaption && (
            <Textarea
              placeholder="Add a caption for your post..."
              value={uploadState.caption}
              onChange={(e) => onCaptionChange(e.target.value)}
              className="min-h-[60px] text-sm resize-none bg-white/50 dark:bg-slate-800/50 border-white/30 dark:border-slate-700/50"
              disabled={isLoading || isSuccess}
              data-testid={`textarea-caption-${platform}`}
            />
          )}
          
          {showHashtags && (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-1.5">
                {uploadState.hashtags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="gap-1 text-xs bg-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-500/30"
                  >
                    #{tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveHashtag(tag)}
                      className="ml-0.5 hover:text-red-500 transition-colors"
                      disabled={isLoading || isSuccess}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              
              <div className="flex gap-1.5">
                <Input
                  placeholder="Add hashtag..."
                  value={newHashtag}
                  onChange={(e) => setNewHashtag(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddHashtag())}
                  className="flex-1 h-8 text-xs bg-white/50 dark:bg-slate-800/50 border-white/30 dark:border-slate-700/50"
                  disabled={isLoading || isSuccess}
                  data-testid={`input-hashtag-${platform}`}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={handleAddHashtag}
                  disabled={!newHashtag.trim() || isLoading || isSuccess}
                  className="h-8 px-2"
                >
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
              
              <div className="flex flex-wrap gap-1">
                {SUGGESTED_HASHTAGS.filter(tag => !uploadState.hashtags.includes(tag)).slice(0, 5).map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleAddSuggested(tag)}
                    disabled={isLoading || isSuccess}
                    className="px-2 py-0.5 text-[10px] rounded-full bg-muted/50 text-muted-foreground hover:bg-purple-500/20 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                  >
                    +{tag}
                  </button>
                ))}
              </div>
            </div>
          )}

          {isSuccess && uploadState.postUrl && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-green-500/10 border border-green-500/30">
              <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
              <span className="text-xs text-green-600 dark:text-green-400 flex-1">Posted successfully!</span>
              <a 
                href={uploadState.postUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline font-medium"
              >
                View
              </a>
            </div>
          )}

          {isError && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-red-500/10 border border-red-500/30">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <span className="text-xs text-red-600 dark:text-red-400">{uploadState.error || "Upload failed"}</span>
            </div>
          )}

          <div className="flex gap-2 flex-wrap">
            {!isSuccess && (
              <>
                {!showCaption && (
                  <Button
                    onClick={() => setShowCaption(true)}
                    variant="secondary"
                    size="sm"
                    className="flex-1 min-w-[80px] text-xs"
                    disabled={isLoading}
                    data-testid={`button-add-caption-${platform}`}
                  >
                    Caption
                  </Button>
                )}
                {!showHashtags && (
                  <Button
                    onClick={() => setShowHashtags(true)}
                    variant="secondary"
                    size="sm"
                    className="flex-1 min-w-[80px] text-xs"
                    disabled={isLoading}
                    data-testid={`button-add-hashtags-${platform}`}
                  >
                    <Hash className="w-3 h-3 mr-1" />
                    Hashtags
                  </Button>
                )}
                <Button
                  onClick={onUpload}
                  size="sm"
                  className={`flex-1 text-xs bg-gradient-to-r ${gradientFrom.replace('/10', '')} ${gradientTo.replace('/10', '')} text-white`}
                  disabled={isLoading}
                  data-testid={`button-upload-${platform}`}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                      {uploadState.status === "connecting" ? "Connecting..." : "Uploading..."}
                    </>
                  ) : (
                    <>
                      <Upload className="w-3 h-3 mr-1.5" />
                      Upload
                    </>
                  )}
                </Button>
              </>
            )}
            <Button
              onClick={onDisconnect}
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground hover:text-destructive"
              disabled={isLoading}
              data-testid={`button-disconnect-${platform}`}
            >
              <Unlink className="w-3 h-3" />
            </Button>
          </div>
        </div>
      ) : (
        <Button
          onClick={onConnect}
          variant="outline"
          size="sm"
          className="w-full text-xs"
          disabled={isLoading}
          data-testid={`button-connect-${platform}`}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              <Link2 className="w-3 h-3 mr-1.5" />
              Connect {label}
            </>
          )}
        </Button>
      )}
    </div>
  );
}

export function ShareModal({ video, isOpen, onClose }: ShareModalProps) {
  const { toast } = useToast();
  const [shareData, setShareData] = useState<ShareResponse | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [uploadStates, setUploadStates] = useState<Record<SocialPlatform, UploadState>>({
    tiktok: { platform: "tiktok", status: "idle", caption: "", hashtags: [] },
    instagram: { platform: "instagram", status: "idle", caption: "", hashtags: [] },
    youtube: { platform: "youtube", status: "idle", caption: "", hashtags: [] },
  });

  const { data: user } = useQuery<FrontendUser>({
    queryKey: ["/api/auth/me"],
  });

  const { data: settings } = useQuery<UserSettings>({
    queryKey: ["/api/settings"],
  });

  const isPro = user?.membershipTier === "pro" || user?.membershipTier === "premium";
  // Default to showing watermark; only hide when settings explicitly set showWatermark to 0
  const shouldShowWatermark = !isPro || settings?.showWatermark !== 0;

  const { data: socialAccounts, refetch: refetchAccounts } = useQuery<{ accounts: SocialAccount[] }>({
    queryKey: ["/api/social/accounts"],
    enabled: isOpen && isPro,
  });

  useEffect(() => {
    if (isOpen) {
      setUploadStates({
        tiktok: { platform: "tiktok", status: "idle", caption: "", hashtags: [] },
        instagram: { platform: "instagram", status: "idle", caption: "", hashtags: [] },
        youtube: { platform: "youtube", status: "idle", caption: "", hashtags: [] },
      });
      setCopied(false);
    }
  }, [isOpen]);

  const createShareMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/videos/${video.id}/share`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create share link");
      }
      return response.json();
    },
    onSuccess: (data: ShareResponse) => {
      setShareData(data);
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Share Failed",
        description: error.message,
      });
    },
  });

  const connectMutation = useMutation({
    mutationFn: async (platform: SocialPlatform) => {
      const response = await apiRequest("POST", `/api/social/connect/${platform}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to connect");
      }
      return response.json();
    },
    onSuccess: (data, platform) => {
      setUploadStates(prev => ({
        ...prev,
        [platform]: { ...prev[platform], status: "idle" }
      }));
      refetchAccounts();
      toast({
        title: "Account Connected",
        description: data.message,
      });
    },
    onError: (error: Error, platform) => {
      setUploadStates(prev => ({
        ...prev,
        [platform]: { ...prev[platform], status: "error", error: error.message }
      }));
      toast({
        variant: "destructive",
        title: "Connection Failed",
        description: error.message,
      });
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: async (accountId: number) => {
      const response = await apiRequest("DELETE", `/api/social/accounts/${accountId}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to disconnect");
      }
      return response.json();
    },
    onSuccess: () => {
      refetchAccounts();
      toast({
        title: "Account Disconnected",
        description: "Social account has been disconnected",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Disconnect Failed",
        description: error.message,
      });
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ platform, caption, hashtags }: { platform: SocialPlatform; caption?: string; hashtags?: string[] }) => {
      const response = await apiRequest("POST", "/api/social/upload", {
        videoId: video.id,
        platform,
        caption,
        hashtags: hashtags?.join(","),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to upload");
      }
      return response.json();
    },
    onSuccess: (data, { platform }) => {
      setUploadStates(prev => ({
        ...prev,
        [platform]: { ...prev[platform], status: "uploading", jobId: data.jobId }
      }));
      pollUploadStatus(data.jobId, platform);
    },
    onError: (error: Error, { platform }) => {
      setUploadStates(prev => ({
        ...prev,
        [platform]: { ...prev[platform], status: "error", error: error.message }
      }));
      toast({
        variant: "destructive",
        title: "Upload Failed",
        description: error.message,
      });
    },
  });

  const pollUploadStatus = async (jobId: number, platform: SocialPlatform) => {
    let attempts = 0;
    const maxAttempts = 30;
    
    const poll = async () => {
      try {
        const response = await apiRequest("GET", `/api/social/upload/${jobId}/status`);
        if (!response.ok) throw new Error("Failed to fetch status");
        
        const data = await response.json();
        
        if (data.status === "completed") {
          setUploadStates(prev => ({
            ...prev,
            [platform]: { 
              ...prev[platform], 
              status: "success", 
              postUrl: data.externalPostUrl 
            }
          }));
          toast({
            title: "Upload Complete",
            description: `Video posted to ${platform} successfully!`,
          });
          return;
        } else if (data.status === "failed") {
          setUploadStates(prev => ({
            ...prev,
            [platform]: { 
              ...prev[platform], 
              status: "error", 
              error: data.errorMessage || "Upload failed"
            }
          }));
          return;
        }
        
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 1000);
        } else {
          setUploadStates(prev => ({
            ...prev,
            [platform]: { 
              ...prev[platform], 
              status: "error", 
              error: "Upload timed out" 
            }
          }));
        }
      } catch (error) {
        setUploadStates(prev => ({
          ...prev,
          [platform]: { 
            ...prev[platform], 
            status: "error", 
            error: "Failed to check upload status" 
          }
        }));
      }
    };
    
    setTimeout(poll, 1000);
  };

  const handleOpen = () => {
    if (!shareData && !createShareMutation.isPending) {
      createShareMutation.mutate();
    }
  };

  useEffect(() => {
    if (isOpen && !shareData && !createShareMutation.isPending && !createShareMutation.isError) {
      handleOpen();
    }
  }, [isOpen]);

  const handleCopyLink = async () => {
    if (shareData?.shareUrl) {
      try {
        await navigator.clipboard.writeText(shareData.shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast({
          title: "Link Copied",
          description: "Share link copied to clipboard!",
        });
      } catch (err) {
        toast({
          variant: "destructive",
          title: "Copy Failed",
          description: "Failed to copy link to clipboard",
        });
      }
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share && shareData) {
      try {
        await navigator.share({
          title: `Cosmic ASMR: ${video.prompt.substring(0, 50)}`,
          text: video.prompt,
          url: shareData.shareUrl,
        });
      } catch (err) {
        console.log("Share cancelled");
      }
    }
  };

  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    if (isDownloading) return;
    
    setIsDownloading(true);
    try {
      const response = await fetch(video.videoUrl);
      if (!response.ok) throw new Error("Failed to fetch video");
      
      const reader = response.body?.getReader();
      const chunks = [];
      
      if (reader) {
        while(true) {
          const {done, value} = await reader.read();
          if (done) break;
          chunks.push(value);
        }
      }

      const blob = new Blob(chunks, { type: 'video/mp4' });

      // Desktop & Fallback: Traditional Download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = 'none';
      a.href = url;
      const safePrompt = video.prompt.slice(0, 30).replace(/[^a-z0-9]/gi, '-').toLowerCase();
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
        title: "Download failed",
        description: "Please try again later",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleConnect = (platform: SocialPlatform) => {
    setUploadStates(prev => ({
      ...prev,
      [platform]: { ...prev[platform], status: "connecting" }
    }));
    connectMutation.mutate(platform);
  };

  const handleDisconnect = (platform: SocialPlatform) => {
    const account = socialAccounts?.accounts.find(a => a.platform === platform);
    if (account) {
      disconnectMutation.mutate(account.id);
    }
  };

  const handleUpload = (platform: SocialPlatform) => {
    setUploadStates(prev => ({
      ...prev,
      [platform]: { ...prev[platform], status: "uploading" }
    }));
    uploadMutation.mutate({ 
      platform, 
      caption: uploadStates[platform].caption || undefined,
      hashtags: uploadStates[platform].hashtags.length > 0 ? uploadStates[platform].hashtags : undefined,
    });
  };

  const handleCaptionChange = (platform: SocialPlatform, caption: string) => {
    setUploadStates(prev => ({
      ...prev,
      [platform]: { ...prev[platform], caption }
    }));
  };

  const handleHashtagsChange = (platform: SocialPlatform, hashtags: string[]) => {
    setUploadStates(prev => ({
      ...prev,
      [platform]: { ...prev[platform], hashtags }
    }));
  };

  const handleClose = () => {
    onClose();
    setShareData(null);
    setCopied(false);
    setUploadStates({
      tiktok: { platform: "tiktok", status: "idle", caption: "", hashtags: [] },
      instagram: { platform: "instagram", status: "idle", caption: "", hashtags: [] },
      youtube: { platform: "youtube", status: "idle", caption: "", hashtags: [] },
    });
  };

  const getAccountByPlatform = (platform: SocialPlatform) => {
    return socialAccounts?.accounts.find(a => a.platform === platform);
  };

  const socialPlatforms = [
    { key: 'twitter', icon: SiX, label: 'X', color: 'hover:shadow-[0_0_20px_rgba(0,0,0,0.3)] dark:hover:shadow-[0_0_20px_rgba(255,255,255,0.2)]' },
    { key: 'facebook', icon: SiFacebook, label: 'Facebook', iconColor: 'text-blue-600', color: 'hover:shadow-[0_0_20px_rgba(37,99,235,0.4)]' },
    { key: 'whatsapp', icon: SiWhatsapp, label: 'WhatsApp', iconColor: 'text-green-500', color: 'hover:shadow-[0_0_20px_rgba(34,197,94,0.4)]' },
    { key: 'telegram', icon: SiTelegram, label: 'Telegram', iconColor: 'text-blue-500', color: 'hover:shadow-[0_0_20px_rgba(59,130,246,0.4)]' },
    { key: 'snapchat', icon: SiSnapchat, label: 'Snapchat', iconColor: 'text-yellow-400', color: 'hover:shadow-[0_0_20px_rgba(250,204,21,0.4)]' },
    { key: 'reddit', icon: SiReddit, label: 'Reddit', iconColor: 'text-orange-600', color: 'hover:shadow-[0_0_20px_rgba(234,88,12,0.4)]' },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent 
        className="sm:max-w-lg glass-card border-purple-400/20 dark:border-purple-500/30 overflow-hidden max-h-[90vh] flex flex-col p-0 animate-fade-in-scale duration-300" 
        data-testid="share-modal"
      >
        <div className="p-6 pb-0">
          <DialogHeader className="relative">
            <DialogTitle className="flex items-center gap-3 text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-500 dark:from-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
              <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-400/30">
                <Share2 className="w-5 h-5 text-purple-500 dark:text-purple-400" />
              </div>
              Share Your Creation
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Share your cosmic video with the world or upload directly to social platforms
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex-1 overflow-y-auto p-6 pt-4 custom-scrollbar">
          {createShareMutation.isPending ? (
            <CosmicLoader />
          ) : shareData ? (
            <div className="space-y-5 animate-in fade-in-0 slide-in-from-bottom-4 duration-500 pb-2">
              <div className="relative rounded-xl overflow-hidden group">
                <div 
                  className="absolute -inset-1 rounded-xl opacity-75 blur-sm transition-opacity duration-300 group-hover:opacity-100"
                  style={{
                    background: 'linear-gradient(135deg, rgba(107, 91, 255, 0.5) 0%, rgba(255, 107, 204, 0.5) 100%)'
                  }}
                />
                <div 
                  className="relative aspect-video rounded-xl overflow-hidden bg-black/10 dark:bg-black/30 cursor-pointer"
                  onClick={() => setPreviewOpen(true)}
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
                        muted
                        loop
                        autoPlay
                        playsInline
                      />
                    ) : (
                      <img
                        src={video.videoUrl}
                        className="w-full h-full object-cover"
                        alt={video.prompt}
                      />
                    );
                  })()}
                  
                  {/* Lunara Watermark */}
                  <VideoWatermark showWatermark={shouldShowWatermark} size="sm" position="bottom-right" />
                  
                  {/* Click to preview overlay */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 bg-black/30">
                    <div className="p-3 rounded-full bg-black/40 backdrop-blur-md border border-white/20 transform scale-90 group-hover:scale-100 transition-transform duration-300">
                      <Eye className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  
                  <div 
                    className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-700"
                    style={{
                      background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.15) 45%, rgba(255,255,255,0.25) 50%, rgba(255,255,255,0.15) 55%, transparent 60%)',
                      animation: 'shimmer 3s ease-in-out infinite',
                      backgroundSize: '200% 100%'
                    }}
                  />
                  
                  {shareData.viewCount > 0 && (
                    <Badge 
                      variant="secondary" 
                      className="absolute top-3 right-3 gap-1.5 bg-black/50 dark:bg-black/60 backdrop-blur-md border-white/20 text-white shadow-lg"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      {shareData.viewCount} {shareData.viewCount === 1 ? 'view' : 'views'}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-medium text-foreground line-clamp-2">
                  {video.prompt}
                </p>
                
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    <Link2 className="w-3.5 h-3.5" />
                    Share Link
                  </label>
                  <div className="flex gap-2 p-1.5 rounded-lg bg-purple-500/5 dark:bg-purple-500/10 border border-purple-400/20">
                    <Input
                      value={shareData.shareUrl}
                      readOnly
                      className="flex-1 text-sm border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                      data-testid="input-share-url"
                    />
                    <Button
                      onClick={handleCopyLink}
                      variant={copied ? "default" : "secondary"}
                      size="sm"
                      className={`min-w-[80px] transition-all duration-300 ${copied ? 'bg-green-500 hover:bg-green-600 text-white' : ''}`}
                      data-testid="button-copy-share-link"
                    >
                      {copied ? (
                        <>
                          <Check className="w-4 h-4 mr-1.5" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 mr-1.5" />
                          Copy
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button 
                  onClick={handleDownload} 
                  variant="default" 
                  disabled={isDownloading}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 dark:from-purple-500 dark:to-purple-600 dark:hover:from-purple-600 dark:hover:to-purple-700 relative overflow-hidden group"
                  data-testid="button-modal-download"
                >
                  <div className={`flex items-center justify-center transition-all duration-300 ${isDownloading ? 'opacity-0 scale-90' : 'opacity-100 scale-100'}`}>
                    <Download className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
                    Download
                  </div>
                  {isDownloading && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Loader2 className="w-5 h-5 animate-spin text-white" />
                    </div>
                  )}
                </Button>
                
                {typeof navigator !== "undefined" && typeof navigator.share !== "undefined" && (
                  <Button 
                    onClick={handleNativeShare} 
                    variant="secondary" 
                    className="flex-1"
                    data-testid="button-modal-share"
                  >
                    <Share2 className="w-4 h-4 mr-2" />
                    Share
                  </Button>
                )}
              </div>

              <div className="space-y-3">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Share on Social Media
                </label>
                <div className="grid grid-cols-6 gap-3">
                  {socialPlatforms.map((platform) => (
                    <a
                      key={platform.key}
                      href={shareData.platformShareUrls[platform.key as keyof typeof shareData.platformShareUrls]}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex flex-col items-center gap-2 p-3 rounded-xl bg-purple-500/5 dark:bg-purple-500/10 border border-purple-400/15 dark:border-purple-400/20 transition-all duration-300 group hover:scale-105 hover:-translate-y-0.5 ${platform.color}`}
                      data-testid={`link-modal-share-${platform.key}`}
                    >
                      <platform.icon className={`w-6 h-6 ${platform.iconColor || 'text-foreground'} transition-transform duration-300 group-hover:scale-110`} />
                      <span className="text-[10px] text-muted-foreground font-medium">{platform.label}</span>
                    </a>
                  ))}
                </div>
              </div>

              <CosmicDivider />

              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Connect your accounts to upload videos directly from Lunara
                </p>
                <div className="grid grid-cols-1 gap-3">
                  <PlatformCard
                    platform="tiktok"
                    icon={SiTiktok}
                    label="TikTok"
                    isConnected={!!getAccountByPlatform("tiktok")}
                    isPro={isPro}
                    account={getAccountByPlatform("tiktok")}
                    uploadState={uploadStates.tiktok}
                    onConnect={() => handleConnect("tiktok")}
                    onDisconnect={() => handleDisconnect("tiktok")}
                    onUpload={() => handleUpload("tiktok")}
                    onCaptionChange={(caption) => handleCaptionChange("tiktok", caption)}
                    onHashtagsChange={(hashtags) => handleHashtagsChange("tiktok", hashtags)}
                    gradientFrom="from-gray-900/10"
                    gradientTo="to-gray-800/5"
                    iconColor="text-foreground"
                    glowColor="rgba(0,0,0,0.2)"
                  />
                  
                  <PlatformCard
                    platform="instagram"
                    icon={SiInstagram}
                    label="Instagram"
                    isConnected={!!getAccountByPlatform("instagram")}
                    isPro={isPro}
                    account={getAccountByPlatform("instagram")}
                    uploadState={uploadStates.instagram}
                    onConnect={() => handleConnect("instagram")}
                    onDisconnect={() => handleDisconnect("instagram")}
                    onUpload={() => handleUpload("instagram")}
                    onCaptionChange={(caption) => handleCaptionChange("instagram", caption)}
                    onHashtagsChange={(hashtags) => handleHashtagsChange("instagram", hashtags)}
                    gradientFrom="from-pink-500/10"
                    gradientTo="to-purple-500/10"
                    iconColor="text-pink-500"
                    glowColor="rgba(236,72,153,0.3)"
                  />
                  
                  <PlatformCard
                    platform="youtube"
                    icon={SiYoutube}
                    label="YouTube"
                    isConnected={!!getAccountByPlatform("youtube")}
                    isPro={isPro}
                    account={getAccountByPlatform("youtube")}
                    uploadState={uploadStates.youtube}
                    onConnect={() => handleConnect("youtube")}
                    onDisconnect={() => handleDisconnect("youtube")}
                    onUpload={() => handleUpload("youtube")}
                    onCaptionChange={(caption) => handleCaptionChange("youtube", caption)}
                    onHashtagsChange={(hashtags) => handleHashtagsChange("youtube", hashtags)}
                    gradientFrom="from-red-500/10"
                    gradientTo="to-red-600/5"
                    iconColor="text-red-600"
                    glowColor="rgba(239,68,68,0.3)"
                  />
                </div>
              </div>
            </div>
          ) : createShareMutation.isError ? (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <div className="p-4 rounded-full bg-destructive/10 border border-destructive/20">
                <X className="w-8 h-8 text-destructive" />
              </div>
              <div className="text-center space-y-1">
                <p className="font-medium text-foreground">Failed to create share link</p>
                <p className="text-sm text-muted-foreground">Please try again</p>
              </div>
              <Button onClick={() => createShareMutation.mutate()} variant="outline" className="mt-2">
                Try Again
              </Button>
            </div>
          ) : null}
        </div>
        
        <style>{`
          .custom-scrollbar::-webkit-scrollbar {
            width: 4px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: transparent;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: rgba(168, 85, 247, 0.2);
            border-radius: 10px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: rgba(168, 85, 247, 0.4);
          }
          @keyframes shimmer {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }
        `}</style>
      </DialogContent>

      {/* Fullscreen Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
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
              onClick={() => setPreviewOpen(false)}
              data-testid="button-close-share-preview"
            >
              <X className="w-5 h-5" />
            </Button>

            <div className="relative flex items-center justify-center p-4 md:p-8">
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] bg-gradient-to-br from-purple-500/20 via-transparent to-pink-500/20 blur-[120px] animate-pulse" style={{ animationDuration: '4s' }} />
              </div>

              <div className="relative">
                {(() => {
                  const isVideo = (url: string) => {
                    const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov'];
                    return videoExtensions.some(ext => url.toLowerCase().includes(ext)) || url.startsWith('blob:');
                  };
                  const aspectClass = video.aspectRatio === "9:16" ? "max-h-[80vh] w-auto" : "max-w-[90vw] h-auto";
                  return isVideo(video.videoUrl) ? (
                    <video
                      src={video.videoUrl}
                      className={`${aspectClass} rounded-2xl shadow-2xl object-contain animate-in zoom-in-95 duration-500`}
                      controls
                      autoPlay
                      loop
                      data-testid="share-preview-video"
                    />
                  ) : (
                    <img
                      src={video.videoUrl}
                      className={`${aspectClass} rounded-2xl shadow-2xl object-contain animate-in zoom-in-95 duration-500`}
                      alt={video.prompt}
                      data-testid="share-preview-image"
                    />
                  );
                })()}
                <VideoWatermark showWatermark={shouldShowWatermark} size="md" position="bottom-right" />
              </div>

              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-full max-w-2xl px-6 opacity-0 group-hover/preview:opacity-100 transition-opacity duration-300">
                <div className="p-4 rounded-2xl border border-white/10 backdrop-blur-xl bg-black/40">
                  <p className="text-white text-sm md:text-base font-medium line-clamp-2 text-center drop-shadow-sm">
                    {video.prompt}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
