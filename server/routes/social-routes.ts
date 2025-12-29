import { Router } from "express";
import { storage } from "../storage";
import { isAuthenticated, getAuthenticatedUserId, getAuthenticatedUser } from "../unified-auth";
import { 
  SOCIAL_PLATFORMS, 
  type SocialPlatform,
  createUploadJobSchema
} from "@shared/schema";
import crypto from "crypto";
import {
  generateOAuthState,
  validateOAuthState,
  encryptToken,
  getTikTokConfig,
  getInstagramConfig,
  getYouTubeConfig,
  getTikTokAuthUrl,
  getInstagramAuthUrl,
  getYouTubeAuthUrl,
  exchangeTikTokCode,
  exchangeInstagramCode,
  exchangeYouTubeCode,
  getTikTokUserInfo,
  getInstagramUserInfo,
  getYouTubeUserInfo,
} from "../services/oauth-service";
import { processUploadJob } from "../services/social-upload-service";

declare module "express-session" {
  interface SessionData {
    oauthState?: {
      state: string;
      platform: SocialPlatform;
      returnUrl: string;
    };
  }
}

const PRO_REQUIRED_MESSAGE = "Social media upload is a Pro feature. Please upgrade your membership to use this feature.";

function isPaidTier(membershipTier: string): boolean {
  return membershipTier === "pro" || membershipTier === "premium";
}

export function createSocialRouter(): Router {
  const router = Router();

  router.get("/config", isAuthenticated, async (req, res) => {
    try {
      const tiktokConfig = getTikTokConfig();
      const instagramConfig = getInstagramConfig();
      const youtubeConfig = getYouTubeConfig();

      res.json({
        platforms: {
          tiktok: {
            available: !!tiktokConfig,
            usesOAuth: !!tiktokConfig,
          },
          instagram: {
            available: !!instagramConfig,
            usesOAuth: !!instagramConfig,
          },
          youtube: {
            available: !!youtubeConfig,
            usesOAuth: !!youtubeConfig,
          },
        },
      });
    } catch (error: any) {
      console.error("Error fetching social config:", error);
      res.status(500).json({ error: "Failed to fetch social configuration" });
    }
  });

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

  router.get("/auth/:platform", isAuthenticated, async (req, res) => {
    try {
      const user = await getAuthenticatedUser(req);
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      if (!isPaidTier(user.membershipTier)) {
        return res.status(403).json({ error: PRO_REQUIRED_MESSAGE });
      }

      const { platform } = req.params;

      if (!SOCIAL_PLATFORMS.includes(platform as SocialPlatform)) {
        return res.status(400).json({ error: "Invalid platform" });
      }

      const existingAccount = await storage.getSocialAccountByPlatform(user.id, platform as SocialPlatform);
      if (existingAccount) {
        return res.status(400).json({ error: "Account already connected" });
      }

      let config;
      let authUrl: string;
      const state = generateOAuthState();

      switch (platform) {
        case "tiktok":
          config = getTikTokConfig();
          if (!config) {
            return res.status(503).json({ 
              error: "TikTok integration not configured", 
              useFallback: true 
            });
          }
          authUrl = getTikTokAuthUrl(config, state);
          break;
        case "instagram":
          config = getInstagramConfig();
          if (!config) {
            return res.status(503).json({ 
              error: "Instagram integration not configured", 
              useFallback: true 
            });
          }
          authUrl = getInstagramAuthUrl(config, state);
          break;
        case "youtube":
          config = getYouTubeConfig();
          if (!config) {
            return res.status(503).json({ 
              error: "YouTube integration not configured", 
              useFallback: true 
            });
          }
          authUrl = getYouTubeAuthUrl(config, state);
          break;
        default:
          return res.status(400).json({ error: "Unsupported platform" });
      }

      req.session.oauthState = {
        state,
        platform: platform as SocialPlatform,
        returnUrl: req.query.returnUrl as string || "/gallery",
      };

      res.json({ authUrl });
    } catch (error: any) {
      console.error("Error initiating OAuth:", error);
      res.status(500).json({ error: "Failed to initiate authentication" });
    }
  });

  router.get("/callback/:platform", async (req, res) => {
    const { platform } = req.params;
    
    const cleanupAndRedirect = (errorCode: string) => {
      if (req.session?.oauthState) {
        delete req.session.oauthState;
      }
      return res.redirect(`/gallery?error=${errorCode}&platform=${platform}`);
    };

    try {
      const { code, state, error, error_description } = req.query;

      if (error) {
        console.error(`OAuth error for ${platform}:`, error, error_description);
        return cleanupAndRedirect("oauth_denied");
      }

      if (!code || typeof code !== "string") {
        return cleanupAndRedirect("missing_code");
      }

      if (!req.session?.oauthState) {
        return cleanupAndRedirect("session_expired");
      }

      const { state: storedState, platform: storedPlatform, returnUrl } = req.session.oauthState;

      delete req.session.oauthState;

      if (storedPlatform !== platform) {
        return res.redirect(`/gallery?error=platform_mismatch&platform=${platform}`);
      }

      const stateStr = typeof state === "string" ? state : undefined;
      if (!validateOAuthState(stateStr, storedState)) {
        return res.redirect(`/gallery?error=invalid_state&platform=${platform}`);
      }

      const userId = await getAuthenticatedUserId(req);
      if (!userId) {
        return res.redirect(`/login?returnUrl=${encodeURIComponent(returnUrl || "/gallery")}`);
      }

      let tokens;
      let userInfo: { displayName: string; externalId: string; profileImageUrl?: string };
      let scopes: string[];

      switch (platform) {
        case "tiktok": {
          const config = getTikTokConfig();
          if (!config) throw new Error("TikTok not configured");
          
          tokens = await exchangeTikTokCode(config, code);
          const tiktokUser = await getTikTokUserInfo(tokens.accessToken, tokens.openId || "");
          
          userInfo = {
            displayName: tiktokUser.displayName,
            externalId: tiktokUser.openId,
            profileImageUrl: tiktokUser.avatarUrl,
          };
          scopes = config.scopes;
          break;
        }
        case "instagram": {
          const config = getInstagramConfig();
          if (!config) throw new Error("Instagram not configured");
          
          tokens = await exchangeInstagramCode(config, code);
          const igUser = await getInstagramUserInfo(tokens.accessToken, tokens.openId || "");
          
          userInfo = {
            displayName: `@${igUser.username}`,
            externalId: igUser.id,
            profileImageUrl: igUser.profilePictureUrl,
          };
          scopes = config.scopes;
          break;
        }
        case "youtube": {
          const config = getYouTubeConfig();
          if (!config) throw new Error("YouTube not configured");
          
          tokens = await exchangeYouTubeCode(config, code);
          const ytChannel = await getYouTubeUserInfo(tokens.accessToken);
          
          userInfo = {
            displayName: ytChannel.title,
            externalId: ytChannel.id,
            profileImageUrl: ytChannel.thumbnailUrl,
          };
          scopes = config.scopes;
          break;
        }
        default:
          throw new Error("Unsupported platform");
      }

      await storage.createSocialAccount({
        userId,
        platform,
        externalAccountId: userInfo.externalId,
        displayName: userInfo.displayName,
        profileImageUrl: userInfo.profileImageUrl || null,
        accessTokenEncrypted: encryptToken(tokens.accessToken),
        refreshTokenEncrypted: tokens.refreshToken ? encryptToken(tokens.refreshToken) : null,
        tokenExpiresAt: new Date(Date.now() + tokens.expiresIn * 1000),
        scopes,
        metadata: { connectedAt: new Date().toISOString() },
        isActive: 1,
      });

      res.redirect(`${returnUrl || "/gallery"}?connected=${platform}`);
    } catch (error: any) {
      console.error(`OAuth callback error for ${req.params.platform}:`, error);
      res.redirect(`/gallery?error=oauth_failed&platform=${req.params.platform}&message=${encodeURIComponent(error.message)}`);
    }
  });

  router.post("/connect/:platform", isAuthenticated, async (req, res) => {
    try {
      const user = await getAuthenticatedUser(req);
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      if (!isPaidTier(user.membershipTier)) {
        return res.status(403).json({ error: PRO_REQUIRED_MESSAGE });
      }

      const { platform } = req.params;

      if (!SOCIAL_PLATFORMS.includes(platform as SocialPlatform)) {
        return res.status(400).json({ error: "Invalid platform" });
      }

      const existingAccount = await storage.getSocialAccountByPlatform(user.id, platform as SocialPlatform);
      if (existingAccount) {
        return res.status(400).json({ error: "Account already connected" });
      }

      let config;
      switch (platform) {
        case "tiktok":
          config = getTikTokConfig();
          break;
        case "instagram":
          config = getInstagramConfig();
          break;
        case "youtube":
          config = getYouTubeConfig();
          break;
      }

      if (config) {
        const state = generateOAuthState();
        let authUrl: string;

        switch (platform) {
          case "tiktok":
            authUrl = getTikTokAuthUrl(config, state);
            break;
          case "instagram":
            authUrl = getInstagramAuthUrl(config, state);
            break;
          case "youtube":
            authUrl = getYouTubeAuthUrl(config, state);
            break;
          default:
            authUrl = "";
        }

        req.session.oauthState = {
          state,
          platform: platform as SocialPlatform,
          returnUrl: req.body.returnUrl || "/gallery",
        };

        return res.json({ 
          requiresOAuth: true,
          authUrl 
        });
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
        message: `Connected to ${platform} successfully (simulation mode)`
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
      const user = await getAuthenticatedUser(req);
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      if (!isPaidTier(user.membershipTier)) {
        return res.status(403).json({ error: PRO_REQUIRED_MESSAGE });
      }

      const validation = createUploadJobSchema.safeParse(req.body);

      if (!validation.success) {
        return res.status(400).json({ error: validation.error.issues[0].message });
      }

      const { videoId, platform, caption, hashtags } = validation.data;

      const video = await storage.getVideoById(videoId);
      if (!video || video.userId !== user.id) {
        return res.status(404).json({ error: "Video not found" });
      }

      const socialAccount = await storage.getSocialAccountByPlatform(user.id, platform);
      if (!socialAccount) {
        return res.status(400).json({ error: `No ${platform} account connected` });
      }

      const job = await storage.createUploadJob({
        userId: user.id,
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

      setImmediate(() => {
        processUploadJob(job.id).catch(err => {
          console.error(`Failed to process upload job ${job.id}:`, err);
        });
      });

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
          hashtags: job.hashtags,
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
