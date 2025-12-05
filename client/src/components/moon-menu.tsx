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
        <SheetContent side="right" className="w-[85vw] max-w-sm glass-card border-l-2 border-purple-200/50 dark:border-purple-500/30">
          <SheetHeader className="pb-4 border-b border-purple-100/40 dark:border-purple-500/20">
            <SheetTitle className="text-3xl bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent font-bold animate-fade-in-up">
              Lunara AI
            </SheetTitle>
            <SheetDescription className="text-slate-600 dark:text-slate-400 text-sm mt-2">
              Cosmic ASMR Video Creation
            </SheetDescription>
          </SheetHeader>
          
          <div className="mt-6 space-y-1.5">
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
          </div>

          <div className="mt-8 pt-6 border-t border-purple-100/40 dark:border-purple-500/20">
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-3 uppercase tracking-wider">Follow Us</p>
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/15 to-secondary/12 dark:from-primary/20 dark:to-secondary/15 p-4 border border-primary/25 dark:border-primary/30 shadow-md hover-elevate transition-all duration-300">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent opacity-40" />
              <div className="relative space-y-3">
                <a href="https://tiktok.com/@lunaralabsai" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-slate-700 dark:text-slate-300 hover:text-primary dark:hover:text-primary transition-all duration-200 hover:translate-x-1 cursor-pointer group">
                  <div className="p-2 rounded-lg bg-white/50 dark:bg-slate-800/50 group-hover:bg-primary/20 transition-colors duration-200">
                    <SiTiktok className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-medium">@lunaralabsai</span>
                </a>
                <a href="https://instagram.com/lunaralabsai" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-slate-700 dark:text-slate-300 hover:text-secondary dark:hover:text-secondary transition-all duration-200 hover:translate-x-1 cursor-pointer group">
                  <div className="p-2 rounded-lg bg-white/50 dark:bg-slate-800/50 group-hover:bg-secondary/20 transition-colors duration-200">
                    <SiInstagram className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-medium">@lunaralabsai</span>
                </a>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
