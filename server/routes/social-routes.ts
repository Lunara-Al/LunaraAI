import { Router } from "express";
import { storage } from "../storage";
import { isAuthenticated, getAuthenticatedUserId, getAuthenticatedUser } from "../unified-auth";
import { 
  SOCIAL_PLATFORMS, 
  type SocialPlatform,
  createUploadJobSchema
} from "@shared/schema";
import crypto from "crypto";

export function createSocialRouter(): Router {
  const router = Router();

  router.get("/accounts", isAuthenticated, async (req, res) => {
    try {
      const userId = await getAuthenticatedUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const accounts = await storage.getSocialAccounts(userId);
      
      const sanitizedAccounts = accounts.map(account => ({
        id: account.id,
        platform: account.platform,
        displayName: account.displayName,
        profileImageUrl: account.profileImageUrl,
        isActive: account.isActive === 1,
        createdAt: account.createdAt,
      }));

      res.json({ accounts: sanitizedAccounts });
    } catch (error: any) {
      console.error("Error fetching social accounts:", error);
      res.status(500).json({ error: "Failed to fetch social accounts" });
    }
  });

  router.post("/connect/:platform", isAuthenticated, async (req, res) => {
    try {
      const user = await getAuthenticatedUser(req);
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { platform } = req.params;

      if (!SOCIAL_PLATFORMS.includes(platform as SocialPlatform)) {
        return res.status(400).json({ error: "Invalid platform" });
      }

      const existingAccount = await storage.getSocialAccountByPlatform(user.id, platform as SocialPlatform);
      if (existingAccount) {
        return res.status(400).json({ error: "Account already connected" });
      }

      const platformDisplayNames: Record<string, string> = {
        tiktok: "TikTok User",
        instagram: "Instagram Creator",
        youtube: "YouTube Channel"
      };

      const mockExternalId = `${platform}_${crypto.randomBytes(8).toString('hex')}`;
      
      const account = await storage.createSocialAccount({
        userId: user.id,
        platform,
        externalAccountId: mockExternalId,
        displayName: `${user.firstName || 'User'}'s ${platformDisplayNames[platform]}`,
        profileImageUrl: null,
        accessTokenEncrypted: null,
        refreshTokenEncrypted: null,
        tokenExpiresAt: null,
        scopes: null,
        metadata: { simulated: true, connectedAt: new Date().toISOString() },
        isActive: 1,
      });

      res.json({ 
        success: true, 
        account: {
          id: account.id,
          platform: account.platform,
          displayName: account.displayName,
          isActive: account.isActive === 1,
          createdAt: account.createdAt,
        },
        message: `Connected to ${platform} successfully`
      });
    } catch (error: any) {
      console.error("Error connecting social account:", error);
      res.status(500).json({ error: "Failed to connect account" });
    }
  });

  router.delete("/accounts/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = await getAuthenticatedUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const accountId = parseInt(req.params.id);

      if (isNaN(accountId)) {
        return res.status(400).json({ error: "Invalid account ID" });
      }

      const success = await storage.deleteSocialAccount(accountId, userId);
      if (!success) {
        return res.status(400).json({ error: "Unable to disconnect account" });
      }

      res.json({ success: true, message: "Account disconnected successfully" });
    } catch (error: any) {
      console.error("Error disconnecting social account:", error);
      res.status(500).json({ error: "Failed to disconnect account" });
    }
  });

  router.post("/upload", isAuthenticated, async (req, res) => {
    try {
      const userId = await getAuthenticatedUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const validation = createUploadJobSchema.safeParse(req.body);

      if (!validation.success) {
        return res.status(400).json({ error: validation.error.issues[0].message });
      }

      const { videoId, platform, caption, hashtags } = validation.data;

      const video = await storage.getVideoById(videoId);
      if (!video || video.userId !== userId) {
        return res.status(404).json({ error: "Video not found" });
      }

      const socialAccount = await storage.getSocialAccountByPlatform(userId, platform);
      if (!socialAccount) {
        return res.status(400).json({ error: `No ${platform} account connected` });
      }

      const job = await storage.createUploadJob({
        userId,
        videoId,
        socialAccountId: socialAccount.id,
        platform,
        status: "pending",
        caption: caption || null,
        hashtags: hashtags || null,
        externalPostId: null,
        externalPostUrl: null,
        errorMessage: null,
      });

      setTimeout(async () => {
        try {
          await storage.updateUploadJobStatus(job.id, "uploading");
          
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          const mockPostId = `post_${crypto.randomBytes(6).toString('hex')}`;
          const mockPostUrls: Record<string, string> = {
            tiktok: `https://www.tiktok.com/@user/video/${mockPostId}`,
            instagram: `https://www.instagram.com/reel/${mockPostId}`,
            youtube: `https://www.youtube.com/shorts/${mockPostId}`,
          };

          await storage.updateUploadJobStatus(
            job.id, 
            "completed", 
            mockPostId,
            mockPostUrls[platform]
          );
        } catch (error) {
          console.error("Error in simulated upload:", error);
          await storage.updateUploadJobStatus(job.id, "failed", undefined, undefined, "Upload failed");
        }
      }, 1000);

      res.json({ 
        success: true, 
        jobId: job.id,
        message: `Video queued for upload to ${platform}`,
        status: "pending"
      });
    } catch (error: any) {
      console.error("Error creating upload job:", error);
      res.status(500).json({ error: "Failed to queue video for upload" });
    }
  });

  router.get("/upload/:jobId/status", isAuthenticated, async (req, res) => {
    try {
      const userId = await getAuthenticatedUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const jobId = parseInt(req.params.jobId);

      if (isNaN(jobId)) {
        return res.status(400).json({ error: "Invalid job ID" });
      }

      const job = await storage.getUploadJob(jobId);
      if (!job || job.userId !== userId) {
        return res.status(404).json({ error: "Upload job not found" });
      }

      res.json({
        id: job.id,
        platform: job.platform,
        status: job.status,
        externalPostUrl: job.externalPostUrl,
        errorMessage: job.errorMessage,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
      });
    } catch (error: any) {
      console.error("Error fetching upload job status:", error);
      res.status(500).json({ error: "Failed to fetch upload status" });
    }
  });

  router.get("/uploads", isAuthenticated, async (req, res) => {
    try {
      const userId = await getAuthenticatedUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const jobs = await storage.getUploadJobs(userId, 20);

      res.json({
        uploads: jobs.map(job => ({
          id: job.id,
          platform: job.platform,
          status: job.status,
          caption: job.caption,
          externalPostUrl: job.externalPostUrl,
          errorMessage: job.errorMessage,
          createdAt: job.createdAt,
        }))
      });
    } catch (error: any) {
      console.error("Error fetching upload jobs:", error);
      res.status(500).json({ error: "Failed to fetch upload history" });
    }
  });

  return router;
}
