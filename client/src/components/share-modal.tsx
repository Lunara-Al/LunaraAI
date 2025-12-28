import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Share2, 
  Copy, 
  Check, 
  Download, 
  Loader2,
  Eye,
  X,
  Sparkles,
  Link2
} from "lucide-react";
import { SiX, SiFacebook, SiLinkedin, SiReddit, SiWhatsapp, SiTelegram, SiTiktok, SiInstagram, SiSnapchat } from "react-icons/si";
import type { VideoGeneration } from "@shared/schema";

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
        <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">In-App Upload</span>
        <Sparkles className="w-3 h-3 text-pink-400/60" />
      </div>
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-pink-400/30 to-transparent" />
    </div>
  );
}

export function ShareModal({ video, isOpen, onClose }: ShareModalProps) {
  const { toast } = useToast();
  const [shareData, setShareData] = useState<ShareResponse | null>(null);
  const [copied, setCopied] = useState(false);

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

  const handleOpen = () => {
    if (!shareData && !createShareMutation.isPending) {
      createShareMutation.mutate();
    }
  };

  if (isOpen && !shareData && !createShareMutation.isPending && !createShareMutation.isError) {
    handleOpen();
  }

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

  const handleDownload = () => {
    if (shareData?.downloadUrl || video.videoUrl) {
      const link = document.createElement("a");
      link.href = shareData?.downloadUrl || video.videoUrl;
      link.download = `lunara-cosmic-asmr-${video.id}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast({
        title: "Download Started",
        description: "Your video is downloading...",
      });
    }
  };

  const openAppDeepLink = (app: "tiktok" | "instagram" | "snapchat") => {
    const deepLinks = {
      tiktok: { deep: "tiktok://", fallback: "https://www.tiktok.com/" },
      instagram: { deep: "instagram://camera", fallback: "https://www.instagram.com/" },
      snapchat: { deep: "snapchat://camera", fallback: "https://www.snapchat.com/" },
    };

    const { deep, fallback } = deepLinks[app];
    
    const timeout = setTimeout(() => {
      window.location.href = fallback;
    }, 1500);

    window.location.href = deep;
    
    window.addEventListener("blur", () => {
      clearTimeout(timeout);
    }, { once: true });
  };

  const handleClose = () => {
    onClose();
    setShareData(null);
    setCopied(false);
  };

  const socialPlatforms = [
    { key: 'twitter', icon: SiX, label: 'X', color: 'hover:shadow-[0_0_20px_rgba(0,0,0,0.3)] dark:hover:shadow-[0_0_20px_rgba(255,255,255,0.2)]' },
    { key: 'facebook', icon: SiFacebook, label: 'Facebook', iconColor: 'text-blue-600', color: 'hover:shadow-[0_0_20px_rgba(37,99,235,0.4)]' },
    { key: 'linkedin', icon: SiLinkedin, label: 'LinkedIn', iconColor: 'text-blue-700', color: 'hover:shadow-[0_0_20px_rgba(29,78,216,0.4)]' },
    { key: 'reddit', icon: SiReddit, label: 'Reddit', iconColor: 'text-orange-600', color: 'hover:shadow-[0_0_20px_rgba(234,88,12,0.4)]' },
    { key: 'whatsapp', icon: SiWhatsapp, label: 'WhatsApp', iconColor: 'text-green-500', color: 'hover:shadow-[0_0_20px_rgba(34,197,94,0.4)]' },
    { key: 'telegram', icon: SiTelegram, label: 'Telegram', iconColor: 'text-blue-500', color: 'hover:shadow-[0_0_20px_rgba(59,130,246,0.4)]' },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent 
        className="sm:max-w-lg glass-card border-purple-400/20 dark:border-purple-500/30 overflow-hidden" 
        data-testid="share-modal"
      >
        <DialogHeader className="relative">
          <DialogTitle className="flex items-center gap-3 text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-500 dark:from-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
            <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-400/30">
              <Share2 className="w-5 h-5 text-purple-500 dark:text-purple-400" />
            </div>
            Share Your Creation
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Share your cosmic video with the world or download it for later
          </DialogDescription>
        </DialogHeader>

        {createShareMutation.isPending ? (
          <CosmicLoader />
        ) : shareData ? (
          <div className="space-y-5 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
            <div className="relative rounded-xl overflow-hidden group">
              <div 
                className="absolute -inset-1 rounded-xl opacity-75 blur-sm transition-opacity duration-300 group-hover:opacity-100"
                style={{
                  background: 'linear-gradient(135deg, rgba(107, 91, 255, 0.5) 0%, rgba(255, 107, 204, 0.5) 100%)'
                }}
              />
              <div className="relative aspect-video rounded-xl overflow-hidden bg-black/10 dark:bg-black/30">
                <video
                  src={video.videoUrl}
                  className="w-full h-full object-cover"
                  muted
                  loop
                  autoPlay
                  playsInline
                />
                
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
                className="flex-1 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 dark:from-purple-500 dark:to-purple-600 dark:hover:from-purple-600 dark:hover:to-purple-700"
                data-testid="button-modal-download"
              >
                <Download className="w-4 h-4 mr-2" />
                Download
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
                Download first, then upload directly in these apps
              </p>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => openAppDeepLink("tiktok")}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl bg-gradient-to-br from-gray-900/10 to-gray-800/5 dark:from-white/10 dark:to-white/5 border border-gray-500/20 dark:border-white/15 transition-all duration-300 group hover:scale-105 hover:-translate-y-0.5 hover:shadow-[0_0_25px_rgba(0,0,0,0.3)] dark:hover:shadow-[0_0_25px_rgba(255,255,255,0.15)]"
                  data-testid="button-open-tiktok"
                >
                  <SiTiktok className="w-6 h-6 text-foreground transition-transform duration-300 group-hover:scale-110" />
                  <span className="text-xs text-muted-foreground font-medium">TikTok</span>
                </button>
                
                <button
                  onClick={() => openAppDeepLink("instagram")}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl bg-gradient-to-br from-pink-500/10 to-purple-500/10 dark:from-pink-500/15 dark:to-purple-500/15 border border-pink-400/20 dark:border-pink-400/25 transition-all duration-300 group hover:scale-105 hover:-translate-y-0.5 hover:shadow-[0_0_25px_rgba(236,72,153,0.4)]"
                  data-testid="button-open-instagram"
                >
                  <SiInstagram className="w-6 h-6 text-pink-500 transition-transform duration-300 group-hover:scale-110" />
                  <span className="text-xs text-muted-foreground font-medium">Instagram</span>
                </button>
                
                <button
                  onClick={() => openAppDeepLink("snapchat")}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl bg-gradient-to-br from-yellow-400/10 to-yellow-500/5 dark:from-yellow-400/15 dark:to-yellow-500/10 border border-yellow-400/20 dark:border-yellow-400/25 transition-all duration-300 group hover:scale-105 hover:-translate-y-0.5 hover:shadow-[0_0_25px_rgba(250,204,21,0.4)]"
                  data-testid="button-open-snapchat"
                >
                  <SiSnapchat className="w-6 h-6 text-yellow-400 transition-transform duration-300 group-hover:scale-110" />
                  <span className="text-xs text-muted-foreground font-medium">Snapchat</span>
                </button>
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
        
        <style>{`
          @keyframes shimmer {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
}
