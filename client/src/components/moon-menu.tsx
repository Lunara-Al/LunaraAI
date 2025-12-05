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
    <div className="fixed top-3 right-3 md:top-4 md:right-4 z-50">
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            className="relative group bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm border border-purple-200/50 dark:border-slate-700/50 shadow-md hover:shadow-lg transition-all duration-300 hover:bg-white/80 dark:hover:bg-slate-800/80"
            data-testid="button-moon-menu"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/12 to-secondary/12 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <img 
              src={logoImage} 
              alt="Lunara AI Logo" 
              className="w-5 h-5 rounded-lg object-cover relative z-10 group-hover:scale-110 transition-transform duration-300"
            />
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-[85vw] max-w-sm bg-white/97 dark:bg-slate-900/95 backdrop-blur-xl border-purple-100/40 dark:border-slate-800">
          <SheetHeader>
            <SheetTitle className="text-2xl bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent font-bold">
              Lunara AI
            </SheetTitle>
            <SheetDescription className="text-slate-600 dark:text-slate-400">
              Navigate to different sections
            </SheetDescription>
          </SheetHeader>
          
          <div className="mt-8 space-y-2">
            {menuItems.map((item, index) => {
              const Icon = item.icon;
              const isActive = location === item.path;
              
              return (
                <Link key={item.path} href={item.path}>
                  <Button
                    variant={isActive ? "default" : "ghost"}
                    className={`w-full justify-start gap-3 h-12 transition-all duration-200 ${
                      isActive 
                        ? "bg-gradient-to-r from-primary to-secondary text-white shadow-lg" 
                        : "text-slate-700 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-slate-800/80"
                    }`}
                    onClick={() => setIsOpen(false)}
                    data-testid={item.testId}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <Icon className={`w-5 h-5 ${isActive ? "" : "text-primary/75 dark:text-primary/65"}`} />
                    <span className="text-base font-medium">{item.label}</span>
                  </Button>
                </Link>
              );
            })}
          </div>

          <div className="absolute bottom-4 left-0 right-0 px-6">
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/12 to-secondary/12 dark:from-primary/12 dark:to-secondary/12 p-4 border border-primary/20 dark:border-primary/25 shadow-md">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent opacity-50" />
              <div className="relative space-y-2">
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-400 hover:text-primary dark:hover:text-primary transition-colors cursor-pointer">
                  <SiTiktok className="w-4 h-4" />
                  <span className="text-xs font-medium">@lunaralabsai</span>
                </div>
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-400 hover:text-secondary dark:hover:text-secondary transition-colors cursor-pointer">
                  <SiInstagram className="w-4 h-4" />
                  <span className="text-xs font-medium">@lunaralabsai</span>
                </div>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
