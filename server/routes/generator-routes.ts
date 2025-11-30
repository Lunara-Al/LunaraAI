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

const PIKA_URL = "https://api.pika.art/v1/videos";

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
        prompt,
        length,
        aspect_ratio: aspectRatio,
        ...(style && { style }),
        ...(imageBase64 && { image_base64: imageBase64 }),
      };

      const response = await fetch(PIKA_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${PIKA_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(pikaRequestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Pika API error:", response.status, errorText);
        const errorResponse: ErrorResponse = {
          error: "Video generation failed",
          message: `Failed to generate video. Status: ${response.status}`,
        };
        return res.status(response.status).json(errorResponse);
      }

      const data = await response.json();
      const videoUrl = data.video_url || data.url || data.videoUrl;
      
      if (!videoUrl) {
        const errorResponse: ErrorResponse = {
          error: "Invalid response",
          message: "Video URL not found in response",
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
