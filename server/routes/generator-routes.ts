import { Router } from "express";
import { 
  videoGenerationSchema, 
  MEMBERSHIP_TIERS, 
  type MembershipTier,
  type VideoGenerationResponse,
  type ErrorResponse 
} from "@shared/schema";
import { storage } from "../storage";
import { isAuthenticated, getAuthenticatedUserId } from "../unified-auth";
import { getWebSocketManager } from "../websocket";

// Pika API via fal.ai
const PIKA_URL = "https://fal.run/fal-ai/pika/v2.2/text-to-video";

export function createGeneratorRouter(): Router {
  const router = Router();
  const PIKA_API_KEY = process.env.PIKA_API_KEY;

  router.post("/", isAuthenticated, async (req: any, res) => {
    try {
      const userId = await getAuthenticatedUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      
      let user = await storage.checkAndResetVideoCount(userId);
      const tierConfig = MEMBERSHIP_TIERS[user.membershipTier as MembershipTier];
      
      if (tierConfig.monthlyVideos !== -1 && user.videosGeneratedThisMonth >= tierConfig.monthlyVideos) {
        const errorResponse: ErrorResponse = {
          error: "Limit reached",
          message: `You've reached your monthly limit of ${tierConfig.monthlyVideos} videos. Upgrade your plan to generate more.`,
        };
        return res.status(403).json(errorResponse);
      }

      const validation = videoGenerationSchema.safeParse(req.body);
      if (!validation.success) {
        const errorResponse: ErrorResponse = {
          error: "Invalid request",
          message: validation.error.errors[0]?.message || "Invalid prompt",
        };
        return res.status(400).json(errorResponse);
      }

      const { prompt, length = 10, aspectRatio = "1:1", style, imageBase64 } = validation.data;

      if (length > tierConfig.maxLength) {
        const errorResponse: ErrorResponse = {
          error: "Length not allowed",
          message: `Your ${tierConfig.name} plan allows videos up to ${tierConfig.maxLength} seconds. Upgrade to generate longer videos.`,
        };
        return res.status(403).json(errorResponse);
      }

      if (!PIKA_API_KEY) {
        const errorResponse: ErrorResponse = {
          error: "Configuration error",
          message: "Pika API key is not configured",
        };
        return res.status(500).json(errorResponse);
      }

      const pikaRequestBody: any = {
        input: {
          prompt,
          duration: Math.min(length, 10), // fal.ai pika v2.2 typically supports 5-10s
          aspect_ratio: aspectRatio,
          ...(style && { style }),
          ...(imageBase64 && { image_url: imageBase64 }), // fal.ai uses image_url for base64 as well
        }
      };

      const response = await fetch(PIKA_URL, {
        method: "POST",
        headers: {
          Authorization: `Key ${PIKA_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(pikaRequestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Pika API (fal.ai) error:", response.status, errorText);
        const errorResponse: ErrorResponse = {
          error: "Video generation failed",
          message: `Failed to generate video. Status: ${response.status}`,
        };
        return res.status(response.status).json(errorResponse);
      }

      const data = await response.json();
      console.log("Pika API response data:", JSON.stringify(data));
      
      // fal.ai structure is usually { video: { url: "..." } }
      const videoUrl = data.video?.url || data.url || data.video_url;
      
      if (!videoUrl) {
        console.error("Video URL missing in Pika response:", data);
        const errorResponse: ErrorResponse = {
          error: "Invalid response",
          message: "Video URL not found in Pika API response. Please check API configuration.",
        };
        return res.status(500).json(errorResponse);
      }

      const savedVideo = await storage.createVideoGeneration({
        userId,
        prompt,
        videoUrl,
        length,
        aspectRatio,
        style: style || null,
      });

      await storage.incrementVideoCount(userId);

      // Broadcast sync event to all devices
      const wsManager = getWebSocketManager();
      if (wsManager) {
        wsManager.broadcastToUser(userId, {
          type: 'video-generated',
          userId,
          videoId: savedVideo.id
        });
      }

      const successResponse: VideoGenerationResponse = {
        videoUrl,
        prompt,
        id: savedVideo.id,
      };

      return res.json(successResponse);
    } catch (error) {
      const errorResponse: ErrorResponse = {
        error: "Server error",
        message: error instanceof Error ? error.message : "An unexpected error occurred",
      };
      return res.status(500).json(errorResponse);
    }
  });

  return router;
}
