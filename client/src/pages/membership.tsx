import { Crown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import MoonMenu from "@/components/moon-menu";

export default function Membership() {
  return (
    <div className="min-h-screen px-4 py-8 md:p-8 bg-gradient-to-br from-background via-background to-card">
      <MoonMenu />
      
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="text-center space-y-3">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent">
            Membership
          </h1>
          <p className="text-muted-foreground">Choose the perfect plan for your cosmic journey</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Free Tier */}
          <div className="bg-card border border-card-border rounded-lg p-6 space-y-6">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">Free</h2>
              <p className="text-3xl font-bold">$0<span className="text-sm text-muted-foreground">/month</span></p>
            </div>
            
            <ul className="space-y-3">
              <li className="flex items-start gap-2">
                <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-sm">5 videos per month</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-sm">Up to 10 seconds</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-sm">Basic quality</span>
              </li>
            </ul>
            
            <Button variant="outline" className="w-full">Current Plan</Button>
          </div>

          {/* Pro Tier */}
          <div className="bg-card border-2 border-primary rounded-lg p-6 space-y-6 relative">
            <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-primary to-secondary">
              Popular
            </Badge>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">Pro</h2>
              <p className="text-3xl font-bold">$19<span className="text-sm text-muted-foreground">/month</span></p>
            </div>
            
            <ul className="space-y-3">
              <li className="flex items-start gap-2">
                <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-sm">50 videos per month</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-sm">Up to 15 seconds</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-sm">HD quality</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-sm">Faster generation</span>
              </li>
            </ul>
            
            <Button className="w-full bg-gradient-to-r from-primary to-secondary">Upgrade to Pro</Button>
          </div>

          {/* Premium Tier */}
          <div className="bg-card border border-card-border rounded-lg p-6 space-y-6">
            <div className="space-y-2 flex items-center gap-2">
              <h2 className="text-2xl font-bold">Premium</h2>
              <Crown className="w-6 h-6 text-primary" />
            </div>
            <p className="text-3xl font-bold">$49<span className="text-sm text-muted-foreground">/month</span></p>
            
            <ul className="space-y-3">
              <li className="flex items-start gap-2">
                <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-sm">Unlimited videos</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-sm">Up to 30 seconds</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-sm">4K quality</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-sm">Priority generation</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-sm">Commercial license</span>
              </li>
            </ul>
            
            <Button variant="outline" className="w-full">Upgrade to Premium</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
