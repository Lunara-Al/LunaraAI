export interface ShareResult {
  success: boolean;
  method: "native" | "clipboard" | "manual";
  message: string;
}

export async function shareContent(data: {
  title: string;
  text?: string;
  url: string;
}): Promise<ShareResult> {
  if (navigator.share) {
    try {
      await navigator.share(data);
      return { 
        success: true, 
        method: "native", 
        message: "Shared successfully!" 
      };
    } catch (err: any) {
      if (err?.name === "AbortError") {
        return { 
          success: false, 
          method: "native", 
          message: "Share cancelled" 
        };
      }
    }
  }

  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(data.url);
      return { 
        success: true, 
        method: "clipboard", 
        message: "Link copied to clipboard!" 
      };
    } catch (err) {
      console.error("Clipboard failed:", err);
    }
  }

  return { 
    success: true, 
    method: "manual", 
    message: "Copy the link below" 
  };
}

export async function copyToClipboard(text: string): Promise<boolean> {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.error("Clipboard failed:", err);
    }
  }

  try {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    textArea.style.top = "-999999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    const success = document.execCommand("copy");
    document.body.removeChild(textArea);
    return success;
  } catch (err) {
    console.error("Fallback copy failed:", err);
    return false;
  }
}

export async function downloadVideo(
  videoUrl: string, 
  filename: string,
  onProgress?: (progress: number) => void
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(videoUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status}`);
    }

    const contentLength = Number(response.headers.get("Content-Length") || 0);
    const reader = response.body?.getReader();
    
    if (!reader) {
      const blob = await response.blob();
      triggerDownload(blob, filename);
      return { success: true };
    }

    const chunks: Uint8Array[] = [];
    let receivedLength = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      chunks.push(value);
      receivedLength += value.length;
      
      if (onProgress && contentLength > 0) {
        onProgress(Math.round((receivedLength / contentLength) * 100));
      }
    }

    const blob = new Blob(chunks, { type: "video/mp4" });
    triggerDownload(blob, filename);
    
    return { success: true };
  } catch (error: any) {
    console.error("Download failed:", error);
    return { 
      success: false, 
      error: error?.message || "Download failed" 
    };
  }
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.style.display = "none";
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 2000);
}

export function sanitizeFilename(prompt: string, maxLength = 30): string {
  return prompt
    .slice(0, maxLength)
    .replace(/[^a-z0-9]/gi, "-")
    .toLowerCase()
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function generateFilename(prompt: string): string {
  const safePrompt = sanitizeFilename(prompt);
  return `lunara-${safePrompt}-${Date.now()}.mp4`;
}
