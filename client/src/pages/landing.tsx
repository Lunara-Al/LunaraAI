import { Sparkles, Video, Zap, Crown, Moon } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import logoImage from "@assets/image_1763580355366.jpeg";

export default function Landing() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-white dark:bg-black">
      {/* Glass header with blur */}
      <header className="glass sticky top-0 z-50 px-4 py-4 md:px-8 md:py-6 flex justify-between items-center backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="relative">
            <img 
              src={logoImage} 
              alt="Lunara AI Logo" 
              className="w-10 h-10 md:w-12 md:h-12 rounded-xl object-cover moon-glow"
            />
          </div>
          <span className="text-xl md:text-3xl font-bold bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent">
            Lunara AI
          </span>
        </div>
        
        <Button 
          onClick={() => setLocation('/login')}
          className="bg-gradient-to-r from-primary to-secondary moon-glow"
          data-testid="button-login"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          Sign In
        </Button>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12 md:py-20 bg-gradient-to-br from-white via-white to-slate-50 dark:from-black dark:via-black dark:to-slate-950">
        <div className="max-w-6xl mx-auto text-center space-y-12">
          {/* Hero Section */}
          <div className="space-y-8">
            <div className="relative inline-block">
              <div className="absolute inset-0 blur-3xl bg-gradient-to-r from-primary/30 via-secondary/30 to-primary/30 rounded-full" />
              <h1 className="relative text-5xl md:text-7xl lg:text-8xl font-bold bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent animate-in fade-in slide-in-from-bottom-4 duration-700">
                Create Cosmic
                <br />
                ASMR Videos
              </h1>
            </div>
            
            <p className="text-lg md:text-2xl text-muted-foreground max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150">
              Transform your imagination into mesmerizing visual experiences with AI-powered video generation
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
              <Button 
                onClick={() => setLocation('/register')}
                size="lg"
                className="bg-gradient-to-r from-primary to-secondary text-lg px-10 py-7 moon-glow text-base md:text-lg"
                data-testid="button-get-started"
              >
                <Sparkles className="w-5 h-5 mr-2" />
                Get Started Basic
              </Button>
              
              <Button 
                onClick={() => setLocation('/login')}
                size="lg"
                variant="outline"
                className="text-lg px-10 py-7 text-base md:text-lg"
              >
                <Moon className="w-5 h-5 mr-2" />
                Sign In
              </Button>
            </div>
          </div>

          {/* Feature Cards with Glass Effect */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-500">
            <Card className="p-8 space-y-4 hover-elevate group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 relative overflow-hidden transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative inline-block">
                <div className="absolute inset-0 blur-2xl bg-primary/20 rounded-full group-hover:bg-primary/30 transition-all" />
                <Video className="w-14 h-14 text-primary mx-auto relative" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">AI-Powered</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Advanced AI creates stunning cosmic ASMR videos from your text prompts
              </p>
            </Card>
            
            <Card className="p-8 space-y-4 hover-elevate group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 relative overflow-hidden transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative inline-block">
                <div className="absolute inset-0 blur-2xl bg-secondary/20 rounded-full group-hover:bg-secondary/30 transition-all" />
                <Zap className="w-14 h-14 text-secondary mx-auto relative" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Lightning Fast</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Generate professional-quality videos in seconds, not hours
              </p>
            </Card>
            
            <Card className="p-8 space-y-4 hover-elevate group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 relative overflow-hidden transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative inline-block">
                <div className="absolute inset-0 blur-2xl bg-primary/20 rounded-full group-hover:bg-primary/30 transition-all" />
                <Crown className="w-14 h-14 text-primary mx-auto relative" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Premium Quality</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                From basic to 4K quality, choose the perfect plan for your needs
              </p>
            </Card>
          </div>
        </div>
      </main>

      <footer className="glass px-4 py-8 text-center backdrop-blur-xl bg-gradient-to-r from-white/80 to-slate-50/80 dark:from-black/80 dark:to-slate-950/80">
        <div className="flex items-center justify-center gap-2 text-sm text-slate-600 dark:text-slate-400">
          <img 
            src={logoImage} 
            alt="Lunara AI" 
            className="w-5 h-5 rounded-md object-cover"
          />
          <span>Lunara AI - Cosmic Video Generation Platform</span>
        </div>
      </footer>
    </div>
  );
}
