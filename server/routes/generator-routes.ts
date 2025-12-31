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
import OpenAI from "openai";
import * as fs from "fs";
import * as path from "path";
import { randomBytes } from "crypto";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Map aspect ratios to Sora size strings
// Sora supports: 720x1280, 1280x720, 1024x1792, 1792x1024
function mapAspectRatioToSize(aspectRatio: string): "720x1280" | "1280x720" | "1024x1792" | "1792x1024" {
  const mapping: Record<string, "720x1280" | "1280x720" | "1024x1792" | "1792x1024"> = {
    "1:1": "1024x1792", // No true 1:1, use portrait as default
    "16:9": "1280x720",
    "9:16": "720x1280",
  };
  return mapping[aspectRatio] || "1280x720";
}

// Map UI video lengths to Sora-supported durations (as strings)
// Sora supports: "4", "8", "12"
function mapDuration(length: number): "4" | "8" | "12" {
  if (length <= 4) return "4";
  if (length <= 8) return "8";
  return "12";
}

// Poll for video completion with exponential backoff
async function pollForVideoCompletion(
  videoId: string,
  maxWaitMs: number = 300000 // 5 minutes max
): Promise<{ status: string; progress?: number; error?: string }> {
  const startTime = Date.now();
  let pollInterval = 5000; // Start with 5 seconds
  const maxPollInterval = 15000; // Max 15 seconds between polls

  while (Date.now() - startTime < maxWaitMs) {
    try {
      const video = await openai.videos.retrieve(videoId);
      console.log(`Video ${videoId} status: ${video.status}, progress: ${(video as any).progress || 0}%`);

      if (video.status === "completed") {
        return { status: "completed" };
      }

      if (video.status === "failed") {
        return { 
          status: "failed", 
          error: (video as any).error?.message || "Video generation failed" 
        };
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, pollInterval));
      
      // Increase poll interval with exponential backoff (capped)
      pollInterval = Math.min(pollInterval * 1.5, maxPollInterval);
    } catch (error: any) {
      console.error("Error polling video status:", error);
      return { status: "error", error: error.message };
    }
  }

  return { status: "timeout", error: "Video generation timed out after 5 minutes" };
}

export function createGeneratorRouter(): Router {
  const router = Router();

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

      const { prompt, length = 4, aspectRatio = "16:9", style } = validation.data;

      if (length > tierConfig.maxLength) {
        const errorResponse: ErrorResponse = {
          error: "Length not allowed",
          message: `Your ${tierConfig.name} plan allows videos up to ${tierConfig.maxLength} seconds. Upgrade to generate longer videos.`,
        };
        return res.status(403).json(errorResponse);
      }

      if (!process.env.OPENAI_API_KEY) {
        const errorResponse: ErrorResponse = {
          error: "Configuration error",
          message: "OpenAI API key is not configured. Please add OPENAI_API_KEY.",
        };
        return res.status(500).json(errorResponse);
      }

      // Build the enhanced prompt with style if provided
      let enhancedPrompt = prompt;
      if (style) {
        enhancedPrompt = `${prompt}, ${style} style`;
      }
      enhancedPrompt = `${enhancedPrompt}, cosmic ASMR aesthetic, high quality, cinematic, smooth motion`;

      const durationStr = mapDuration(length);
      const size = mapAspectRatioToSize(aspectRatio);

      console.log("Generating video via OpenAI Sora API for prompt:", enhancedPrompt);
      console.log("Options - Duration:", durationStr, "s, Size:", size);
      
      let videoUrl: string;
      try {
        // Create video generation job with Sora
        // API: POST /videos with prompt at top level
        const videoJob = await openai.videos.create({
          model: "sora-2",
          prompt: enhancedPrompt,
          seconds: durationStr,
          size: size,
        });

        console.log("Video job created:", videoJob.id, "Status:", videoJob.status);

        // Poll for completion
        const result = await pollForVideoCompletion(videoJob.id);
        
        if (result.status !== "completed") {
          throw new Error(result.error || `Video generation ${result.status}`);
        }

        console.log("Video generation completed, downloading...");

        // Download the video content using downloadContent method
        const videoResponse = await openai.videos.downloadContent(videoJob.id);
        
        // Get the video data as a blob then convert to buffer
        const blob = await videoResponse.blob();
        const arrayBuffer = await blob.arrayBuffer();
        const videoBuffer = Buffer.from(arrayBuffer);
        
        // Save video locally
        const uniqueId = randomBytes(8).toString("hex");
        const fileName = `video_${uniqueId}.mp4`;
        const publicDir = path.join(process.cwd(), "public", "generated");
        
        // Ensure directory exists
        if (!fs.existsSync(publicDir)) {
          fs.mkdirSync(publicDir, { recursive: true });
        }
        
        const filePath = path.join(publicDir, fileName);
        fs.writeFileSync(filePath, videoBuffer);
        
        // Store the local URL path that will be served statically
        videoUrl = `/generated/${fileName}`;
        console.log("Video saved locally:", videoUrl);
      } catch (err: any) {
        console.error("Video generation failed:", err);
        
        // Provide more specific error messages
        if (err.status === 401 || err.message?.includes("authentication") || err.message?.includes("API key")) {
          throw new Error("Invalid OpenAI API key. Please check your OPENAI_API_KEY configuration.");
        }
        if (err.status === 429 || err.message?.includes("rate limit")) {
          throw new Error("Rate limit exceeded. Please try again in a few minutes.");
        }
        if (err.message?.includes("quota") || err.message?.includes("billing")) {
          throw new Error("OpenAI API quota exceeded. Please check your billing settings.");
        }
        if (err.message?.includes("not available") || err.message?.includes("access")) {
          throw new Error("Sora API access not available. Please ensure your OpenAI account has Sora API access.");
        }
        
        throw new Error(`Video generation failed: ${err.message}`);
      }
      
      if (!videoUrl) {
        const errorResponse: ErrorResponse = {
          error: "Invalid response",
          message: "Video URL not found in API response.",
        };
        return res.status(500).json(errorResponse);
      }

      const savedVideo = await storage.createVideoGeneration({
        userId,
        prompt,
        videoUrl,
        length: parseInt(durationStr),
        aspectRatio,
        style: style || null,
      });

      await storage.incrementVideoCount(userId);

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
      console.error("Generation error:", error);
      const errorResponse: ErrorResponse = {
        error: "Server error",
        message: error instanceof Error ? error.message : "An unexpected error occurred",
      };
      return res.status(500).json(errorResponse);
    }
  });

  return router;
}
