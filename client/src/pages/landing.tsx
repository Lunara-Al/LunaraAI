import { Sparkles, Video, Zap, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Landing() {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="fixed inset-0 bg-gradient-to-br from-background via-background to-card -z-10" />
      
      <header className="px-4 py-4 md:px-8 md:py-6 flex justify-between items-center border-b border-card-border">
        <div className="flex items-center gap-2">
          <Sparkles className="w-6 h-6 md:w-8 md:h-8 text-primary" />
          <span className="text-xl md:text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Lunara AI
          </span>
        </div>
        
        <Button 
          onClick={() => window.location.href = '/api/login'}
          className="bg-gradient-to-r from-primary to-secondary"
          data-testid="button-login"
        >
          Sign In
        </Button>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12 md:py-20">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="space-y-4">
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent animate-in fade-in slide-in-from-bottom-4 duration-700">
              Create Cosmic ASMR Videos
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150">
              Transform your text into mesmerizing visual experiences with AI-powered video generation
            </p>
          </div>

          <Button 
            onClick={() => window.location.href = '/api/login'}
            size="lg"
            className="bg-gradient-to-r from-primary to-secondary text-lg px-8 py-6 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300"
            data-testid="button-get-started"
          >
            <Sparkles className="w-5 h-5 mr-2" />
            Get Started Free
          </Button>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-12 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-500">
            <div className="bg-card border border-card-border rounded-lg p-6 space-y-3">
              <Video className="w-10 h-10 text-primary mx-auto" />
              <h3 className="text-lg font-semibold">AI-Powered</h3>
              <p className="text-sm text-muted-foreground">
                Advanced AI creates stunning cosmic ASMR videos from your text prompts
              </p>
            </div>
            
            <div className="bg-card border border-card-border rounded-lg p-6 space-y-3">
              <Zap className="w-10 h-10 text-primary mx-auto" />
              <h3 className="text-lg font-semibold">Lightning Fast</h3>
              <p className="text-sm text-muted-foreground">
                Generate professional-quality videos in seconds, not hours
              </p>
            </div>
            
            <div className="bg-card border border-card-border rounded-lg p-6 space-y-3">
              <Crown className="w-10 h-10 text-primary mx-auto" />
              <h3 className="text-lg font-semibold">Premium Quality</h3>
              <p className="text-sm text-muted-foreground">
                From basic to 4K quality, choose the perfect plan for your needs
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer className="px-4 py-6 border-t border-card-border text-center text-sm text-muted-foreground">
        <p>Lunara AI - Cosmic Video Generation Platform</p>
      </footer>
    </div>
  );
}
