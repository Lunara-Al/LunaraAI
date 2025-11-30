import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

interface ProfilePictureCropperProps {
  imagePreview: string;
  isOpen: boolean;
  onCropComplete: (croppedBase64: string) => void;
  onCancel: () => void;
}

export function ProfilePictureCropper({
  imagePreview,
  isOpen,
  onCropComplete,
  onCancel,
}: ProfilePictureCropperProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const imageRef = useRef<HTMLImageElement | null>(null);

  const CROP_SIZE = 256;
  const CANVAS_SIZE = 300;

  useEffect(() => {
    if (!isOpen) return;

    const img = new Image();
    img.onload = () => {
      imageRef.current = img;
      // Reset zoom and pan
      setZoom(1);
      setPan({ x: 0, y: 0 });
      redraw(img, 1, { x: 0, y: 0 });
    };
    img.src = imagePreview;
  }, [isOpen, imagePreview]);

  const redraw = (img: HTMLImageElement, zoomLevel: number, panOffset: { x: number; y: number }) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Draw the image
    const scaledWidth = img.width * zoomLevel;
    const scaledHeight = img.height * zoomLevel;
    const x = (CANVAS_SIZE - scaledWidth) / 2 + panOffset.x;
    const y = (CANVAS_SIZE - scaledHeight) / 2 + panOffset.y;

    ctx.drawImage(img, x, y, scaledWidth, scaledHeight);

    // Draw crop frame (center square)
    const frameX = (CANVAS_SIZE - CROP_SIZE) / 2;
    const frameY = (CANVAS_SIZE - CROP_SIZE) / 2;

    // Darken outside frame
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(0, 0, frameX, CANVAS_SIZE);
    ctx.fillRect(frameX + CROP_SIZE, 0, frameX, CANVAS_SIZE);
    ctx.fillRect(frameX, 0, CROP_SIZE, frameY);
    ctx.fillRect(frameX, frameY + CROP_SIZE, CROP_SIZE, frameY);

    // Draw frame border
    ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
    ctx.lineWidth = 2;
    ctx.strokeRect(frameX, frameY, CROP_SIZE, CROP_SIZE);

    // Draw grid
    ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
    ctx.lineWidth = 1;
    for (let i = 1; i < 3; i++) {
      const gridX = frameX + (CROP_SIZE / 3) * i;
      const gridY = frameY + (CROP_SIZE / 3) * i;
      ctx.beginPath();
      ctx.moveTo(gridX, frameY);
      ctx.lineTo(gridX, frameY + CROP_SIZE);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(frameX, gridY);
      ctx.lineTo(frameX + CROP_SIZE, gridY);
      ctx.stroke();
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !imageRef.current) return;

    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;

    const newPan = {
      x: pan.x + deltaX,
      y: pan.y + deltaY,
    };

    setPan(newPan);
    setDragStart({ x: e.clientX, y: e.clientY });
    redraw(imageRef.current, zoom, newPan);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!imageRef.current) return;

    const newZoom = Math.max(0.5, Math.min(3, zoom + (e.deltaY > 0 ? -0.1 : 0.1)));
    setZoom(newZoom);
    redraw(imageRef.current, newZoom, pan);
  };

  const handleZoomIn = () => {
    if (!imageRef.current) return;
    const newZoom = Math.min(3, zoom + 0.2);
    setZoom(newZoom);
    redraw(imageRef.current, newZoom, pan);
  };

  const handleZoomOut = () => {
    if (!imageRef.current) return;
    const newZoom = Math.max(0.5, zoom - 0.2);
    setZoom(newZoom);
    redraw(imageRef.current, newZoom, pan);
  };

  const handleReset = () => {
    if (!imageRef.current) return;
    setZoom(1);
    setPan({ x: 0, y: 0 });
    redraw(imageRef.current, 1, { x: 0, y: 0 });
  };

  const handleCrop = () => {
    if (!imageRef.current) return;

    // Create a new canvas for the cropped image
    const cropCanvas = document.createElement("canvas");
    cropCanvas.width = CROP_SIZE;
    cropCanvas.height = CROP_SIZE;
    const cropCtx = cropCanvas.getContext("2d");
    if (!cropCtx) return;

    // Calculate source rect from display canvas
    const frameX = (CANVAS_SIZE - CROP_SIZE) / 2;
    const frameY = (CANVAS_SIZE - CROP_SIZE) / 2;

    const scaledWidth = imageRef.current.width * zoom;
    const scaledHeight = imageRef.current.height * zoom;
    const imgX = (CANVAS_SIZE - scaledWidth) / 2 + pan.x;
    const imgY = (CANVAS_SIZE - scaledHeight) / 2 + pan.y;

    // Draw the cropped portion
    cropCtx.drawImage(
      imageRef.current,
      (frameX - imgX) / zoom,
      (frameY - imgY) / zoom,
      CROP_SIZE / zoom,
      CROP_SIZE / zoom,
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
    }, "image/jpeg", 0.85);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Crop Your Profile Picture</DialogTitle>
          <DialogDescription>Drag to move, scroll to zoom. Adjust until it fits the frame.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Canvas */}
          <div className="flex justify-center">
            <canvas
              ref={canvasRef}
              width={CANVAS_SIZE}
              height={CANVAS_SIZE}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onWheel={handleWheel}
              className="border-2 border-primary/20 rounded-lg cursor-move bg-black/20"
              style={{ maxWidth: "100%", height: "auto" }}
            />
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center justify-center gap-2">
            <Button
              type="button"
              size="icon"
              variant="outline"
              onClick={handleZoomOut}
              title="Zoom out"
              data-testid="button-zoom-out"
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-sm font-medium min-w-[60px] text-center">{Math.round(zoom * 100)}%</span>
            <Button
              type="button"
              size="icon"
              variant="outline"
              onClick={handleZoomIn}
              title="Zoom in"
              data-testid="button-zoom-in"
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
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onCancel} className="flex-1" data-testid="button-cancel-crop">
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleCrop}
              className="flex-1 bg-gradient-to-r from-primary to-secondary"
              data-testid="button-confirm-crop"
            >
              Crop & Use
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
