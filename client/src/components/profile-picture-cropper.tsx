import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

interface ProfilePictureCropperProps {
  imagePreview: string;
  isOpen: boolean;
  onCropComplete: (croppedBase64: string) => void;
  onCancel: () => void;
}

interface CropState {
  zoom: number;
  pan: { x: number; y: number };
}

// Type-safe canvas context utilities
const getCanvasContext = (
  canvas: HTMLCanvasElement | null
): CanvasRenderingContext2D | null => {
  if (!canvas) return null;
  const ctx = canvas.getContext("2d", {
    alpha: true,
    willReadFrequently: false,
  }) as CanvasRenderingContext2D | null;
  return ctx;
};

export function ProfilePictureCropper({
  imagePreview,
  isOpen,
  onCropComplete,
  onCancel,
}: ProfilePictureCropperProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const imageRef = useRef<HTMLImageElement | null>(null);
  const stateRef = useRef<CropState>({ zoom: 1, pan: { x: 0, y: 0 } });

  // High-DPI support for crisp rendering
  const CROP_RADIUS = 128;
  const CANVAS_SIZE = 320;
  const DPI = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
  const SCALED_CANVAS_SIZE = CANVAS_SIZE * DPI;
  const SCALED_CROP_RADIUS = CROP_RADIUS * DPI;

  // Downsample large images for better performance
  const downscaleImage = useCallback((img: HTMLImageElement): HTMLImageElement => {
    const MAX_DIMENSION = 2000;
    if (img.width <= MAX_DIMENSION && img.height <= MAX_DIMENSION) return img;

    const scale = MAX_DIMENSION / Math.max(img.width, img.height);
    const canvas = document.createElement("canvas");
    canvas.width = img.width * scale;
    canvas.height = img.height * scale;

    const ctx = canvas.getContext("2d", { alpha: false }) as CanvasRenderingContext2D;
    if (!ctx) return img;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const scaledImg = new Image();
    scaledImg.src = canvas.toDataURL("image/jpeg", 0.9);
    return scaledImg;
  }, []);

  // Advanced rendering with circular mask and anti-aliasing
  const redraw = useCallback(
    (img: HTMLImageElement, zoomLevel: number, panOffset: { x: number; y: number }) => {
      const canvas = canvasRef.current;
      const ctx = getCanvasContext(canvas);
      
      if (!ctx) return;

      // Clear with DPI scaling
      ctx.clearRect(0, 0, SCALED_CANVAS_SIZE, SCALED_CANVAS_SIZE);

      // Draw dimmed background (outside circle)
      ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
      ctx.fillRect(0, 0, SCALED_CANVAS_SIZE, SCALED_CANVAS_SIZE);

      // Calculate circle center
      const centerX = SCALED_CANVAS_SIZE / 2;
      const centerY = SCALED_CANVAS_SIZE / 2;

      // Create circular clipping region for image
      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX, centerY, SCALED_CROP_RADIUS, 0, Math.PI * 2);
      ctx.clip();

      // Render image with high-quality settings
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      const scaledWidth = img.width * zoomLevel;
      const scaledHeight = img.height * zoomLevel;
      const x = (SCALED_CANVAS_SIZE - scaledWidth) / 2 + panOffset.x * DPI;
      const y = (SCALED_CANVAS_SIZE - scaledHeight) / 2 + panOffset.y * DPI;

      ctx.drawImage(img, x, y, scaledWidth, scaledHeight);
      ctx.restore();

      // Draw circular frame border with gradient glow
      const gradient = ctx.createLinearGradient(
        centerX - SCALED_CROP_RADIUS,
        centerY - SCALED_CROP_RADIUS,
        centerX + SCALED_CROP_RADIUS,
        centerY + SCALED_CROP_RADIUS
      );
      gradient.addColorStop(0, "rgba(255, 80, 225, 0.8)");
      gradient.addColorStop(0.5, "rgba(138, 43, 226, 0.9)");
      gradient.addColorStop(1, "rgba(75, 0, 130, 0.8)");

      ctx.strokeStyle = gradient;
      ctx.lineWidth = 3 * DPI;
      ctx.beginPath();
      ctx.arc(centerX, centerY, SCALED_CROP_RADIUS, 0, Math.PI * 2);
      ctx.stroke();

      // Add outer ring for depth
      ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
      ctx.lineWidth = 1 * DPI;
      ctx.beginPath();
      ctx.arc(centerX, centerY, SCALED_CROP_RADIUS + 4 * DPI, 0, Math.PI * 2);
      ctx.stroke();

      // Draw subtle radial grid lines
      ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
      ctx.lineWidth = 0.5 * DPI;
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const x1 = centerX + Math.cos(angle) * (SCALED_CROP_RADIUS * 0.3);
        const y1 = centerY + Math.sin(angle) * (SCALED_CROP_RADIUS * 0.3);
        const x2 = centerX + Math.cos(angle) * SCALED_CROP_RADIUS;
        const y2 = centerY + Math.sin(angle) * SCALED_CROP_RADIUS;

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }

      // Draw center dot for reference
      ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
      ctx.beginPath();
      ctx.arc(centerX, centerY, 3 * DPI, 0, Math.PI * 2);
      ctx.fill();
    },
    [DPI, SCALED_CANVAS_SIZE, SCALED_CROP_RADIUS]
  );

  // Use requestAnimationFrame for smooth rendering
  const scheduleRedraw = useCallback(
    (img: HTMLImageElement, zoomLevel: number, panOffset: { x: number; y: number }) => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      animationFrameRef.current = requestAnimationFrame(() => {
        redraw(img, zoomLevel, panOffset);
        animationFrameRef.current = null;
      });
    },
    [redraw]
  );

  // Load and process image
  useEffect(() => {
    if (!isOpen) return;

    const img = new Image();
    img.onload = () => {
      // Downsample for performance if needed
      const processedImg = downscaleImage(img);
      processedImg.onload = () => {
        imageRef.current = processedImg;
        stateRef.current = { zoom: 1, pan: { x: 0, y: 0 } };
        setZoom(1);
        setPan({ x: 0, y: 0 });
        redraw(processedImg, 1, { x: 0, y: 0 });
      };
      if (img !== processedImg) {
        processedImg.src = img.src;
      } else {
        redraw(img, 1, { x: 0, y: 0 });
      }
    };
    img.src = imagePreview;
  }, [isOpen, imagePreview, downscaleImage, redraw]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !imageRef.current) return;

    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;

    const newPan = {
      x: stateRef.current.pan.x + deltaX,
      y: stateRef.current.pan.y + deltaY,
    };

    stateRef.current.pan = newPan;
    setPan(newPan);
    setDragStart({ x: e.clientX, y: e.clientY });
    scheduleRedraw(imageRef.current, stateRef.current.zoom, newPan);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!imageRef.current) return;

    const newZoom = Math.max(0.5, Math.min(4, stateRef.current.zoom + (e.deltaY > 0 ? -0.1 : 0.1)));
    stateRef.current.zoom = newZoom;
    setZoom(newZoom);
    scheduleRedraw(imageRef.current, newZoom, stateRef.current.pan);
  };

  const handleZoomIn = () => {
    if (!imageRef.current) return;
    const newZoom = Math.min(4, stateRef.current.zoom + 0.2);
    stateRef.current.zoom = newZoom;
    setZoom(newZoom);
    scheduleRedraw(imageRef.current, newZoom, stateRef.current.pan);
  };

  const handleZoomOut = () => {
    if (!imageRef.current) return;
    const newZoom = Math.max(0.5, stateRef.current.zoom - 0.2);
    stateRef.current.zoom = newZoom;
    setZoom(newZoom);
    scheduleRedraw(imageRef.current, newZoom, stateRef.current.pan);
  };

  const handleReset = () => {
    if (!imageRef.current) return;
    stateRef.current = { zoom: 1, pan: { x: 0, y: 0 } };
    setZoom(1);
    setPan({ x: 0, y: 0 });
    scheduleRedraw(imageRef.current, 1, { x: 0, y: 0 });
  };

  const handleCrop = () => {
    if (!imageRef.current) return;

    // Create high-resolution circular crop
    const cropSize = 256;
    const cropCanvas = document.createElement("canvas");
    cropCanvas.width = cropSize;
    cropCanvas.height = cropSize;

    const ctx = cropCanvas.getContext("2d") as CanvasRenderingContext2D;
    if (!ctx) return;

    // Create circular clipping path
    ctx.beginPath();
    ctx.arc(cropSize / 2, cropSize / 2, cropSize / 2, 0, Math.PI * 2);
    ctx.clip();

    // Calculate source coordinates
    const centerX = SCALED_CANVAS_SIZE / 2;
    const centerY = SCALED_CANVAS_SIZE / 2;
    const scaledWidth = imageRef.current.width * stateRef.current.zoom;
    const scaledHeight = imageRef.current.height * stateRef.current.zoom;
    const imgX = (SCALED_CANVAS_SIZE - scaledWidth) / 2 + stateRef.current.pan.x * DPI;
    const imgY = (SCALED_CANVAS_SIZE - scaledHeight) / 2 + stateRef.current.pan.y * DPI;

    // Calculate crop region (from centered circle)
    const cropX = centerX - SCALED_CROP_RADIUS;
    const cropY = centerY - SCALED_CROP_RADIUS;

    ctx.drawImage(
      imageRef.current,
      (cropX - imgX) / stateRef.current.zoom,
      (cropY - imgY) / stateRef.current.zoom,
      (SCALED_CROP_RADIUS * 2) / stateRef.current.zoom,
      (SCALED_CROP_RADIUS * 2) / stateRef.current.zoom,
      0,
      0,
      cropSize,
      cropSize
    );

    // Convert to blob and trigger completion
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
          <DialogTitle>Perfect Your Profile</DialogTitle>
          <DialogDescription>Drag to position, scroll to zoom. Crop to a beautiful circle.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Canvas with circle crop frame */}
          <div className="flex justify-center items-center">
            <canvas
              ref={canvasRef}
              width={SCALED_CANVAS_SIZE}
              height={SCALED_CANVAS_SIZE}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onWheel={handleWheel}
              className="cursor-move bg-gradient-to-br from-black/40 to-black/60 rounded-lg shadow-xl"
              style={{
                width: `${CANVAS_SIZE}px`,
                height: `${CANVAS_SIZE}px`,
                maxWidth: "100%",
                border: "2px solid rgba(138, 43, 226, 0.2)",
              }}
            />
          </div>

          {/* Advanced zoom controls */}
          <div className="flex items-center justify-center gap-3">
            <Button
              type="button"
              size="icon"
              variant="outline"
              onClick={handleZoomOut}
              title="Zoom out"
              data-testid="button-zoom-out"
              disabled={zoom <= 0.5}
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-2 px-4 py-2 bg-card rounded-lg border border-primary/10">
              <span className="text-sm font-semibold text-muted-foreground">Zoom</span>
              <span className="text-lg font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent min-w-[50px]">
                {Math.round(zoom * 100)}%
              </span>
            </div>
            <Button
              type="button"
              size="icon"
              variant="outline"
              onClick={handleZoomIn}
              title="Zoom in"
              data-testid="button-zoom-in"
              disabled={zoom >= 4}
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={handleReset}
              title="Reset position"
              data-testid="button-reset-crop"
              className="hover-elevate"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="flex-1"
              data-testid="button-cancel-crop"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleCrop}
              className="flex-1 bg-gradient-to-r from-primary via-secondary to-primary moon-glow text-white font-semibold"
              data-testid="button-confirm-crop"
            >
              Crop & Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
