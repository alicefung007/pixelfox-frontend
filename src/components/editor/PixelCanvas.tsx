import React, { useRef, useEffect, useState } from 'react';
import { useEditorStore } from '@/store/useEditorStore';
import { usePaletteStore } from '@/store/usePaletteStore';
import { Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PixelCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { pixels, width, height, zoom, setPixel, setPixels, currentTool, primaryColor, setZoom, saveHistory, undo, redo } = useEditorStore();

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
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear and draw background
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw checkerboard background
    const checkerSize = 1; // 1 pixel in logical space
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        ctx.fillStyle = (x + y) % 2 === 0 ? '#FFFFFF' : '#F0F0F0';
        ctx.fillRect(x, y, 1, 1);
      }
    }

    // Draw pixels
    Object.entries(pixels).forEach(([key, color]) => {
      const [x, y] = key.split(',').map(Number);
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    });

    // Draw grid lines
    ctx.strokeStyle = GRID_COLOR;
    ctx.lineWidth = GRID_LINE_WIDTH / zoom;
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

  }, [pixels, width, height, zoom]);

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

    const x = Math.floor((clientX - rect.left) / (rect.width / width));
    const y = Math.floor((clientY - rect.top) / (rect.height / height));

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

  return (
    <div ref={containerRef} className="flex-1 relative flex items-center justify-center overflow-auto p-12 bg-[#F8F9FA]">
      <div 
        className="relative shadow-2xl bg-white border"
        style={{
          width: width * (zoom / 10),
          height: height * (zoom / 10),
          imageRendering: 'pixelated'
        }}
      >
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="w-full h-full cursor-crosshair"
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
          onTouchStart={onMouseDown}
          onTouchMove={onMouseMove}
          onTouchEnd={onMouseUp}
          style={{ imageRendering: 'pixelated' }}
        />
      </div>

      {/* Zoom Controls */}
      <div className="absolute bottom-6 right-6 flex items-center gap-2 bg-white rounded-lg shadow-sm border p-1">
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 text-muted-foreground"
          onClick={() => setZoom(zoom - 10)}
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
          onClick={() => setZoom(zoom + 10)}
        >
          <Plus size={16} />
        </Button>
      </div>
    </div>
  );
}
