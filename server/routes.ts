// Server routes with Auth and Stripe integration
import type { Express } from "express";
import { createServer, type Server } from "http";
import { videoGenerationSchema, MEMBERSHIP_TIERS, type MembershipTier, updateUserSettingsSchema, registerSchema, loginSchema } from "@shared/schema";
import type { VideoGenerationResponse, ErrorResponse } from "@shared/schema";
import { storage } from "./storage";
import { isAuthenticated, getAuthenticatedUserId, getAuthenticatedUser } from "./unified-auth";
import { authService } from "./auth-service";
import passport from "passport";
import Stripe from "stripe";

export async function registerRoutes(app: Express): Promise<Server> {
  const PIKA_API_KEY = process.env.PIKA_API_KEY;
  const PIKA_URL = "https://api.pika.art/v1/videos";

  // Initialize Stripe (optional - will work without Stripe keys for simulation)
  let stripe: Stripe | null = null;
  if (process.env.STRIPE_SECRET_KEY) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  } else {
    console.warn("STRIPE_SECRET_KEY not set - payment processing will be simulated");
  }

  if (!PIKA_API_KEY) {
    console.error("PIKA_API_KEY is not set in environment variables");
  }

  // New unified auth endpoints for local password authentication
  app.post('/api/auth/register', async (req, res) => {
    try {
      const validation = registerSchema.safeParse(req.body);
      
      if (!validation.success) {
        const fieldErrors: Record<string, string> = {};
        validation.error.errors.forEach(err => {
          const field = err.path[0];
          if (field) {
            fieldErrors[field.toString()] = err.message;
          }
        });
        
        return res.status(400).json({ 
          message: "Validation failed",
          errors: fieldErrors
        });
      }

      const { email, username, password, firstName, lastName } = validation.data;
      
      const user = await authService.createUser({
        email,
        username,
        password,
        firstName,
        lastName,
      });

      res.status(201).json({ 
        success: true,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
        }
      });
    } catch (error: any) {
      console.error("Error registering user:", error);
      
      const fieldErrors: Record<string, string> = {};
      if (error.message === "Email already in use") {
        fieldErrors.email = "This email is already registered";
      } else if (error.message === "Username already in use") {
        fieldErrors.username = "This username is already taken";
      }
      
      res.status(400).json({ 
        message: error.message || "Failed to create account",
        errors: Object.keys(fieldErrors).length > 0 ? fieldErrors : undefined
      });
    }
  });

  app.post('/api/auth/login', (req, res, next) => {
    const validation = loginSchema.safeParse(req.body);
    
    if (!validation.success) {
      const fieldErrors: Record<string, string> = {};
      validation.error.errors.forEach(err => {
        const field = err.path[0];
        if (field) {
          fieldErrors[field.toString()] = err.message;
        }
      });
      
      return res.status(400).json({ 
        message: "Validation failed",
        errors: fieldErrors
      });
    }
    
    passport.authenticate('local', (err: any, session: any, info: any) => {
      if (err) {
        return res.status(500).json({ 
          message: "An error occurred during login"
        });
      }
      
      if (!session) {
        return res.status(401).json({ 
          message: info?.message || "Invalid credentials"
        });
      }

      req.logIn(session, (err) => {
        if (err) {
          return res.status(500).json({ 
            message: "Failed to create session"
          });
        }
        
        res.json({ success: true });
      });
    })(req, res, next);
  });

  app.get('/api/auth/me', isAuthenticated, async (req: any, res) => {
    try {
      const user = await getAuthenticatedUser(req);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(user);
    } catch (error) {
      console.error("Error fetching current user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Legacy endpoint for backward compatibility
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const user = await getAuthenticatedUser(req);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Delete account endpoint
  app.post('/api/auth/delete-account', isAuthenticated, async (req: any, res) => {
    try {
      const user = await getAuthenticatedUser(req);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
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
      console.error("Error deleting account:", error);
      res.status(500).json({ message: "Failed to delete account" });
    }
  });

  // Get user's current subscription status
  app.get("/api/subscription/status", isAuthenticated, async (req: any, res) => {
    try {
      const userId = await getAuthenticatedUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const tierConfig = MEMBERSHIP_TIERS[user.membershipTier as MembershipTier];
      const videoCount = await storage.getMonthlyVideoCount(userId);
      
      res.json({
        tier: user.membershipTier,
        videosUsed: videoCount,
        videosLimit: tierConfig.monthlyVideos,
        maxLength: tierConfig.maxLength,
        quality: tierConfig.quality,
        stripeSubscriptionId: user.stripeSubscriptionId,
      });
    } catch (error) {
      console.error("Error fetching subscription status:", error);
      res.status(500).json({ error: "Failed to fetch subscription status" });
    }
  });

  // Create or upgrade subscription
  app.post("/api/subscription/create", isAuthenticated, async (req: any, res) => {
    try {
      const userId = await getAuthenticatedUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const { tier } = req.body as { tier: MembershipTier };

      if (!tier || !MEMBERSHIP_TIERS[tier]) {
        return res.status(400).json({ error: "Invalid membership tier" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Free tier - just update in database
      if (tier === "free") {
        const updatedUser = await storage.updateUserMembership(userId, "free", undefined);
        return res.json({ success: true, tier: updatedUser.membershipTier });
      }

      // Paid tiers - require Stripe
      if (!stripe) {
        return res.status(503).json({ 
          error: "Payment processing unavailable", 
          message: "Stripe is not configured. Simulating subscription upgrade.",
          simulated: true 
        });
      }

      // Create or retrieve Stripe customer
      let customerId = user.stripeCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email || undefined,
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || undefined,
          metadata: { userId },
        });
        customerId = customer.id;
      }

      // Get price ID for the tier
      const tierConfig = MEMBERSHIP_TIERS[tier];
      if (!tierConfig.stripePriceId) {
        return res.status(400).json({ error: "Price ID not configured for this tier" });
      }

      // Create checkout session
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: "subscription",
        payment_method_types: ["card"],
        line_items: [
          {
            price: tierConfig.stripePriceId,
            quantity: 1,
          },
        ],
        success_url: `${req.protocol}://${req.get('host')}/membership?success=true`,
        cancel_url: `${req.protocol}://${req.get('host')}/membership?canceled=true`,
        metadata: {
          userId,
          tier,
        },
      });

      res.json({ sessionId: session.id, url: session.url });
    } catch (error: any) {
      console.error("Error creating subscription:", error);
      res.status(500).json({ error: "Failed to create subscription", message: error.message });
    }
  });

  // Simulate subscription upgrade (when Stripe is not configured)
  app.post("/api/subscription/simulate-upgrade", isAuthenticated, async (req: any, res) => {
    try {
      const userId = await getAuthenticatedUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const { tier } = req.body as { tier: MembershipTier };

      if (!tier || !MEMBERSHIP_TIERS[tier]) {
        return res.status(400).json({ error: "Invalid membership tier" });
      }

      const updatedUser = await storage.updateUserMembership(userId, tier, `sim_${Date.now()}`);
      res.json({ 
        success: true, 
        tier: updatedUser.membershipTier,
        simulated: true,
        message: "Subscription updated (simulated - Stripe not configured)"
      });
    } catch (error) {
      console.error("Error simulating upgrade:", error);
      res.status(500).json({ error: "Failed to update subscription" });
    }
  });

  // Cancel subscription (downgrade to free)
  app.post("/api/subscription/cancel", isAuthenticated, async (req: any, res) => {
    try {
      const userId = await getAuthenticatedUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // If has Stripe subscription, cancel it
      if (stripe && user.stripeSubscriptionId && !user.stripeSubscriptionId.startsWith('sim_')) {
        await stripe.subscriptions.cancel(user.stripeSubscriptionId);
      }

      // Downgrade to free tier
      const updatedUser = await storage.updateUserMembership(userId, "free", undefined);
      
      res.json({ 
        success: true, 
        tier: updatedUser.membershipTier,
        message: "Subscription canceled successfully"
      });
    } catch (error) {
      console.error("Error canceling subscription:", error);
      res.status(500).json({ error: "Failed to cancel subscription" });
    }
  });

  // Get user settings
  app.get("/api/settings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = await getAuthenticatedUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      let settings = await storage.getUserSettings(userId);
      
      // If settings don't exist, create default settings
      if (!settings) {
        settings = await storage.createUserSettings({
          userId,
          defaultLength: 10,
          defaultAspectRatio: "1:1",
          emailNotifications: 1,
          galleryView: "grid",
          theme: "dark",
          autoSave: 1,
        });
      }
      
      res.json(settings);
    } catch (error) {
      console.error("Error fetching settings:", error);
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  // Update user settings
  app.patch("/api/settings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = await getAuthenticatedUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      // Validate request body
      const validation = updateUserSettingsSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({ 
          error: "Invalid request",
          message: validation.error.errors[0]?.message || "Invalid settings data"
        });
      }
      
      // Ensure settings exist
      let settings = await storage.getUserSettings(userId);
      if (!settings) {
        settings = await storage.createUserSettings({
          userId,
          defaultLength: 10,
          defaultAspectRatio: "1:1",
          emailNotifications: 1,
          galleryView: "grid",
          theme: "dark",
          autoSave: 1,
        });
      }
      
      // Update settings
      const updated = await storage.updateUserSettings(userId, validation.data);
      res.json(updated);
    } catch (error) {
      console.error("Error updating settings:", error);
      res.status(500).json({ error: "Failed to update settings" });
    }
  });

  // Get video generation history (user-specific when authenticated)
  app.get("/api/history", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      
      // If authenticated, get user-specific videos
      if (req.isAuthenticated && req.isAuthenticated()) {
        const userId = await getAuthenticatedUserId(req);
        if (userId) {
          const videos = await storage.getUserVideoGenerations(userId, limit);
          return res.json(videos);
        }
      }
      
      // Otherwise get all videos (for non-authenticated access)
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

  // Delete video generation (user can only delete their own)
  app.delete("/api/history/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = await getAuthenticatedUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      if (isNaN(id)) {
        const errorResponse: ErrorResponse = {
          error: "Invalid ID",
          message: "Video ID must be a number"
        };
        return res.status(400).json(errorResponse);
      }

      const deleted = await storage.deleteVideoGeneration(id, userId);
      
      if (!deleted) {
        const errorResponse: ErrorResponse = {
          error: "Not found",
          message: "Video not found or you don't have permission to delete it"
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

  // Video generation endpoint (protected - requires authentication)
  app.post("/api/generate", isAuthenticated, async (req: any, res) => {
    try {
      const userId = await getAuthenticatedUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      // Get user and check/reset monthly video count if needed
      let user = await storage.checkAndResetVideoCount(userId);
      const tierConfig = MEMBERSHIP_TIERS[user.membershipTier as MembershipTier];
      
      // Check video limit
      if (tierConfig.monthlyVideos !== -1 && user.videosGeneratedThisMonth >= tierConfig.monthlyVideos) {
        const errorResponse: ErrorResponse = {
          error: "Limit reached",
          message: `You've reached your monthly limit of ${tierConfig.monthlyVideos} videos. Upgrade your plan to generate more.`
        };
        return res.status(403).json(errorResponse);
      }

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

      // Check length limit based on membership
      if (length > tierConfig.maxLength) {
        const errorResponse: ErrorResponse = {
          error: "Length not allowed",
          message: `Your ${tierConfig.name} plan allows videos up to ${tierConfig.maxLength} seconds. Upgrade to generate longer videos.`
        };
        return res.status(403).json(errorResponse);
      }

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

      // Save to database with user ID
      const savedVideo = await storage.createVideoGeneration({
        userId,
        prompt,
        videoUrl,
        length,
        aspectRatio,
        style: style || null,
      });

      // Increment user's video count
      await storage.incrementVideoCount(userId);

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
