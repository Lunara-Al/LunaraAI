import { Crown, Check, X, Loader2, Sparkles, TrendingDown, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import MoonMenu from "@/components/moon-menu";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

type SubscriptionStatus = {
  tier: string;
  videosUsed: number;
  videosLimit: number;
  maxLength: number;
  quality: string;
  credits: number;
  monthlyCreditsAllocated: number;
  stripeSubscriptionId?: string;
};

export default function Membership() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [downgradeDialogOpen, setDowngradeDialogOpen] = useState(false);
  const [targetDowngradeTier, setTargetDowngradeTier] = useState<string | null>(null);

  // Fetch subscription status
  const { data: subscription, isLoading: subLoading, refetch } = useQuery<SubscriptionStatus>({
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
      if (tier !== "free") {
        try {
          const response = await apiRequest("POST", "/api/subscription/create", { tier });
          const data = await response.json();
          
          if (data.url && !data.simulated) {
            window.location.href = data.url;
            return data;
          }
          
          if (data.simulated) {
            const simResponse = await apiRequest("POST", "/api/subscription/simulate-upgrade", { tier });
            return await simResponse.json();
          }
        } catch (error) {
          console.warn("Stripe checkout unavailable, using simulation mode", error);
          const simResponse = await apiRequest("POST", "/api/subscription/simulate-upgrade", { tier });
          return await simResponse.json();
        }
      }
      
      const response = await apiRequest("POST", "/api/subscription/simulate-upgrade", { tier });
      return await response.json();
    },
    onSuccess: (data) => {
      if (!data.url) {
        toast({
          title: data.simulated ? "Subscription Updated (Simulated)" : "Success",
          description: data.simulated 
            ? "Subscription updated in simulation mode. Add Stripe keys to enable real payments."
            : "Subscription updated successfully!",
        });
        refetch();
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

  // Downgrade subscription mutation
  const downgradeMutation = useMutation({
    mutationFn: async (tier: string) => {
      const response = await apiRequest("POST", "/api/subscription/downgrade", { tier });
      return await response.json();
    },
    onSuccess: (data) => {
      setDowngradeDialogOpen(false);
      toast({
        title: "Downgrade Successful",
        description: data.message || "Your subscription has been downgraded.",
      });
      if (data.creditApplied) {
        toast({
          title: "Credits Allocated",
          description: "You've received credits for your new tier.",
          variant: "default",
        });
      }
      refetch();
    },
    onError: (error: any) => {
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
        description: error?.message || "Failed to downgrade subscription.",
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
      refetch();
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
      });
    },
  });

  const currentTier = subscription?.tier || "free";
  const isLoading = authLoading || subLoading;

  const handleUpgrade = (tier: string) => {
    subscribeMutation.mutate(tier);
  };

  const handleInitiateDowngrade = (tier: string) => {
    setTargetDowngradeTier(tier);
    setDowngradeDialogOpen(true);
  };

  const handleConfirmDowngrade = () => {
    if (targetDowngradeTier) {
      downgradeMutation.mutate(targetDowngradeTier);
    }
  };

  const handleCancel = () => {
    if (confirm("Are you sure you want to cancel your subscription and downgrade to Free?")) {
      cancelMutation.mutate();
    }
  };

  // Credit display component
  const CreditDisplay = ({ credits, monthlyCredits }: { credits: number; monthlyCredits: number }) => (
    <div className="mt-4 p-4 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg border border-primary/20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-primary" />
          <span className="text-sm font-medium">Monthly Credits</span>
        </div>
        <span className="text-lg font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          {credits} / {monthlyCredits}
        </span>
      </div>
      <div className="w-full bg-background rounded-full h-2 mt-2 overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-500"
          style={{ width: `${Math.min((credits / monthlyCredits) * 100, 100)}%` }}
        />
      </div>
    </div>
  );

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
            <Card className="inline-flex flex-col items-center gap-3 px-6 py-4">
              <div className="flex items-center gap-3">
                <Badge className="capitalize moon-glow">{currentTier}</Badge>
                <span className="text-sm text-muted-foreground font-medium">
                  {subscription.videosLimit === -1 
                    ? `${subscription.videosUsed} videos created this month`
                    : `${subscription.videosUsed}/${subscription.videosLimit} videos used`}
                </span>
              </div>
              <CreditDisplay credits={subscription.credits} monthlyCredits={subscription.monthlyCreditsAllocated} />
            </Card>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-muted-foreground text-sm">Loading plans...</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-500">
            {/* Free Tier */}
            <Card className={`p-8 space-y-6 transition-all duration-300 hover-elevate ${currentTier === "free" ? "ring-2 ring-primary moon-glow" : ""} animate-in fade-in slide-in-from-bottom-4`} style={{ animationDelay: '0ms' }}>
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
                  <span className="text-sm">Up to 10 seconds</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm">Basic quality</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm">25 monthly credits</span>
                </li>
              </ul>

              <div className="pt-4 border-t border-border/50">
                <div className="text-sm text-muted-foreground mb-2">Monthly Credits</div>
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-primary" />
                  <span className="font-bold text-lg text-primary">25</span>
                </div>
              </div>
              
              {currentTier === "free" && (
                <Button variant="outline" className="w-full" disabled>Current Plan</Button>
              )}
            </Card>

            {/* Pro Tier */}
            <Card className={`p-8 space-y-6 relative ring-2 ring-primary transition-all duration-300 hover-elevate scale-105 ${currentTier === "pro" ? "moon-glow" : ""} animate-in fade-in slide-in-from-bottom-4`} style={{ animationDelay: '100ms' }}>
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
                  <span className="text-sm">Up to 15 seconds</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm">HD quality</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm">300 monthly credits</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm">No watermark</span>
                </li>
              </ul>

              <div className="pt-4 border-t border-border/50">
                <div className="text-sm text-muted-foreground mb-2">Monthly Credits</div>
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-primary" />
                  <span className="font-bold text-lg text-primary">300</span>
                </div>
              </div>
              
              {currentTier === "pro" ? (
                <div className="space-y-3">
                  <Button variant="outline" className="w-full" disabled>Current Plan</Button>
                  <Button 
                    variant="destructive" 
                    className="w-full" 
                    onClick={handleCancel}
                    disabled={cancelMutation.isPending}
                    data-testid="button-cancel-pro"
                  >
                    {cancelMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <X className="w-4 h-4 mr-2" />}
                    Cancel Subscription
                  </Button>
                </div>
              ) : (
                <Button 
                  className="w-full bg-gradient-to-r from-primary to-secondary moon-glow" 
                  onClick={() => handleUpgrade("pro")}
                  disabled={subscribeMutation.isPending}
                  data-testid="button-upgrade-pro"
                >
                  {subscribeMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                  Upgrade to Pro
                </Button>
              )}
            </Card>

            {/* Premium Tier */}
            <Card className={`p-8 space-y-6 transition-all duration-300 hover-elevate ${currentTier === "premium" ? "ring-2 ring-primary moon-glow" : ""} animate-in fade-in slide-in-from-bottom-4`} style={{ animationDelay: '200ms' }}>
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
                  <span className="text-sm">1,000 monthly credits</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm">Priority support</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm">Commercial license</span>
                </li>
              </ul>

              <div className="pt-4 border-t border-border/50">
                <div className="text-sm text-muted-foreground mb-2">Monthly Credits</div>
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-primary" />
                  <span className="font-bold text-lg text-primary">1,000</span>
                </div>
              </div>
              
              {currentTier === "premium" ? (
                <div className="space-y-3">
                  <Button variant="outline" className="w-full" disabled>Current Plan</Button>
                  <Button 
                    variant="secondary" 
                    className="w-full" 
                    onClick={() => handleInitiateDowngrade("pro")}
                    disabled={downgradeMutation.isPending}
                    data-testid="button-downgrade-premium"
                  >
                    {downgradeMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <TrendingDown className="w-4 h-4 mr-2" />}
                    Downgrade to Pro
                  </Button>
                  <Button 
                    variant="destructive" 
                    className="w-full" 
                    onClick={handleCancel}
                    disabled={cancelMutation.isPending}
                    data-testid="button-cancel-premium"
                  >
                    {cancelMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <X className="w-4 h-4 mr-2" />}
                    Cancel Subscription
                  </Button>
                </div>
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

      {/* Downgrade Confirmation Dialog */}
      <Dialog open={downgradeDialogOpen} onOpenChange={setDowngradeDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-primary" />
              Downgrade to Pro?
            </DialogTitle>
            <DialogDescription>
              You're about to downgrade from Premium to Pro. You'll retain your Pro tier benefits, and any unused credits will be converted.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="rounded-lg bg-destructive/10 p-4 border border-destructive/20">
              <p className="text-sm font-medium text-destructive mb-2">Changes:</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Video limit: Unlimited → 100/month</li>
                <li>• Monthly credits: 1,000 → 300</li>
                <li>• Quality: 4K → HD</li>
              </ul>
            </div>

            <div className="rounded-lg bg-primary/10 p-4 border border-primary/20">
              <p className="text-sm font-medium text-primary mb-2">Benefits:</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Still get 300 monthly credits</li>
                <li>• HD quality generation</li>
                <li>• 100 videos per month</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setDowngradeDialogOpen(false)}
              disabled={downgradeMutation.isPending}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={handleConfirmDowngrade}
              disabled={downgradeMutation.isPending}
            >
              {downgradeMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Confirm Downgrade
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
