import type { SocialPlatform } from "@shared/schema";

export interface SocialApiError {
  success: false;
  platform: 'youtube' | 'tiktok' | 'instagram';
  error: string;
  message: string;
  retry_possible: boolean;
  retry_after?: number;
}

export const SocialErrorCodes = {
  TOKEN_EXPIRED: 'token_expired',
  TOKEN_INVALID: 'token_invalid',
  RATE_LIMIT: 'rate_limit',
  NETWORK_ERROR: 'network_error',
  TIMEOUT: 'timeout',
  INVALID_VIDEO: 'invalid_video',
  CONTENT_FILTERED: 'content_filtered',
  QUOTA_EXCEEDED: 'quota_exceeded',
  ACCOUNT_NOT_FOUND: 'account_not_found',
  PERMISSION_DENIED: 'permission_denied',
  PLATFORM_ERROR: 'platform_error',
  UNKNOWN_ERROR: 'unknown_error'
} as const;

export type SocialErrorCode = typeof SocialErrorCodes[keyof typeof SocialErrorCodes];

const ERROR_PATTERNS: Record<string, { code: SocialErrorCode; retryable: boolean; retryAfter?: number }> = {
  'token expired': { code: SocialErrorCodes.TOKEN_EXPIRED, retryable: false },
  'token invalid': { code: SocialErrorCodes.TOKEN_INVALID, retryable: false },
  'invalid_token': { code: SocialErrorCodes.TOKEN_INVALID, retryable: false },
  'access_token_expired': { code: SocialErrorCodes.TOKEN_EXPIRED, retryable: false },
  'oauth_exception': { code: SocialErrorCodes.TOKEN_EXPIRED, retryable: false },
  'rate limit': { code: SocialErrorCodes.RATE_LIMIT, retryable: true, retryAfter: 60 },
  'too many requests': { code: SocialErrorCodes.RATE_LIMIT, retryable: true, retryAfter: 60 },
  'rate_limit_exceeded': { code: SocialErrorCodes.RATE_LIMIT, retryable: true, retryAfter: 60 },
  'quota': { code: SocialErrorCodes.QUOTA_EXCEEDED, retryable: false },
  'quotaexceeded': { code: SocialErrorCodes.QUOTA_EXCEEDED, retryable: false },
  'daily limit': { code: SocialErrorCodes.QUOTA_EXCEEDED, retryable: false },
  'network': { code: SocialErrorCodes.NETWORK_ERROR, retryable: true, retryAfter: 5 },
  'econnreset': { code: SocialErrorCodes.NETWORK_ERROR, retryable: true, retryAfter: 5 },
  'econnrefused': { code: SocialErrorCodes.NETWORK_ERROR, retryable: true, retryAfter: 5 },
  'etimedout': { code: SocialErrorCodes.NETWORK_ERROR, retryable: true, retryAfter: 5 },
  'timeout': { code: SocialErrorCodes.TIMEOUT, retryable: true, retryAfter: 10 },
  'timed out': { code: SocialErrorCodes.TIMEOUT, retryable: true, retryAfter: 10 },
  'invalid video': { code: SocialErrorCodes.INVALID_VIDEO, retryable: false },
  'video format': { code: SocialErrorCodes.INVALID_VIDEO, retryable: false },
  'unsupported format': { code: SocialErrorCodes.INVALID_VIDEO, retryable: false },
  'video_invalid': { code: SocialErrorCodes.INVALID_VIDEO, retryable: false },
  'content filtered': { code: SocialErrorCodes.CONTENT_FILTERED, retryable: false },
  'policy violation': { code: SocialErrorCodes.CONTENT_FILTERED, retryable: false },
  'community guidelines': { code: SocialErrorCodes.CONTENT_FILTERED, retryable: false },
  'spam': { code: SocialErrorCodes.CONTENT_FILTERED, retryable: false },
  'account not found': { code: SocialErrorCodes.ACCOUNT_NOT_FOUND, retryable: false },
  'user not found': { code: SocialErrorCodes.ACCOUNT_NOT_FOUND, retryable: false },
  'channel not found': { code: SocialErrorCodes.ACCOUNT_NOT_FOUND, retryable: false },
  'permission': { code: SocialErrorCodes.PERMISSION_DENIED, retryable: false },
  'forbidden': { code: SocialErrorCodes.PERMISSION_DENIED, retryable: false },
  'unauthorized': { code: SocialErrorCodes.PERMISSION_DENIED, retryable: false },
  'access denied': { code: SocialErrorCodes.PERMISSION_DENIED, retryable: false },
  'insufficient_scope': { code: SocialErrorCodes.PERMISSION_DENIED, retryable: false },
};

function classifyByHttpStatus(status: number): { code: SocialErrorCode; retryable: boolean; retryAfter?: number } | null {
  switch (status) {
    case 401:
      return { code: SocialErrorCodes.TOKEN_EXPIRED, retryable: false };
    case 403:
      return { code: SocialErrorCodes.PERMISSION_DENIED, retryable: false };
    case 404:
      return { code: SocialErrorCodes.ACCOUNT_NOT_FOUND, retryable: false };
    case 429:
      return { code: SocialErrorCodes.RATE_LIMIT, retryable: true, retryAfter: 60 };
    case 500:
    case 502:
    case 503:
    case 504:
      return { code: SocialErrorCodes.PLATFORM_ERROR, retryable: true, retryAfter: 30 };
    default:
      return null;
  }
}

function classifyTikTokError(error: any): { code: SocialErrorCode; retryable: boolean; retryAfter?: number } | null {
  const errorCode = error?.error?.code || error?.code;
  
  if (errorCode) {
    const codeStr = String(errorCode).toLowerCase();
    if (codeStr.includes('access_token') || codeStr === 'invalid_token') {
      return { code: SocialErrorCodes.TOKEN_EXPIRED, retryable: false };
    }
    if (codeStr.includes('rate') || codeStr === 'spam_risk') {
      return { code: SocialErrorCodes.RATE_LIMIT, retryable: true, retryAfter: 60 };
    }
    if (codeStr.includes('video') || codeStr === 'invalid_file') {
      return { code: SocialErrorCodes.INVALID_VIDEO, retryable: false };
    }
  }
  
  return null;
}

function classifyInstagramError(error: any): { code: SocialErrorCode; retryable: boolean; retryAfter?: number } | null {
  const errorCode = error?.error?.code || error?.code;
  const errorSubcode = error?.error?.error_subcode || error?.error_subcode;
  
  if (errorCode === 190) {
    return { code: SocialErrorCodes.TOKEN_EXPIRED, retryable: false };
  }
  if (errorCode === 4 || errorCode === 17 || errorSubcode === 2207051) {
    return { code: SocialErrorCodes.RATE_LIMIT, retryable: true, retryAfter: 300 };
  }
  if (errorCode === 10 || errorCode === 200) {
    return { code: SocialErrorCodes.PERMISSION_DENIED, retryable: false };
  }
  
  return null;
}

function classifyYouTubeError(error: any): { code: SocialErrorCode; retryable: boolean; retryAfter?: number } | null {
  const reason = error?.error?.errors?.[0]?.reason || error?.reason;
  
  if (reason) {
    const reasonStr = String(reason).toLowerCase();
    if (reasonStr === 'authError' || reasonStr === 'unauthorized') {
      return { code: SocialErrorCodes.TOKEN_EXPIRED, retryable: false };
    }
    if (reasonStr === 'quotaExceeded' || reasonStr === 'dailyLimitExceeded') {
      return { code: SocialErrorCodes.QUOTA_EXCEEDED, retryable: false };
    }
    if (reasonStr === 'rateLimitExceeded' || reasonStr === 'userRateLimitExceeded') {
      return { code: SocialErrorCodes.RATE_LIMIT, retryable: true, retryAfter: 60 };
    }
    if (reasonStr === 'forbidden' || reasonStr === 'insufficientPermissions') {
      return { code: SocialErrorCodes.PERMISSION_DENIED, retryable: false };
    }
    if (reasonStr === 'videoNotFound' || reasonStr === 'channelNotFound') {
      return { code: SocialErrorCodes.ACCOUNT_NOT_FOUND, retryable: false };
    }
  }
  
  return null;
}

export function classifySocialError(error: any, platform: SocialPlatform | string): SocialApiError {
  const platformTyped = platform as 'youtube' | 'tiktok' | 'instagram';
  const errorMessage = error?.message || error?.error?.message || String(error);
  const messageLower = errorMessage.toLowerCase();
  
  let classification: { code: SocialErrorCode; retryable: boolean; retryAfter?: number } | null = null;
  
  switch (platform) {
    case 'tiktok':
      classification = classifyTikTokError(error);
      break;
    case 'instagram':
      classification = classifyInstagramError(error);
      break;
    case 'youtube':
      classification = classifyYouTubeError(error);
      break;
  }
  
  if (!classification && error?.status) {
    classification = classifyByHttpStatus(error.status);
  }
  
  if (!classification) {
    for (const [pattern, result] of Object.entries(ERROR_PATTERNS)) {
      if (messageLower.includes(pattern)) {
        classification = result;
        break;
      }
    }
  }
  
  if (!classification) {
    classification = { code: SocialErrorCodes.UNKNOWN_ERROR, retryable: false };
  }
  
  const humanReadableMessages: Record<SocialErrorCode, string> = {
    [SocialErrorCodes.TOKEN_EXPIRED]: 'Your authentication has expired. Please reconnect your account.',
    [SocialErrorCodes.TOKEN_INVALID]: 'Your authentication is invalid. Please reconnect your account.',
    [SocialErrorCodes.RATE_LIMIT]: 'Too many requests. Please wait before trying again.',
    [SocialErrorCodes.NETWORK_ERROR]: 'A network error occurred. Please check your connection.',
    [SocialErrorCodes.TIMEOUT]: 'The request timed out. Please try again.',
    [SocialErrorCodes.INVALID_VIDEO]: 'The video format is not supported by this platform.',
    [SocialErrorCodes.CONTENT_FILTERED]: 'This content was flagged and cannot be uploaded.',
    [SocialErrorCodes.QUOTA_EXCEEDED]: 'You have exceeded your upload quota for this platform.',
    [SocialErrorCodes.ACCOUNT_NOT_FOUND]: 'The social media account was not found.',
    [SocialErrorCodes.PERMISSION_DENIED]: 'Permission denied. Please check your account permissions.',
    [SocialErrorCodes.PLATFORM_ERROR]: 'The platform is experiencing issues. Please try again later.',
    [SocialErrorCodes.UNKNOWN_ERROR]: 'An unexpected error occurred.',
  };
  
  return {
    success: false,
    platform: platformTyped,
    error: classification.code,
    message: humanReadableMessages[classification.code] + (errorMessage ? ` (${errorMessage})` : ''),
    retry_possible: classification.retryable,
    retry_after: classification.retryAfter,
  };
}

export function isRetryableError(error: SocialApiError): boolean {
  return error.retry_possible;
}

export interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 2000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
};

export function calculateBackoffDelay(attempt: number, config: RetryConfig = DEFAULT_RETRY_CONFIG): number {
  const delay = config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt);
  return Math.min(delay, config.maxDelayMs);
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  platform: SocialPlatform | string,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
  onRetry?: (error: SocialApiError, attempt: number, delayMs: number) => void
): Promise<T> {
  let lastError: SocialApiError | null = null;
  
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = classifySocialError(error, platform);
      
      if (!isRetryableError(lastError) || attempt >= config.maxRetries) {
        throw lastError;
      }
      
      const retryAfterMs = lastError.retry_after 
        ? lastError.retry_after * 1000 
        : calculateBackoffDelay(attempt, config);
      
      const actualDelay = Math.min(retryAfterMs, config.maxDelayMs);
      
      if (onRetry) {
        onRetry(lastError, attempt + 1, actualDelay);
      }
      
      await new Promise(resolve => setTimeout(resolve, actualDelay));
    }
  }
  
  throw lastError || classifySocialError(new Error('Max retries exceeded'), platform);
}

export function formatRetryMessage(error: SocialApiError, attempt: number, maxRetries: number): string {
  if (!error.retry_possible) {
    return error.message;
  }
  
  if (attempt >= maxRetries) {
    return `${error.message} (failed after ${maxRetries} retries)`;
  }
  
  const retryInfo = error.retry_after 
    ? `Retrying in ${error.retry_after} seconds...` 
    : 'Retrying...';
    
  return `${error.message} (attempt ${attempt + 1}/${maxRetries + 1}) ${retryInfo}`;
}
