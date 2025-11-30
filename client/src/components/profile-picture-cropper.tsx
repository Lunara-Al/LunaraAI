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

interface TouchPoint {
  id: number;
  x: number;
  y: number;
  clientX: number;
  clientY: number;
}

interface GestureState {
  touchPoints: Map<number, TouchPoint>;
  initialDistance: number | null;
  initialZoom: number | null;
  previousPan: { x: number; y: number };
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

// Advanced gesture detection utilities
const calculateDistance = (p1: TouchPoint, p2: TouchPoint): number => {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
};

const calculateMidpoint = (
  p1: TouchPoint,
  p2: TouchPoint
): { x: number; y: number } => {
  return {
    x: (p1.x + p2.x) / 2,
    y: (p1.y + p2.y) / 2,
  };
};

const clampZoom = (zoom: number, min: number = 0.5, max: number = 4): number => {
  return Math.max(min, Math.min(max, zoom));
};

const easeOutCubic = (t: number): number => {
  return 1 - Math.pow(1 - t, 3);
};

// Advanced input validation utilities
interface ZoomInputValidation {
  isValid: boolean;
  error: string | null;
  value: number | null;
}

const parseZoomInput = (input: string): ZoomInputValidation => {
  const trimmed = input.trim();
  
  if (!trimmed) {
    return { isValid: false, error: "Please enter a value", value: null };
  }

  const parsed = parseFloat(trimmed);

  if (isNaN(parsed)) {
    return { isValid: false, error: "Must be a number", value: null };
  }

  if (parsed < 50) {
    return { isValid: false, error: "Minimum is 50%", value: null };
  }

  if (parsed > 400) {
    return { isValid: false, error: "Maximum is 400%", value: null };
  }

  return { isValid: true, error: null, value: parsed / 100 };
};

const normalizeZoomDisplay = (zoom: number): string => {
  return Math.round(zoom * 100).toString();
};

export function ProfilePictureCropper({
  imagePreview,
  isOpen,
  onCropComplete,
  onCancel,
}: ProfilePictureCropperProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const zoomInputRef = useRef<HTMLInputElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isZoomInputMode, setIsZoomInputMode] = useState(false);
  const [zoomInputValue, setZoomInputValue] = useState(normalizeZoomDisplay(1));
  const [zoomInputError, setZoomInputError] = useState<string | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const stateRef = useRef<CropState>({ zoom: 1, pan: { x: 0, y: 0 } });
  const gestureRef = useRef<GestureState>({
    touchPoints: new Map(),
    initialDistance: null,
    initialZoom: null,
    previousPan: { x: 0, y: 0 },
  });

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

      ctx.clearRect(0, 0, SCALED_CANVAS_SIZE, SCALED_CANVAS_SIZE);

      ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
      ctx.fillRect(0, 0, SCALED_CANVAS_SIZE, SCALED_CANVAS_SIZE);

      const centerX = SCALED_CANVAS_SIZE / 2;
      const centerY = SCALED_CANVAS_SIZE / 2;

      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX, centerY, SCALED_CROP_RADIUS, 0, Math.PI * 2);
      ctx.clip();

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

      ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
      ctx.lineWidth = 1 * DPI;
      ctx.beginPath();
      ctx.arc(centerX, centerY, SCALED_CROP_RADIUS + 4 * DPI, 0, Math.PI * 2);
      ctx.stroke();

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

  // ============ MOUSE HANDLERS ============
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

    const newZoom = clampZoom(stateRef.current.zoom + (e.deltaY > 0 ? -0.1 : 0.1));
    stateRef.current.zoom = newZoom;
    setZoom(newZoom);
    scheduleRedraw(imageRef.current, newZoom, stateRef.current.pan);
  };

  // ============ TOUCH HANDLERS ============
  const getTouchPoint = (touch: React.Touch, index: number): TouchPoint => {
    return {
      id: touch.identifier,
      x: touch.clientX,
      y: touch.clientY,
      clientX: touch.clientX,
      clientY: touch.clientY,
    };
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!imageRef.current) return;

    const gesture = gestureRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Clear old touches and add new ones
    gesture.touchPoints.clear();
    Array.from(e.touches).forEach((touch, index) => {
      const rect = canvas.getBoundingClientRect();
      const point: TouchPoint = {
        id: touch.identifier,
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
        clientX: touch.clientX,
        clientY: touch.clientY,
      };
      gesture.touchPoints.set(touch.identifier, point);
    });

    // Handle multi-touch pinch-zoom setup
    if (gesture.touchPoints.size === 2) {
      const points = Array.from(gesture.touchPoints.values());
      gesture.initialDistance = calculateDistance(points[0], points[1]);
      gesture.initialZoom = stateRef.current.zoom;
      gesture.previousPan = { ...stateRef.current.pan };
    } else if (gesture.touchPoints.size === 1) {
      gesture.previousPan = { ...stateRef.current.pan };
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!imageRef.current || gestureRef.current.touchPoints.size === 0) return;

    const gesture = gestureRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();

    // Update touch points with new positions
    Array.from(e.touches).forEach((touch) => {
      if (gesture.touchPoints.has(touch.identifier)) {
        const point = gesture.touchPoints.get(touch.identifier)!;
        point.clientX = touch.clientX;
        point.clientY = touch.clientY;
        point.x = touch.clientX - rect.left;
        point.y = touch.clientY - rect.top;
      }
    });

    if (gesture.touchPoints.size === 2) {
      // Two-finger pinch-to-zoom gesture
      const points = Array.from(gesture.touchPoints.values());
      const currentDistance = calculateDistance(points[0], points[1]);
      const midpoint = calculateMidpoint(points[0], points[1]);

      if (gesture.initialDistance && gesture.initialZoom) {
        const pinchRatio = currentDistance / gesture.initialDistance;
        const newZoom = clampZoom(gesture.initialZoom * pinchRatio);

        stateRef.current.zoom = newZoom;
        setZoom(newZoom);
        scheduleRedraw(imageRef.current, newZoom, stateRef.current.pan);
      }
    } else if (gesture.touchPoints.size === 1) {
      // Single-finger drag to pan
      const point = Array.from(gesture.touchPoints.values())[0];
      const prevPoints = Array.from(e.touches);

      if (prevPoints.length > 0) {
        const prevTouch = prevPoints[0];
        const rect = canvas.getBoundingClientRect();

        const deltaX = prevTouch.clientX - (point.clientX - (point.x - (prevTouch.clientX - rect.left)));
        const deltaY = prevTouch.clientY - (point.clientY - (point.y - (prevTouch.clientY - rect.top)));

        const lastPoint = Array.from(gesture.touchPoints.values())[0];
        const newPan = {
          x: gesture.previousPan.x + (lastPoint.x - (lastPoint.clientX - rect.left)),
          y: gesture.previousPan.y + (lastPoint.y - (lastPoint.clientY - rect.top)),
        };

        stateRef.current.pan = newPan;
        setPan(newPan);
        scheduleRedraw(imageRef.current, stateRef.current.zoom, newPan);
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const gesture = gestureRef.current;

    // Remove ended touches from tracking
    Array.from(e.changedTouches).forEach((touch) => {
      gesture.touchPoints.delete(touch.identifier);
    });

    // Reset gesture state if no more touches
    if (gesture.touchPoints.size === 0) {
      gesture.initialDistance = null;
      gesture.initialZoom = null;
    }
  };

  // ============ BUTTON HANDLERS ============
  const handleZoomIn = () => {
    if (!imageRef.current) return;
    const newZoom = clampZoom(stateRef.current.zoom + 0.2);
    stateRef.current.zoom = newZoom;
    setZoom(newZoom);
    scheduleRedraw(imageRef.current, newZoom, stateRef.current.pan);
  };

  const handleZoomOut = () => {
    if (!imageRef.current) return;
    const newZoom = clampZoom(stateRef.current.zoom - 0.2);
    stateRef.current.zoom = newZoom;
    setZoom(newZoom);
    scheduleRedraw(imageRef.current, newZoom, stateRef.current.pan);
  };

  const handleReset = () => {
    if (!imageRef.current) return;
    stateRef.current = { zoom: 1, pan: { x: 0, y: 0 } };
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setZoomInputValue(normalizeZoomDisplay(1));
    scheduleRedraw(imageRef.current, 1, { x: 0, y: 0 });
  };

  // ============ ZOOM INPUT HANDLERS ============
  const handleZoomDisplayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    setIsZoomInputMode(true);
    setZoomInputValue(normalizeZoomDisplay(stateRef.current.zoom));
    setZoomInputError(null);
    
    // Focus input after state update
    setTimeout(() => {
      zoomInputRef.current?.focus();
      zoomInputRef.current?.select();
    }, 0);
  };

  const applyZoomInput = useCallback((inputValue: string) => {
    if (!imageRef.current) return;

    const validation = parseZoomInput(inputValue);

    if (!validation.isValid) {
      setZoomInputError(validation.error);
      return;
    }

    if (validation.value === null) return;

    const newZoom = clampZoom(validation.value);
    stateRef.current.zoom = newZoom;
    setZoom(newZoom);
    setZoomInputValue(normalizeZoomDisplay(newZoom));
    setZoomInputError(null);
    setIsZoomInputMode(false);
    scheduleRedraw(imageRef.current, newZoom, stateRef.current.pan);
  }, [imageRef, scheduleRedraw]);

  const handleZoomInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setZoomInputValue(value);
    setZoomInputError(null);
  };

  const handleZoomInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      applyZoomInput(zoomInputValue);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setIsZoomInputMode(false);
      setZoomInputError(null);
      setZoomInputValue(normalizeZoomDisplay(stateRef.current.zoom));
    }
  };

  const handleZoomInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    // Only apply if not already closed via escape
    if (isZoomInputMode) {
      applyZoomInput(zoomInputValue);
    }
  };

  const handleCrop = () => {
    if (!imageRef.current) return;

    const cropSize = 256;
    const cropCanvas = document.createElement("canvas");
    cropCanvas.width = cropSize;
    cropCanvas.height = cropSize;

    const ctx = cropCanvas.getContext("2d") as CanvasRenderingContext2D;
    if (!ctx) return;

    ctx.beginPath();
    ctx.arc(cropSize / 2, cropSize / 2, cropSize / 2, 0, Math.PI * 2);
    ctx.clip();

    const centerX = SCALED_CANVAS_SIZE / 2;
    const centerY = SCALED_CANVAS_SIZE / 2;
    const scaledWidth = imageRef.current.width * stateRef.current.zoom;
    const scaledHeight = imageRef.current.height * stateRef.current.zoom;
    const imgX = (SCALED_CANVAS_SIZE - scaledWidth) / 2 + stateRef.current.pan.x * DPI;
    const imgY = (SCALED_CANVAS_SIZE - scaledHeight) / 2 + stateRef.current.pan.y * DPI;

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
          <DialogDescription>
            Desktop: Drag to move • Scroll to zoom | Mobile: Drag with 1 finger • Pinch with 2 fingers
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Canvas with circle crop frame - Touch enabled */}
          <div className="flex justify-center items-center touch-none select-none">
            <canvas
              ref={canvasRef}
              width={SCALED_CANVAS_SIZE}
              height={SCALED_CANVAS_SIZE}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onWheel={handleWheel}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onTouchCancel={handleTouchEnd}
              className="cursor-move bg-gradient-to-br from-black/40 to-black/60 rounded-lg shadow-xl"
              style={{
                width: `${CANVAS_SIZE}px`,
                height: `${CANVAS_SIZE}px`,
                maxWidth: "100%",
                border: "2px solid rgba(138, 43, 226, 0.2)",
                touchAction: "none",
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
            
            {/* Zoom display with clickable input */}
            <div className="flex flex-col items-center gap-1">
              {!isZoomInputMode ? (
                <div
                  onClick={handleZoomDisplayClick}
                  className="flex items-center gap-2 px-4 py-2 bg-card rounded-lg border border-primary/10 cursor-pointer hover:border-primary/30 transition-colors hover-elevate"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleZoomDisplayClick(e as any);
                    }
                  }}
                  data-testid="zoom-display-clickable"
                >
                  <span className="text-sm font-semibold text-muted-foreground">Zoom</span>
                  <span className="text-lg font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent min-w-[50px]">
                    {Math.round(zoom * 100)}%
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <input
                    ref={zoomInputRef}
                    type="number"
                    min="50"
                    max="400"
                    value={zoomInputValue}
                    onChange={handleZoomInputChange}
                    onKeyDown={handleZoomInputKeyDown}
                    onBlur={handleZoomInputBlur}
                    className="w-16 px-2 py-1 bg-background border border-primary rounded text-center font-semibold focus:outline-none focus:ring-2 focus:ring-primary/50"
                    data-testid="zoom-input"
                    aria-label="Enter zoom percentage"
                  />
                  <span className="text-sm font-semibold text-muted-foreground">%</span>
                </div>
              )}
              {zoomInputError && isZoomInputMode && (
                <span className="text-xs text-destructive font-medium" data-testid="zoom-input-error">
                  {zoomInputError}
                </span>
              )}
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
