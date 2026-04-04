import React, { useRef, useEffect, useState } from 'react';
import { useEditorStore } from '@/store/useEditorStore';
import { usePaletteStore } from '@/store/usePaletteStore';
import { Minus, Plus, Maximize } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PixelCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { pixels, width, height, zoom, setPixel, setPixels, currentTool, primaryColor, setZoom, saveHistory, undo, redo } = useEditorStore();
  const [isAutoZoom, setIsAutoZoom] = useState(true);
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const [viewOffset, setViewOffset] = useState({ x: 0, y: 0 });

  const clampZoom = (value: number) => Math.max(10, Math.min(1000, value));

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateZoomToFit = () => {
      if (!isAutoZoom) return;
      
      const padding = 96;
      const availableWidth = container.clientWidth - padding;
      const availableHeight = container.clientHeight - padding;
      
      const scaleX = availableWidth / width;
      const scaleY = availableHeight / height;
      const nextZoom = clampZoom(Math.floor(Math.min(scaleX, scaleY) * 10));
      setZoom(nextZoom);
    };

    const resizeObserver = new ResizeObserver(updateZoomToFit);
    resizeObserver.observe(container);
    
    // Initial fit
    updateZoomToFit();

    return () => resizeObserver.disconnect();
  }, [width, height, setZoom, isAutoZoom]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateViewport = () => {
      setViewportSize({ width: container.clientWidth, height: container.clientHeight });
    };

    const resizeObserver = new ResizeObserver(updateViewport);
    resizeObserver.observe(container);
    updateViewport();
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    if (!isAutoZoom) return;
    if (viewportSize.width === 0 || viewportSize.height === 0) return;

    const scale = zoom / 10;
    const contentWidth = width * scale;
    const contentHeight = height * scale;
    const x = (viewportSize.width - contentWidth) / 2;
    const y = (viewportSize.height - contentHeight) / 2;
    setViewOffset({ x, y });
  }, [isAutoZoom, viewportSize.width, viewportSize.height, zoom, width, height]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isZ = e.key.toLowerCase() === 'z';
      const isY = e.key.toLowerCase() === 'y';
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      const isShift = e.shiftKey;

      if (isCtrlOrCmd && isZ) {
        e.preventDefault();
        if (isShift) {
          redo();
        } else {
          undo();
        }
      } else if (isCtrlOrCmd && isY) {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  const { addUsedColor, addRecentColor } = usePaletteStore();
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastCoords, setLastCoords] = useState<{ x: number, y: number } | null>(null);

  // Constants
  const GRID_LINE_WIDTH = 0.5;
  const GRID_COLOR = 'rgba(0, 0, 0, 0.05)';

  const getLinePoints = (x0: number, y0: number, x1: number, y1: number) => {
    const points: { x: number, y: number }[] = [];
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = (x0 < x1) ? 1 : -1;
    const sy = (y0 < y1) ? 1 : -1;
    let err = dx - dy;

    while (true) {
      points.push({ x: x0, y: y0 });
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x0 += sx;
      }
      if (e2 < dx) {
        err += dx;
        y0 += sy;
      }
    }
    return points;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const container = containerRef.current;
    if (!container) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const viewW = container.clientWidth;
    const viewH = container.clientHeight;

    canvas.width = Math.max(1, Math.floor(viewW * dpr));
    canvas.height = Math.max(1, Math.floor(viewH * dpr));

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, viewW, viewH);
    ctx.fillStyle = '#F8F9FA';
    ctx.fillRect(0, 0, viewW, viewH);

    const scale = zoom / 10;
    ctx.save();
    ctx.translate(viewOffset.x, viewOffset.y);
    ctx.scale(scale, scale);
    ctx.imageSmoothingEnabled = false;

    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        ctx.fillStyle = (x + y) % 2 === 0 ? '#FFFFFF' : '#F0F0F0';
        ctx.fillRect(x, y, 1, 1);
      }
    }

    Object.entries(pixels).forEach(([key, color]) => {
      const [x, y] = key.split(',').map(Number);
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    });

    ctx.strokeStyle = GRID_COLOR;
    ctx.lineWidth = GRID_LINE_WIDTH / scale;
    ctx.beginPath();
    for (let x = 0; x <= width; x++) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
    }
    for (let y = 0; y <= height; y++) {
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
    ctx.stroke();

    ctx.lineWidth = 1 / scale;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.strokeRect(0, 0, width, height);

    ctx.restore();
  }, [pixels, width, height, zoom, viewOffset.x, viewOffset.y]);

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const viewX = clientX - rect.left;
    const viewY = clientY - rect.top;
    const scale = zoom / 10;
    const x = Math.floor((viewX - viewOffset.x) / scale);
    const y = Math.floor((viewY - viewOffset.y) / scale);

    if (x >= 0 && x < width && y >= 0 && y < height) {
      return { x, y };
    }
    return null;
  };

  const floodFill = (startX: number, startY: number, targetColor: string, replacementColor: string) => {
    if (targetColor === replacementColor) return;
    
    const newPixels = { ...pixels };
    const queue: [number, number][] = [[startX, startY]];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const [x, y] = queue.shift()!;
      const key = `${x},${y}`;
      
      if (x < 0 || x >= width || y < 0 || y >= height) continue;
      if (visited.has(key)) continue;
      
      const currentColor = pixels[key] || '#FFFFFF'; // Default to white for empty
      if (currentColor !== targetColor) continue;

      visited.add(key);
      newPixels[key] = replacementColor;

      queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
    
    setPixels(newPixels);
    addUsedColor(replacementColor);
    addRecentColor(replacementColor);
  };

  const handleDraw = (e: React.MouseEvent | React.TouchEvent) => {
    const coords = getCoordinates(e);
    if (!coords) return;

    if (currentTool === 'brush' || currentTool === 'eraser') {
      const color = currentTool === 'brush' ? primaryColor : '#FFFFFF';
      
      if (lastCoords) {
        const points = getLinePoints(lastCoords.x, lastCoords.y, coords.x, coords.y);
        points.forEach(p => setPixel(p.x, p.y, color));
      } else {
        setPixel(coords.x, coords.y, color);
      }
      
      if (currentTool === 'brush') {
        addUsedColor(primaryColor);
        addRecentColor(primaryColor);
      }
      setLastCoords(coords);
    } else if (currentTool === 'bucket') {
      const targetColor = pixels[`${coords.x},${coords.y}`] || '#FFFFFF';
      floodFill(coords.x, coords.y, targetColor, primaryColor);
    } else if (currentTool === 'eyedropper') {
      const pickedColor = pixels[`${coords.x},${coords.y}`] || '#FFFFFF';
      useEditorStore.getState().setColor(pickedColor);
      useEditorStore.getState().setTool('brush');
    }
  };

  const onMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    handleDraw(e);
  };

  const onMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (isDrawing) {
      handleDraw(e);
    }
  };

  const onMouseUp = () => {
    if (isDrawing) {
      saveHistory();
    }
    setIsDrawing(false);
    setLastCoords(null);
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        setIsAutoZoom(false);

        const rect = container.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const scale = zoom / 10;
        const worldX = (mouseX - viewOffset.x) / scale;
        const worldY = (mouseY - viewOffset.y) / scale;

        const factor = Math.exp(-e.deltaY / 200);
        const nextZoom = clampZoom(Math.round(zoom * factor));
        if (nextZoom === zoom) return;

        const nextScale = nextZoom / 10;
        setZoom(nextZoom);
        setViewOffset({
          x: mouseX - worldX * nextScale,
          y: mouseY - worldY * nextScale,
        });
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [zoom, setZoom, viewOffset.x, viewOffset.y]);

  const zoomByStep = (direction: 'in' | 'out') => {
    const container = containerRef.current;
    if (!container) return;
    setIsAutoZoom(false);
    const anchorX = container.clientWidth / 2;
    const anchorY = container.clientHeight / 2;
    const scale = zoom / 10;
    const worldX = (anchorX - viewOffset.x) / scale;
    const worldY = (anchorY - viewOffset.y) / scale;
    const step = 10;
    const nextZoom = clampZoom(direction === 'in' ? zoom + step : zoom - step);
    const nextScale = nextZoom / 10;
    setZoom(nextZoom);
    setViewOffset({
      x: anchorX - worldX * nextScale,
      y: anchorY - worldY * nextScale,
    });
  };

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div ref={containerRef} className="absolute inset-0 overflow-hidden bg-[#F8F9FA]">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full cursor-crosshair touch-none"
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
          onTouchStart={onMouseDown}
          onTouchMove={onMouseMove}
          onTouchEnd={onMouseUp}
        />
      </div>

      {/* Zoom Controls - Now absolute to the fixed outer container */}
      <div className="absolute bottom-6 right-6 flex items-center gap-2 bg-white rounded-lg shadow-sm border p-1 z-20">
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 text-muted-foreground"
          onClick={() => {
            zoomByStep('out');
          }}
        >
          <Minus size={16} />
        </Button>
        <div className="text-xs font-medium w-12 text-center text-muted-foreground">
          {zoom}%
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 text-muted-foreground"
          onClick={() => {
            zoomByStep('in');
          }}
        >
          <Plus size={16} />
        </Button>
        <div className="w-px h-4 bg-border mx-1" />
        <Button 
          variant="ghost" 
          size="icon" 
          className={`h-8 w-8 ${isAutoZoom ? 'text-pink-500' : 'text-muted-foreground'}`}
          onClick={() => setIsAutoZoom(true)}
          title="Fit to Screen"
        >
          <Maximize size={16} />
        </Button>
      </div>
    </div>
  );
}
