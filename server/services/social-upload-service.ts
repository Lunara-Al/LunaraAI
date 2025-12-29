import { storage } from "../storage";
import { 
  decryptToken, 
  getTikTokConfig, 
  getInstagramConfig, 
  getYouTubeConfig,
  refreshTikTokToken,
  refreshInstagramToken,
  refreshYouTubeToken,
  encryptToken
} from "./oauth-service";
import type { SocialAccount, SocialUploadJob, VideoGeneration } from "@shared/schema";

async function getValidAccessToken(account: SocialAccount): Promise<string> {
  if (!account.accessTokenEncrypted) {
    throw new Error("No access token stored for this account");
  }
  
  const accessToken = decryptToken(account.accessTokenEncrypted);
  
  if (account.tokenExpiresAt && new Date(account.tokenExpiresAt) < new Date()) {
    if (!account.refreshTokenEncrypted) {
      throw new Error("Token expired and no refresh token available");
    }
    
    const refreshToken = decryptToken(account.refreshTokenEncrypted);
    let newTokens;
    
    switch (account.platform) {
      case "tiktok": {
        const config = getTikTokConfig();
        if (!config) throw new Error("TikTok not configured");
        newTokens = await refreshTikTokToken(config, refreshToken);
        break;
      }
      case "instagram": {
        const config = getInstagramConfig();
        if (!config) throw new Error("Instagram not configured");
        newTokens = await refreshInstagramToken(config, accessToken);
        break;
      }
      case "youtube": {
        const config = getYouTubeConfig();
        if (!config) throw new Error("YouTube not configured");
        newTokens = await refreshYouTubeToken(config, refreshToken);
        break;
      }
      default:
        throw new Error("Unknown platform");
    }
    
    await storage.updateSocialAccountTokens(
      account.id,
      encryptToken(newTokens.accessToken),
      newTokens.refreshToken ? encryptToken(newTokens.refreshToken) : account.refreshTokenEncrypted,
      new Date(Date.now() + newTokens.expiresIn * 1000)
    );
    
    return newTokens.accessToken;
  }
  
  return accessToken;
}

export async function uploadToTikTok(
  job: SocialUploadJob,
  video: VideoGeneration,
  account: SocialAccount
): Promise<{ postId: string; postUrl: string }> {
  const accessToken = await getValidAccessToken(account);
  
  const caption = formatCaption(job.caption, job.hashtags);
  
  const initResponse = await fetch(
    "https://open.tiktokapis.com/v2/post/publish/video/init/",
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        post_info: {
          title: caption.substring(0, 2200),
          privacy_level: "SELF_ONLY",
          disable_duet: false,
          disable_comment: false,
          disable_stitch: false,
        },
        source_info: {
          source: "PULL_FROM_URL",
          video_url: video.videoUrl,
        },
      }),
    }
  );
  
  const initData = await initResponse.json();
  
  if (initData.error?.code) {
    throw new Error(initData.error.message || "Failed to initialize TikTok upload");
  }
  
  const publishId = initData.data?.publish_id;
  if (!publishId) {
    throw new Error("No publish ID returned from TikTok");
  }
  
  let attempts = 0;
  const maxAttempts = 30;
  
  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const statusResponse = await fetch(
      "https://open.tiktokapis.com/v2/post/publish/status/fetch/",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ publish_id: publishId }),
      }
    );
    
    const statusData = await statusResponse.json();
    
    if (statusData.data?.status === "PUBLISH_COMPLETE") {
      const postId = statusData.data.publicaly_available_post_id?.[0] || publishId;
      return {
        postId,
        postUrl: `https://www.tiktok.com/@${account.displayName}/video/${postId}`,
      };
    } else if (statusData.data?.status === "FAILED") {
      throw new Error(statusData.data.fail_reason || "TikTok upload failed");
    }
    
    attempts++;
  }
  
  throw new Error("TikTok upload timed out");
}

export async function uploadToInstagram(
  job: SocialUploadJob,
  video: VideoGeneration,
  account: SocialAccount
): Promise<{ postId: string; postUrl: string }> {
  const accessToken = await getValidAccessToken(account);
  
  const caption = formatCaption(job.caption, job.hashtags);
  const userId = account.externalAccountId;
  
  const containerResponse = await fetch(
    `https://graph.instagram.com/v21.0/${userId}/media`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        media_type: "REELS",
        video_url: video.videoUrl,
        caption: caption.substring(0, 2200),
        access_token: accessToken,
      }),
    }
  );
  
  const containerData = await containerResponse.json();
  
  if (containerData.error) {
    throw new Error(containerData.error.message || "Failed to create Instagram media container");
  }
  
  const containerId = containerData.id;
  
  let attempts = 0;
  const maxAttempts = 30;
  
  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const statusResponse = await fetch(
      `https://graph.instagram.com/v21.0/${containerId}?fields=status_code&access_token=${accessToken}`
    );
    
    const statusData = await statusResponse.json();
    
    if (statusData.status_code === "FINISHED") {
      break;
    } else if (statusData.status_code === "ERROR") {
      throw new Error("Instagram video processing failed");
    }
    
    attempts++;
  }
  
  if (attempts >= maxAttempts) {
    throw new Error("Instagram video processing timed out");
  }
  
  const publishResponse = await fetch(
    `https://graph.instagram.com/v21.0/${userId}/media_publish`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        creation_id: containerId,
        access_token: accessToken,
      }),
    }
  );
  
  const publishData = await publishResponse.json();
  
  if (publishData.error) {
    throw new Error(publishData.error.message || "Failed to publish Instagram reel");
  }
  
  const postId = publishData.id;
  
  const permalinkResponse = await fetch(
    `https://graph.instagram.com/v21.0/${postId}?fields=permalink&access_token=${accessToken}`
  );
  
  const permalinkData = await permalinkResponse.json();
  
  return {
    postId,
    postUrl: permalinkData.permalink || `https://www.instagram.com/reel/${postId}`,
  };
}

export async function uploadToYouTube(
  job: SocialUploadJob,
  video: VideoGeneration,
  account: SocialAccount
): Promise<{ postId: string; postUrl: string }> {
  const accessToken = await getValidAccessToken(account);
  
  const title = job.caption?.substring(0, 100) || video.prompt.substring(0, 100);
  const description = formatCaption(job.caption || video.prompt, job.hashtags);
  
  const videoResponse = await fetch(video.videoUrl);
  const videoBuffer = await videoResponse.arrayBuffer();
  
  const metadata = {
    snippet: {
      title,
      description,
      categoryId: "22",
      tags: parseHashtags(job.hashtags),
    },
    status: {
      privacyStatus: "private",
      selfDeclaredMadeForKids: false,
    },
  };
  
  const boundary = "---boundary" + Date.now();
  
  const metadataJson = JSON.stringify(metadata);
  
  let body = "";
  body += `--${boundary}\r\n`;
  body += "Content-Type: application/json; charset=UTF-8\r\n\r\n";
  body += metadataJson + "\r\n";
  body += `--${boundary}\r\n`;
  body += "Content-Type: video/mp4\r\n";
  body += "Content-Transfer-Encoding: binary\r\n\r\n";
  
  const encoder = new TextEncoder();
  const metadataPart = encoder.encode(body);
  const endPart = encoder.encode(`\r\n--${boundary}--`);
  
  const combinedBuffer = new Uint8Array(
    metadataPart.length + videoBuffer.byteLength + endPart.length
  );
  combinedBuffer.set(metadataPart, 0);
  combinedBuffer.set(new Uint8Array(videoBuffer), metadataPart.length);
  combinedBuffer.set(endPart, metadataPart.length + videoBuffer.byteLength);
  
  const uploadResponse = await fetch(
    "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=multipart&part=snippet,status",
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body: combinedBuffer,
    }
  );
  
  const uploadData = await uploadResponse.json();
  
  if (uploadData.error) {
    throw new Error(uploadData.error.message || "Failed to upload to YouTube");
  }
  
  const videoId = uploadData.id;
  
  return {
    postId: videoId,
    postUrl: `https://www.youtube.com/shorts/${videoId}`,
  };
}

function formatCaption(caption: string | null, hashtags: string | null): string {
  let result = caption || "";
  
  if (hashtags) {
    const formattedHashtags = parseHashtags(hashtags)
      .map(tag => `#${tag}`)
      .join(" ");
    
    if (formattedHashtags) {
      result = result ? `${result}\n\n${formattedHashtags}` : formattedHashtags;
    }
  }
  
  return result;
}

function parseHashtags(hashtags: string | null): string[] {
  if (!hashtags) return [];
  
  return hashtags
    .split(/[,\s#]+/)
    .map(tag => tag.trim().replace(/^#/, ""))
    .filter(tag => tag.length > 0 && tag.length <= 100);
}

export async function processUploadJob(jobId: number): Promise<void> {
  const job = await storage.getUploadJob(jobId);
  if (!job) {
    console.error(`Upload job ${jobId} not found`);
    return;
  }
  
  try {
    await storage.updateUploadJobStatus(job.id, "uploading");
    
    const video = await storage.getVideoById(job.videoId);
    if (!video || !video.videoUrl) {
      throw new Error("Video not found or has no URL");
    }
    
    const account = await storage.getSocialAccountById(job.socialAccountId);
    if (!account) {
      throw new Error("Social account not found");
    }
    
    if (account.metadata && (account.metadata as any).simulated) {
      await simulateUpload(job.id, job.platform);
      return;
    }
    
    let result: { postId: string; postUrl: string };
    
    switch (job.platform) {
      case "tiktok":
        result = await uploadToTikTok(job, video, account);
        break;
      case "instagram":
        result = await uploadToInstagram(job, video, account);
        break;
      case "youtube":
        result = await uploadToYouTube(job, video, account);
        break;
      default:
        throw new Error(`Unsupported platform: ${job.platform}`);
    }
    
    await storage.updateUploadJobStatus(
      job.id,
      "completed",
      result.postId,
      result.postUrl
    );
  } catch (error: any) {
    console.error(`Upload job ${jobId} failed:`, error);
    await storage.updateUploadJobStatus(
      job.id,
      "failed",
      undefined,
      undefined,
      error.message || "Upload failed"
    );
  }
}

async function simulateUpload(jobId: number, platform: string): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  const mockPostId = `post_${Date.now().toString(36)}`;
  const mockPostUrls: Record<string, string> = {
    tiktok: `https://www.tiktok.com/@user/video/${mockPostId}`,
    instagram: `https://www.instagram.com/reel/${mockPostId}`,
    youtube: `https://www.youtube.com/shorts/${mockPostId}`,
  };
  
  await storage.updateUploadJobStatus(
    jobId,
    "completed",
    mockPostId,
    mockPostUrls[platform]
  );
}
