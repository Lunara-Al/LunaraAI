import { Router } from "express";
import { db } from "../db";
import { users, updateProfileSchema } from "@shared/schema";
import { eq } from "drizzle-orm";
import { isAuthenticated, getAuthenticatedUser } from "../unified-auth";
import { getWebSocketManager } from "../websocket";
import { z } from "zod";

export function createProfileRouter(): Router {
  const router = Router();

  /**
   * Upload and save profile picture
   * POST /api/profile/upload-picture
   * 
   * Expected body:
   * - imageData: base64 encoded JPEG image string
   */
  router.post("/upload-picture", isAuthenticated, async (req, res) => {
    try {
      const userId = getAuthenticatedUser(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { imageData } = req.body;

      // Validate imageData
      if (!imageData || typeof imageData !== "string") {
        return res.status(400).json({ message: "Invalid image data" });
      }

      // Basic validation: should be a data URL or base64 string
      if (!imageData.startsWith("data:") && !imageData.match(/^[A-Za-z0-9+/=]+$/)) {
        return res.status(400).json({ message: "Invalid image format" });
      }

      // Size validation: base64 images should be reasonable size (limit to ~5MB)
      const maxSizeInBytes = 5 * 1024 * 1024;
      if (imageData.length > maxSizeInBytes) {
        return res.status(400).json({ message: "Image too large. Maximum size is 5MB." });
      }

      // Update the user's profile image
      const updatedUser = await db
        .update(users)
        .set({
          profileImageUrl: imageData,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId))
        .returning();

      if (!updatedUser.length) {
        return res.status(404).json({ message: "User not found" });
      }

      // Notify all devices of this user about the profile picture change
      const wsManager = getWebSocketManager();
      wsManager.broadcastToUser(userId, {
        type: "profile-picture-updated",
        data: {
          profileImageUrl: imageData,
        },
      });

      res.json({
        success: true,
        message: "Profile picture updated successfully",
        profileImageUrl: imageData,
      });
    } catch (error) {
      console.error("Error uploading profile picture:", error);
      res.status(500).json({
        message: "Failed to upload profile picture",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  /**
   * Update profile information
   * PATCH /api/profile/update
   * 
   * Expected body (all fields optional):
   * - firstName: string
   * - lastName: string
   * - email: string
   * - username: string
   * - currentPassword: string (required if changing password)
   * - newPassword: string (required if changing password)
   */
  router.patch("/update", isAuthenticated, async (req, res) => {
    try {
      const userId = getAuthenticatedUser(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Validate with partial profile update schema
      const validation = updateProfileSchema
        .partial()
        .omit({ currentPassword: true, newPassword: true })
        .safeParse(req.body);

      if (!validation.success) {
        const fieldErrors: Record<string, string> = {};
        validation.error.errors.forEach((err) => {
          const field = err.path[0];
          if (field) fieldErrors[field.toString()] = err.message;
        });
        return res.status(400).json({
          message: "Validation failed",
          errors: fieldErrors,
        });
      }

      const { firstName, lastName, email, username } = validation.data;

      // Build update object dynamically
      const updateData: Record<string, any> = {
        updatedAt: new Date(),
      };

      if (firstName !== undefined) updateData.firstName = firstName || null;
      if (lastName !== undefined) updateData.lastName = lastName || null;
      if (email !== undefined) updateData.email = email || null;
      if (username !== undefined) updateData.username = username || null;

      // Check for unique constraints before updating
      if (email) {
        const existingEmail = await db
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1);

        if (existingEmail.length > 0 && existingEmail[0].id !== userId) {
          return res.status(400).json({
            message: "Validation failed",
            errors: { email: "This email is already in use" },
          });
        }
      }

      if (username) {
        const existingUsername = await db
          .select()
          .from(users)
          .where(eq(users.username, username))
          .limit(1);

        if (existingUsername.length > 0 && existingUsername[0].id !== userId) {
          return res.status(400).json({
            message: "Validation failed",
            errors: { username: "This username is already taken" },
          });
        }
      }

      // Update the user
      const updatedUser = await db
        .update(users)
        .set(updateData)
        .where(eq(users.id, userId))
        .returning();

      if (!updatedUser.length) {
        return res.status(404).json({ message: "User not found" });
      }

      // Notify all devices of this user about the profile update
      const wsManager = getWebSocketManager();
      const user = updatedUser[0];
      wsManager.broadcastToUser(userId, {
        type: "profile-updated",
        data: {
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          username: user.username,
        },
      });

      res.json({
        success: true,
        message: "Profile updated successfully",
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          username: user.username,
          profileImageUrl: user.profileImageUrl,
        },
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({
        message: "Failed to update profile",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  return router;
}
