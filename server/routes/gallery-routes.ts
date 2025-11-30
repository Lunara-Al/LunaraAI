import { Router } from "express";
import type { ErrorResponse } from "@shared/schema";
import { storage } from "../storage";
import { isAuthenticated, getAuthenticatedUserId } from "../unified-auth";

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

      return res.json({ success: true });
    } catch (error) {
      const errorResponse: ErrorResponse = {
        error: "Server error",
        message: "Failed to delete video",
      };
      return res.status(500).json(errorResponse);
    }
  });

  return router;
}
