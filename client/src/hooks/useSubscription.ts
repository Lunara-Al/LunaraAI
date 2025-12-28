import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";

export interface SubscriptionStatus {
  tier: "free" | "pro" | "premium";
  videosUsed: number;
  videosLimit: number;
  maxLength: number;
  quality: string;
  credits: number;
  monthlyCreditsAllocated: number;
  stripeSubscriptionId?: string;
  daysUntilReset?: number;
}

export function useSubscription(enabled: boolean = true) {
  return useQuery<SubscriptionStatus>({
    queryKey: ["/api/subscription/status"],
    enabled,
  });
}

export function useUpgradeMutation() {
  const { toast } = useToast();
  
  return useMutation({
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
            ? "Subscription updated in simulation mode."
            : "Subscription updated successfully!",
        });
        queryClient.invalidateQueries({ queryKey: ["/api/subscription/status"] });
      }
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        handleUnauthorized(toast);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to update subscription. Please try again.",
        variant: "destructive",
      });
    },
  });
}

export function useDowngradeMutation() {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (tier: string) => {
      const response = await apiRequest("POST", "/api/subscription/downgrade", { tier });
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Downgrade Successful",
        description: data.message || "Your subscription has been downgraded.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/subscription/status"] });
    },
    onError: (error: any) => {
      if (isUnauthorizedError(error)) {
        handleUnauthorized(toast);
        return;
      }
      toast({
        title: "Error",
        description: error?.message || "Failed to downgrade subscription.",
        variant: "destructive",
      });
    },
  });
}

export function useCancelMutation() {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/subscription/cancel");
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Subscription Canceled",
        description: "You've been downgraded to the Basic plan.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/subscription/status"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        handleUnauthorized(toast);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to cancel subscription.",
        variant: "destructive",
      });
    },
  });
}

function handleUnauthorized(toast: ReturnType<typeof useToast>["toast"]) {
  toast({
    title: "Unauthorized",
    description: "You are logged out. Logging in again...",
    variant: "destructive",
  });
  setTimeout(() => {
    window.location.href = "/api/login";
  }, 500);
}
