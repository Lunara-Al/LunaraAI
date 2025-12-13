import { Home, User, Crown, Settings, Mail, Film } from "lucide-react";
import { SiTiktok, SiInstagram } from "react-icons/si";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useState } from "react";
import logoImage from "@assets/image_1763580355366.jpeg";

export default function MoonMenu() {
  const [location] = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const menuItems = [
    { icon: Home, label: "Home", path: "/", testId: "nav-home" },
    { icon: Film, label: "Gallery", path: "/gallery", testId: "nav-gallery" },
    { icon: User, label: "Profile", path: "/profile", testId: "nav-profile" },
    { icon: Crown, label: "Membership", path: "/membership", testId: "nav-membership" },
    { icon: Settings, label: "Settings", path: "/settings", testId: "nav-settings" },
    { icon: Mail, label: "Contact", path: "/contact", testId: "nav-contact" },
  ];

  return (
    <div className="fixed top-4 right-4 z-50">
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            className="relative group w-12 h-12 rounded-full bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 backdrop-blur-md border-2 border-purple-200/60 dark:border-purple-500/40 shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95"
            data-testid="button-moon-menu"
          >
            {/* Animated glow background */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20 dark:from-primary/30 dark:to-secondary/30 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 blur-md" />
            
            {/* Pulsing ring effect */}
            <div className="absolute inset-0 rounded-full border border-primary/30 dark:border-primary/50 group-hover:animate-pulse-glow" />
            
            <img 
              src={logoImage} 
              alt="Lunara AI Logo" 
              className="w-6 h-6 rounded-lg object-cover relative z-10 group-hover:scale-125 transition-transform duration-300"
            />
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-[85vw] max-w-sm glass-card border-l-2 border-purple-200/50 dark:border-purple-500/30 flex flex-col p-0">
          <SheetHeader className="px-6 py-4 border-b border-purple-100/40 dark:border-purple-500/20 flex-shrink-0">
            <SheetTitle className="text-3xl bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent font-bold animate-fade-in-up">
              Lunara AI
            </SheetTitle>
            <SheetDescription className="text-slate-600 dark:text-slate-400 text-sm mt-2">
              Cosmic ASMR Video Creation
            </SheetDescription>
          </SheetHeader>
          
          <div className="flex-1 overflow-y-auto px-6 pt-4 pb-6 space-y-1.5">
            {menuItems.map((item, index) => {
              const Icon = item.icon;
              const isActive = location === item.path;
              
              return (
                <Link key={item.path} href={item.path}>
                  <Button
                    variant={isActive ? "default" : "ghost"}
                    className={`w-full justify-start gap-4 h-11 transition-all duration-200 font-medium ${
                      isActive 
                        ? "bg-gradient-to-r from-primary to-secondary text-white shadow-lg hover-elevate" 
                        : "text-slate-700 dark:text-slate-300 hover:bg-gradient-to-r hover:from-primary/10 hover:to-secondary/10 dark:hover:from-primary/15 dark:hover:to-secondary/15"
                    }`}
                    onClick={() => setIsOpen(false)}
                    data-testid={item.testId}
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? "text-white" : "text-primary/80 dark:text-primary/70"}`} />
                    <span className="text-base">{item.label}</span>
                  </Button>
                </Link>
              );
            })}

            <div className="pt-4 mt-4 border-t border-purple-100/40 dark:border-purple-500/20">
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-4 uppercase tracking-wider opacity-75">Follow Us</p>
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/12 via-secondary/8 to-primary/10 dark:from-primary/18 dark:via-secondary/12 dark:to-primary/15 p-5 border-2 border-primary/25 dark:border-primary/35 shadow-md hover:shadow-lg transition-all duration-300">
                {/* Enhanced background glow */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/15 via-transparent to-secondary/10 opacity-40 pointer-events-none rounded-2xl" />
                
                <div className="relative space-y-3">
                  {/* TikTok Link */}
                  <a 
                    href="https://tiktok.com/@lunaralabsai" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    aria-label="Follow Lunara AI on TikTok"
                    className="flex items-center gap-3 transition-all duration-300 hover:translate-x-1 cursor-pointer group/social rounded-xl p-2.5 hover:bg-black/5 dark:hover:bg-white/8"
                  >
                    <div className="relative flex items-center justify-center flex-shrink-0">
                      {/* Outer glow for TikTok */}
                      <div className="absolute inset-0 bg-gradient-to-br from-black/20 to-black/0 dark:from-black/50 dark:to-black/30 rounded-xl opacity-0 group-hover/social:opacity-100 transition-opacity duration-300 blur-sm scale-150" />
                      
                      {/* Icon container */}
                      <div className="relative p-3 rounded-xl bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-900 dark:to-slate-950 border-2 border-slate-200/60 dark:border-slate-700/50 shadow-md group-hover/social:shadow-xl group-hover/social:border-black/50 dark:group-hover/social:border-white/40 transition-all duration-300">
                        <SiTiktok className="w-5 h-5 text-black dark:text-white group-hover/social:scale-125 group-hover/social:-rotate-12 transition-all duration-300 flex-shrink-0" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-bold bg-gradient-to-r from-pink-600 to-purple-600 dark:from-pink-400 dark:to-purple-400 bg-clip-text text-transparent transition-all duration-300">@lunaralabsai</span>
                      <p className="text-xs text-slate-500 dark:text-slate-400 group-hover/social:text-slate-700 dark:group-hover/social:text-slate-300 transition-colors duration-300">TikTok</p>
                    </div>
                    <div className="w-1.5 h-1.5 rounded-full bg-black dark:bg-white opacity-0 group-hover/social:opacity-100 transition-opacity duration-300 flex-shrink-0" />
                  </a>

                  {/* Instagram Link */}
                  <a 
                    href="https://instagram.com/lunaralabsai" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    aria-label="Follow Lunara AI on Instagram"
                    className="flex items-center gap-3 transition-all duration-300 hover:translate-x-1 cursor-pointer group/social rounded-xl p-2.5 hover:bg-black/5 dark:hover:bg-white/8"
                  >
                    <div className="relative flex items-center justify-center flex-shrink-0">
                      {/* Outer glow for Instagram */}
                      <div className="absolute inset-0 bg-gradient-to-br from-pink-400/30 via-purple-400/20 to-pink-400/10 dark:from-pink-500/50 dark:via-purple-500/40 dark:to-pink-500/20 rounded-xl opacity-0 group-hover/social:opacity-100 transition-opacity duration-300 blur-md scale-150" />
                      
                      {/* Icon container - matching TikTok style */}
                      <div className="relative p-3 rounded-xl bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-900 dark:to-slate-950 border-2 border-slate-200/60 dark:border-slate-700/50 shadow-md group-hover/social:shadow-xl group-hover/social:border-pink-400/50 dark:group-hover/social:border-pink-400/50 transition-all duration-300">
                        <SiInstagram className="w-5 h-5 bg-gradient-to-br from-yellow-400 via-pink-500 to-purple-600 dark:from-yellow-300 dark:via-pink-400 dark:to-purple-500 bg-clip-text text-transparent group-hover/social:scale-125 group-hover/social:rotate-12 transition-all duration-300 flex-shrink-0" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-bold bg-gradient-to-r from-pink-600 to-purple-600 dark:from-pink-400 dark:to-purple-400 bg-clip-text text-transparent transition-all duration-300">@lunaralabsai</span>
                      <p className="text-xs text-slate-500 dark:text-slate-400 group-hover/social:text-slate-700 dark:group-hover/social:text-slate-300 transition-colors duration-300">Instagram</p>
                    </div>
                    <div className="w-1.5 h-1.5 rounded-full bg-black dark:bg-white opacity-0 group-hover/social:opacity-100 transition-opacity duration-300 flex-shrink-0" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
