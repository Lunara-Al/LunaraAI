import type { Express } from "express";
import { createServer, type Server } from "http";
import { videoGenerationSchema } from "@shared/schema";
import type { VideoGenerationResponse, ErrorResponse } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  const PIKA_API_KEY = process.env.PIKA_API_KEY;
  const PIKA_URL = "https://api.pika.art/v1/videos";

  if (!PIKA_API_KEY) {
    console.error("PIKA_API_KEY is not set in environment variables");
  }

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

      const { prompt } = validation.data;

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
          length: 10,
          aspect_ratio: "1:1"
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

      const successResponse: VideoGenerationResponse = {
        videoUrl,
        prompt
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
