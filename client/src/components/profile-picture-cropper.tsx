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

const CROP_SIZE = 256;
const CANVAS_SIZE = 320;
const DPI = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
const CIRCLE_RADIUS = 128;

export function ProfilePictureCropper({
  imagePreview,
  isOpen,
  onCropComplete,
  onCancel,
}: ProfilePictureCropperProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Simple state: zoom and pan
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [touchDistance, setTouchDistance] = useState<number | null>(null);
  const [touchZoomStart, setTouchZoomStart] = useState<number | null>(null);

  // Draw the canvas
  const draw = useCallback(
    (img: HTMLImageElement, currentZoom: number, currentPanX: number, currentPanY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const scaledSize = CANVAS_SIZE * DPI;
      const scaledRadius = CIRCLE_RADIUS * DPI;
      const centerX = scaledSize / 2;
      const centerY = scaledSize / 2;

      // Clear
      ctx.clearRect(0, 0, scaledSize, scaledSize);

      // Dark overlay
      ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
      ctx.fillRect(0, 0, scaledSize, scaledSize);

      // Draw image in circular region
      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX, centerY, scaledRadius, 0, Math.PI * 2);
      ctx.clip();

      const imgWidth = img.width * currentZoom;
      const imgHeight = img.height * currentZoom;
      const imgX = (scaledSize - imgWidth) / 2 + currentPanX * DPI;
      const imgY = (scaledSize - imgHeight) / 2 + currentPanY * DPI;

      ctx.drawImage(img, imgX, imgY, imgWidth, imgHeight);
      ctx.restore();

      // Draw circle border
      ctx.strokeStyle = "rgba(138, 43, 226, 0.8)";
      ctx.lineWidth = 2 * DPI;
      ctx.beginPath();
      ctx.arc(centerX, centerY, scaledRadius, 0, Math.PI * 2);
      ctx.stroke();
    },
    []
  );

  const scheduleRedraw = useCallback(
    (currentZoom: number, currentPanX: number, currentPanY: number) => {
      if (!imageRef.current) return;

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      animationFrameRef.current = requestAnimationFrame(() => {
        draw(imageRef.current!, currentZoom, currentPanX, currentPanY);
      });
    },
    [draw]
  );

  // Load image
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
    img.src = imagePreview;
  }, [isOpen, imagePreview, scheduleRedraw]);

  // Mouse handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const movementX = e.movementX / DPI;
    const movementY = e.movementY / DPI;

    const newPanX = panX + movementX;
    const newPanY = panY + movementY;

    setPanX(newPanX);
    setPanY(newPanY);
    scheduleRedraw(zoom, newPanX, newPanY);
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

  // Touch handlers
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
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
      // Single finger drag
      const canvas = canvasRef.current;
      if (!canvas) return;

      const touch = e.touches[0];
      const prevTouch = e.targetTouches[0];

      if (prevTouch) {
        const movementX = (touch.clientX - prevTouch.clientX) / DPI;
        const movementY = (touch.clientY - prevTouch.clientY) / DPI;

        const newPanX = panX + movementX;
        const newPanY = panY + movementY;

        setPanX(newPanX);
        setPanY(newPanY);
        scheduleRedraw(zoom, newPanX, newPanY);
      }
    } else if (e.touches.length === 2 && touchDistance !== null) {
      // Two finger pinch
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const newDistance = Math.sqrt(dx * dx + dy * dy);

      const ratio = newDistance / touchDistance;
      const newZoom = Math.max(0.5, Math.min(4, (touchZoomStart || 1) * ratio));

      setZoom(newZoom);
      scheduleRedraw(newZoom, panX, panY);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 0) {
      setIsDragging(false);
      setTouchDistance(null);
      setTouchZoomStart(null);
    } else if (e.touches.length === 1) {
      setTouchDistance(null);
      setTouchZoomStart(null);
      setIsDragging(true);
    }
  };

  // Zoom buttons
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

  // Crop and save
  const handleCrop = () => {
    if (!imageRef.current) return;

    const cropCanvas = document.createElement("canvas");
    cropCanvas.width = CROP_SIZE;
    cropCanvas.height = CROP_SIZE;

    const ctx = cropCanvas.getContext("2d");
    if (!ctx) return;

    // Clip to circle
    ctx.beginPath();
    ctx.arc(CROP_SIZE / 2, CROP_SIZE / 2, CROP_SIZE / 2, 0, Math.PI * 2);
    ctx.clip();

    // Calculate image position and size on the display canvas
    const scaledSize = CANVAS_SIZE * DPI;
    const scaledRadius = CIRCLE_RADIUS * DPI;
    const centerX = scaledSize / 2;
    const centerY = scaledSize / 2;

    const imgWidth = imageRef.current.width * zoom;
    const imgHeight = imageRef.current.height * zoom;
    const imgX = (scaledSize - imgWidth) / 2 + panX * DPI;
    const imgY = (scaledSize - imgHeight) / 2 + panY * DPI;

    // Map from canvas to crop
    const circleX = centerX - scaledRadius;
    const circleY = centerY - scaledRadius;

    const srcX = (circleX - imgX) / zoom;
    const srcY = (circleY - imgY) / zoom;
    const srcSize = (scaledRadius * 2) / zoom;

    ctx.drawImage(
      imageRef.current,
      srcX,
      srcY,
      srcSize,
      srcSize,
      0,
      0,
      CROP_SIZE,
      CROP_SIZE
    );

    cropCanvas.toBlob((blob) => {
      if (!blob) return;
      const reader = new FileReader();
      reader.onload = () => {
        onCropComplete(reader.result as string);
      };
      reader.readAsDataURL(blob);
    }, "image/jpeg", 0.95);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Crop Your Profile Picture</DialogTitle>
          <DialogDescription>
            Drag to move, scroll to zoom
          </DialogDescription>
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
              className="border-2 border-primary/20 rounded-lg bg-black/40 cursor-move"
              style={{
                width: `${CANVAS_SIZE}px`,
                height: `${CANVAS_SIZE}px`,
                touchAction: "none",
              }}
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
            <span className="text-sm font-medium min-w-[60px] text-center">
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
            <Button
              size="icon"
              variant="ghost"
              onClick={handleReset}
              data-testid="button-reset"
            >
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
            <Button
              onClick={handleCrop}
              className="flex-1"
              data-testid="button-save"
            >
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
