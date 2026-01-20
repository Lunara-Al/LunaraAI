import type { SocialPlatform } from "@shared/schema";

export interface PlatformFlags {
  enabled: boolean;
  uploadEnabled: boolean;
  oauthEnabled: boolean;
  reason?: string;
}

export interface PlatformFeatureFlags {
  tiktok: PlatformFlags;
  instagram: PlatformFlags;
  youtube: PlatformFlags;
}

function parseBooleanEnv(value: string | undefined, defaultValue: boolean = true): boolean {
  if (value === undefined || value === "") return defaultValue;
  return value.toLowerCase() === "true" || value === "1";
}

export function getPlatformFeatureFlags(): PlatformFeatureFlags {
  const tiktokEnabled = parseBooleanEnv(process.env.FEATURE_TIKTOK_ENABLED);
  const instagramEnabled = parseBooleanEnv(process.env.FEATURE_INSTAGRAM_ENABLED);
  const youtubeEnabled = parseBooleanEnv(process.env.FEATURE_YOUTUBE_ENABLED);

  const tiktokUploadEnabled = parseBooleanEnv(process.env.FEATURE_TIKTOK_UPLOAD_ENABLED, tiktokEnabled);
  const instagramUploadEnabled = parseBooleanEnv(process.env.FEATURE_INSTAGRAM_UPLOAD_ENABLED, instagramEnabled);
  const youtubeUploadEnabled = parseBooleanEnv(process.env.FEATURE_YOUTUBE_UPLOAD_ENABLED, youtubeEnabled);

  const tiktokOAuthEnabled = parseBooleanEnv(process.env.FEATURE_TIKTOK_OAUTH_ENABLED, tiktokEnabled);
  const instagramOAuthEnabled = parseBooleanEnv(process.env.FEATURE_INSTAGRAM_OAUTH_ENABLED, instagramEnabled);
  const youtubeOAuthEnabled = parseBooleanEnv(process.env.FEATURE_YOUTUBE_OAUTH_ENABLED, youtubeEnabled);

  return {
    tiktok: {
      enabled: tiktokEnabled,
      uploadEnabled: tiktokUploadEnabled && tiktokEnabled,
      oauthEnabled: tiktokOAuthEnabled && tiktokEnabled,
      reason: !tiktokEnabled ? (process.env.FEATURE_TIKTOK_DISABLED_REASON || "TikTok integration is currently disabled") : undefined,
    },
    instagram: {
      enabled: instagramEnabled,
      uploadEnabled: instagramUploadEnabled && instagramEnabled,
      oauthEnabled: instagramOAuthEnabled && instagramEnabled,
      reason: !instagramEnabled ? (process.env.FEATURE_INSTAGRAM_DISABLED_REASON || "Instagram integration is currently disabled") : undefined,
    },
    youtube: {
      enabled: youtubeEnabled,
      uploadEnabled: youtubeUploadEnabled && youtubeEnabled,
      oauthEnabled: youtubeOAuthEnabled && youtubeEnabled,
      reason: !youtubeEnabled ? (process.env.FEATURE_YOUTUBE_DISABLED_REASON || "YouTube integration is currently disabled") : undefined,
    },
  };
}

export function isPlatformEnabled(platform: SocialPlatform): boolean {
  const flags = getPlatformFeatureFlags();
  return flags[platform]?.enabled ?? false;
}

export function isPlatformUploadEnabled(platform: SocialPlatform): boolean {
  const flags = getPlatformFeatureFlags();
  return flags[platform]?.uploadEnabled ?? false;
}

export function isPlatformOAuthEnabled(platform: SocialPlatform): boolean {
  const flags = getPlatformFeatureFlags();
  return flags[platform]?.oauthEnabled ?? false;
}

export function getPlatformDisabledReason(platform: SocialPlatform): string | undefined {
  const flags = getPlatformFeatureFlags();
  return flags[platform]?.reason;
}
