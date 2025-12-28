import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Share2, 
  Copy, 
  Check, 
  Download, 
  ExternalLink,
  Loader2,
  Eye,
  X
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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-lg glass-card border-primary/20" data-testid="share-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <Share2 className="w-5 h-5 text-primary" />
            Share Video
          </DialogTitle>
        </DialogHeader>

        {createShareMutation.isPending ? (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-muted-foreground">Creating share link...</p>
          </div>
        ) : shareData ? (
          <div className="space-y-6">
            <div className="relative aspect-video rounded-lg overflow-hidden bg-black/10">
              <video
                src={video.videoUrl}
                className="w-full h-full object-cover"
                muted
                loop
                autoPlay
                playsInline
              />
              {shareData.viewCount > 0 && (
                <Badge variant="secondary" className="absolute top-2 right-2 gap-1">
                  <Eye className="w-3 h-3" />
                  {shareData.viewCount} views
                </Badge>
              )}
            </div>

            <div>
              <p className="text-sm font-medium text-foreground line-clamp-2 mb-3">
                {video.prompt}
              </p>
              <div className="flex gap-2">
                <Input
                  value={shareData.shareUrl}
                  readOnly
                  className="flex-1 text-sm"
                  data-testid="input-share-url"
                />
                <Button
                  onClick={handleCopyLink}
                  variant="secondary"
                  size="icon"
                  data-testid="button-copy-share-link"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={handleDownload} variant="default" className="flex-1" data-testid="button-modal-download">
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
              
              {typeof navigator !== "undefined" && typeof navigator.share !== "undefined" && (
                <Button onClick={handleNativeShare} variant="secondary" className="flex-1" data-testid="button-modal-share">
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </Button>
              )}
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground">Share on Social Media</p>
              <div className="grid grid-cols-6 gap-2">
                <a
                  href={shareData.platformShareUrls.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center gap-1.5 p-2 rounded-lg bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors group"
                  data-testid="link-modal-share-twitter"
                >
                  <SiX className="w-5 h-5 text-foreground group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] text-muted-foreground">X</span>
                </a>
                
                <a
                  href={shareData.platformShareUrls.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center gap-1.5 p-2 rounded-lg bg-black/5 dark:bg-white/5 hover:bg-blue-500/10 transition-colors group"
                  data-testid="link-modal-share-facebook"
                >
                  <SiFacebook className="w-5 h-5 text-blue-600 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] text-muted-foreground">FB</span>
                </a>
                
                <a
                  href={shareData.platformShareUrls.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center gap-1.5 p-2 rounded-lg bg-black/5 dark:bg-white/5 hover:bg-blue-600/10 transition-colors group"
                  data-testid="link-modal-share-linkedin"
                >
                  <SiLinkedin className="w-5 h-5 text-blue-700 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] text-muted-foreground">LI</span>
                </a>
                
                <a
                  href={shareData.platformShareUrls.reddit}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center gap-1.5 p-2 rounded-lg bg-black/5 dark:bg-white/5 hover:bg-orange-500/10 transition-colors group"
                  data-testid="link-modal-share-reddit"
                >
                  <SiReddit className="w-5 h-5 text-orange-600 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] text-muted-foreground">Reddit</span>
                </a>
                
                <a
                  href={shareData.platformShareUrls.whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center gap-1.5 p-2 rounded-lg bg-black/5 dark:bg-white/5 hover:bg-green-500/10 transition-colors group"
                  data-testid="link-modal-share-whatsapp"
                >
                  <SiWhatsapp className="w-5 h-5 text-green-500 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] text-muted-foreground">WA</span>
                </a>
                
                <a
                  href={shareData.platformShareUrls.telegram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center gap-1.5 p-2 rounded-lg bg-black/5 dark:bg-white/5 hover:bg-blue-400/10 transition-colors group"
                  data-testid="link-modal-share-telegram"
                >
                  <SiTelegram className="w-5 h-5 text-blue-500 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] text-muted-foreground">TG</span>
                </a>
              </div>
            </div>

            <div className="space-y-3 pt-2 border-t border-primary/10">
              <div>
                <p className="text-sm font-medium text-foreground">TikTok, Instagram & Snapchat</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Download first, then upload in-app
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => openAppDeepLink("tiktok")}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-lg bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors group"
                  data-testid="button-open-tiktok"
                >
                  <SiTiktok className="w-5 h-5 text-foreground group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] text-muted-foreground">TikTok</span>
                </button>
                
                <button
                  onClick={() => openAppDeepLink("instagram")}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-lg bg-black/5 dark:bg-white/5 hover:bg-pink-500/10 transition-colors group"
                  data-testid="button-open-instagram"
                >
                  <SiInstagram className="w-5 h-5 text-pink-500 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] text-muted-foreground">Instagram</span>
                </button>
                
                <button
                  onClick={() => openAppDeepLink("snapchat")}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-lg bg-black/5 dark:bg-white/5 hover:bg-yellow-400/10 transition-colors group"
                  data-testid="button-open-snapchat"
                >
                  <SiSnapchat className="w-5 h-5 text-yellow-400 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] text-muted-foreground">Snapchat</span>
                </button>
              </div>
            </div>
          </div>
        ) : createShareMutation.isError ? (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <X className="w-8 h-8 text-destructive" />
            <p className="text-muted-foreground">Failed to create share link</p>
            <Button onClick={() => createShareMutation.mutate()} variant="outline">
              Try Again
            </Button>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
