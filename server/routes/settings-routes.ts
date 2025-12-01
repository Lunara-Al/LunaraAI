import { Router } from "express";
import { updateUserSettingsSchema, DEFAULT_VIDEO_LENGTH } from "@shared/schema";
import { storage } from "../storage";
import { isAuthenticated, getAuthenticatedUserId } from "../unified-auth";
import { getWebSocketManager } from "../websocket";

const DEFAULT_SETTINGS = {
  defaultLength: DEFAULT_VIDEO_LENGTH,
  defaultAspectRatio: "1:1",
  emailNotifications: 1,
  galleryView: "grid",
  theme: "dark",
  autoSave: 1,
} as const;

export function createSettingsRouter(): Router {
  const router = Router();

  router.get("/", isAuthenticated, async (req: any, res) => {
    try {
      const userId = await getAuthenticatedUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      
      let settings = await storage.getUserSettings(userId);
      
      if (!settings) {
        settings = await storage.createUserSettings({ userId, ...DEFAULT_SETTINGS });
      }
      
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  router.patch("/", isAuthenticated, async (req: any, res) => {
    try {
      const userId = await getAuthenticatedUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      
      const validation = updateUserSettingsSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          error: "Invalid request",
          message: validation.error.errors[0]?.message || "Invalid settings data",
        });
      }
      
      let settings = await storage.getUserSettings(userId);
      if (!settings) {
        settings = await storage.createUserSettings({ userId, ...DEFAULT_SETTINGS });
      }
      
      const updated = await storage.updateUserSettings(userId, validation.data);
      
      // Broadcast sync event to all devices
      const wsManager = getWebSocketManager();
      if (wsManager) {
        wsManager.broadcastToUser(userId, {
          type: 'settings-updated',
          userId,
          settings: updated
        });
      }
      
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update settings" });
    }
  });

  return router;
}
