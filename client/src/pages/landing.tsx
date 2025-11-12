import { Sparkles } from "lucide-react";
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
        <div className="max-w-3xl mx-auto text-center space-y-8">
          <div className="space-y-6">
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent animate-in fade-in slide-in-from-bottom-4 duration-700">
              Lunara AI
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150">
              Create cosmic ASMR videos with AI
            </p>
          </div>

          <Button 
            onClick={() => window.location.href = '/api/login'}
            size="lg"
            className="bg-gradient-to-r from-primary to-secondary text-lg px-8 py-6 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300"
            data-testid="button-get-started"
          >
            <Sparkles className="w-5 h-5 mr-2" />
            Get Started
          </Button>
        </div>
      </main>

      <footer className="px-4 py-6 border-t border-card-border text-center text-sm text-muted-foreground">
        <p>Lunara AI - Cosmic Video Generation Platform</p>
      </footer>
    </div>
  );
}
