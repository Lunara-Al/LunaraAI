import crypto from "crypto";

const ENCRYPTION_ALGORITHM = "aes-256-gcm";

function getEncryptionKey(): Buffer {
  const key = process.env.SESSION_SECRET || "default-encryption-key-change-me";
  return crypto.scryptSync(key, "salt", 32);
}

export function encryptToken(token: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);
  
  let encrypted = cipher.update(token, "utf8", "hex");
  encrypted += cipher.final("hex");
  
  const authTag = cipher.getAuthTag();
  
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

export function decryptToken(encryptedData: string): string {
  const key = getEncryptionKey();
  const [ivHex, authTagHex, encrypted] = encryptedData.split(":");
  
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  
  const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  
  return decrypted;
}

export function generateOAuthState(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function validateOAuthState(state: string | undefined, storedState: string | undefined): boolean {
  if (!state || !storedState) {
    return false;
  }
  
  if (state.length !== storedState.length) {
    return false;
  }
  
  try {
    return crypto.timingSafeEqual(
      Buffer.from(state),
      Buffer.from(storedState)
    );
  } catch {
    return false;
  }
}

export interface OAuthConfig {
  platform: "tiktok" | "instagram" | "youtube";
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
}

export interface OAuthTokenResponse {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  tokenType: string;
  scope?: string;
  openId?: string;
}

export interface TikTokUserInfo {
  openId: string;
  unionId?: string;
  displayName: string;
  avatarUrl?: string;
}

export interface InstagramUserInfo {
  id: string;
  username: string;
  name?: string;
  profilePictureUrl?: string;
}

export interface YouTubeUserInfo {
  id: string;
  title: string;
  thumbnailUrl?: string;
}

export function getTikTokConfig(): OAuthConfig | null {
  const clientId = process.env.TIKTOK_CLIENT_KEY;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) {
    return null;
  }
  
  const baseUrl = process.env.REPL_SLUG 
    ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`
    : "http://localhost:5000";
  
  return {
    platform: "tiktok",
    clientId,
    clientSecret,
    redirectUri: `${baseUrl}/api/social/callback/tiktok`,
    scopes: ["user.info.basic", "video.upload"],
  };
}

export function getInstagramConfig(): OAuthConfig | null {
  const clientId = process.env.INSTAGRAM_APP_ID;
  const clientSecret = process.env.INSTAGRAM_APP_SECRET;
  
  if (!clientId || !clientSecret) {
    return null;
  }
  
  const baseUrl = process.env.REPL_SLUG 
    ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`
    : "http://localhost:5000";
  
  return {
    platform: "instagram",
    clientId,
    clientSecret,
    redirectUri: `${baseUrl}/api/social/callback/instagram`,
    scopes: ["instagram_business_basic", "instagram_business_content_publish"],
  };
}

export function getYouTubeConfig(): OAuthConfig | null {
  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) {
    return null;
  }
  
  const baseUrl = process.env.REPL_SLUG 
    ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`
    : "http://localhost:5000";
  
  return {
    platform: "youtube",
    clientId,
    clientSecret,
    redirectUri: `${baseUrl}/api/social/callback/youtube`,
    scopes: ["https://www.googleapis.com/auth/youtube.upload"],
  };
}

export function getTikTokAuthUrl(config: OAuthConfig, state: string): string {
  const params = new URLSearchParams({
    client_key: config.clientId,
    scope: config.scopes.join(","),
    response_type: "code",
    redirect_uri: config.redirectUri,
    state,
  });
  
  return `https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`;
}

export function getInstagramAuthUrl(config: OAuthConfig, state: string): string {
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    scope: config.scopes.join(","),
    response_type: "code",
    state,
  });
  
  return `https://api.instagram.com/oauth/authorize?${params.toString()}`;
}

export function getYouTubeAuthUrl(config: OAuthConfig, state: string): string {
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    scope: config.scopes.join(" "),
    response_type: "code",
    state,
    access_type: "offline",
    prompt: "consent",
  });
  
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeTikTokCode(
  config: OAuthConfig,
  code: string
): Promise<OAuthTokenResponse> {
  const response = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_key: config.clientId,
      client_secret: config.clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: config.redirectUri,
    }),
  });
  
  const data = await response.json();
  
  if (data.error) {
    throw new Error(data.error_description || data.error);
  }
  
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
    tokenType: data.token_type,
    scope: data.scope,
    openId: data.open_id,
  };
}

export async function exchangeInstagramCode(
  config: OAuthConfig,
  code: string
): Promise<OAuthTokenResponse> {
  const response = await fetch("https://api.instagram.com/oauth/access_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      grant_type: "authorization_code",
      redirect_uri: config.redirectUri,
      code,
    }),
  });
  
  const data = await response.json();
  
  if (data.error) {
    throw new Error(data.error_description || data.error_message || data.error);
  }
  
  const longLivedResponse = await fetch(
    `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${config.clientSecret}&access_token=${data.access_token}`
  );
  
  const longLivedData = await longLivedResponse.json();
  
  return {
    accessToken: longLivedData.access_token || data.access_token,
    expiresIn: longLivedData.expires_in || 3600,
    tokenType: "Bearer",
    openId: data.user_id?.toString(),
  };
}

export async function exchangeYouTubeCode(
  config: OAuthConfig,
  code: string
): Promise<OAuthTokenResponse> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: config.redirectUri,
    }),
  });
  
  const data = await response.json();
  
  if (data.error) {
    throw new Error(data.error_description || data.error);
  }
  
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
    tokenType: data.token_type,
    scope: data.scope,
  };
}

export async function getTikTokUserInfo(accessToken: string, openId: string): Promise<TikTokUserInfo> {
  const response = await fetch(
    `https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,display_name,avatar_url`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
  
  const data = await response.json();
  
  if (data.error?.code) {
    throw new Error(data.error.message || "Failed to get TikTok user info");
  }
  
  return {
    openId: data.data?.user?.open_id || openId,
    unionId: data.data?.user?.union_id,
    displayName: data.data?.user?.display_name || "TikTok User",
    avatarUrl: data.data?.user?.avatar_url,
  };
}

export async function getInstagramUserInfo(accessToken: string, userId: string): Promise<InstagramUserInfo> {
  const response = await fetch(
    `https://graph.instagram.com/v21.0/${userId}?fields=id,username,name,profile_picture_url&access_token=${accessToken}`
  );
  
  const data = await response.json();
  
  if (data.error) {
    throw new Error(data.error.message || "Failed to get Instagram user info");
  }
  
  return {
    id: data.id,
    username: data.username,
    name: data.name,
    profilePictureUrl: data.profile_picture_url,
  };
}

export async function getYouTubeUserInfo(accessToken: string): Promise<YouTubeUserInfo> {
  const response = await fetch(
    "https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
  
  const data = await response.json();
  
  if (data.error) {
    throw new Error(data.error.message || "Failed to get YouTube channel info");
  }
  
  const channel = data.items?.[0];
  if (!channel) {
    throw new Error("No YouTube channel found");
  }
  
  return {
    id: channel.id,
    title: channel.snippet?.title || "YouTube Channel",
    thumbnailUrl: channel.snippet?.thumbnails?.default?.url,
  };
}

export async function refreshTikTokToken(
  config: OAuthConfig,
  refreshToken: string
): Promise<OAuthTokenResponse> {
  const response = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_key: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  
  const data = await response.json();
  
  if (data.error) {
    throw new Error(data.error_description || data.error);
  }
  
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
    tokenType: data.token_type,
    scope: data.scope,
    openId: data.open_id,
  };
}

export async function refreshInstagramToken(
  config: OAuthConfig,
  accessToken: string
): Promise<OAuthTokenResponse> {
  const response = await fetch(
    `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${accessToken}`
  );
  
  const data = await response.json();
  
  if (data.error) {
    throw new Error(data.error.message || "Failed to refresh Instagram token");
  }
  
  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in,
    tokenType: "Bearer",
  };
}

export async function refreshYouTubeToken(
  config: OAuthConfig,
  refreshToken: string
): Promise<OAuthTokenResponse> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  
  const data = await response.json();
  
  if (data.error) {
    throw new Error(data.error_description || data.error);
  }
  
  return {
    accessToken: data.access_token,
    refreshToken: refreshToken,
    expiresIn: data.expires_in,
    tokenType: data.token_type,
    scope: data.scope,
  };
}
