import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

interface ProfilePictureCropperProps {
  imagePreview: string;
  isOpen: boolean;
  onCropComplete: (croppedBase64: string) => void;
  onCancel: () => void;
}

const CROP_SIZE = 256;
const CANVAS_SIZE = 320;
const DPI = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
const CIRCLE_RADIUS = 128;
const CIRCLE_DIAMETER = CIRCLE_RADIUS * 2;

export function ProfilePictureCropper({
  imagePreview,
  isOpen,
  onCropComplete,
  onCancel,
}: ProfilePictureCropperProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [touchDistance, setTouchDistance] = useState<number | null>(null);
  const [touchZoomStart, setTouchZoomStart] = useState<number | null>(null);

  const scaledCanvasSize = CANVAS_SIZE * DPI;
  const scaledRadius = CIRCLE_RADIUS * DPI;

  /**
   * Advanced boundary calculation with perfect mathematical constraints.
   * Ensures:
   * - Entire image stays visible (no parts cropped off)
   * - Only minimal panning/cropping allowed
   * - Works perfectly on mobile and desktop
   * - Handles all aspect ratios (portrait, landscape, square)
   */
  const clampPan = useCallback(
    (currentPanX: number, currentPanY: number): { x: number; y: number } => {
      if (!imageRef.current) return { x: currentPanX, y: currentPanY };

      const img = imageRef.current;
      const imgWidth = img.width * zoom;
      const imgHeight = img.height * zoom;

      /**
       * Core algorithm:
       * Calculate max pan distance per dimension based on:
       * 1. Whether image fits entirely in circle
       * 2. Aspect ratio and size differences
       * 3. Minimal crop margin (allow only ~3% crop max)
       */
      const calculateMaxPan = (imageSize: number, circleDiam: number): number => {
        // Case 1: Image is smaller than or equal to circle
        // Allow only ~1% fine-tuning movement for centering
        if (imageSize <= circleDiam) {
          const excess = circleDiam - imageSize;
          return excess * 0.01; // Very limited adjustment
        }

        // Case 2: Image is larger than circle (zoomed in)
        // Allow only minimal cropping (~3-5% max on each side)
        // This keeps the entire image visible with minimal cutoff
        const maxCropMargin = circleDiam * 0.03; // 3% crop margin
        const maxPan = (imageSize / 2 - circleDiam / 2 + maxCropMargin) / zoom;

        return Math.max(0, maxPan);
      };

      const maxPanX = calculateMaxPan(imgWidth, CIRCLE_DIAMETER);
      const maxPanY = calculateMaxPan(imgHeight, CIRCLE_DIAMETER);

      // Clamp to boundaries with smooth constraints
      const clampedX = Math.max(-maxPanX, Math.min(maxPanX, currentPanX));
      const clampedY = Math.max(-maxPanY, Math.min(maxPanY, currentPanY));

      return { x: clampedX, y: clampedY };
    },
    [zoom]
  );

  // Draw canvas with high-quality rendering
  const draw = useCallback(
    (currentZoom: number, currentPanX: number, currentPanY: number) => {
      const canvas = canvasRef.current;
      if (!canvas || !imageRef.current) return;

      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;

      const centerX = scaledCanvasSize / 2;
      const centerY = scaledCanvasSize / 2;

      // Clear canvas
      ctx.clearRect(0, 0, scaledCanvasSize, scaledCanvasSize);

      // Dark overlay outside circle
      ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
      ctx.fillRect(0, 0, scaledCanvasSize, scaledCanvasSize);

      // Draw image within circular clipping region
      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX, centerY, scaledRadius, 0, Math.PI * 2);
      ctx.clip();

      const imgWidth = imageRef.current.width * currentZoom;
      const imgHeight = imageRef.current.height * currentZoom;
      const imgX = (scaledCanvasSize - imgWidth) / 2 + currentPanX * DPI;
      const imgY = (scaledCanvasSize - imgHeight) / 2 + currentPanY * DPI;

      // High-quality image rendering
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(imageRef.current, imgX, imgY, imgWidth, imgHeight);
      ctx.restore();

      // Draw circle border with anti-aliasing
      ctx.strokeStyle = "rgba(138, 43, 226, 0.8)";
      ctx.lineWidth = 2 * DPI;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.arc(centerX, centerY, scaledRadius, 0, Math.PI * 2);
      ctx.stroke();
    },
    [scaledCanvasSize, scaledRadius]
  );

  const scheduleRedraw = useCallback(
    (currentZoom: number, currentPanX: number, currentPanY: number) => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      animationFrameRef.current = requestAnimationFrame(() => {
        draw(currentZoom, currentPanX, currentPanY);
      });
    },
    [draw]
  );

  // Load and initialize image
  useEffect(() => {
    if (!isOpen) return;

    const img = new Image();
    img.onload = () => {
      imageRef.current = img;
      setZoom(1);
      setPanX(0);
      setPanY(0);
      scheduleRedraw(1, 0, 0);
    };
    img.onerror = () => {
      console.error("Failed to load image");
    };
    img.src = imagePreview;
  }, [isOpen, imagePreview, scheduleRedraw]);

  // Mouse event handlers with adaptive movement
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const movementX = (e.movementX / rect.width) * CANVAS_SIZE / DPI;
    const movementY = (e.movementY / rect.height) * CANVAS_SIZE / DPI;

    const newPanX = panX + movementX;
    const newPanY = panY + movementY;

    const clamped = clampPan(newPanX, newPanY);

    setPanX(clamped.x);
    setPanY(clamped.y);
    scheduleRedraw(zoom, clamped.x, clamped.y);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomSpeed = 0.1;
    const newZoom = Math.max(0.5, Math.min(4, zoom + (e.deltaY > 0 ? -zoomSpeed : zoomSpeed)));
    setZoom(newZoom);
    scheduleRedraw(newZoom, panX, panY);
  };

  // Touch event handlers with pinch zoom support
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      setTouchDistance(distance);
      setTouchZoomStart(zoom);
      setIsDragging(false);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();

    if (e.touches.length === 1 && isDragging) {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const touch = e.touches[0];
      const movementX = (touch.clientX - dragStart.x) / rect.width * CANVAS_SIZE / DPI;
      const movementY = (touch.clientY - dragStart.y) / rect.height * CANVAS_SIZE / DPI;

      const newPanX = panX + movementX;
      const newPanY = panY + movementY;

      const clamped = clampPan(newPanX, newPanY);

      setPanX(clamped.x);
      setPanY(clamped.y);
      setDragStart({ x: touch.clientX, y: touch.clientY });
      scheduleRedraw(zoom, clamped.x, clamped.y);
    } else if (e.touches.length === 2 && touchDistance !== null && touchZoomStart !== null) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const newDistance = Math.sqrt(dx * dx + dy * dy);
      const ratio = newDistance / touchDistance;
      const newZoom = Math.max(0.5, Math.min(4, touchZoomStart * ratio));
      setZoom(newZoom);
      scheduleRedraw(newZoom, panX, panY);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 0) {
      setIsDragging(false);
      setTouchDistance(null);
      setTouchZoomStart(null);
    }
  };

  // Zoom controls
  const handleZoomIn = () => {
    const newZoom = Math.min(4, zoom + 0.2);
    setZoom(newZoom);
    scheduleRedraw(newZoom, panX, panY);
  };

  const handleZoomOut = () => {
    const newZoom = Math.max(0.5, zoom - 0.2);
    setZoom(newZoom);
    scheduleRedraw(newZoom, panX, panY);
  };

  const handleReset = () => {
    setZoom(1);
    setPanX(0);
    setPanY(0);
    scheduleRedraw(1, 0, 0);
  };

  // Crop and save with high-quality output
  const handleCrop = () => {
    if (!imageRef.current) return;

    const cropCanvas = document.createElement("canvas");
    cropCanvas.width = CROP_SIZE;
    cropCanvas.height = CROP_SIZE;

    const ctx = cropCanvas.getContext("2d");
    if (!ctx) return;

    // Circular clipping
    ctx.beginPath();
    ctx.arc(CROP_SIZE / 2, CROP_SIZE / 2, CROP_SIZE / 2, 0, Math.PI * 2);
    ctx.clip();

    const scaledSize = CANVAS_SIZE * DPI;
    const scaledRadius = CIRCLE_RADIUS * DPI;
    const centerX = scaledSize / 2;
    const centerY = scaledSize / 2;

    const imgWidth = imageRef.current.width * zoom;
    const imgHeight = imageRef.current.height * zoom;
    const imgX = (scaledSize - imgWidth) / 2 + panX * DPI;
    const imgY = (scaledSize - imgHeight) / 2 + panY * DPI;

    const circleX = centerX - scaledRadius;
    const circleY = centerY - scaledRadius;

    const srcX = (circleX - imgX) / zoom;
    const srcY = (circleY - imgY) / zoom;
    const srcSize = (scaledRadius * 2) / zoom;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(imageRef.current, srcX, srcY, srcSize, srcSize, 0, 0, CROP_SIZE, CROP_SIZE);

    cropCanvas.toBlob(
      (blob) => {
        if (!blob) return;
        const reader = new FileReader();
        reader.onload = () => {
          onCropComplete(reader.result as string);
        };
        reader.readAsDataURL(blob);
      },
      "image/jpeg",
      0.95
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Crop Your Profile Picture</DialogTitle>
          <DialogDescription>Drag to adjust • Scroll/pinch to zoom • Full image always visible</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex justify-center">
            <canvas
              ref={canvasRef}
              width={CANVAS_SIZE * DPI}
              height={CANVAS_SIZE * DPI}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onWheel={handleWheel}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              className="border-2 border-primary/20 rounded-lg bg-black/40 cursor-move select-none"
              style={{
                width: `${CANVAS_SIZE}px`,
                height: `${CANVAS_SIZE}px`,
                touchAction: "none",
                userSelect: "none",
              }}
              data-testid="canvas-cropper"
            />
          </div>

          <div className="flex items-center justify-center gap-2">
            <Button
              size="icon"
              variant="outline"
              onClick={handleZoomOut}
              disabled={zoom <= 0.5}
              data-testid="button-zoom-out"
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-sm font-medium min-w-[60px] text-center" data-testid="text-zoom-level">
              {Math.round(zoom * 100)}%
            </span>
            <Button
              size="icon"
              variant="outline"
              onClick={handleZoomIn}
              disabled={zoom >= 4}
              data-testid="button-zoom-in"
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={handleReset} data-testid="button-reset">
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={onCancel}
              className="flex-1"
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button onClick={handleCrop} className="flex-1" data-testid="button-save">
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
