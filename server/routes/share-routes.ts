import { Router } from "express";
import { storage } from "../storage";
import { isAuthenticated, getAuthenticatedUserId } from "../unified-auth";
import crypto from "crypto";

function generateShareToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

function generatePlatformShareUrls(shareUrl: string, title: string, description: string) {
  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedText = encodeURIComponent(`${title} - ${description}`);
  const encodedTitle = encodeURIComponent(title);

  return {
    twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    reddit: `https://www.reddit.com/submit?url=${encodedUrl}&title=${encodedTitle}`,
    whatsapp: `https://wa.me/?text=${encodedText}%20${encodedUrl}`,
    telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
  };
}

export function createShareRouter() {
  const router = Router();

  router.post("/videos/:videoId/share", isAuthenticated, async (req: any, res) => {
    try {
      const videoId = parseInt(req.params.videoId);
      const userId = await getAuthenticatedUserId(req);
      
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      if (isNaN(videoId)) {
        return res.status(400).json({ error: "Invalid video ID" });
      }

      const video = await storage.getVideoById(videoId);
      if (!video) {
        return res.status(404).json({ error: "Video not found" });
      }

      if (video.userId !== userId) {
        return res.status(403).json({ error: "You can only share your own videos" });
      }

      let shareLink = await storage.getShareLinkByVideoId(videoId, userId);
      
      if (!shareLink) {
        const token = generateShareToken();
        const title = req.body.title || `Cosmic ASMR: ${video.prompt.substring(0, 50)}${video.prompt.length > 50 ? '...' : ''}`;
        const description = req.body.description || video.prompt;

        shareLink = await storage.createShareLink({
          videoId,
          ownerUserId: userId,
          token,
          title,
          description,
        });
      }

      const baseUrl = process.env.REPLIT_DEV_DOMAIN 
        ? `https://${process.env.REPLIT_DEV_DOMAIN}`
        : process.env.REPLIT_DOMAINS?.split(',')[0] 
          ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`
          : `http://localhost:5000`;
      
      const shareUrl = `${baseUrl}/s/${shareLink.token}`;
      const title = shareLink.title || "Cosmic ASMR Video";
      const description = shareLink.description || video.prompt;

      res.json({
        shareUrl,
        token: shareLink.token,
        videoUrl: video.videoUrl,
        downloadUrl: video.videoUrl,
        platformShareUrls: generatePlatformShareUrls(shareUrl, title, description),
        viewCount: shareLink.viewCount,
        createdAt: shareLink.createdAt,
      });
    } catch (error) {
      console.error("Error creating share link:", error);
      res.status(500).json({ error: "Failed to create share link" });
    }
  });

  router.post("/shares/:token/revoke", isAuthenticated, async (req: any, res) => {
    try {
      const { token } = req.params;
      const userId = await getAuthenticatedUserId(req);
      
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const revoked = await storage.revokeShareLink(token, userId);
      
      if (!revoked) {
        return res.status(404).json({ error: "Share link not found or already revoked" });
      }

      res.json({ success: true, message: "Share link revoked successfully" });
    } catch (error) {
      console.error("Error revoking share link:", error);
      res.status(500).json({ error: "Failed to revoke share link" });
    }
  });

  router.get("/shares/:token", async (req, res) => {
    try {
      const { token } = req.params;
      
      const shareLink = await storage.getShareLinkByToken(token);
      
      if (!shareLink) {
        return res.status(404).json({ error: "Share link not found" });
      }

      if (shareLink.isRevoked) {
        return res.status(404).json({ error: "Share link not found" });
      }

      if (shareLink.expiresAt && new Date(shareLink.expiresAt) < new Date()) {
        return res.status(410).json({ error: "This share link has expired" });
      }

      const video = await storage.getVideoById(shareLink.videoId);
      
      if (!video) {
        return res.status(404).json({ error: "Video not found" });
      }

      await storage.incrementShareLinkViews(token);

      const baseUrl = process.env.REPLIT_DEV_DOMAIN 
        ? `https://${process.env.REPLIT_DEV_DOMAIN}`
        : process.env.REPLIT_DOMAINS?.split(',')[0] 
          ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`
          : `http://localhost:5000`;
      
      const shareUrl = `${baseUrl}/s/${shareLink.token}`;
      const title = shareLink.title || "Cosmic ASMR Video";
      const description = shareLink.description || video.prompt;

      res.json({
        video: {
          id: video.id,
          prompt: video.prompt,
          videoUrl: video.videoUrl,
          length: video.length,
          aspectRatio: video.aspectRatio,
          createdAt: video.createdAt,
        },
        share: {
          title,
          description,
          viewCount: shareLink.viewCount + 1,
          createdAt: shareLink.createdAt,
        },
        platformShareUrls: generatePlatformShareUrls(shareUrl, title, description),
      });
    } catch (error) {
      console.error("Error getting share link:", error);
      res.status(500).json({ error: "Failed to get share link" });
    }
  });

  return router;
}
