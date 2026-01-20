import { type SocialPlatform, type SocialAccount } from "@shared/schema";
import { decryptToken, getTikTokConfig, getInstagramConfig, getYouTubeConfig } from "./oauth-service";

export async function revokeTikTokToken(accessToken: string): Promise<boolean> {
  const config = getTikTokConfig();
  if (!config) {
    console.warn("TikTok not configured, skipping token revocation");
    return false;
  }

  try {
    const response = await fetch("https://open.tiktokapis.com/v2/oauth/revoke/", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        token: accessToken,
        client_key: config.clientId,
        client_secret: config.clientSecret,
      }),
    });

    const data = await response.json();
    
    if (data.error) {
      console.error("TikTok token revocation error:", data.error_description || data.error);
      return false;
    }

    console.log("TikTok token revoked successfully");
    return true;
  } catch (error) {
    console.error("TikTok token revocation failed:", error);
    return false;
  }
}

export async function revokeInstagramToken(accessToken: string, userId: string): Promise<boolean> {
  const config = getInstagramConfig();
  if (!config) {
    console.warn("Instagram not configured, skipping token revocation");
    return false;
  }

  try {
    const response = await fetch(
      `https://graph.instagram.com/${userId}/permissions?access_token=${accessToken}`,
      {
        method: "DELETE",
      }
    );

    const data = await response.json();
    
    if (data.error) {
      console.error("Instagram token revocation error:", data.error.message || data.error);
      return false;
    }

    console.log("Instagram token revoked successfully");
    return true;
  } catch (error) {
    console.error("Instagram token revocation failed:", error);
    return false;
  }
}

export async function revokeYouTubeToken(accessToken: string): Promise<boolean> {
  try {
    const response = await fetch(
      `https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(accessToken)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("YouTube token revocation error:", errorText);
      return false;
    }

    console.log("YouTube token revoked successfully");
    return true;
  } catch (error) {
    console.error("YouTube token revocation failed:", error);
    return false;
  }
}

export async function revokeToken(platform: SocialPlatform, account: SocialAccount): Promise<boolean> {
  if (!account.accessTokenEncrypted) {
    console.log(`No access token to revoke for ${platform} account ${account.id}`);
    return true;
  }

  try {
    const accessToken = decryptToken(account.accessTokenEncrypted);

    switch (platform) {
      case "tiktok":
        return await revokeTikTokToken(accessToken);
      case "instagram":
        if (!account.externalAccountId) {
          console.warn("No external account ID for Instagram token revocation");
          return false;
        }
        return await revokeInstagramToken(accessToken, account.externalAccountId);
      case "youtube":
        return await revokeYouTubeToken(accessToken);
      default:
        console.warn(`Unknown platform for token revocation: ${platform}`);
        return false;
    }
  } catch (error) {
    console.error(`Failed to revoke token for ${platform}:`, error);
    return false;
  }
}
