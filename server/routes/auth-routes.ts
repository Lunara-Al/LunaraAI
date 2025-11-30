import { Router } from "express";
import { registerSchema, loginSchema, updateProfileSchema, users } from "@shared/schema";
import { storage } from "../storage";
import { db } from "../db";
import { eq } from "drizzle-orm";
import { isAuthenticated, getAuthenticatedUserId, getAuthenticatedUser } from "../unified-auth";
import { authService } from "../auth-service";
import passport from "passport";

export function createAuthRouter(): Router {
  const router = Router();

  router.post("/register", async (req, res) => {
    try {
      const validation = registerSchema.safeParse(req.body);
      
      if (!validation.success) {
        const fieldErrors: Record<string, string> = {};
        validation.error.errors.forEach((err) => {
          const field = err.path[0];
          if (field) fieldErrors[field.toString()] = err.message;
        });
        return res.status(400).json({ message: "Validation failed", errors: fieldErrors });
      }

      const { email, username, password, firstName, lastName } = validation.data;
      const user = await authService.createUser({ email, username, password, firstName, lastName });

      res.status(201).json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
        },
      });
    } catch (error: any) {
      const fieldErrors: Record<string, string> = {};
      if (error.message === "Email already in use") {
        fieldErrors.email = "This email is already registered";
      } else if (error.message === "Username already in use") {
        fieldErrors.username = "This username is already taken";
      }
      res.status(400).json({
        message: error.message || "Failed to create account",
        errors: Object.keys(fieldErrors).length > 0 ? fieldErrors : undefined,
      });
    }
  });

  router.post("/login", (req, res, next) => {
    const validation = loginSchema.safeParse(req.body);
    
    if (!validation.success) {
      const fieldErrors: Record<string, string> = {};
      validation.error.errors.forEach((err) => {
        const field = err.path[0];
        if (field) fieldErrors[field.toString()] = err.message;
      });
      return res.status(400).json({ message: "Validation failed", errors: fieldErrors });
    }
    
    passport.authenticate("local", (err: any, session: any, info: any) => {
      if (err) return res.status(500).json({ message: "An error occurred during login" });
      if (!session) return res.status(401).json({ message: info?.message || "Invalid credentials" });

      req.logIn(session, (err) => {
        if (err) return res.status(500).json({ message: "Failed to create session" });
        res.json({ success: true });
      });
    })(req, res, next);
  });

  router.get("/me", isAuthenticated, async (req: any, res) => {
    try {
      const user = await getAuthenticatedUser(req);
      if (!user) return res.status(404).json({ message: "User not found" });
      
      const userResponse = {
        ...user,
        hasPassword: !!user.passwordHash,
      };
      delete (userResponse as any).passwordHash;
      delete (userResponse as any).resetToken;
      delete (userResponse as any).resetTokenExpiry;
      
      res.json(userResponse);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  router.get("/user", isAuthenticated, async (req: any, res) => {
    try {
      const user = await getAuthenticatedUser(req);
      if (!user) return res.status(404).json({ message: "User not found" });
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  router.post("/delete-account", isAuthenticated, async (req: any, res) => {
    try {
      const user = await getAuthenticatedUser(req);
      if (!user) return res.status(404).json({ message: "User not found" });

      const { method, password, confirmation } = req.body;

      if (method === "password") {
        if (!user.passwordHash) return res.status(400).json({ message: "Invalid verification method" });
        if (!password) return res.status(400).json({ message: "Password is required" });
        const isValid = await authService.verifyPassword(password, user.passwordHash);
        if (!isValid) return res.status(401).json({ message: "Incorrect password" });
      } else if (method === "text") {
        if (user.passwordHash) return res.status(400).json({ message: "Invalid verification method" });
        if (confirmation !== "DELETE") return res.status(400).json({ message: "Invalid confirmation text" });
      } else {
        return res.status(400).json({ message: "Invalid verification method" });
      }

      await storage.logAccountAudit({
        userId: user.id,
        email: user.email || "",
        username: user.username || undefined,
        action: "deleted",
        authProvider: user.passwordHash ? "local" : "replit",
      });

      await storage.deleteUserAccount(user.id);

      req.logout(() => {
        res.json({ success: true, message: "Account deleted successfully" });
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete account" });
    }
  });

  return router;
}

export function createProfileRouter(): Router {
  const router = Router();

  router.post("/upload-picture", isAuthenticated, async (req: any, res) => {
    try {
      const userId = await getAuthenticatedUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const { imageData } = req.body as { imageData: string };
      if (!imageData) return res.status(400).json({ error: "Image data is required" });
      if (!imageData.startsWith("data:image/")) return res.status(400).json({ error: "Invalid image format" });
      if (imageData.length > 7 * 1024 * 1024) return res.status(400).json({ error: "Image is too large" });

      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ error: "User not found" });

      const updatedUser = await storage.updateProfilePicture(userId, imageData);
      res.json({ success: true, profileImageUrl: updatedUser.profileImageUrl });
    } catch (error) {
      res.status(500).json({ error: "Failed to upload profile picture" });
    }
  });

  router.patch("/update", isAuthenticated, async (req: any, res) => {
    try {
      const userId = await getAuthenticatedUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const validation = updateProfileSchema.safeParse(req.body);
      if (!validation.success) {
        const fieldErrors: Record<string, string> = {};
        validation.error.errors.forEach((err) => {
          const field = err.path[0];
          if (field) fieldErrors[field.toString()] = err.message;
        });
        return res.status(400).json({ message: "Validation failed", errors: fieldErrors });
      }

      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ error: "User not found" });

      const { firstName, lastName, email, username, currentPassword, newPassword } = validation.data;
      const updateData: any = {};

      if (newPassword) {
        if (!user.passwordHash) return res.status(400).json({ error: "You cannot change password for OIDC accounts" });
        if (!currentPassword) return res.status(400).json({ error: "Current password is required" });
        const isValid = await authService.verifyPassword(currentPassword, user.passwordHash);
        if (!isValid) return res.status(401).json({ error: "Current password is incorrect" });
        updateData.passwordHash = await authService.hashPassword(newPassword);
      }

      if (email && email !== user.email) {
        const existingByEmail = await storage.getUser(email.toLowerCase());
        if (existingByEmail && existingByEmail.id !== userId) {
          return res.status(400).json({ error: "Email is already in use" });
        }
        updateData.email = email;
      }

      if (username && username !== user.username) {
        const [existingByUsername] = await db.select().from(users).where(eq(users.username, username));
        if (existingByUsername && existingByUsername.id !== userId) {
          return res.status(400).json({ error: "Username is already taken" });
        }
        updateData.username = username;
      }

      if (firstName !== undefined) updateData.firstName = firstName;
      if (lastName !== undefined) updateData.lastName = lastName;

      const updatedUser = await storage.updateProfile(userId, updateData);

      res.json({
        success: true,
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          username: updatedUser.username,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          profileImageUrl: updatedUser.profileImageUrl,
          membershipTier: updatedUser.membershipTier,
          createdAt: updatedUser.createdAt,
          hasPassword: !!updatedUser.passwordHash,
        },
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to update profile" });
    }
  });

  return router;
}
