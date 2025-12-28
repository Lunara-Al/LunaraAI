import { Crown, Check, X, Loader2, Sparkles, TrendingDown, Zap, Calendar, TrendingUp, Infinity, ChevronDown } from "lucide-react";
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
  const [showContentCalendarDetails, setShowContentCalendarDetails] = useState(false);

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
        description: "You've been downgraded to the Basic plan.",
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
        variant: "destructive",
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
    if (confirm("Are you sure you want to cancel your subscription and downgrade to Basic?")) {
      cancelMutation.mutate();
    }
  };

  // Format video limit for display
  const formatVideoLimit = (limit: number) => {
    return limit === -1 ? "Unlimited" : limit.toString();
  };

  // Credit display component
  const CreditDisplay = ({ credits, monthlyCredits }: { credits: number; monthlyCredits: number }) => (
    <div className="w-full mt-4 p-4 bg-gradient-to-r from-primary/20 to-secondary/18 dark:from-primary/15 dark:to-secondary/12 rounded-lg border-2 border-primary/40 dark:border-primary/30 shadow-md hover:shadow-lg transition-all duration-300">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-full bg-primary/20 dark:bg-primary/15">
            <Zap className="w-4 h-4 text-primary dark:text-primary" />
          </div>
          <span className="text-sm font-bold text-slate-900 dark:text-white">Monthly Credits</span>
        </div>
        <span className="text-lg font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          {credits} / {monthlyCredits}
        </span>
      </div>
      <div className="w-full bg-slate-200/60 dark:bg-slate-700/60 rounded-full h-2.5 overflow-hidden border border-primary/30 dark:border-primary/20 shadow-inner">
        <div 
          className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-500 shadow-lg shadow-primary/50"
          style={{ width: `${Math.min((credits / monthlyCredits) * 100, 100)}%` }}
        />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen px-4 py-8 md:p-8 bg-gradient-to-br from-white via-purple-50/30 to-pink-50/20 dark:from-black dark:via-black dark:to-slate-950 transition-colors duration-300 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="fixed inset-0 pointer-events-none opacity-25 dark:opacity-20">
        <div className="absolute top-20 right-1/4 w-72 h-72 bg-primary/20 dark:bg-primary/15 rounded-full blur-3xl animate-float-slow" />
        <div className="absolute bottom-20 left-1/4 w-64 h-64 bg-secondary/20 dark:bg-secondary/15 rounded-full blur-3xl animate-float" style={{ animationDelay: '1.5s' }} />
      </div>

      <MoonMenu />
      
      <div className="max-w-6xl mx-auto space-y-8 relative z-10 animate-fade-in-up">
        <div className="text-center space-y-3">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent animate-text-gradient" style={{ backgroundSize: '200% 200%' }}>
            Membership Plans
          </h1>
          <p className="text-muted-foreground animate-fade-in-up" style={{ animationDelay: '100ms' }}>Choose the perfect plan for your cosmic video journey</p>
          
          {!isLoading && subscription && (
            <Card className="inline-flex flex-col items-center gap-4 px-8 py-6 glass-card animate-fade-in-scale bg-gradient-to-br from-white/95 to-slate-50/80 dark:from-slate-900/95 dark:to-slate-900/80 border-2 border-purple-200/60 dark:border-purple-500/40 shadow-lg hover:shadow-xl transition-all duration-300" style={{ animationDelay: '150ms' }}>
              <div className="flex items-center gap-4 flex-wrap justify-center">
                <Badge className={`capitalize text-sm font-bold px-4 py-2 rounded-full transition-all duration-300 ${
                  currentTier === "premium" 
                    ? "bg-gradient-to-r from-primary to-secondary text-white shadow-lg moon-glow" 
                    : currentTier === "pro"
                    ? "bg-gradient-to-r from-primary/90 to-secondary/85 text-white shadow-md moon-glow"
                    : "bg-slate-200/80 dark:bg-slate-700/80 text-slate-900 dark:text-white shadow-sm"
                }`}>{currentTier}</Badge>
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 bg-white/50 dark:bg-slate-800/50 px-3 py-1.5 rounded-lg backdrop-blur-sm">
                  {subscription.videosLimit === -1 
                    ? `${subscription.videosUsed} videos created`
                    : `${subscription.videosUsed}/${subscription.videosLimit} videos this month`}
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
              <p className="text-slate-600 dark:text-slate-400 text-sm">Loading your plan details...</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Basic Tier */}
            <Card className={`p-8 space-y-6 transition-all duration-300 hover:shadow-lg dark:hover:shadow-xl bg-white/90 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 ${currentTier === "free" ? "ring-2 ring-primary moon-glow" : ""} animate-fade-in-up`} style={{ animationDelay: '200ms' }} data-testid="card-plan-free">
              {currentTier === "free" && (
                <Badge className="moon-glow" data-testid="badge-current-free">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Current Plan
                </Badge>
              )}
              
              <div className="space-y-3">
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Basic</h2>
                <p className="text-4xl font-bold text-slate-900 dark:text-white">$0<span className="text-base text-slate-600 dark:text-slate-400 font-normal">/month</span></p>
              </div>
              
              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-slate-900 dark:text-slate-100">5 videos per month</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-slate-900 dark:text-slate-100">Up to 10 seconds</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-slate-900 dark:text-slate-100">Reference images & Styles</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-slate-900 dark:text-slate-100">25 monthly credits</span>
                </li>
              </ul>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-700/50">
                <div className="text-sm text-slate-600 dark:text-slate-400 mb-2">Monthly Credits</div>
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-primary" />
                  <span className="font-bold text-lg text-primary">25</span>
                </div>
              </div>
              
              {currentTier === "free" ? (
                <Button variant="outline" className="w-full" disabled data-testid="button-current-free">Current Plan</Button>
              ) : (
                <Button 
                  variant="secondary" 
                  className="w-full" 
                  onClick={() => handleUpgrade("free")}
                  disabled={subscribeMutation.isPending}
                  data-testid="button-downgrade-to-free"
                >
                  {subscribeMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <TrendingDown className="w-4 h-4 mr-2" />}
                  Downgrade to Basic
                </Button>
              )}
            </Card>

            {/* Pro Tier */}
            <Card className={`p-8 space-y-6 relative ring-2 ring-primary transition-all duration-300 hover:shadow-xl dark:hover:shadow-2xl md:scale-105 bg-white/95 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 ${currentTier === "pro" ? "moon-glow" : ""} animate-fade-in-up`} style={{ animationDelay: '300ms' }} data-testid="card-plan-pro">
              {currentTier === "pro" ? (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 moon-glow" data-testid="badge-current-pro">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Current Plan
                </Badge>
              ) : (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-primary to-secondary moon-glow" data-testid="badge-popular">
                  <Crown className="w-3 h-3 mr-1" />
                  Popular
                </Badge>
              )}
              
              <div className="space-y-3">
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Pro</h2>
                <p className="text-4xl font-bold text-slate-900 dark:text-white">$19<span className="text-base text-slate-600 dark:text-slate-400 font-normal">/month</span></p>
              </div>
              
              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-slate-900 dark:text-slate-100">100 videos per month</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-slate-900 dark:text-slate-100">Up to 15 seconds</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-slate-900 dark:text-slate-100">HD quality</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-slate-900 dark:text-slate-100">300 monthly credits</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-slate-900 dark:text-slate-100">No watermark</span>
                </li>
              </ul>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-700/50">
                <div className="text-sm text-slate-600 dark:text-slate-400 mb-2">Monthly Credits</div>
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-primary" />
                  <span className="font-bold text-lg text-primary">300</span>
                </div>
              </div>
              
              {currentTier === "pro" ? (
                <div className="space-y-3">
                  <Button variant="outline" className="w-full" disabled data-testid="button-current-pro">Current Plan</Button>
                  <Button 
                    variant="destructive" 
                    className="w-full" 
                    onClick={handleCancel}
                    disabled={cancelMutation.isPending}
                    data-testid="button-cancel-pro"
                  >
                    {cancelMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <X className="w-4 h-4 mr-2" />}
                    Cancel & Downgrade
                  </Button>
                </div>
              ) : currentTier === "free" ? (
                <Button 
                  className="w-full bg-gradient-to-r from-primary to-secondary moon-glow" 
                  onClick={() => handleUpgrade("pro")}
                  disabled={subscribeMutation.isPending}
                  data-testid="button-upgrade-pro"
                >
                  {subscribeMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                  Upgrade to Pro
                </Button>
              ) : (
                <Button 
                  variant="secondary" 
                  className="w-full" 
                  onClick={() => handleInitiateDowngrade("pro")}
                  disabled={downgradeMutation.isPending}
                  data-testid="button-downgrade-to-pro"
                >
                  {downgradeMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <TrendingDown className="w-4 h-4 mr-2" />}
                  Downgrade to Pro
                </Button>
              )}
            </Card>

            {/* Premium Tier */}
            <Card className={`p-8 space-y-6 transition-all duration-300 hover:shadow-lg dark:hover:shadow-xl bg-white/90 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 ${currentTier === "premium" ? "ring-2 ring-primary moon-glow" : ""} animate-fade-in-up`} style={{ animationDelay: '400ms' }} data-testid="card-plan-premium">
              {currentTier === "premium" && (
                <Badge className="moon-glow" data-testid="badge-current-premium">
                  <Crown className="w-3 h-3 mr-1" />
                  Current Plan
                </Badge>
              )}
              
              <div className="space-y-3">
                <h2 className="text-3xl font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                  Premium
                  <Crown className="w-7 h-7 text-primary" />
                </h2>
                <p className="text-4xl font-bold text-slate-900 dark:text-white">$49<span className="text-base text-slate-600 dark:text-slate-400 font-normal">/month</span></p>
              </div>
              
              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-slate-900 dark:text-slate-100">Unlimited videos</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-slate-900 dark:text-slate-100">Up to 15 seconds</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-slate-900 dark:text-slate-100">4K quality</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-slate-900 dark:text-slate-100">1,000 monthly credits</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-slate-900 dark:text-slate-100">Priority support</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-slate-900 dark:text-slate-100">Commercial license</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm font-semibold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Content Calendar</span>
                </li>
              </ul>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-700/50">
                <div className="text-sm text-slate-600 dark:text-slate-400 mb-2">Monthly Credits</div>
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-primary" />
                  <span className="font-bold text-lg text-primary">1,000</span>
                </div>
              </div>
              
              {currentTier === "premium" ? (
                <div className="space-y-3">
                  <Button variant="outline" className="w-full" disabled data-testid="button-current-premium">Current Plan</Button>
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
                    Cancel & Downgrade
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

        {/* Features comparison section */}
        <Card className="p-8 mt-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <h3 className="text-2xl font-bold mb-6 text-slate-900 dark:text-white">Feature Comparison</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left py-3 px-4 font-semibold text-slate-900 dark:text-white">Feature</th>
                  <th className="text-center py-3 px-4 text-slate-900 dark:text-white">Free</th>
                  <th className="text-center py-3 px-4 text-slate-900 dark:text-white">Pro</th>
                  <th className="text-center py-3 px-4 text-slate-900 dark:text-white">Premium</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="py-3 px-4 text-slate-900 dark:text-slate-100">Monthly Videos</td>
                  <td className="text-center text-slate-900 dark:text-slate-100">5</td>
                  <td className="text-center text-slate-900 dark:text-slate-100">100</td>
                  <td className="text-center text-slate-900 dark:text-slate-100">Unlimited</td>
                </tr>
                <tr className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="py-3 px-4 text-slate-900 dark:text-slate-100">Max Length</td>
                  <td className="text-center text-slate-900 dark:text-slate-100">10s</td>
                  <td className="text-center text-slate-900 dark:text-slate-100">15s</td>
                  <td className="text-center text-slate-900 dark:text-slate-100">15s</td>
                </tr>
                <tr className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="py-3 px-4 text-slate-900 dark:text-slate-100">Quality</td>
                  <td className="text-center text-slate-900 dark:text-slate-100">Basic</td>
                  <td className="text-center text-slate-900 dark:text-slate-100">HD</td>
                  <td className="text-center text-slate-900 dark:text-slate-100">4K</td>
                </tr>
                <tr className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="py-3 px-4 text-slate-900 dark:text-slate-100">Monthly Credits</td>
                  <td className="text-center text-slate-900 dark:text-slate-100">25</td>
                  <td className="text-center text-slate-900 dark:text-slate-100">300</td>
                  <td className="text-center text-slate-900 dark:text-slate-100">1,000</td>
                </tr>
                <tr className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="py-3 px-4 text-slate-900 dark:text-slate-100">No Watermark</td>
                  <td className="text-center"><X className="w-4 h-4 mx-auto text-slate-400 dark:text-slate-600" /></td>
                  <td className="text-center"><Check className="w-4 h-4 mx-auto text-primary" /></td>
                  <td className="text-center"><Check className="w-4 h-4 mx-auto text-primary" /></td>
                </tr>
                <tr className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="py-3 px-4 text-slate-900 dark:text-slate-100">Priority Support</td>
                  <td className="text-center"><X className="w-4 h-4 mx-auto text-slate-400 dark:text-slate-600" /></td>
                  <td className="text-center"><X className="w-4 h-4 mx-auto text-slate-400 dark:text-slate-600" /></td>
                  <td className="text-center"><Check className="w-4 h-4 mx-auto text-primary" /></td>
                </tr>
                <tr className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 bg-primary/5 dark:bg-primary/10">
                  <td className="py-3 px-4 font-semibold text-primary">Content Calendar</td>
                  <td className="text-center"><X className="w-4 h-4 mx-auto text-slate-400 dark:text-slate-600" /></td>
                  <td className="text-center"><X className="w-4 h-4 mx-auto text-slate-400 dark:text-slate-600" /></td>
                  <td className="text-center"><Check className="w-4 h-4 mx-auto text-primary" /></td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>

        {/* Premium Feature Showcase - Content Calendar (Collapsible) */}
        <Card className="p-8 mt-12 bg-gradient-to-br from-purple-900/20 via-pink-900/10 to-indigo-900/20 dark:from-purple-900/40 dark:via-pink-900/20 dark:to-indigo-900/40 border border-primary/30 dark:border-primary/50 relative overflow-hidden transition-all duration-300">
          {/* Decorative glow elements */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full opacity-5 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-72 h-72 bg-gradient-to-r from-pink-500 to-indigo-500 rounded-full opacity-5 blur-3xl" />
          
          {/* Collapsible Header */}
          <button
            onClick={() => setShowContentCalendarDetails(!showContentCalendarDetails)}
            className="relative z-10 w-full flex items-center justify-between group hover:opacity-80 transition-opacity"
            data-testid="button-toggle-calendar-details"
          >
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center justify-center rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-indigo-500 p-[2px]">
                <div className="rounded-full bg-background p-2">
                  <Calendar className="w-5 h-5 text-primary" />
                </div>
              </div>
              <h3 className="text-3xl font-bold">Content Calendar</h3>
              <Badge className="bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0">
                <Crown className="w-3 h-3 mr-1" />
                PREMIUM ONLY
              </Badge>
            </div>
            <ChevronDown 
              className={`w-6 h-6 text-primary transition-transform duration-300 ${showContentCalendarDetails ? 'rotate-180' : ''}`}
              data-testid="icon-chevron-calendar"
            />
          </button>

          {/* Expanded Content */}
          {showContentCalendarDetails && (
            <div className="relative z-10 space-y-6 mt-6 pt-6 border-t border-primary/20 animate-in fade-in slide-in-from-top-2 duration-300">
              {/* Description */}
              <p className="text-muted-foreground text-lg">
                Available exclusively with Premium membership - Your complete content planning hub
              </p>

            {/* Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
              {/* Feature 1 */}
              <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800/50 border border-purple-500/20 dark:border-purple-500/30 hover:border-purple-500/40 dark:hover:border-purple-500/50 hover:bg-slate-200 dark:hover:bg-slate-700/50 transition-all">
                <div className="flex items-start gap-3">
                  <Calendar className="w-6 h-6 text-purple-500 dark:text-purple-400 flex-shrink-0 mt-1" />
                  <div className="space-y-2">
                    <h4 className="font-semibold text-foreground">30-Day Planning View</h4>
                    <p className="text-sm text-muted-foreground">
                      Visual calendar interface with 30-day preview to plan and organize your cosmic ASMR content
                    </p>
                  </div>
                </div>
              </div>

              {/* Feature 2 */}
              <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800/50 border border-pink-500/20 dark:border-pink-500/30 hover:border-pink-500/40 dark:hover:border-pink-500/50 hover:bg-slate-200 dark:hover:bg-slate-700/50 transition-all">
                <div className="flex items-start gap-3">
                  <TrendingUp className="w-6 h-6 text-pink-500 dark:text-pink-400 flex-shrink-0 mt-1" />
                  <div className="space-y-2">
                    <h4 className="font-semibold text-foreground">Platform Tracking</h4>
                    <p className="text-sm text-muted-foreground">
                      Track content across TikTok, YouTube Shorts, Instagram, Facebook, and X with platform-specific badges
                    </p>
                  </div>
                </div>
              </div>

              {/* Feature 3 */}
              <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800/50 border border-indigo-500/20 dark:border-indigo-500/30 hover:border-indigo-500/40 dark:hover:border-indigo-500/50 hover:bg-slate-200 dark:hover:bg-slate-700/50 transition-all">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-6 h-6 text-indigo-500 dark:text-indigo-400 flex-shrink-0 mt-1" />
                  <div className="space-y-2">
                    <h4 className="font-semibold text-foreground">Content Details</h4>
                    <p className="text-sm text-muted-foreground">
                      Store comprehensive content information including ideas, descriptions, and platform targets
                    </p>
                  </div>
                </div>
              </div>

              {/* Feature 4 */}
              <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800/50 border border-cyan-500/20 dark:border-cyan-500/30 hover:border-cyan-500/40 dark:hover:border-cyan-500/50 hover:bg-slate-200 dark:hover:bg-slate-700/50 transition-all">
                <div className="flex items-start gap-3">
                  <Infinity className="w-6 h-6 text-cyan-500 dark:text-cyan-400 flex-shrink-0 mt-1" />
                  <div className="space-y-2">
                    <h4 className="font-semibold text-foreground">Unlimited Entries</h4>
                    <p className="text-sm text-muted-foreground">
                      Plan as much content as you want with no limits on calendar entries or platform assignments
                    </p>
                  </div>
                </div>
              </div>

              {/* Feature 5 */}
              <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800/50 border border-amber-500/20 dark:border-amber-500/30 hover:border-amber-500/40 dark:hover:border-amber-500/50 hover:bg-slate-200 dark:hover:bg-slate-700/50 transition-all">
                <div className="flex items-start gap-3">
                  <Zap className="w-6 h-6 text-amber-500 dark:text-amber-400 flex-shrink-0 mt-1" />
                  <div className="space-y-2">
                    <h4 className="font-semibold text-foreground">Smart Navigation</h4>
                    <p className="text-sm text-muted-foreground">
                      Navigate weeks easily with intuitive controls, jump to today, and view comprehensive month ranges
                    </p>
                  </div>
                </div>
              </div>

              {/* Feature 6 */}
              <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800/50 border border-rose-500/20 dark:border-rose-500/30 hover:border-rose-500/40 dark:hover:border-rose-500/50 hover:bg-slate-200 dark:hover:bg-slate-700/50 transition-all">
                <div className="flex items-start gap-3">
                  <Crown className="w-6 h-6 text-rose-500 dark:text-rose-400 flex-shrink-0 mt-1" />
                  <div className="space-y-2">
                    <h4 className="font-semibold text-foreground">Priority Feature</h4>
                    <p className="text-sm text-muted-foreground">
                      Exclusive to Premium members - Gives you a competitive edge in content planning and scheduling
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Key Benefits Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-border/50">
              <div className="text-center p-4 space-y-2">
                <div className="text-3xl font-bold text-primary">30+</div>
                <p className="text-sm text-muted-foreground">Days of planning ahead</p>
              </div>
              <div className="text-center p-4 space-y-2">
                <div className="text-3xl font-bold text-primary">5</div>
                <p className="text-sm text-muted-foreground">Supported social platforms</p>
              </div>
              <div className="text-center p-4 space-y-2">
                <div className="text-3xl font-bold text-primary">∞</div>
                <p className="text-sm text-muted-foreground">Content entries (unlimited)</p>
              </div>
            </div>

              {/* Call to Action */}
              <div className="bg-gradient-to-r from-purple-600/15 dark:from-purple-600/25 to-pink-600/15 dark:to-pink-600/25 p-6 rounded-xl border border-primary/30 dark:border-primary/40 text-center space-y-3">
                <p className="text-sm text-muted-foreground">
                  Start organizing your cosmic content strategy with Premium membership
                </p>
                <p className="text-lg font-semibold">
                  Access Content Calendar now for <span className="text-primary">$49/month</span>
                </p>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Downgrade Confirmation Dialog */}
      <Dialog open={downgradeDialogOpen} onOpenChange={setDowngradeDialogOpen}>
        <DialogContent className="sm:max-w-[425px]" data-testid="dialog-downgrade">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-primary" />
              Downgrade to Pro?
            </DialogTitle>
            <DialogDescription>
              You're about to downgrade from Premium to Pro. You'll retain your Pro tier benefits, and your credits will be adjusted accordingly.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="rounded-lg bg-destructive/10 p-4 border border-destructive/20">
              <p className="text-sm font-medium text-destructive mb-2">Tier Changes:</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Video limit: Unlimited → 100/month</li>
                <li>• Monthly credits: 1,000 → 300</li>
                <li>• Quality: 4K → HD</li>
                <li>• Priority support: Removed</li>
              </ul>
            </div>

            <div className="rounded-lg bg-primary/10 p-4 border border-primary/20">
              <p className="text-sm font-medium text-primary mb-2">You'll Keep:</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• 300 monthly credits every 30 days</li>
                <li>• HD quality video generation</li>
                <li>• 100 videos per month limit</li>
                <li>• No watermark on videos</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setDowngradeDialogOpen(false)}
              disabled={downgradeMutation.isPending}
              data-testid="button-cancel-downgrade"
            >
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={handleConfirmDowngrade}
              disabled={downgradeMutation.isPending}
              data-testid="button-confirm-downgrade"
            >
              {downgradeMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Downgrade to Pro
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
