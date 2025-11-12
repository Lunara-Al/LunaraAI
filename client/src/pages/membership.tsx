import { Crown, Check, LogOut, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import MoonMenu from "@/components/moon-menu";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useEffect } from "react";

type SubscriptionStatus = {
  tier: string;
  videosUsed: number;
  videosLimit: number;
  maxLength: number;
  quality: string;
  stripeSubscriptionId?: string;
};

export default function Membership() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  // Fetch subscription status
  const { data: subscription, isLoading: subLoading } = useQuery<SubscriptionStatus>({
    queryKey: ["/api/subscription/status"],
    enabled: isAuthenticated,
  });

  // Handle unauthorized errors
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [isAuthenticated, authLoading, toast]);

  // Upgrade/Subscribe mutation
  const subscribeMutation = useMutation({
    mutationFn: async (tier: string) => {
      // Try real Stripe checkout first (for paid tiers)
      if (tier !== "free") {
        try {
          const response = await apiRequest("POST", "/api/subscription/create", { tier });
          const data = await response.json();
          
          // If Stripe is configured, redirect to checkout
          if (data.url && !data.simulated) {
            window.location.href = data.url;
            return data;
          }
          
          // If simulated, fall through to simulation endpoint
          if (data.simulated) {
            const simResponse = await apiRequest("POST", "/api/subscription/simulate-upgrade", { tier });
            return await simResponse.json();
          }
        } catch (error) {
          // If Stripe checkout fails (e.g., 503), fall back to simulation
          console.warn("Stripe checkout unavailable, using simulation mode", error);
          const simResponse = await apiRequest("POST", "/api/subscription/simulate-upgrade", { tier });
          return await simResponse.json();
        }
      }
      
      // For free tier, use simulation endpoint
      const response = await apiRequest("POST", "/api/subscription/simulate-upgrade", { tier });
      return await response.json();
    },
    onSuccess: (data) => {
      // Don't show toast if redirecting to Stripe checkout
      if (!data.url) {
        toast({
          title: data.simulated ? "Subscription Updated (Simulated)" : "Success",
          description: data.simulated 
            ? "Subscription updated in simulation mode. Add Stripe keys to enable real payments."
            : "Subscription updated successfully!",
        });
        queryClient.invalidateQueries({ queryKey: ["/api/subscription/status"] });
      }
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to update subscription. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Cancel subscription mutation
  const cancelMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/subscription/cancel");
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Subscription Canceled",
        description: "You've been downgraded to the Free plan.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/subscription/status"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to cancel subscription.",
        variant: "destructive",
      });
    },
  });

  const currentTier = subscription?.tier || "free";
  const isLoading = authLoading || subLoading;

  const handleUpgrade = (tier: string) => {
    subscribeMutation.mutate(tier);
  };

  const handleCancel = () => {
    if (confirm("Are you sure you want to cancel your subscription and downgrade to Free?")) {
      cancelMutation.mutate();
    }
  };

  return (
    <div className="min-h-screen px-4 py-8 md:p-8 bg-gradient-to-br from-background via-background to-card">
      <MoonMenu />
      
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="text-center space-y-3">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent">
            Membership
          </h1>
          <p className="text-muted-foreground">Choose the perfect plan for your cosmic journey</p>
          
          {!isLoading && subscription && (
            <Card className="inline-flex items-center gap-3 px-6 py-3">
              <Badge className="capitalize moon-glow">{currentTier}</Badge>
              <span className="text-sm text-muted-foreground font-medium">
                {subscription.videosLimit === -1 
                  ? `${subscription.videosUsed} videos created this month`
                  : `${subscription.videosUsed}/${subscription.videosLimit} videos used`}
              </span>
            </Card>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Free Tier */}
            <Card className={`p-8 space-y-6 ${currentTier === "free" ? "ring-2 ring-primary moon-glow" : ""}`}>
              {currentTier === "free" && (
                <Badge className="moon-glow">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Current Plan
                </Badge>
              )}
              
              <div className="space-y-3">
                <h2 className="text-3xl font-bold">Free</h2>
                <p className="text-4xl font-bold">$0<span className="text-base text-muted-foreground font-normal">/month</span></p>
              </div>
              
              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm">5 videos per month</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm">Up to 5 seconds</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm">Basic quality</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm">Lunar AI watermark</span>
                </li>
              </ul>
              
              {currentTier === "free" ? (
                <Button variant="outline" className="w-full" disabled>Current Plan</Button>
              ) : (
                <Button 
                  variant="outline" 
                  className="w-full" 
                  onClick={handleCancel}
                  disabled={cancelMutation.isPending}
                  data-testid="button-downgrade-free"
                >
                  {cancelMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <LogOut className="w-4 h-4 mr-2" />}
                  Downgrade to Free
                </Button>
              )}
            </Card>

            {/* Pro Tier */}
            <Card className={`p-8 space-y-6 relative ring-2 ring-primary ${currentTier === "pro" ? "moon-glow" : ""}`}>
              {currentTier === "pro" ? (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 moon-glow">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Current Plan
                </Badge>
              ) : (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-primary to-secondary moon-glow">
                  <Crown className="w-3 h-3 mr-1" />
                  Popular
                </Badge>
              )}
              
              <div className="space-y-3">
                <h2 className="text-3xl font-bold">Pro</h2>
                <p className="text-4xl font-bold">$19<span className="text-base text-muted-foreground font-normal">/month</span></p>
              </div>
              
              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm">100 videos per month</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm">Up to 10 seconds</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm">HD quality</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm">Faster generation</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm">No watermark</span>
                </li>
              </ul>
              
              {currentTier === "pro" ? (
                <Button variant="outline" className="w-full" disabled>Current Plan</Button>
              ) : (
                <Button 
                  className="w-full bg-gradient-to-r from-primary to-secondary moon-glow" 
                  onClick={() => handleUpgrade("pro")}
                  disabled={subscribeMutation.isPending}
                  data-testid="button-upgrade-pro"
                >
                  {subscribeMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                  {currentTier === "premium" ? "Downgrade to Pro" : "Upgrade to Pro"}
                </Button>
              )}
            </Card>

            {/* Premium Tier */}
            <Card className={`p-8 space-y-6 ${currentTier === "premium" ? "ring-2 ring-primary moon-glow" : ""}`}>
              {currentTier === "premium" && (
                <Badge className="moon-glow">
                  <Crown className="w-3 h-3 mr-1" />
                  Current Plan
                </Badge>
              )}
              
              <div className="space-y-3">
                <h2 className="text-3xl font-bold flex items-center gap-2">
                  Premium
                  <Crown className="w-7 h-7 text-primary" />
                </h2>
                <p className="text-4xl font-bold">$49<span className="text-base text-muted-foreground font-normal">/month</span></p>
              </div>
              
              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm">Unlimited videos</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm">Up to 15 seconds</span>
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
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm">No watermark</span>
                </li>
              </ul>
              
              {currentTier === "premium" ? (
                <Button variant="outline" className="w-full" disabled>Current Plan</Button>
              ) : (
                <Button 
                  className="w-full bg-gradient-to-r from-primary via-secondary to-primary moon-glow" 
                  onClick={() => handleUpgrade("premium")}
                  disabled={subscribeMutation.isPending}
                  data-testid="button-upgrade-premium"
                >
                  {subscribeMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Crown className="w-4 h-4 mr-2" />}
                  Upgrade to Premium
                </Button>
              )}
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
