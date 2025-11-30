import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { VideoGeneration } from "@shared/schema";

export function useVideoHistory(limit: number = 50) {
  return useQuery<VideoGeneration[]>({
    queryKey: ["/api/history", limit],
  });
}

export function useDeleteVideoMutation() {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (videoId: number) => {
      const response = await apiRequest("DELETE", `/api/history/${videoId}`);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Video Deleted",
        description: "The video has been removed from your gallery.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/history"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete video. Please try again.",
        variant: "destructive",
      });
    },
  });
}
