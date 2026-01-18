import { Router } from "express";
import { 
  videoGenerationSchema, 
  MEMBERSHIP_TIERS, 
  type MembershipTier,
  type VideoJobInitResponse,
  type VideoJobStatusResponse,
  type ErrorResponse,
  type VideoJobStatus
} from "@shared/schema";
import { storage } from "../storage";
import { isAuthenticated, getAuthenticatedUserId } from "../unified-auth";
import { getWebSocketManager } from "../websocket";
import * as fs from "fs";
import * as path from "path";
import { randomBytes } from "crypto";

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";

function mapAspectRatio(aspectRatio: string): "16:9" | "9:16" {
  if (aspectRatio === "9:16") return "9:16";
  return "16:9";
}

function mapDuration(length: number): number {
  // Gemini Veo 3.1 API only supports 4, 6, or 8 seconds
  if (length <= 5) return 6; // Map 5s to 6s (closest supported value)
  return 8;
}

function classifyError(error: any, rawResponse?: string): { code: string; message: string } {
  const errMsg = error?.message?.toLowerCase() || "";
  const rawLower = rawResponse?.toLowerCase() || "";
  
  if (errMsg.includes("api key") || errMsg.includes("authentication") || errMsg.includes("401")) {
    return { code: "AUTH_ERROR", message: "Invalid API key. Please check your GEMINI_API_KEY configuration." };
  }
  if (errMsg.includes("rate limit") || errMsg.includes("quota") || errMsg.includes("429")) {
    return { code: "RATE_LIMIT", message: "Rate limit or quota exceeded. Please try again later." };
  }
  if (errMsg.includes("timeout") || errMsg.includes("timed out")) {
    return { code: "TIMEOUT", message: "Video generation timed out. Please try again." };
  }
  if (errMsg.includes("safety") || errMsg.includes("filtered") || rawLower.includes("rai")) {
    return { code: "CONTENT_FILTERED", message: "Your prompt was flagged by safety filters. Please try a different description." };
  }
  if (errMsg.includes("not found") || errMsg.includes("does not exist")) {
    return { code: "MODEL_UNAVAILABLE", message: "Veo model not available. Please ensure your account has access." };
  }
  if (errMsg.includes("empty response") || rawResponse === "") {
    return { code: "EMPTY_RESPONSE", message: "Empty response from API. This may be a temporary issue." };
  }
  return { code: "UNKNOWN_ERROR", message: error?.message || "An unexpected error occurred." };
}

async function processVideoGenerationJob(jobId: number): Promise<void> {
  const job = await storage.getVideoGenerationJob(jobId);
  if (!job || job.status === "completed" || job.status === "failed") {
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    await storage.updateVideoGenerationJob(jobId, {
      status: "failed",
      errorCode: "CONFIG_ERROR",
      errorMessage: "Gemini API key is not configured.",
      completedAt: new Date()
    });
    return;
  }

  try {
    await storage.updateVideoGenerationJob(jobId, { 
      status: "processing", 
      startedAt: new Date(),
      progress: 10
    });

    const generationUrl = `${GEMINI_API_BASE}/models/veo-3.1-generate-preview:predictLongRunning`;
    
    console.log(`[Job ${jobId}] Job data - length: ${job.length} (type: ${typeof job.length}), aspectRatio: ${job.aspectRatio}`);
    
    const requestBody = {
      instances: [{ 
        prompt: job.enhancedPrompt 
      }],
      parameters: {
        aspectRatio: job.aspectRatio,
        sampleCount: 1,
        durationSeconds: job.length,
      }
    };

    console.log(`[Job ${jobId}] API Request body:`, JSON.stringify(requestBody, null, 2));
    console.log(`[Job ${jobId}] Starting video generation...`);
    console.log(`[Job ${jobId}] Prompt: ${job.enhancedPrompt.substring(0, 100)}...`);

    const initialResponse = await fetch(generationUrl, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey
      },
      body: JSON.stringify(requestBody)
    });

    const responseText = await initialResponse.text();
    console.log(`[Job ${jobId}] Initial API response status: ${initialResponse.status}`);
    console.log(`[Job ${jobId}] Raw response (first 500 chars): ${responseText.substring(0, 500)}`);

    if (!responseText) {
      await storage.updateVideoGenerationJob(jobId, {
        status: "failed",
        errorCode: "EMPTY_RESPONSE",
        errorMessage: "Empty response from video generation service.",
        rawApiResponse: "EMPTY",
        completedAt: new Date()
      });
      return;
    }

    let initialData;
    try {
      initialData = JSON.parse(responseText);
    } catch (e) {
      await storage.updateVideoGenerationJob(jobId, {
        status: "failed",
        errorCode: "INVALID_JSON",
        errorMessage: "Invalid JSON response from API.",
        rawApiResponse: responseText.substring(0, 2000),
        completedAt: new Date()
      });
      return;
    }

    if (!initialResponse.ok) {
      const { code, message } = classifyError(initialData.error, responseText);
      await storage.updateVideoGenerationJob(jobId, {
        status: "failed",
        errorCode: code,
        errorMessage: message,
        rawApiResponse: responseText.substring(0, 2000),
        completedAt: new Date()
      });
      return;
    }

    const operationName = initialData.name;
    if (!operationName) {
      await storage.updateVideoGenerationJob(jobId, {
        status: "failed",
        errorCode: "NO_OPERATION_ID",
        errorMessage: "Failed to get operation ID from API response.",
        rawApiResponse: responseText.substring(0, 2000),
        completedAt: new Date()
      });
      return;
    }

    await storage.updateVideoGenerationJob(jobId, { 
      status: "polling", 
      operationName,
      progress: 20
    });

    console.log(`[Job ${jobId}] Operation started: ${operationName}`);

    let completedVideoUri: string | null = null;
    const maxPolls = 60;

    for (let i = 0; i < maxPolls; i++) {
      await new Promise(r => setTimeout(r, 5000));

      const pollUrl = `${GEMINI_API_BASE}/${operationName}`;
      const pollResponse = await fetch(pollUrl, {
        method: 'GET',
        headers: { 
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey 
        }
      });

      if (!pollResponse.ok) {
        console.error(`[Job ${jobId}] Poll ${i + 1} failed: ${pollResponse.status}`);
        await storage.updateVideoGenerationJob(jobId, { 
          pollAttempts: i + 1,
          progress: Math.min(20 + (i * 1.2), 80)
        });
        continue;
      }

      const status = await pollResponse.json();
      const progress = Math.min(20 + ((i + 1) / maxPolls * 60), 80);
      
      await storage.updateVideoGenerationJob(jobId, { 
        pollAttempts: i + 1,
        progress: Math.round(progress)
      });

      console.log(`[Job ${jobId}] Poll ${i + 1}/${maxPolls} - Done: ${status.done}, State: ${status.metadata?.state || "unknown"}`);

      if (status.done) {
        if (status.error) {
          const { code, message } = classifyError(status.error, JSON.stringify(status));
          await storage.updateVideoGenerationJob(jobId, {
            status: "failed",
            errorCode: code,
            errorMessage: message,
            rawApiResponse: JSON.stringify(status).substring(0, 2000),
            completedAt: new Date()
          });
          return;
        }

        const raiCount = status.response?.generateVideoResponse?.raiMediaFilteredCount;
        if (raiCount && raiCount > 0) {
          await storage.updateVideoGenerationJob(jobId, {
            status: "failed",
            errorCode: "CONTENT_FILTERED",
            errorMessage: "Your prompt was flagged by Google's safety filters. Please try a different description.",
            rawApiResponse: JSON.stringify(status).substring(0, 2000),
            completedAt: new Date()
          });
          return;
        }

        completedVideoUri = status.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri
                          || status.response?.generateVideoResponse?.generatedVideos?.[0]?.video?.uri
                          || status.response?.generatedVideos?.[0]?.video?.uri 
                          || status.result?.generatedVideos?.[0]?.video?.uri
                          || status.response?.videos?.[0]?.gcsUri
                          || status.response?.candidates?.[0]?.content?.parts?.[0]?.fileData?.fileUri;

        console.log(`[Job ${jobId}] Video URI extracted: ${completedVideoUri}`);
        break;
      }
    }

    if (!completedVideoUri) {
      await storage.updateVideoGenerationJob(jobId, {
        status: "failed",
        errorCode: "TIMEOUT",
        errorMessage: "Video generation timed out after 5 minutes.",
        completedAt: new Date()
      });
      return;
    }

    await storage.updateVideoGenerationJob(jobId, { 
      status: "downloading",
      progress: 85
    });

    console.log(`[Job ${jobId}] Downloading video from: ${completedVideoUri}`);

    const downloadResponse = await fetch(completedVideoUri, {
      method: 'GET',
      headers: { 'x-goog-api-key': apiKey }
    });

    if (!downloadResponse.ok) {
      await storage.updateVideoGenerationJob(jobId, {
        status: "failed",
        errorCode: "DOWNLOAD_FAILED",
        errorMessage: `Failed to download video: ${downloadResponse.statusText}`,
        completedAt: new Date()
      });
      return;
    }

    const arrayBuffer = await downloadResponse.arrayBuffer();
    const videoBuffer = Buffer.from(arrayBuffer);
    
    console.log(`[Job ${jobId}] Downloaded video buffer size: ${videoBuffer.length} bytes`);

    const uniqueId = randomBytes(8).toString("hex");
    const fileName = `video_${uniqueId}.mp4`;
    
    // Use path.resolve for absolute path to ensure consistency
    const projectRoot = process.cwd();
    const publicDir = path.resolve(projectRoot, "public", "generated");

    console.log(`[Job ${jobId}] Project root: ${projectRoot}`);
    console.log(`[Job ${jobId}] Target directory: ${publicDir}`);

    try {
      if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true, mode: 0o755 });
        console.log(`[Job ${jobId}] Created directory: ${publicDir}`);
      }
    } catch (mkdirError) {
      console.error(`[Job ${jobId}] Failed to create directory:`, mkdirError);
      await storage.updateVideoGenerationJob(jobId, {
        status: "failed",
        errorCode: "DIRECTORY_ERROR",
        errorMessage: "Failed to create output directory.",
        completedAt: new Date()
      });
      return;
    }

    const filePath = path.resolve(publicDir, fileName);
    console.log(`[Job ${jobId}] Writing video to: ${filePath}`);
    
    try {
      fs.writeFileSync(filePath, videoBuffer);
      console.log(`[Job ${jobId}] File write completed`);
    } catch (writeError) {
      console.error(`[Job ${jobId}] Failed to write file:`, writeError);
      await storage.updateVideoGenerationJob(jobId, {
        status: "failed",
        errorCode: "WRITE_FAILED",
        errorMessage: `Failed to write video file: ${writeError instanceof Error ? writeError.message : 'Unknown error'}`,
        completedAt: new Date()
      });
      return;
    }

    // Verify file was written successfully
    if (!fs.existsSync(filePath)) {
      console.error(`[Job ${jobId}] File does not exist after write: ${filePath}`);
      await storage.updateVideoGenerationJob(jobId, {
        status: "failed",
        errorCode: "SAVE_FAILED",
        errorMessage: "Video file was not saved correctly - file does not exist.",
        completedAt: new Date()
      });
      return;
    }
    
    const fileStats = fs.statSync(filePath);
    if (fileStats.size === 0) {
      console.error(`[Job ${jobId}] File is empty: ${filePath}`);
      await storage.updateVideoGenerationJob(jobId, {
        status: "failed",
        errorCode: "SAVE_FAILED",
        errorMessage: "Video file was not saved correctly - file is empty.",
        completedAt: new Date()
      });
      return;
    }
    
    console.log(`[Job ${jobId}] File verified: ${filePath} (${fileStats.size} bytes)`);

    const videoUrl = `/generated/${fileName}`;

    const savedVideo = await storage.createVideoGeneration({
      userId: job.userId,
      prompt: job.prompt,
      videoUrl,
      length: job.length,
      aspectRatio: job.aspectRatio,
      style: job.style || null,
    });

    await storage.incrementVideoCount(job.userId);

    await storage.updateVideoGenerationJob(jobId, {
      status: "completed",
      videoUrl,
      progress: 100,
      completedAt: new Date()
    });

    const wsManager = getWebSocketManager();
    if (wsManager) {
      wsManager.broadcastToUser(job.userId, {
        type: 'video-generated',
        userId: job.userId,
        videoId: savedVideo.id
      });
    }

    console.log(`[Job ${jobId}] Completed successfully! Video saved: ${videoUrl}`);

  } catch (error: any) {
    console.error(`[Job ${jobId}] Processing error:`, error);
    const { code, message } = classifyError(error);
    await storage.updateVideoGenerationJob(jobId, {
      status: "failed",
      errorCode: code,
      errorMessage: message,
      completedAt: new Date()
    });
  }
}

export function createGeneratorRouter(): Router {
  const router = Router();

  router.post("/", isAuthenticated, async (req: any, res) => {
    try {
      const userId = await getAuthenticatedUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      
      let user = await storage.checkAndResetVideoCount(userId);
      user = await storage.checkAndAllocateCredits(userId, user.membershipTier as MembershipTier);
      
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

      const { prompt, length = 6, aspectRatio = "16:9", style } = validation.data;

      // Calculate credit cost
      // Base cost 10, +2 for 8s, +3 for 4K (Premium), +2 for HD (Pro)
      let creditCost = 10;
      if (length > 6) creditCost += 2;
      if (user.membershipTier === "premium") creditCost += 3;
      else if (user.membershipTier === "pro") creditCost += 2;

      if (user.credits < creditCost) {
        return res.status(403).json({
          error: "Insufficient credits",
          message: `You need ${creditCost} credits to generate this video. You have ${user.credits}.`,
        });
      }

      console.log(`[API Debug] Received request - length: ${length} (type: ${typeof length}), aspectRatio: ${aspectRatio}, style: ${style}, cost: ${creditCost}`);

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

      let enhancedPrompt = prompt;
      if (style) {
        enhancedPrompt = `${prompt}, ${style} style`;
      }
      enhancedPrompt = `${enhancedPrompt}, cosmic ASMR aesthetic, high quality, cinematic, smooth motion, satisfying visuals`;

      const veoAspectRatio = mapAspectRatio(aspectRatio);
      const videoDuration = mapDuration(length);

      console.log(`[API Debug] Mapped values - videoDuration: ${videoDuration}, veoAspectRatio: ${veoAspectRatio}`);

      const job = await storage.createVideoGenerationJob({
        userId,
        prompt,
        enhancedPrompt,
        length: videoDuration,
        aspectRatio: veoAspectRatio,
        style: style || null,
        status: "pending",
        progress: 0
      });

      // Deduct credits
      await storage.deductCredits(userId, creditCost);

      console.log(`[API] Created generation job ${job.id} for user ${userId}, deducted ${creditCost} credits`);

      setImmediate(() => {
        processVideoGenerationJob(job.id).catch(err => {
          console.error(`[Job ${job.id}] Background processing error:`, err);
        });
      });

      const response: VideoJobInitResponse = {
        jobId: job.id,
        status: "pending",
        message: "Video generation started. Poll /api/generate/status/:jobId for updates."
      };

      return res.json(response);
    } catch (error) {
      console.error("Generation init error:", error);
      const errorResponse: ErrorResponse = {
        error: "Server error",
        message: error instanceof Error ? error.message : "An unexpected error occurred",
      };
      return res.status(500).json(errorResponse);
    }
  });

  router.get("/status/:jobId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = await getAuthenticatedUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const jobId = parseInt(req.params.jobId, 10);
      if (isNaN(jobId)) {
        return res.status(400).json({ error: "Invalid job ID" });
      }

      const job = await storage.getVideoGenerationJobByUser(jobId, userId);
      if (!job) {
        return res.status(404).json({ error: "Job not found" });
      }

      const response: VideoJobStatusResponse = {
        jobId: job.id,
        status: job.status as VideoJobStatus,
        progress: job.progress,
        videoUrl: job.videoUrl || undefined,
        errorMessage: job.errorMessage || undefined,
        errorCode: job.errorCode || undefined
      };

      return res.json(response);
    } catch (error) {
      console.error("Status check error:", error);
      return res.status(500).json({ error: "Failed to check job status" });
    }
  });

  return router;
}
