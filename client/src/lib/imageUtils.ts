/**
 * Image processing utilities with smart compression
 * Centralized image handling for both video generator and profile uploads
 */

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB
const VALID_IMAGE_TYPES = [
  "image/jpeg",
  "image/png", 
  "image/webp",
  "image/gif",
  "image/bmp",
  "image/svg+xml",
  "image/tiff",
];

export interface ImageValidationResult {
  valid: boolean;
  error?: string;
}

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

/**
 * Validate image file type and size
 */
export function validateImageFile(file: File): ImageValidationResult {
  if (!VALID_IMAGE_TYPES.includes(file.type)) {
    return { 
      valid: false, 
      error: "Please upload a valid image (JPEG, PNG, WebP, GIF, BMP, SVG, or TIFF)" 
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    return { 
      valid: false, 
      error: `Image size must be less than 500MB. Your file is ${formatFileSize(file.size)}` 
    };
  }

  return { valid: true };
}

/**
 * Convert file to base64 data URL
 */
export function imageToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Compress image with adaptive quality
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<Blob> {
  const { maxWidth = 4096, maxHeight = 4096, quality = 0.85 } = options;
  
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        // Scale down if needed
        if (width > maxWidth || height > maxHeight) {
          const scale = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Failed to get canvas context"));
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, width, height);

        // Try progressive compression
        attemptCompress(canvas, quality, resolve, reject);
      };
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Compress for profile picture (smaller dimensions)
 */
export async function compressProfileImage(file: File): Promise<string> {
  const blob = await compressImage(file, {
    maxWidth: 1024,
    maxHeight: 1024,
    quality: 0.85,
  });
  
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function attemptCompress(
  canvas: HTMLCanvasElement,
  quality: number,
  resolve: (blob: Blob) => void,
  reject: (error: Error) => void,
  attempt: number = 0
): void {
  canvas.toBlob(
    (blob) => {
      if (!blob) {
        reject(new Error("Failed to compress image"));
        return;
      }

      // Accept if size is reasonable or quality is too low
      if (blob.size < 10 * 1024 * 1024 || quality <= 0.3 || attempt >= 3) {
        resolve(blob);
      } else {
        attemptCompress(canvas, quality - 0.15, resolve, reject, attempt + 1);
      }
    },
    "image/jpeg",
    quality
  );
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}
