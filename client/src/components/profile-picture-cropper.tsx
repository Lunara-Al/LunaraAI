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

interface CropRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

type ResizeHandle = "nw" | "ne" | "sw" | "se" | "n" | "s" | "e" | "w" | "body" | null;

const CROP_SIZE = 256;
const CANVAS_SIZE = 320;
const DPI = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
const CIRCLE_RADIUS = 128;
const HANDLE_SIZE = 12;

export function ProfilePictureCropper({
  imagePreview,
  isOpen,
  onCropComplete,
  onCancel,
}: ProfilePictureCropperProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Image transformation state
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);

  // Cropping state
  const [cropRegion, setCropRegion] = useState<CropRegion>({
    x: CIRCLE_RADIUS - 60,
    y: CIRCLE_RADIUS - 60,
    width: 120,
    height: 120,
  });

  // Interaction state
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const [resizingHandle, setResizingHandle] = useState<ResizeHandle>(null);
  const [isDraggingCrop, setIsDraggingCrop] = useState(false);
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });
  const [touchDistance, setTouchDistance] = useState<number | null>(null);
  const [touchZoomStart, setTouchZoomStart] = useState<number | null>(null);

  const scaledCanvasSize = CANVAS_SIZE * DPI;
  const scaledRadius = CIRCLE_RADIUS * DPI;
  const scaledCropRegion = {
    x: cropRegion.x * DPI,
    y: cropRegion.y * DPI,
    width: cropRegion.width * DPI,
    height: cropRegion.height * DPI,
  };

  // Draw canvas with image and crop region
  const draw = useCallback(
    (currentZoom: number, currentPanX: number, currentPanY: number) => {
      const canvas = canvasRef.current;
      if (!canvas || !imageRef.current) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const centerX = scaledCanvasSize / 2;
      const centerY = scaledCanvasSize / 2;

      // Clear
      ctx.clearRect(0, 0, scaledCanvasSize, scaledCanvasSize);

      // Dark overlay
      ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
      ctx.fillRect(0, 0, scaledCanvasSize, scaledCanvasSize);

      // Draw image in circular region
      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX, centerY, scaledRadius, 0, Math.PI * 2);
      ctx.clip();

      const imgWidth = imageRef.current.width * currentZoom;
      const imgHeight = imageRef.current.height * currentZoom;
      const imgX = (scaledCanvasSize - imgWidth) / 2 + currentPanX * DPI;
      const imgY = (scaledCanvasSize - imgHeight) / 2 + currentPanY * DPI;

      ctx.drawImage(imageRef.current, imgX, imgY, imgWidth, imgHeight);
      ctx.restore();

      // Draw circle border
      ctx.strokeStyle = "rgba(138, 43, 226, 0.8)";
      ctx.lineWidth = 2 * DPI;
      ctx.beginPath();
      ctx.arc(centerX, centerY, scaledRadius, 0, Math.PI * 2);
      ctx.stroke();

      // Draw crop region
      const cropX = centerX - scaledRadius + scaledCropRegion.x;
      const cropY = centerY - scaledRadius + scaledCropRegion.y;
      const cropW = scaledCropRegion.width;
      const cropH = scaledCropRegion.height;

      // Crop area highlight
      ctx.strokeStyle = "rgba(255, 200, 100, 0.8)";
      ctx.lineWidth = 2 * DPI;
      ctx.strokeRect(cropX, cropY, cropW, cropH);

      // Crop area semi-transparent overlay
      ctx.fillStyle = "rgba(255, 200, 100, 0.05)";
      ctx.fillRect(cropX, cropY, cropW, cropH);

      // Draw resize handles
      const handleRadius = HANDLE_SIZE * DPI;
      const handles = [
        { x: cropX, y: cropY }, // nw
        { x: cropX + cropW, y: cropY }, // ne
        { x: cropX, y: cropY + cropH }, // sw
        { x: cropX + cropW, y: cropY + cropH }, // se
        { x: cropX + cropW / 2, y: cropY }, // n
        { x: cropX + cropW / 2, y: cropY + cropH }, // s
        { x: cropX, y: cropY + cropH / 2 }, // w
        { x: cropX + cropW, y: cropY + cropH / 2 }, // e
      ];

      handles.forEach((handle) => {
        ctx.fillStyle = "rgba(255, 200, 100, 0.9)";
        ctx.beginPath();
        ctx.arc(handle.x, handle.y, handleRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
        ctx.lineWidth = 1 * DPI;
        ctx.stroke();
      });
    },
    [scaledCanvasSize, scaledRadius, scaledCropRegion]
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

  // Load image
  useEffect(() => {
    if (!isOpen) return;

    const img = new Image();
    img.onload = () => {
      imageRef.current = img;
      setZoom(1);
      setPanX(0);
      setPanY(0);
      setCropRegion({
        x: CIRCLE_RADIUS - 60,
        y: CIRCLE_RADIUS - 60,
        width: 120,
        height: 120,
      });
      scheduleRedraw(1, 0, 0);
    };
    img.src = imagePreview;
  }, [isOpen, imagePreview, scheduleRedraw]);

  // Detect which handle is being hovered/touched
  const getHandleAtPosition = (
    x: number,
    y: number,
    region: CropRegion
  ): ResizeHandle => {
    const centerX = CANVAS_SIZE / 2;
    const centerY = CANVAS_SIZE / 2;
    const radius = scaledRadius / DPI;
    const threshold = HANDLE_SIZE;

    const cropX = centerX - radius + region.x;
    const cropY = centerY - radius + region.y;
    const cropW = region.width;
    const cropH = region.height;

    // Check corners first (larger touch area)
    if (Math.abs(x - cropX) < threshold && Math.abs(y - cropY) < threshold) return "nw";
    if (Math.abs(x - (cropX + cropW)) < threshold && Math.abs(y - cropY) < threshold) return "ne";
    if (Math.abs(x - cropX) < threshold && Math.abs(y - (cropY + cropH)) < threshold) return "sw";
    if (Math.abs(x - (cropX + cropW)) < threshold && Math.abs(y - (cropY + cropH)) < threshold) return "se";

    // Check edges
    if (
      Math.abs(y - cropY) < threshold &&
      x > cropX + threshold &&
      x < cropX + cropW - threshold
    )
      return "n";
    if (
      Math.abs(y - (cropY + cropH)) < threshold &&
      x > cropX + threshold &&
      x < cropX + cropW - threshold
    )
      return "s";
    if (
      Math.abs(x - cropX) < threshold &&
      y > cropY + threshold &&
      y < cropY + cropH - threshold
    )
      return "w";
    if (
      Math.abs(x - (cropX + cropW)) < threshold &&
      y > cropY + threshold &&
      y < cropY + cropH - threshold
    )
      return "e";

    // Check body
    if (
      x > cropX &&
      x < cropX + cropW &&
      y > cropY &&
      y < cropY + cropH
    )
      return "body";

    return null;
  };

  // Clamp crop region to circle boundaries
  const clampCropRegion = (region: CropRegion): CropRegion => {
    const minSize = 40;
    const maxSize = CIRCLE_RADIUS * 2 - 10;
    const minPos = 5;
    const maxPos = CIRCLE_RADIUS * 2 - minSize - 5;

    return {
      x: Math.max(minPos, Math.min(region.x, maxPos)),
      y: Math.max(minPos, Math.min(region.y, maxPos)),
      width: Math.max(minSize, Math.min(region.width, maxSize)),
      height: Math.max(minSize, Math.min(region.height, maxSize)),
    };
  };

  // Mouse handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / (rect.width / CANVAS_SIZE);
    const y = (e.clientY - rect.top) / (rect.height / CANVAS_SIZE);

    const centerX = CANVAS_SIZE / 2;
    const centerY = CANVAS_SIZE / 2;
    const radius = scaledRadius / DPI;

    const handle = getHandleAtPosition(x, y, cropRegion);

    if (handle === "body") {
      setIsDraggingCrop(true);
      setDragStartPos({ x: x - cropRegion.x, y: y - cropRegion.y });
    } else if (handle && handle !== "body") {
      setResizingHandle(handle);
      setDragStartPos({ x, y });
    } else {
      setIsDraggingImage(true);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / (rect.width / CANVAS_SIZE);
    const y = (e.clientY - rect.top) / (rect.height / CANVAS_SIZE);

    if (isDraggingImage) {
      const movementX = (e.movementX / rect.width) * CANVAS_SIZE / DPI;
      const movementY = (e.movementY / rect.height) * CANVAS_SIZE / DPI;
      setPanX((prev) => prev + movementX);
      setPanY((prev) => prev + movementY);
      scheduleRedraw(zoom, panX + movementX, panY + movementY);
    } else if (isDraggingCrop) {
      const newRegion = clampCropRegion({
        ...cropRegion,
        x: x - dragStartPos.x,
        y: y - dragStartPos.y,
      });
      setCropRegion(newRegion);
      scheduleRedraw(zoom, panX, panY);
    } else if (resizingHandle) {
      const deltaX = x - dragStartPos.x;
      const deltaY = y - dragStartPos.y;

      let newRegion = { ...cropRegion };

      if (resizingHandle.includes("n")) newRegion.y += deltaY;
      if (resizingHandle.includes("s")) newRegion.height += deltaY;
      if (resizingHandle.includes("w")) newRegion.x += deltaX;
      if (resizingHandle.includes("e")) newRegion.width += deltaX;

      const clamped = clampCropRegion(newRegion);
      setCropRegion(clamped);
      setDragStartPos({ x, y });
      scheduleRedraw(zoom, panX, panY);
    } else {
      const handle = getHandleAtPosition(x, y, cropRegion);
      const cursor = {
        nw: "nwse-resize",
        ne: "nesw-resize",
        sw: "nesw-resize",
        se: "nwse-resize",
        n: "ns-resize",
        s: "ns-resize",
        e: "ew-resize",
        w: "ew-resize",
        body: "move",
        null: "move",
      }[handle || "null"];
      canvas.style.cursor = cursor;
    }
  };

  const handleMouseUp = () => {
    setIsDraggingImage(false);
    setIsDraggingCrop(false);
    setResizingHandle(null);
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
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const touch = e.touches[0];
      const x = (touch.clientX - rect.left) / (rect.width / CANVAS_SIZE);
      const y = (touch.clientY - rect.top) / (rect.height / CANVAS_SIZE);

      const handle = getHandleAtPosition(x, y, cropRegion);

      if (handle === "body") {
        setIsDraggingCrop(true);
        setDragStartPos({ x: x - cropRegion.x, y: y - cropRegion.y });
      } else if (handle && handle !== "body") {
        setResizingHandle(handle);
        setDragStartPos({ x, y });
      } else {
        setIsDraggingImage(true);
        setDragStartPos({ x, y });
      }
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      setTouchDistance(distance);
      setTouchZoomStart(zoom);
      setIsDraggingImage(false);
      setIsDraggingCrop(false);
      setResizingHandle(null);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();

    if (e.touches.length === 1) {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const touch = e.touches[0];
      const x = (touch.clientX - rect.left) / (rect.width / CANVAS_SIZE);
      const y = (touch.clientY - rect.top) / (rect.height / CANVAS_SIZE);

      if (isDraggingImage) {
        const movementX = (x - dragStartPos.x) / 2;
        const movementY = (y - dragStartPos.y) / 2;
        setPanX((prev) => prev + movementX);
        setPanY((prev) => prev + movementY);
        scheduleRedraw(zoom, panX + movementX, panY + movementY);
        setDragStartPos({ x, y });
      } else if (isDraggingCrop) {
        const newRegion = clampCropRegion({
          ...cropRegion,
          x: x - dragStartPos.x,
          y: y - dragStartPos.y,
        });
        setCropRegion(newRegion);
        scheduleRedraw(zoom, panX, panY);
      } else if (resizingHandle) {
        const deltaX = x - dragStartPos.x;
        const deltaY = y - dragStartPos.y;

        let newRegion = { ...cropRegion };

        if (resizingHandle.includes("n")) newRegion.y += deltaY;
        if (resizingHandle.includes("s")) newRegion.height += deltaY;
        if (resizingHandle.includes("w")) newRegion.x += deltaX;
        if (resizingHandle.includes("e")) newRegion.width += deltaX;

        const clamped = clampCropRegion(newRegion);
        setCropRegion(clamped);
        setDragStartPos({ x, y });
        scheduleRedraw(zoom, panX, panY);
      }
    } else if (e.touches.length === 2 && touchDistance !== null) {
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
      setIsDraggingImage(false);
      setIsDraggingCrop(false);
      setResizingHandle(null);
      setTouchDistance(null);
      setTouchZoomStart(null);
    } else if (e.touches.length === 1) {
      setTouchDistance(null);
      setTouchZoomStart(null);
      setIsDraggingImage(true);
    }
  };

  // Controls
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
    setCropRegion({
      x: CIRCLE_RADIUS - 60,
      y: CIRCLE_RADIUS - 60,
      width: 120,
      height: 120,
    });
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

    const circleX = centerX - scaledRadius + cropRegion.x * DPI;
    const circleY = centerY - scaledRadius + cropRegion.y * DPI;

    const srcX = (circleX - imgX) / zoom;
    const srcY = (circleY - imgY) / zoom;
    const srcSize = (cropRegion.width * DPI) / zoom;

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
            Drag image to move • Drag handles to crop • Scroll/pinch to zoom
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
