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
import { GoogleGenAI } from "@google/genai";
import * as fs from "fs";
import * as path from "path";
import { randomBytes } from "crypto";

// Initialize Gemini client
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

// Map aspect ratios to Gemini Veo supported formats
function mapAspectRatio(aspectRatio: string): "16:9" | "9:16" {
  if (aspectRatio === "9:16") return "9:16";
  return "16:9"; // Default to landscape
}

// Map UI video lengths to Gemini Veo durations (5-8 seconds)
function mapDuration(length: number): number {
  // Veo supports 5-8 second videos
  if (length <= 5) return 5;
  return 8; // Max 8 seconds for Veo
}

// Poll for video generation completion
async function pollForVideoCompletion(
  operation: any,
  maxWaitMs: number = 300000 // 5 minutes max
): Promise<{ done: boolean; result?: any; error?: string }> {
  const startTime = Date.now();
  let pollInterval = 5000; // Start with 5 seconds
  const maxPollInterval = 15000; // Max 15 seconds between polls

  while (Date.now() - startTime < maxWaitMs) {
    try {
      // Check if the operation is complete
      if (operation.done) {
        return { done: true, result: operation.result };
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, pollInterval));
      
      // Increase poll interval with exponential backoff (capped)
      pollInterval = Math.min(pollInterval * 1.5, maxPollInterval);
      
      // Refresh operation status if there's a refresh method
      if (typeof operation.refresh === 'function') {
        await operation.refresh();
      }
    } catch (error: any) {
      console.error("Error polling video status:", error);
      return { done: false, error: error.message };
    }
  }

  return { done: false, error: "Video generation timed out after 5 minutes" };
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

      const { prompt, length = 5, aspectRatio = "16:9", style } = validation.data;

      if (length > tierConfig.maxLength) {
        const errorResponse: ErrorResponse = {
          error: "Length not allowed",
          message: `Your ${tierConfig.name} plan allows videos up to ${tierConfig.maxLength} seconds. Upgrade to generate longer videos.`,
        };
        return res.status(403).json(errorResponse);
      }

      if (!process.env.GEMINI_API_KEY) {
        const errorResponse: ErrorResponse = {
          error: "Configuration error",
          message: "Gemini API key is not configured. Please add GEMINI_API_KEY.",
        };
        return res.status(500).json(errorResponse);
      }

      // Build the enhanced prompt with style if provided
      let enhancedPrompt = prompt;
      if (style) {
        enhancedPrompt = `${prompt}, ${style} style`;
      }
      enhancedPrompt = `${enhancedPrompt}, cosmic ASMR aesthetic, high quality, cinematic, smooth motion, satisfying visuals`;

      const veoAspectRatio = mapAspectRatio(aspectRatio);
      const videoDuration = mapDuration(length);

      console.log("Generating video via Google Gemini Veo API for prompt:", enhancedPrompt);
      console.log("Options - Duration:", videoDuration, "s, Aspect Ratio:", veoAspectRatio);
      
      let videoUrl: string;
      try {
        // 1. Start the video generation
        console.log("Starting video generation...");
        const initialResponse = await genAI.models.generateVideos({
          model: "veo-2.0-generate-001",
          prompt: enhancedPrompt,
          config: {
            aspectRatio: veoAspectRatio,
            numberOfVideos: 1,
            durationSeconds: videoDuration,
            personGeneration: "dont_allow",
          },
        });

        // 2. Get the Operation Name (The ID) safely
        const operationName = (initialResponse as any).name;
        console.log("Video started. Operation ID:", operationName);

        if (!operationName) {
          console.error("Initial response:", JSON.stringify(initialResponse, null, 2));
          throw new Error("Failed to get operation name from response");
        }

        // 3. Manual Polling Loop using REST API (check status every 5 seconds for up to 5 minutes)
        // The SDK doesn't have genAI.operations, so we poll directly via REST API
        let completedVideoUri: string | null = null;
        const apiKey = process.env.GEMINI_API_KEY;

        for (let i = 0; i < 60; i++) {
          // Wait 5 seconds
          await new Promise(r => setTimeout(r, 5000));

          // Poll operation status via REST API
          const pollUrl = `https://generativelanguage.googleapis.com/v1beta/${operationName}`;
          const pollResponse = await fetch(pollUrl, {
            method: 'GET',
            headers: {
              'x-goog-api-key': apiKey || '',
            },
          });

          if (!pollResponse.ok) {
            console.error(`Polling failed with status ${pollResponse.status}: ${pollResponse.statusText}`);
            continue; // Try again
          }

          const status = await pollResponse.json();
          console.log(`Polling attempt ${i + 1}/60 - Done:`, status.done, "State:", status.metadata?.state || "unknown");

          // Check if done
          if (status.done) {
            // If there is an error in the result
            if (status.error) {
              throw new Error(`Generation failed: ${status.error.message || JSON.stringify(status.error)}`);
            }
            
            // Success! Extract the URI from various possible locations
            // The response nests videos under generateVideoResponse.generatedSamples (not generatedVideos)
            completedVideoUri = status.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri
                              || status.response?.generateVideoResponse?.generatedVideos?.[0]?.video?.uri
                              || status.response?.generatedVideos?.[0]?.video?.uri 
                              || status.result?.generatedVideos?.[0]?.video?.uri
                              || status.response?.videos?.[0]?.gcsUri
                              || status.response?.candidates?.[0]?.content?.parts?.[0]?.fileData?.fileUri;
            
            console.log("Completed status object keys:", Object.keys(status));
            if (status.response) {
              console.log("Response keys:", Object.keys(status.response));
              if (status.response.generateVideoResponse) {
                console.log("generateVideoResponse keys:", Object.keys(status.response.generateVideoResponse));
                const samples = status.response.generateVideoResponse.generatedSamples;
                if (samples?.[0]) {
                  console.log("First sample keys:", Object.keys(samples[0]));
                }
              }
            }
            console.log("Extracted video URI:", completedVideoUri);
            break; // Exit the loop
          }
        }

        if (!completedVideoUri) {
          throw new Error("Timed out waiting for video generation (5 minutes)");
        }

        const videoUri = completedVideoUri;
        console.log("Video generation completed!");
        console.log("Downloading video from:", videoUri);

        // Fetch the video content
        const downloadResponse = await fetch(videoUri);
        if (!downloadResponse.ok) {
          throw new Error(`Failed to download video: ${downloadResponse.statusText}`);
        }
        
        const arrayBuffer = await downloadResponse.arrayBuffer();
        const videoBuffer = Buffer.from(arrayBuffer);
        
        // Save video locally
        const uniqueId = randomBytes(8).toString("hex");
        const fileName = `video_${uniqueId}.mp4`;
        const publicDir = path.join(process.cwd(), "public", "generated");
        
        // Ensure directory exists with correct permissions
        if (!fs.existsSync(publicDir)) {
          fs.mkdirSync(publicDir, { recursive: true, mode: 0o755 });
        }
        
        const filePath = path.join(publicDir, fileName);
        fs.writeFileSync(filePath, videoBuffer);
        
        // Store the local URL path that will be served statically
        videoUrl = `/generated/${fileName}`;
        console.log("Video saved locally:", videoUrl);

        // Verify the file exists and has content before proceeding
        if (!fs.existsSync(filePath) || fs.statSync(filePath).size === 0) {
          throw new Error("Video file was not saved correctly or is empty");
        }
      } catch (err: any) {
        console.error("Video generation failed:", err);
        
        // Provide more specific error messages
        if (err.status === 401 || err.message?.includes("authentication") || err.message?.includes("API key")) {
          throw new Error("Invalid Gemini API key. Please check your GEMINI_API_KEY configuration.");
        }
        if (err.status === 429 || err.message?.includes("rate limit") || err.message?.includes("quota")) {
          throw new Error("Rate limit or quota exceeded. Please try again later.");
        }
        if (err.message?.includes("not found") || err.message?.includes("does not exist")) {
          throw new Error("Veo model not available. Please ensure your Google Cloud account has access to Veo.");
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
        length: videoDuration,
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
