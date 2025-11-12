import { Moon, Home, User, Crown, Settings, Mail } from "lucide-react";
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

export default function MoonMenu() {
  const [location] = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const menuItems = [
    { icon: Home, label: "Home", path: "/", testId: "nav-home" },
    { icon: User, label: "Profile", path: "/profile", testId: "nav-profile" },
    { icon: Crown, label: "Membership", path: "/membership", testId: "nav-membership" },
    { icon: Settings, label: "Settings", path: "/settings", testId: "nav-settings" },
    { icon: Mail, label: "Contact", path: "/contact", testId: "nav-contact" },
  ];

  return (
    <div className="fixed top-3 right-3 md:top-4 md:right-4 z-10">
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" data-testid="button-moon-menu">
            <Moon className="w-5 h-5 md:w-6 md:h-6 text-primary" />
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-[85vw] max-w-sm">
          <SheetHeader>
            <SheetTitle className="text-xl md:text-2xl bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Lunara AI
            </SheetTitle>
            <SheetDescription>
              Navigate to different sections
            </SheetDescription>
          </SheetHeader>
          
          <div className="mt-8 space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.path;
              
              return (
                <Link key={item.path} href={item.path}>
                  <Button
                    variant={isActive ? "default" : "ghost"}
                    className="w-full justify-start gap-3 h-12"
                    onClick={() => setIsOpen(false)}
                    data-testid={item.testId}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-base">{item.label}</span>
                  </Button>
                </Link>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
