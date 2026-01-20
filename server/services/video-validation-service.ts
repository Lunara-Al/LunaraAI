import type { SocialPlatform } from "@shared/schema";

export interface VideoValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  platformRequirements: PlatformRequirements;
}

export interface PlatformRequirements {
  maxFileSize: number;
  maxFileSizeFormatted: string;
  maxDuration: number;
  minDuration: number;
  supportedFormats: string[];
  preferredFormat: string;
  maxFps?: number;
  codec?: string;
  notes: string[];
}

export interface VideoMetadata {
  fileSize: number | null;
  duration: number | null;
  contentType: string | null;
}

export const PLATFORM_REQUIREMENTS: Record<SocialPlatform, PlatformRequirements> = {
  youtube: {
    maxFileSize: 256 * 1024 * 1024 * 1024,
    maxFileSizeFormatted: "256GB",
    maxDuration: 12 * 60 * 60,
    minDuration: 0,
    supportedFormats: ["mp4", "mov", "avi", "wmv", "flv", "webm", "3gp", "mkv"],
    preferredFormat: "mp4",
    notes: [
      "Maximum file size: 256GB",
      "Maximum duration: 12 hours",
      "MP4 with H.264 codec recommended for best quality",
      "Supports most common video formats",
      "For YouTube Shorts: vertical 9:16, max 60 seconds"
    ]
  },
  tiktok: {
    maxFileSize: 287.6 * 1024 * 1024,
    maxFileSizeFormatted: "287.6MB",
    maxDuration: 60,
    minDuration: 3,
    supportedFormats: ["mp4", "mov"],
    preferredFormat: "mp4",
    notes: [
      "Maximum file size: 287.6MB (via API)",
      "Duration: 3-60 seconds (up to 10 minutes with approval)",
      "MP4 or MOV format only",
      "Vertical 9:16 aspect ratio recommended",
      "H.264 encoding recommended"
    ]
  },
  instagram: {
    maxFileSize: 100 * 1024 * 1024,
    maxFileSizeFormatted: "100MB",
    maxDuration: 60,
    minDuration: 3,
    supportedFormats: ["mp4"],
    preferredFormat: "mp4",
    maxFps: 30,
    codec: "H.264",
    notes: [
      "Maximum file size: 100MB for feed/reels",
      "Duration: 3-60 seconds for feed, up to 90 seconds for Reels",
      "MP4 format with H.264 codec required",
      "Maximum 30fps",
      "Vertical 9:16 aspect ratio recommended for Reels"
    ]
  }
};

async function fetchVideoMetadata(videoUrl: string): Promise<VideoMetadata> {
  const metadata: VideoMetadata = {
    fileSize: null,
    duration: null,
    contentType: null
  };

  try {
    const response = await fetch(videoUrl, {
      method: "HEAD",
      signal: AbortSignal.timeout(10000)
    });

    if (response.ok) {
      const contentLength = response.headers.get("content-length");
      if (contentLength) {
        metadata.fileSize = parseInt(contentLength, 10);
      }

      const contentType = response.headers.get("content-type");
      if (contentType) {
        metadata.contentType = contentType;
      }
    }
  } catch (error) {
    console.warn("Failed to fetch video metadata via HEAD request:", error);
  }

  return metadata;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function getFormatFromContentType(contentType: string | null): string | null {
  if (!contentType) return null;
  
  const formatMap: Record<string, string> = {
    "video/mp4": "mp4",
    "video/quicktime": "mov",
    "video/x-msvideo": "avi",
    "video/x-ms-wmv": "wmv",
    "video/x-flv": "flv",
    "video/webm": "webm",
    "video/3gpp": "3gp",
    "video/x-matroska": "mkv"
  };

  return formatMap[contentType.toLowerCase()] || null;
}

export function validateForYouTube(metadata: VideoMetadata): VideoValidationResult {
  const requirements = PLATFORM_REQUIREMENTS.youtube;
  const errors: string[] = [];
  const warnings: string[] = [];

  if (metadata.fileSize !== null) {
    if (metadata.fileSize > requirements.maxFileSize) {
      errors.push(`File size (${formatBytes(metadata.fileSize)}) exceeds YouTube's maximum of ${requirements.maxFileSizeFormatted}`);
    }
  } else {
    warnings.push("Could not determine file size. Ensure video is under 256GB.");
  }

  if (metadata.duration !== null) {
    if (metadata.duration > requirements.maxDuration) {
      errors.push(`Duration (${Math.round(metadata.duration / 60)} minutes) exceeds YouTube's maximum of 12 hours`);
    }
  } else {
    warnings.push("Could not determine video duration. YouTube supports videos up to 12 hours.");
  }

  const format = getFormatFromContentType(metadata.contentType);
  if (format) {
    if (!requirements.supportedFormats.includes(format)) {
      errors.push(`Format (${format}) is not supported by YouTube. Supported formats: ${requirements.supportedFormats.join(", ")}`);
    } else if (format !== requirements.preferredFormat) {
      warnings.push(`Using ${format} format. MP4 with H.264 codec is recommended for best quality.`);
    }
  } else if (metadata.contentType) {
    warnings.push(`Could not verify video format (${metadata.contentType}). MP4 is recommended.`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    platformRequirements: requirements
  };
}

export function validateForTikTok(metadata: VideoMetadata): VideoValidationResult {
  const requirements = PLATFORM_REQUIREMENTS.tiktok;
  const errors: string[] = [];
  const warnings: string[] = [];

  if (metadata.fileSize !== null) {
    if (metadata.fileSize > requirements.maxFileSize) {
      errors.push(`File size (${formatBytes(metadata.fileSize)}) exceeds TikTok's maximum of ${requirements.maxFileSizeFormatted}`);
    }
  } else {
    warnings.push("Could not determine file size. Ensure video is under 287.6MB.");
  }

  if (metadata.duration !== null) {
    if (metadata.duration < requirements.minDuration) {
      errors.push(`Duration (${metadata.duration}s) is below TikTok's minimum of ${requirements.minDuration} seconds`);
    }
    if (metadata.duration > requirements.maxDuration) {
      warnings.push(`Duration (${metadata.duration}s) exceeds standard limit of 60 seconds. Videos up to 10 minutes may require approval.`);
    }
  } else {
    warnings.push("Could not determine video duration. TikTok requires 3-60 second videos.");
  }

  const format = getFormatFromContentType(metadata.contentType);
  if (format) {
    if (!requirements.supportedFormats.includes(format)) {
      errors.push(`Format (${format}) is not supported by TikTok. Only MP4 and MOV are supported.`);
    }
  } else if (metadata.contentType) {
    warnings.push(`Could not verify video format (${metadata.contentType}). MP4 or MOV required.`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    platformRequirements: requirements
  };
}

export function validateForInstagram(metadata: VideoMetadata): VideoValidationResult {
  const requirements = PLATFORM_REQUIREMENTS.instagram;
  const errors: string[] = [];
  const warnings: string[] = [];

  if (metadata.fileSize !== null) {
    if (metadata.fileSize > requirements.maxFileSize) {
      errors.push(`File size (${formatBytes(metadata.fileSize)}) exceeds Instagram's maximum of ${requirements.maxFileSizeFormatted}`);
    }
  } else {
    warnings.push("Could not determine file size. Ensure video is under 100MB.");
  }

  if (metadata.duration !== null) {
    if (metadata.duration < requirements.minDuration) {
      errors.push(`Duration (${metadata.duration}s) is below Instagram's minimum of ${requirements.minDuration} seconds`);
    }
    if (metadata.duration > requirements.maxDuration) {
      warnings.push(`Duration (${metadata.duration}s) exceeds feed limit of 60 seconds. Reels can be up to 90 seconds.`);
    }
  } else {
    warnings.push("Could not determine video duration. Instagram requires 3-60 second videos for feed.");
  }

  const format = getFormatFromContentType(metadata.contentType);
  if (format) {
    if (!requirements.supportedFormats.includes(format)) {
      errors.push(`Format (${format}) is not supported by Instagram. Only MP4 with H.264 codec is supported.`);
    }
  } else if (metadata.contentType) {
    warnings.push(`Could not verify video format (${metadata.contentType}). MP4 with H.264 codec required.`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    platformRequirements: requirements
  };
}

export async function validateVideoForPlatform(
  videoUrl: string,
  platform: SocialPlatform
): Promise<VideoValidationResult> {
  const metadata = await fetchVideoMetadata(videoUrl);

  switch (platform) {
    case "youtube":
      return validateForYouTube(metadata);
    case "tiktok":
      return validateForTikTok(metadata);
    case "instagram":
      return validateForInstagram(metadata);
    default:
      return {
        isValid: false,
        errors: [`Unknown platform: ${platform}`],
        warnings: [],
        platformRequirements: PLATFORM_REQUIREMENTS.youtube
      };
  }
}

export interface MultiPlatformValidationResult {
  overallValid: boolean;
  results: Record<SocialPlatform, VideoValidationResult>;
  summary: {
    validPlatforms: SocialPlatform[];
    invalidPlatforms: SocialPlatform[];
    allErrors: string[];
    allWarnings: string[];
  };
}

export async function validateVideoForMultiplePlatforms(
  videoUrl: string,
  platforms: SocialPlatform[]
): Promise<MultiPlatformValidationResult> {
  const metadata = await fetchVideoMetadata(videoUrl);
  
  const results: Record<string, VideoValidationResult> = {};
  const validPlatforms: SocialPlatform[] = [];
  const invalidPlatforms: SocialPlatform[] = [];
  const allErrors: string[] = [];
  const allWarnings: string[] = [];

  for (const platform of platforms) {
    let result: VideoValidationResult;
    
    switch (platform) {
      case "youtube":
        result = validateForYouTube(metadata);
        break;
      case "tiktok":
        result = validateForTikTok(metadata);
        break;
      case "instagram":
        result = validateForInstagram(metadata);
        break;
      default:
        result = {
          isValid: false,
          errors: [`Unknown platform: ${platform}`],
          warnings: [],
          platformRequirements: PLATFORM_REQUIREMENTS.youtube
        };
    }

    results[platform] = result;

    if (result.isValid) {
      validPlatforms.push(platform);
    } else {
      invalidPlatforms.push(platform);
    }

    result.errors.forEach(error => {
      const prefixedError = `[${platform.toUpperCase()}] ${error}`;
      if (!allErrors.includes(prefixedError)) {
        allErrors.push(prefixedError);
      }
    });

    result.warnings.forEach(warning => {
      const prefixedWarning = `[${platform.toUpperCase()}] ${warning}`;
      if (!allWarnings.includes(prefixedWarning)) {
        allWarnings.push(prefixedWarning);
      }
    });
  }

  return {
    overallValid: invalidPlatforms.length === 0,
    results: results as Record<SocialPlatform, VideoValidationResult>,
    summary: {
      validPlatforms,
      invalidPlatforms,
      allErrors,
      allWarnings
    }
  };
}

export function getPlatformRequirements(platform: SocialPlatform): PlatformRequirements {
  return PLATFORM_REQUIREMENTS[platform];
}

export function getAllPlatformRequirements(): Record<SocialPlatform, PlatformRequirements> {
  return PLATFORM_REQUIREMENTS;
}
