import { Router } from "express";
import type { ErrorResponse } from "@shared/schema";
import { storage } from "../storage";
import { isAuthenticated, getAuthenticatedUserId } from "../unified-auth";
import { getWebSocketManager } from "../websocket";

export function createGalleryRouter(): Router {
  const router = Router();

  router.get("/", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      
      if (req.isAuthenticated && req.isAuthenticated()) {
        const userId = await getAuthenticatedUserId(req);
        if (userId) {
          const videos = await storage.getUserVideoGenerations(userId, limit);
          return res.json(videos);
        }
      }
      
      const videos = await storage.getVideoGenerations(limit);
      return res.json(videos);
    } catch (error) {
      const errorResponse: ErrorResponse = {
        error: "Server error",
        message: "Failed to fetch video history",
      };
      return res.status(500).json(errorResponse);
    }
  });

  router.delete("/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = await getAuthenticatedUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      
      if (isNaN(id)) {
        const errorResponse: ErrorResponse = {
          error: "Invalid ID",
          message: "Video ID must be a number",
        };
        return res.status(400).json(errorResponse);
      }

      const deleted = await storage.deleteVideoGeneration(id, userId);
      
      if (!deleted) {
        const errorResponse: ErrorResponse = {
          error: "Not found",
          message: "Video not found or you don't have permission to delete it",
        };
        return res.status(404).json(errorResponse);
      }

      // Broadcast sync event to all devices
      const wsManager = getWebSocketManager();
      if (wsManager) {
        wsManager.broadcastToUser(userId, {
          type: 'video-deleted',
          userId,
          videoId: id
        });
      }

      return res.json({ success: true });
    } catch (error) {
      const errorResponse: ErrorResponse = {
        error: "Server error",
        message: "Failed to delete video",
      };
      return res.status(500).json(errorResponse);
    }
  });

  router.patch("/:id/creation-toggle", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = await getAuthenticatedUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid video ID" });
      }

      const { display } = req.body;
      if (typeof display !== "boolean") {
        return res.status(400).json({ error: "Display must be a boolean" });
      }

      const updated = await storage.toggleCreationDisplay(id, userId, display);
      
      if (!updated) {
        return res.status(404).json({ error: "Video not found or unauthorized" });
      }

      // Note: WebSocket sync for creation toggle can be added when extending message types

      return res.json(updated);
    } catch (error) {
      return res.status(500).json({ error: "Failed to toggle creation display" });
    }
  });

  router.get("/creations/:userId", async (req: any, res) => {
    try {
      const { userId } = req.params;
      const creations = await storage.getUserCreations(userId);
      return res.json(creations);
    } catch (error) {
      return res.status(500).json({ error: "Failed to fetch creations" });
    }
  });

  router.get("/search", async (req: any, res) => {
    try {
      const query = req.query.q as string;
      if (!query || query.trim().length === 0) {
        return res.json([]);
      }

      const searchTerm = query.toLowerCase();
      const allCreations = await storage.getAllVideoGenerations();
      
      const filtered = allCreations
        .filter(video => 
          video.displayOnProfile === 1 &&
          (video.prompt.toLowerCase().includes(searchTerm) ||
           (video.style && video.style.toLowerCase().includes(searchTerm)))
        )
        .slice(0, 12);

      return res.json(filtered);
    } catch (error) {
      return res.status(500).json({ error: "Failed to search creations" });
    }
  });

  router.post("/", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const userId = await getAuthenticatedUserId(req);
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const { videoUrl, prompt, length, aspectRatio } = req.body;
    const newVideo = await storage.createVideoGeneration({
      userId: userId,
      videoUrl: videoUrl || "https://cdn.pixabay.com/video/2023/10/20/185834-876678680_large.mp4",
      prompt: prompt || "Cosmic ASMR Test Video",
      length: length || 10,
      aspectRatio: aspectRatio || "16:9",
      displayOnProfile: 0,
    });
    res.json(newVideo);
  });

  return router;
}
