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
import { fal } from "@fal-ai/client";
import * as fs from "fs";
import * as path from "path";
import { randomBytes } from "crypto";

// Get API key - check both FAL_KEY (preferred) and PIKA_API_KEY (legacy)
function getFalApiKey(): string | null {
  return process.env.FAL_KEY || process.env.PIKA_API_KEY || null;
}

// Configure fal.ai client
const falApiKey = getFalApiKey();
if (falApiKey) {
  fal.config({
    credentials: falApiKey
  });
}

// Map aspect ratios to fal.ai format
function mapAspectRatio(aspectRatio: string): string {
  const mapping: Record<string, string> = {
    "1:1": "1:1",
    "16:9": "16:9",
    "9:16": "9:16",
    "4:3": "4:3",
    "3:4": "3:4",
  };
  return mapping[aspectRatio] || "16:9";
}

// Map video length to supported duration (Pika API supports 5 or 10 seconds)
function mapDuration(length: number): 5 | 10 {
  return length <= 5 ? 5 : 10;
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

      const { prompt, length = 5, aspectRatio = "16:9", style, imageBase64 } = validation.data;

      if (length > tierConfig.maxLength) {
        const errorResponse: ErrorResponse = {
          error: "Length not allowed",
          message: `Your ${tierConfig.name} plan allows videos up to ${tierConfig.maxLength} seconds. Upgrade to generate longer videos.`,
        };
        return res.status(403).json(errorResponse);
      }

      const apiKey = getFalApiKey();
      if (!apiKey) {
        const errorResponse: ErrorResponse = {
          error: "Configuration error",
          message: "Video generation API key is not configured. Please add FAL_KEY or PIKA_API_KEY.",
        };
        return res.status(500).json(errorResponse);
      }

      // Build the enhanced prompt with style if provided
      let enhancedPrompt = prompt;
      if (style) {
        enhancedPrompt = `${prompt}, ${style} style`;
      }
      enhancedPrompt = `${enhancedPrompt}, cosmic ASMR aesthetic, high quality, cinematic`;

      console.log("Generating video via Pika Labs API for prompt:", enhancedPrompt);
      console.log("Options - Length:", mapDuration(length), "s, Aspect Ratio:", mapAspectRatio(aspectRatio));
      
      let videoUrl: string;
      try {
        // Use Pika text-to-video API via fal.ai
        const result = await fal.subscribe("fal-ai/pika/v2.2/text-to-video", {
          input: {
            prompt: enhancedPrompt,
            aspect_ratio: mapAspectRatio(aspectRatio) as "1:1" | "16:9" | "9:16" | "4:5" | "5:4" | "3:2" | "2:3",
            duration: mapDuration(length),
            resolution: "720p" as const,
          },
          logs: true,
          onQueueUpdate: (update) => {
            if (update.status === "IN_PROGRESS") {
              console.log("Video generation in progress...");
            }
            if (update.status === "IN_QUEUE") {
              console.log("Video generation queued...");
            }
          },
        });

        // Extract video URL from result - handle different response shapes
        const data = result.data as Record<string, unknown>;
        let tempVideoUrl: string | undefined;
        
        // Try different possible response structures
        if (typeof data?.video === 'object' && data?.video !== null) {
          tempVideoUrl = (data.video as { url?: string })?.url;
        } else if (typeof data?.output === 'string') {
          tempVideoUrl = data.output;
        } else if (typeof data?.url === 'string') {
          tempVideoUrl = data.url;
        } else if (Array.isArray(data?.videos) && data.videos.length > 0) {
          tempVideoUrl = (data.videos[0] as { url?: string })?.url;
        }
        
        if (!tempVideoUrl) {
          console.error("Pika API response structure:", JSON.stringify(result.data, null, 2));
          throw new Error("Could not extract video URL from API response. Please check API configuration.");
        }

        console.log("Video generated successfully, downloading...");

        // Download and save the video locally
        const videoResponse = await fetch(tempVideoUrl);
        if (!videoResponse.ok) {
          throw new Error(`Failed to download video: ${videoResponse.statusText}`);
        }

        const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());
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
        if (err.message?.includes("authentication") || err.message?.includes("credentials")) {
          throw new Error("Invalid API key. Please check your Pika/fal.ai API key configuration.");
        }
        if (err.message?.includes("rate limit")) {
          throw new Error("Rate limit exceeded. Please try again in a few minutes.");
        }
        if (err.message?.includes("quota")) {
          throw new Error("API quota exceeded. Please check your fal.ai account.");
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
        length: mapDuration(length),
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
