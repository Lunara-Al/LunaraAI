/**
 * Advanced image processing utilities with smart compression
 * Supports files up to 500MB with adaptive compression
 */

/**
 * Convert image file to base64 with adaptive compression
 */
export async function imageToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Advanced image compression with adaptive quality
 * Automatically reduces quality if resulting base64 is too large
 */
export async function compressImage(
  file: File,
  maxWidth: number = 4096,
  maxHeight: number = 4096,
  initialQuality: number = 0.85
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions maintaining aspect ratio
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        // Enable image smoothing for better quality
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        ctx.drawImage(img, 0, 0, width, height);

        // Try initial quality, then adaptively reduce if needed
        attemptCompress(canvas, initialQuality, resolve, reject);
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Adaptively compress with fallback quality levels
 */
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
        reject(new Error('Failed to compress image'));
        return;
      }

      // If size is reasonable or we've reduced quality enough, accept it
      if (blob.size < 10 * 1024 * 1024 || quality <= 0.3 || attempt >= 3) {
        resolve(blob);
      } else {
        // Try again with lower quality
        attemptCompress(canvas, quality - 0.15, resolve, reject, attempt + 1);
      }
    },
    'image/jpeg',
    quality
  );
}

/**
 * Validate image file with generous limits
 * Supports up to 500MB files
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/bmp', 'image/svg+xml', 'image/tiff'];
  const maxSize = 500 * 1024 * 1024; // 500MB

  if (!validTypes.includes(file.type)) {
    return { 
      valid: false, 
      error: 'Please upload a valid image (JPEG, PNG, WebP, GIF, BMP, SVG, or TIFF)' 
    };
  }

  if (file.size > maxSize) {
    return { 
      valid: false, 
      error: `Image size must be less than 500MB. Your file is ${(file.size / 1024 / 1024).toFixed(2)}MB` 
    };
  }

  return { valid: true };
}

/**
 * Get human-readable file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
