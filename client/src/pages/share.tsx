import { useEffect, useState } from "react";
import { useParams, Link } from "wouter";
import { Play, Download, Share2, Copy, Check, ExternalLink, Moon, AlertCircle, Eye, Clock, Ratio, Calendar, Sparkles, Star } from "lucide-react";
import { SiX, SiFacebook, SiLinkedin, SiReddit, SiWhatsapp, SiTelegram, SiTiktok, SiInstagram, SiYoutube, SiSnapchat } from "react-icons/si";
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

function CosmicOrb({ className, delay = 0, size = "md" }: { className?: string; delay?: number; size?: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: "w-32 h-32",
    md: "w-48 h-48",
    lg: "w-64 h-64"
  };
  
  return (
    <div 
      className={`absolute rounded-full blur-3xl opacity-30 dark:opacity-40 ${sizeClasses[size]} ${className}`}
      style={{
        background: "radial-gradient(circle, rgba(168, 85, 247, 0.6) 0%, rgba(236, 72, 153, 0.4) 50%, transparent 70%)",
        animation: `cosmicPulse 4s ease-in-out infinite`,
        animationDelay: `${delay}s`
      }}
    />
  );
}

function FloatingStar({ className, delay = 0, size = 4 }: { className?: string; delay?: number; size?: number }) {
  return (
    <div 
      className={`absolute ${className}`}
      style={{
        animation: `starFloat 6s ease-in-out infinite, starTwinkle 2s ease-in-out infinite`,
        animationDelay: `${delay}s`
      }}
    >
      <Star className={`w-${size} h-${size} text-primary/60 dark:text-primary/80 fill-primary/30`} />
    </div>
  );
}

function MoonStarsLogo({ className }: { className?: string }) {
  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <div className="absolute inset-0 bg-gradient-to-r from-primary/30 via-secondary/20 to-primary/30 rounded-full blur-2xl scale-150 animate-pulse" />
      <svg 
        viewBox="0 0 100 100" 
        className="w-16 h-16 md:w-20 md:h-20 relative z-10 drop-shadow-lg"
        style={{ filter: "drop-shadow(0 0 20px rgba(168, 85, 247, 0.5))" }}
      >
        <defs>
          <linearGradient id="moonGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(270, 85%, 70%)" />
            <stop offset="50%" stopColor="hsl(320, 78%, 72%)" />
            <stop offset="100%" stopColor="hsl(270, 85%, 65%)" />
          </linearGradient>
          <radialGradient id="moonShine" cx="30%" cy="30%" r="50%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.3)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
        </defs>
        <circle cx="45" cy="50" r="28" fill="url(#moonGradient)" />
        <circle cx="45" cy="50" r="28" fill="url(#moonShine)" />
        <circle cx="60" cy="42" r="20" fill="hsl(258, 70%, 4%)" className="dark:fill-background" />
        <circle cx="20" cy="20" r="3" fill="hsl(270, 85%, 75%)" className="animate-pulse" />
        <circle cx="80" cy="25" r="2" fill="hsl(320, 78%, 72%)" style={{ animationDelay: "0.5s" }} className="animate-pulse" />
        <circle cx="75" cy="70" r="2.5" fill="hsl(270, 85%, 80%)" style={{ animationDelay: "1s" }} className="animate-pulse" />
        <circle cx="15" cy="65" r="1.5" fill="hsl(320, 78%, 75%)" style={{ animationDelay: "1.5s" }} className="animate-pulse" />
        <circle cx="85" cy="50" r="2" fill="hsl(270, 85%, 70%)" style={{ animationDelay: "0.3s" }} className="animate-pulse" />
        <path d="M18 18 L20 14 L22 18 L26 20 L22 22 L20 26 L18 22 L14 20 Z" fill="hsl(270, 85%, 80%)" opacity="0.8" />
        <path d="M78 68 L79.5 65 L81 68 L84 69.5 L81 71 L79.5 74 L78 71 L75 69.5 Z" fill="hsl(320, 78%, 75%)" opacity="0.7" />
      </svg>
    </div>
  );
}

function CosmicBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      <CosmicOrb className="top-10 left-10" delay={0} size="lg" />
      <CosmicOrb className="top-1/4 right-20" delay={1} size="md" />
      <CosmicOrb className="bottom-20 left-1/4" delay={2} size="lg" />
      <CosmicOrb className="bottom-1/3 right-10" delay={0.5} size="sm" />
      <CosmicOrb className="top-1/2 left-1/3" delay={1.5} size="sm" />
      
      <FloatingStar className="top-20 left-[15%]" delay={0} size={3} />
      <FloatingStar className="top-32 right-[25%]" delay={0.5} size={4} />
      <FloatingStar className="top-1/3 left-[8%]" delay={1} size={2} />
      <FloatingStar className="bottom-40 right-[15%]" delay={1.5} size={3} />
      <FloatingStar className="bottom-1/4 left-[20%]" delay={2} size={4} />
      <FloatingStar className="top-1/2 right-[10%]" delay={0.8} size={2} />
      
      <style>{`
        @keyframes cosmicPulse {
          0%, 100% { transform: scale(1); opacity: 0.3; }
          50% { transform: scale(1.2); opacity: 0.5; }
        }
        @keyframes starFloat {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-10px) rotate(10deg); }
        }
        @keyframes starTwinkle {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes cosmicBorder {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes floatUpDown {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
      `}</style>
    </div>
  );
}

function ShimmerOverlay() {
  return (
    <div 
      className="absolute inset-0 z-20 pointer-events-none rounded-t-xl overflow-hidden"
      style={{
        background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.1) 50%, transparent 100%)",
        backgroundSize: "200% 100%",
        animation: "shimmer 3s ease-in-out infinite"
      }}
    />
  );
}

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

  const openAppDeepLink = (app: "tiktok" | "instagram" | "youtube") => {
    const deepLinks = {
      tiktok: { deep: "tiktok://", fallback: "https://www.tiktok.com/" },
      instagram: { deep: "instagram://camera", fallback: "https://www.instagram.com/" },
      youtube: { deep: "youtube://upload", fallback: "https://www.youtube.com/upload" },
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
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
        <CosmicBackground />
        <div className="flex flex-col items-center gap-6 relative z-10">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-primary via-secondary to-primary rounded-full blur-2xl opacity-50 animate-pulse scale-150" />
            <div className="relative">
              <div className="w-24 h-24 border-4 border-primary/20 rounded-full"></div>
              <div 
                className="w-24 h-24 border-4 border-transparent rounded-full absolute top-0 left-0"
                style={{
                  borderImage: "linear-gradient(135deg, hsl(270, 85%, 70%), hsl(320, 78%, 72%), hsl(270, 85%, 70%)) 1",
                  borderImageSlice: 1,
                  animation: "spin 1.5s linear infinite"
                }}
              />
              <div className="w-24 h-24 border-4 border-secondary/40 border-t-transparent rounded-full animate-spin absolute top-0 left-0" style={{ animationDuration: "2s", animationDirection: "reverse" }} />
              <MoonStarsLogo className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 scale-75" />
            </div>
          </div>
          <div className="text-center space-y-2">
            <p className="text-lg font-medium bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent animate-pulse">
              Loading cosmic video...
            </p>
            <div className="flex items-center justify-center gap-1">
              {[0, 1, 2].map((i) => (
                <div 
                  key={i}
                  className="w-2 h-2 rounded-full bg-primary/60"
                  style={{
                    animation: "bounce 1s ease-in-out infinite",
                    animationDelay: `${i * 0.15}s`
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
        <CosmicBackground />
        <Card className="max-w-md w-full p-8 text-center glass-card relative z-10 border-2 border-destructive/20">
          <div className="absolute inset-0 bg-gradient-to-br from-destructive/5 via-transparent to-destructive/5 rounded-xl" />
          <div className="relative z-10">
            <div className="relative inline-block mb-6">
              <div className="absolute inset-0 bg-destructive/20 rounded-full blur-xl scale-150" />
              <AlertCircle className="w-16 h-16 text-destructive relative z-10" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Video Unavailable</h1>
            <p className="text-muted-foreground mb-6">{error}</p>
            <Link href="/">
              <Button 
                className="w-full bg-gradient-to-r from-primary via-secondary to-primary bg-[length:200%_100%] hover:bg-[position:100%_0] transition-all duration-500"
                style={{ backgroundSize: "200% 100%" }}
              >
                <Moon className="w-4 h-4 mr-2" />
                Go to Lunara AI
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  if (!shareData) return null;

  const { video, share, platformShareUrls } = shareData;

  return (
    <div className="min-h-screen p-4 md:p-8 relative overflow-hidden">
      <CosmicBackground />
      
      <div className="max-w-4xl mx-auto space-y-8 relative z-10">
        <div className="text-center space-y-4">
          <Link href="/">
            <div 
              className="inline-flex flex-col items-center gap-3 cursor-pointer group transition-all duration-300"
              data-testid="text-logo"
            >
              <MoonStarsLogo className="group-hover:scale-110 transition-transform duration-300" />
              <h1 
                className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent bg-[length:200%_100%] group-hover:bg-[position:100%_0] transition-all duration-500"
                style={{ backgroundSize: "200% 100%" }}
              >
                Lunara AI
              </h1>
            </div>
          </Link>
          <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4 text-primary/60" />
            Cosmic ASMR Video Generation
            <Sparkles className="w-4 h-4 text-secondary/60" />
          </p>
        </div>

        <Card 
          className="overflow-visible glass-card relative"
          data-testid="share-video-card"
          style={{
            boxShadow: "0 0 60px rgba(168, 85, 247, 0.15), 0 0 100px rgba(236, 72, 153, 0.1)"
          }}
        >
          <div 
            className="absolute -inset-[2px] rounded-xl z-0"
            style={{
              background: "linear-gradient(135deg, hsl(270, 85%, 70%), hsl(320, 78%, 72%), hsl(270, 85%, 65%), hsl(320, 78%, 70%))",
              backgroundSize: "300% 300%",
              animation: "cosmicBorder 4s ease infinite"
            }}
          />
          <div className="relative z-10 bg-card rounded-xl overflow-hidden">
            <div className="relative group">
              <div className="absolute -inset-4 bg-gradient-to-r from-primary/40 via-secondary/30 to-primary/40 rounded-t-xl blur-2xl opacity-60 group-hover:opacity-90 transition-opacity duration-500 z-0" />
              <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-secondary/10 z-10 pointer-events-none" />
              <ShimmerOverlay />
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

            <div className="p-6 md:p-8 space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl md:text-2xl font-bold text-foreground line-clamp-2 mb-2" data-testid="text-share-title">
                    {share.title}
                  </h2>
                  <p className="text-sm text-muted-foreground line-clamp-3" data-testid="text-share-description">
                    {share.description}
                  </p>
                </div>
                <Badge 
                  variant="secondary" 
                  className="flex-shrink-0 gap-1.5 px-3 py-1.5 glass-button"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span className="font-semibold">{share.viewCount}</span>
                  <span className="text-muted-foreground">views</span>
                </Badge>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs">
                <Badge variant="outline" className="gap-1.5 glass-button border-primary/20">
                  <Clock className="w-3 h-3 text-primary" />
                  {video.length}s
                </Badge>
                <Badge variant="outline" className="gap-1.5 glass-button border-secondary/20">
                  <Ratio className="w-3 h-3 text-secondary" />
                  {video.aspectRatio}
                </Badge>
                <Badge variant="outline" className="gap-1.5 glass-button border-primary/20">
                  <Calendar className="w-3 h-3 text-primary" />
                  {new Date(video.createdAt).toLocaleDateString()}
                </Badge>
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <Button 
                  onClick={handleDownload} 
                  className="flex-1 min-w-[140px] bg-gradient-to-r from-primary via-secondary to-primary bg-[length:200%_100%] hover:bg-[position:100%_0] transition-all duration-500 shadow-lg hover:shadow-primary/25"
                  style={{ backgroundSize: "200% 100%" }}
                  data-testid="button-download"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
                
                {typeof navigator.share !== "undefined" && (
                  <Button 
                    onClick={handleNativeShare} 
                    variant="secondary" 
                    className="flex-1 min-w-[140px] bg-gradient-to-r from-secondary/80 to-primary/80 text-white hover:from-secondary hover:to-primary transition-all duration-300"
                    data-testid="button-share-native"
                  >
                    <Share2 className="w-4 h-4 mr-2" />
                    Share
                  </Button>
                )}
                
                <Button 
                  onClick={handleCopyLink} 
                  variant="outline" 
                  className="flex-1 min-w-[140px] glass-button hover:border-primary/40 transition-all duration-300"
                  data-testid="button-copy-link"
                >
                  {copied ? <Check className="w-4 h-4 mr-2 text-green-500" /> : <Copy className="w-4 h-4 mr-2" />}
                  {copied ? "Copied!" : "Copy Link"}
                </Button>
              </div>
            </div>
          </div>
        </Card>

        <Card 
          className="p-6 md:p-8 glass-card space-y-5 relative"
          data-testid="share-platforms-card"
          style={{
            boxShadow: "0 0 40px rgba(168, 85, 247, 0.08), 0 0 60px rgba(236, 72, 153, 0.05)"
          }}
        >
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Share2 className="w-5 h-5 text-primary" />
            Share on Social Media
          </h3>
          
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
            {[
              { url: platformShareUrls.twitter, icon: SiX, label: "X", color: "from-gray-800 to-gray-900 dark:from-gray-200 dark:to-white", iconColor: "text-foreground", testId: "link-share-twitter" },
              { url: platformShareUrls.facebook, icon: SiFacebook, label: "Facebook", color: "from-blue-500 to-blue-700", iconColor: "text-blue-600", testId: "link-share-facebook" },
              { url: `https://www.snapchat.com/scan?attachmentUrl=${encodeURIComponent(window.location.href)}`, icon: SiSnapchat, label: "Snapchat", color: "from-yellow-400 to-yellow-500", iconColor: "text-yellow-400", testId: "link-share-snapchat" },
              { url: platformShareUrls.whatsapp, icon: SiWhatsapp, label: "WhatsApp", color: "from-green-500 to-green-700", iconColor: "text-green-500", testId: "link-share-whatsapp" },
              { url: platformShareUrls.telegram, icon: SiTelegram, label: "Telegram", color: "from-blue-400 to-blue-600", iconColor: "text-blue-500", testId: "link-share-telegram" },
              { url: platformShareUrls.reddit, icon: SiReddit, label: "Reddit", color: "from-orange-500 to-orange-700", iconColor: "text-orange-600", testId: "link-share-reddit" },
            ].map((platform) => (
              <a
                key={platform.label}
                href={platform.url}
                target="_blank"
                rel="noopener noreferrer"
                className="relative flex flex-col items-center gap-2 p-4 rounded-xl glass-button group overflow-visible transition-all duration-300 hover:scale-105"
                data-testid={platform.testId}
              >
                <div 
                  className="absolute -inset-[1px] rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{
                    background: `linear-gradient(135deg, ${platform.color.replace("from-", "").replace(" to-", ", ")})`,
                    filter: "blur(4px)"
                  }}
                />
                <div className="absolute inset-0 rounded-xl glass-button group-hover:bg-white/10 dark:group-hover:bg-white/5 transition-colors duration-300" />
                <platform.icon className={`w-6 h-6 ${platform.iconColor} relative z-10 group-hover:scale-110 transition-transform duration-300`} />
                <span className="text-xs text-muted-foreground relative z-10">{platform.label}</span>
              </a>
            ))}
          </div>
        </Card>

        <Card 
          className="p-6 md:p-8 glass-card space-y-5"
          data-testid="share-apps-card"
          style={{
            boxShadow: "0 0 40px rgba(168, 85, 247, 0.08), 0 0 60px rgba(236, 72, 153, 0.05)"
          }}
        >
          <div>
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-secondary" />
              TikTok, Instagram & YouTube
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              These platforms require uploading the video in-app. Download first, then upload.
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div 
              className="relative flex flex-col gap-3 p-5 rounded-xl overflow-hidden group"
              style={{
                background: "linear-gradient(135deg, rgba(0,0,0,0.9) 0%, rgba(37,37,37,0.9) 100%)"
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 via-purple-500/20 to-pink-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="flex items-center gap-2 relative z-10">
                <SiTiktok className="w-5 h-5 text-white" />
                <span className="font-medium text-white">TikTok</span>
              </div>
              <div className="flex gap-2 relative z-10">
                <Button size="sm" variant="outline" onClick={handleDownload} className="flex-1 border-white/20 text-white hover:bg-white/10">
                  <Download className="w-3 h-3 mr-1" />
                  Download
                </Button>
                <Button size="sm" variant="ghost" onClick={() => openAppDeepLink("tiktok")} className="flex-1 text-white hover:bg-white/10">
                  <ExternalLink className="w-3 h-3 mr-1" />
                  Open
                </Button>
              </div>
            </div>
            
            <div 
              className="relative flex flex-col gap-3 p-5 rounded-xl overflow-hidden group"
              style={{
                background: "linear-gradient(135deg, rgba(131,58,180,0.9) 0%, rgba(253,29,29,0.8) 50%, rgba(252,176,69,0.9) 100%)"
              }}
            >
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="flex items-center gap-2 relative z-10">
                <SiInstagram className="w-5 h-5 text-white" />
                <span className="font-medium text-white">Instagram</span>
              </div>
              <div className="flex gap-2 relative z-10">
                <Button size="sm" variant="outline" onClick={handleDownload} className="flex-1 border-white/30 text-white hover:bg-white/20">
                  <Download className="w-3 h-3 mr-1" />
                  Download
                </Button>
                <Button size="sm" variant="ghost" onClick={() => openAppDeepLink("instagram")} className="flex-1 text-white hover:bg-white/20">
                  <ExternalLink className="w-3 h-3 mr-1" />
                  Open
                </Button>
              </div>
            </div>
            
            <div 
              className="relative flex flex-col gap-3 p-5 rounded-xl overflow-hidden group"
              style={{
                background: "linear-gradient(135deg, rgba(239,68,68,0.9) 0%, rgba(185,28,28,0.8) 100%)"
              }}
            >
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="flex items-center gap-2 relative z-10">
                <SiYoutube className="w-5 h-5 text-white" />
                <span className="font-medium text-white">YouTube</span>
              </div>
              <div className="flex gap-2 relative z-10">
                <Button size="sm" variant="outline" onClick={handleDownload} className="flex-1 border-white/30 text-white hover:bg-white/20">
                  <Download className="w-3 h-3 mr-1" />
                  Download
                </Button>
                <Button size="sm" variant="ghost" onClick={() => openAppDeepLink("youtube")} className="flex-1 text-white hover:bg-white/20">
                  <ExternalLink className="w-3 h-3 mr-1" />
                  Open
                </Button>
              </div>
            </div>
          </div>
        </Card>

        <div className="text-center py-8 relative">
          <FloatingStar className="-left-4 top-1/2 -translate-y-1/2" delay={0} size={3} />
          <FloatingStar className="-right-4 top-1/2 -translate-y-1/2" delay={0.5} size={3} />
          <FloatingStar className="left-1/4 top-0" delay={1} size={2} />
          <FloatingStar className="right-1/4 bottom-0" delay={1.5} size={2} />
          
          <Link href="/">
            <Button 
              size="lg"
              className="bg-gradient-to-r from-primary via-secondary to-primary bg-[length:200%_100%] hover:bg-[position:100%_0] transition-all duration-500 shadow-xl hover:shadow-primary/30 px-8 py-6 text-lg font-semibold group"
              style={{ 
                backgroundSize: "200% 100%",
                boxShadow: "0 0 30px rgba(168, 85, 247, 0.3), 0 0 50px rgba(236, 72, 153, 0.2)"
              }}
              data-testid="link-create-own"
            >
              <Sparkles className="w-5 h-5 mr-2 group-hover:animate-pulse" />
              Create Your Own Cosmic Videos
              <Moon className="w-5 h-5 ml-2 group-hover:rotate-12 transition-transform duration-300" />
            </Button>
          </Link>
          <p className="text-sm text-muted-foreground mt-4">
            Join thousands creating magical ASMR content
          </p>
        </div>
      </div>
    </div>
  );
}
