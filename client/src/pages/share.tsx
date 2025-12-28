import { useEffect, useState } from "react";
import { useParams, Link } from "wouter";
import { Play, Download, Share2, Copy, Check, ExternalLink, Moon, AlertCircle, Eye } from "lucide-react";
import { SiX, SiFacebook, SiLinkedin, SiReddit, SiWhatsapp, SiTelegram, SiTiktok, SiInstagram, SiSnapchat } from "react-icons/si";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type ShareData = {
  video: {
    id: number;
    prompt: string;
    videoUrl: string;
    length: number;
    aspectRatio: string;
    createdAt: string;
  };
  share: {
    title: string;
    description: string;
    viewCount: number;
    createdAt: string;
  };
  platformShareUrls: {
    twitter: string;
    facebook: string;
    linkedin: string;
    reddit: string;
    whatsapp: string;
    telegram: string;
  };
};

export default function SharePage() {
  const { token } = useParams<{ token: string }>();
  const [shareData, setShareData] = useState<ShareData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const fetchShareData = async () => {
      try {
        const response = await fetch(`/api/shares/${token}`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to load shared video");
        }
        const data = await response.json();
        setShareData(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchShareData();
    }
  }, [token]);

  useEffect(() => {
    if (!shareData) return;

    const { video, share } = shareData;
    const shareUrl = window.location.href;

    document.title = `${share.title} | Lunara AI`;

    const setOrCreateMeta = (property: string, content: string) => {
      let meta = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement | null;
      if (!meta) {
        meta = document.querySelector(`meta[name="${property}"]`) as HTMLMetaElement | null;
      }
      if (!meta) {
        meta = document.createElement("meta");
        if (property.startsWith("og:")) {
          meta.setAttribute("property", property);
        } else {
          meta.setAttribute("name", property);
        }
        document.head.appendChild(meta);
      }
      meta.content = content;
    };

    setOrCreateMeta("og:title", share.title);
    setOrCreateMeta("og:description", share.description);
    setOrCreateMeta("og:url", shareUrl);
    setOrCreateMeta("og:type", "video.other");
    setOrCreateMeta("og:video", video.videoUrl);
    setOrCreateMeta("og:video:type", "video/mp4");
    setOrCreateMeta("og:video:width", video.aspectRatio === "9:16" ? "720" : "1280");
    setOrCreateMeta("og:video:height", video.aspectRatio === "9:16" ? "1280" : "720");
    setOrCreateMeta("og:site_name", "Lunara AI");

    setOrCreateMeta("twitter:card", "player");
    setOrCreateMeta("twitter:title", share.title);
    setOrCreateMeta("twitter:description", share.description);
    setOrCreateMeta("twitter:player", video.videoUrl);
    setOrCreateMeta("twitter:player:width", video.aspectRatio === "9:16" ? "720" : "1280");
    setOrCreateMeta("twitter:player:height", video.aspectRatio === "9:16" ? "1280" : "720");

    return () => {
      document.title = "Lunara AI";
    };
  }, [shareData]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy link");
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share && shareData) {
      try {
        await navigator.share({
          title: shareData.share.title,
          text: shareData.share.description,
          url: window.location.href,
        });
      } catch (err) {
        console.log("Share cancelled");
      }
    }
  };

  const handleDownload = () => {
    if (shareData?.video.videoUrl) {
      const link = document.createElement("a");
      link.href = shareData.video.videoUrl;
      link.download = `lunara-cosmic-asmr-${shareData.video.id}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-accent/30 dark:from-background dark:via-slate-950 dark:to-slate-900">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-primary/20 rounded-full animate-pulse"></div>
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
            <Moon className="w-6 h-6 text-primary absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="text-muted-foreground animate-pulse">Loading cosmic video...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-accent/30 dark:from-background dark:via-slate-950 dark:to-slate-900 p-4">
        <Card className="max-w-md w-full p-8 text-center glass-card">
          <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Video Unavailable</h1>
          <p className="text-muted-foreground mb-6">{error}</p>
          <Link href="/">
            <Button className="w-full">
              <Moon className="w-4 h-4 mr-2" />
              Go to Lunara AI
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  if (!shareData) return null;

  const { video, share, platformShareUrls } = shareData;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/30 dark:from-background dark:via-slate-950 dark:to-slate-900 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <Link href="/">
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent inline-block cursor-pointer hover:opacity-80 transition-opacity" data-testid="text-logo">
              Lunara AI
            </h1>
          </Link>
          <p className="text-sm text-muted-foreground">Cosmic ASMR Video Generation</p>
        </div>

        <Card className="overflow-hidden glass-card" data-testid="share-video-card">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary/30 via-secondary/20 to-primary/30 rounded-t-xl blur-lg opacity-60 group-hover:opacity-80 transition-opacity duration-300 z-0" />
            <video
              src={video.videoUrl}
              controls
              autoPlay
              loop
              playsInline
              className="w-full aspect-video object-cover relative z-10"
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              data-testid="share-video-player"
            />
          </div>

          <div className="p-6 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h2 className="text-xl md:text-2xl font-bold text-foreground line-clamp-2" data-testid="text-share-title">
                  {share.title}
                </h2>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-3" data-testid="text-share-description">
                  {share.description}
                </p>
              </div>
              <Badge variant="secondary" className="flex-shrink-0 gap-1">
                <Eye className="w-3 h-3" />
                {share.viewCount} views
              </Badge>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>{video.length}s</span>
              <span>·</span>
              <span>{video.aspectRatio}</span>
              <span>·</span>
              <span>{new Date(video.createdAt).toLocaleDateString()}</span>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <Button onClick={handleDownload} variant="default" className="flex-1 min-w-[120px]" data-testid="button-download">
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
              
              {typeof navigator.share !== "undefined" && (
                <Button onClick={handleNativeShare} variant="secondary" className="flex-1 min-w-[120px]" data-testid="button-share-native">
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </Button>
              )}
              
              <Button onClick={handleCopyLink} variant="outline" className="flex-1 min-w-[120px]" data-testid="button-copy-link">
                {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                {copied ? "Copied!" : "Copy Link"}
              </Button>
            </div>
          </div>
        </Card>

        <Card className="p-6 glass-card space-y-4" data-testid="share-platforms-card">
          <h3 className="text-lg font-semibold text-foreground">Share on Social Media</h3>
          
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            <a
              href={platformShareUrls.twitter}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-2 p-3 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors group"
              data-testid="link-share-twitter"
            >
              <SiX className="w-6 h-6 text-foreground group-hover:scale-110 transition-transform" />
              <span className="text-xs text-muted-foreground">X</span>
            </a>
            
            <a
              href={platformShareUrls.facebook}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-2 p-3 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-blue-500/10 transition-colors group"
              data-testid="link-share-facebook"
            >
              <SiFacebook className="w-6 h-6 text-blue-600 group-hover:scale-110 transition-transform" />
              <span className="text-xs text-muted-foreground">Facebook</span>
            </a>
            
            <a
              href={platformShareUrls.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-2 p-3 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-blue-600/10 transition-colors group"
              data-testid="link-share-linkedin"
            >
              <SiLinkedin className="w-6 h-6 text-blue-700 group-hover:scale-110 transition-transform" />
              <span className="text-xs text-muted-foreground">LinkedIn</span>
            </a>
            
            <a
              href={platformShareUrls.reddit}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-2 p-3 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-orange-500/10 transition-colors group"
              data-testid="link-share-reddit"
            >
              <SiReddit className="w-6 h-6 text-orange-600 group-hover:scale-110 transition-transform" />
              <span className="text-xs text-muted-foreground">Reddit</span>
            </a>
            
            <a
              href={platformShareUrls.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-2 p-3 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-green-500/10 transition-colors group"
              data-testid="link-share-whatsapp"
            >
              <SiWhatsapp className="w-6 h-6 text-green-500 group-hover:scale-110 transition-transform" />
              <span className="text-xs text-muted-foreground">WhatsApp</span>
            </a>
            
            <a
              href={platformShareUrls.telegram}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-2 p-3 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-blue-400/10 transition-colors group"
              data-testid="link-share-telegram"
            >
              <SiTelegram className="w-6 h-6 text-blue-500 group-hover:scale-110 transition-transform" />
              <span className="text-xs text-muted-foreground">Telegram</span>
            </a>
          </div>
        </Card>

        <Card className="p-6 glass-card space-y-4" data-testid="share-apps-card">
          <div>
            <h3 className="text-lg font-semibold text-foreground">TikTok, Instagram & Snapchat</h3>
            <p className="text-sm text-muted-foreground mt-1">
              These platforms require uploading the video in-app. Download first, then upload.
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="flex flex-col gap-2 p-4 rounded-xl bg-black/5 dark:bg-white/5">
              <div className="flex items-center gap-2">
                <SiTiktok className="w-5 h-5 text-foreground" />
                <span className="font-medium text-foreground">TikTok</span>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={handleDownload} className="flex-1">
                  <Download className="w-3 h-3 mr-1" />
                  Download
                </Button>
                <Button size="sm" variant="ghost" onClick={() => openAppDeepLink("tiktok")} className="flex-1">
                  <ExternalLink className="w-3 h-3 mr-1" />
                  Open App
                </Button>
              </div>
            </div>
            
            <div className="flex flex-col gap-2 p-4 rounded-xl bg-black/5 dark:bg-white/5">
              <div className="flex items-center gap-2">
                <SiInstagram className="w-5 h-5 text-pink-500" />
                <span className="font-medium text-foreground">Instagram</span>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={handleDownload} className="flex-1">
                  <Download className="w-3 h-3 mr-1" />
                  Download
                </Button>
                <Button size="sm" variant="ghost" onClick={() => openAppDeepLink("instagram")} className="flex-1">
                  <ExternalLink className="w-3 h-3 mr-1" />
                  Open App
                </Button>
              </div>
            </div>
            
            <div className="flex flex-col gap-2 p-4 rounded-xl bg-black/5 dark:bg-white/5">
              <div className="flex items-center gap-2">
                <SiSnapchat className="w-5 h-5 text-yellow-400" />
                <span className="font-medium text-foreground">Snapchat</span>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={handleDownload} className="flex-1">
                  <Download className="w-3 h-3 mr-1" />
                  Download
                </Button>
                <Button size="sm" variant="ghost" onClick={() => openAppDeepLink("snapchat")} className="flex-1">
                  <ExternalLink className="w-3 h-3 mr-1" />
                  Open App
                </Button>
              </div>
            </div>
          </div>
        </Card>

        <div className="text-center pt-4">
          <Link href="/">
            <Button variant="ghost" className="text-muted-foreground hover:text-foreground" data-testid="link-create-own">
              <Moon className="w-4 h-4 mr-2" />
              Create your own cosmic ASMR videos
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
