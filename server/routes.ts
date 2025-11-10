import type { Express } from "express";
import { createServer, type Server } from "http";
import { videoGenerationSchema } from "@shared/schema";
import type { VideoGenerationResponse, ErrorResponse } from "@shared/schema";
import { storage } from "./storage";

export async function registerRoutes(app: Express): Promise<Server> {
  const PIKA_API_KEY = process.env.PIKA_API_KEY;
  const PIKA_URL = "https://api.pika.art/v1/videos";

  if (!PIKA_API_KEY) {
    console.error("PIKA_API_KEY is not set in environment variables");
  }

  // Get video generation history
  app.get("/api/history", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const videos = await storage.getVideoGenerations(limit);
      return res.json(videos);
    } catch (error) {
      console.error("Error fetching history:", error);
      const errorResponse: ErrorResponse = {
        error: "Server error",
        message: "Failed to fetch video history"
      };
      return res.status(500).json(errorResponse);
    }
  });

  // Delete video generation
  app.delete("/api/history/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        const errorResponse: ErrorResponse = {
          error: "Invalid ID",
          message: "Video ID must be a number"
        };
        return res.status(400).json(errorResponse);
      }

      const deleted = await storage.deleteVideoGeneration(id);
      
      if (!deleted) {
        const errorResponse: ErrorResponse = {
          error: "Not found",
          message: "Video not found"
        };
        return res.status(404).json(errorResponse);
      }

      return res.json({ success: true });
    } catch (error) {
      console.error("Error deleting video:", error);
      const errorResponse: ErrorResponse = {
        error: "Server error",
        message: "Failed to delete video"
      };
      return res.status(500).json(errorResponse);
    }
  });

  app.post("/api/generate", async (req, res) => {
    try {
      // Validate request body
      const validation = videoGenerationSchema.safeParse(req.body);
      
      if (!validation.success) {
        const errorResponse: ErrorResponse = {
          error: "Invalid request",
          message: validation.error.errors[0]?.message || "Invalid prompt"
        };
        return res.status(400).json(errorResponse);
      }

      const { prompt, length = 10, aspectRatio = "1:1", style } = validation.data;

      // Check if API key is available
      if (!PIKA_API_KEY) {
        const errorResponse: ErrorResponse = {
          error: "Configuration error",
          message: "Pika API key is not configured"
        };
        return res.status(500).json(errorResponse);
      }

      // Call Pika Labs API
      const response = await fetch(PIKA_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${PIKA_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          prompt,
          length,
          aspect_ratio: aspectRatio,
          ...(style && { style })
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Pika API error:", response.status, errorText);
        
        const errorResponse: ErrorResponse = {
          error: "Video generation failed",
          message: `Failed to generate video. Status: ${response.status}`
        };
        return res.status(response.status).json(errorResponse);
      }

      const data = await response.json();
      
      // Extract video URL from response
      const videoUrl = data.video_url || data.url || data.videoUrl;
      
      if (!videoUrl) {
        console.error("No video URL in Pika API response:", data);
        const errorResponse: ErrorResponse = {
          error: "Invalid response",
          message: "Video URL not found in response"
        };
        return res.status(500).json(errorResponse);
      }

      // Save to database
      const savedVideo = await storage.createVideoGeneration({
        prompt,
        videoUrl,
        length,
        aspectRatio,
        style: style || null,
      });

      const successResponse: VideoGenerationResponse = {
        videoUrl,
        prompt,
        id: savedVideo.id
      };

      return res.json(successResponse);

    } catch (error) {
      console.error("Error generating video:", error);
      
      const errorResponse: ErrorResponse = {
        error: "Server error",
        message: error instanceof Error ? error.message : "An unexpected error occurred"
      };
      
      return res.status(500).json(errorResponse);
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
