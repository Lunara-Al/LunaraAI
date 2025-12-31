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

export function createGeneratorRouter(): Router {
  const router = Router();
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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

      if (!process.env.OPENAI_API_KEY) {
        const errorResponse: ErrorResponse = {
          error: "Configuration error",
          message: "OpenAI API key is not configured",
        };
        return res.status(500).json(errorResponse);
      }

      console.log("Generating image via OpenAI DALL-E 3 for prompt:", prompt);
      
      let videoUrl: string;
      try {
        const response = await openai.images.generate({
          model: "dall-e-3",
          prompt: `A beautiful cosmic ASMR scene: ${prompt}. High quality, cinematic, 4k.`,
          n: 1,
          size: "1024x1024",
        });

        const tempUrl = response.data?.[0]?.url;
        if (!tempUrl) {
          throw new Error("No image URL in OpenAI response");
        }

        // Download and save the image locally since OpenAI URLs expire after ~1 hour
        const imageResponse = await fetch(tempUrl);
        if (!imageResponse.ok) {
          throw new Error(`Failed to download image: ${imageResponse.statusText}`);
        }

        const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
        const uniqueId = randomBytes(8).toString("hex");
        const fileName = `generated_${uniqueId}.png`;
        const publicDir = path.join(process.cwd(), "public", "generated");
        
        // Ensure directory exists
        if (!fs.existsSync(publicDir)) {
          fs.mkdirSync(publicDir, { recursive: true });
        }
        
        const filePath = path.join(publicDir, fileName);
        fs.writeFileSync(filePath, imageBuffer);
        
        // Store the local URL path that will be served statically
        videoUrl = `/generated/${fileName}`;
        console.log("Image saved locally:", videoUrl);
      } catch (err: any) {
        console.error("OpenAI generation failed:", err);
        throw new Error(`OpenAI generation failed: ${err.message}`);
      }
      
      if (!videoUrl) {
        const errorResponse: ErrorResponse = {
          error: "Invalid response",
          message: "Image URL not found in OpenAI response.",
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
