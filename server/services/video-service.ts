import { storage } from "../storage";
import { 
  MEMBERSHIP_TIERS, 
  hasUnlimitedVideos,
  type MembershipTier,
  type VideoGeneration,
  type VideoGenerationRequest 
} from "@shared/schema";

export interface GenerationResult {
  success: boolean;
  video?: VideoGeneration;
  error?: string;
  creditsRemaining?: number;
}

export interface VideoQuota {
  videosUsed: number;
  videosLimit: number;
  creditsRemaining: number;
  canGenerate: boolean;
}

class VideoService {
  async checkQuota(userId: string): Promise<VideoQuota> {
    const user = await storage.getUser(userId);
    if (!user) throw new Error("User not found");

    const tier = user.membershipTier as MembershipTier;
    const tierConfig = MEMBERSHIP_TIERS[tier];
    const videosUsed = await storage.getMonthlyVideoCount(userId);
    const unlimited = hasUnlimitedVideos(tier);
    
    const canGenerate = user.credits > 0 && (unlimited || videosUsed < tierConfig.monthlyVideos);

    return {
      videosUsed,
      videosLimit: tierConfig.monthlyVideos,
      creditsRemaining: user.credits,
      canGenerate,
    };
  }

  async recordGeneration(
    userId: string,
    videoUrl: string,
    request: VideoGenerationRequest
  ): Promise<VideoGeneration> {
    const video = await storage.createVideoGeneration({
      userId,
      prompt: request.prompt,
      videoUrl,
      length: request.length,
      aspectRatio: request.aspectRatio,
      style: request.style,
    });

    await storage.incrementVideoCount(userId);
    return video;
  }

  async getUserVideos(userId: string, limit: number = 50): Promise<VideoGeneration[]> {
    return storage.getUserVideoGenerations(userId, limit);
  }

  async deleteVideo(videoId: number, userId: string): Promise<boolean> {
    return storage.deleteVideoGeneration(videoId, userId);
  }

  getMaxVideoLength(tier: MembershipTier): number {
    return MEMBERSHIP_TIERS[tier].maxLength;
  }
}

export const videoService = new VideoService();
