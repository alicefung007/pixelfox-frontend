import React, { useRef, useEffect, useLayoutEffect, useState } from 'react';
import { useEditorStore } from '@/store/useEditorStore';
import { usePaletteStore } from '@/store/usePaletteStore';
import { Minus, Plus, Maximize, Pencil, PaintBucket, Eraser, Pipette, Brush } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/components/theme-provider';
import { clampZoom, getLinePoints } from '@/lib/utils';
import { EDITOR_CONFIG, CANVAS_CONFIG, CURSOR_CONFIG } from '@/lib/constants';


export default function PixelCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { pixels, width, height, backgroundColor, zoom, setPixel, clearPixel, setPixels, currentTool, primaryColor, setZoom, saveHistory, undo, redo } = useEditorStore();
  const [isAutoZoom, setIsAutoZoom] = useState(true);
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const [viewOffset, setViewOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panLastRef = useRef<{ x: number; y: number } | null>(null);
  const zoomRef = useRef(zoom);
  const isGestureRef = useRef(false);
  const gestureStartRef = useRef<{ distance: number; midpoint: { x: number; y: number }; zoom: number; offset: { x: number; y: number } } | null>(null);
  const viewOffsetRef = useRef(viewOffset);
  const [cursorOverlay, setCursorOverlay] = useState<{ x: number; y: number; visible: boolean }>({ x: 0, y: 0, visible: false });
  const cursorRafRef = useRef<number | null>(null);
  const cursorPendingRef = useRef<{ x: number; y: number; visible: boolean }>(cursorOverlay);
  const { theme } = useTheme();
  const [systemTheme, setSystemTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window === 'undefined' || !('matchMedia' in window)) return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  useEffect(() => {
    viewOffsetRef.current = viewOffset;
  }, [viewOffset]);

  useEffect(() => {
    cursorPendingRef.current = cursorOverlay;
  }, [cursorOverlay]);

  useEffect(() => {
    if (theme !== 'system') return;
    if (!('matchMedia' in window)) return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => setSystemTheme(mediaQuery.matches ? 'dark' : 'light');
    handleChange();
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateZoomToFit = () => {
      if (!isAutoZoom) return;
      if (container.offsetParent === null) return;
      if (container.clientWidth === 0 || container.clientHeight === 0) return;
      
      const availableWidth = container.clientWidth - EDITOR_CONFIG.AUTO_FIT_PADDING;
      const availableHeight = container.clientHeight - EDITOR_CONFIG.AUTO_FIT_PADDING;
      if (availableWidth <= 0 || availableHeight <= 0) return;
      
      const scaleX = availableWidth / width;
      const scaleY = availableHeight / height;
      const nextZoom = clampZoom(Math.floor(Math.min(scaleX, scaleY) * 10));
      setZoom(nextZoom);
    };

    const resizeObserver = new ResizeObserver(updateZoomToFit);
    resizeObserver.observe(container);
    
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

  useLayoutEffect(() => {
    if (!isAutoZoom) return;
    if (viewportSize.width === 0 || viewportSize.height === 0) return;

    const scale = zoom / 10;
    const contentWidth = width * scale;
    const contentHeight = height * scale;
    const x = (viewportSize.width - contentWidth) / 2;
    const y = (viewportSize.height - contentHeight) / 2;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setViewOffset({ x, y });
  }, [isAutoZoom, viewportSize.width, viewportSize.height, zoom, width, height]);


  const { addUsedColor, addRecentColor } = usePaletteStore();
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastCoords, setLastCoords] = useState<{ x: number, y: number } | null>(null);

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
    const resolvedTheme = theme === 'system' ? systemTheme : theme;
    ctx.fillStyle = resolvedTheme === 'dark' ? '#0B0B0C' : '#F8F9FA';
    ctx.fillRect(0, 0, viewW, viewH);

    const scale = zoom / 10;
    ctx.save();
    ctx.translate(viewOffset.x, viewOffset.y);
    ctx.scale(scale, scale);
    ctx.imageSmoothingEnabled = false;

    if (backgroundColor) {
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, width, height);
    } else {
      for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
          ctx.fillStyle = (x + y) % 2 === 0 ? CANVAS_CONFIG.CHECKER_LIGHT : CANVAS_CONFIG.CHECKER_DARK;
          ctx.fillRect(x, y, 1, 1);
        }
      }
    }

    Object.entries(pixels).forEach(([key, color]) => {
      const [x, y] = key.split(',').map(Number);
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    });

    const effectiveScale = dpr * scale;
    const gridLineWidth = CANVAS_CONFIG.GRID_LINE_WIDTH / effectiveScale;
    const bold5LineWidth = (CANVAS_CONFIG.BOLD_LINE_WIDTH * CANVAS_CONFIG.GRID_LINE_WIDTH) / effectiveScale;
    const bold10LineWidth = (CANVAS_CONFIG.MAJOR_LINE_WIDTH * CANVAS_CONFIG.GRID_LINE_WIDTH) / effectiveScale;
    const gridColor = CANVAS_CONFIG.GRID_COLOR;

    ctx.strokeStyle = gridColor;
    ctx.lineWidth = gridLineWidth;
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

    ctx.strokeStyle = gridColor;
    ctx.lineWidth = bold5LineWidth;
    ctx.beginPath();
    for (let x = CANVAS_CONFIG.GRID_INTERVAL_5; x <= width; x += CANVAS_CONFIG.GRID_INTERVAL_5) {
      if (x % CANVAS_CONFIG.GRID_INTERVAL_10 !== 0) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
    }
    for (let y = CANVAS_CONFIG.GRID_INTERVAL_5; y <= height; y += CANVAS_CONFIG.GRID_INTERVAL_5) {
      if (y % CANVAS_CONFIG.GRID_INTERVAL_10 !== 0) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
    }
    ctx.stroke();

    ctx.strokeStyle = gridColor;
    ctx.lineWidth = bold10LineWidth;
    ctx.beginPath();
    for (let x = CANVAS_CONFIG.GRID_INTERVAL_10; x <= width; x += CANVAS_CONFIG.GRID_INTERVAL_10) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
    }
    for (let y = CANVAS_CONFIG.GRID_INTERVAL_10; y <= height; y += CANVAS_CONFIG.GRID_INTERVAL_10) {
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
    ctx.stroke();

    ctx.lineWidth = 1 / effectiveScale;
    ctx.strokeStyle = CANVAS_CONFIG.BORDER_COLOR;
    ctx.strokeRect(0, 0, width, height);

    ctx.restore();
  }, [pixels, width, height, zoom, viewOffset.x, viewOffset.y, viewportSize.width, viewportSize.height, theme, systemTheme, backgroundColor]);

  const getCoordinates = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();

    const clientX = e.clientX;
    const clientY = e.clientY;

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

  const getCoordinatesFromTouch = (e: React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();

    const clientX = e.touches[0].clientX;
    const clientY = e.touches[0].clientY;

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

  const floodFill = (startX: number, startY: number, targetColor: string | null, replacementColor: string) => {
    if (targetColor === replacementColor) return;
    
    const newPixels = { ...pixels };
    const queue: [number, number][] = [[startX, startY]];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const [x, y] = queue.shift()!;
      const key = `${x},${y}`;
      
      if (x < 0 || x >= width || y < 0 || y >= height) continue;
      if (visited.has(key)) continue;
      
      const currentColor = pixels[key] ?? null;
      if (currentColor !== targetColor) continue;

      visited.add(key);
      newPixels[key] = replacementColor;

      queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
    
    setPixels(newPixels);
    addUsedColor(replacementColor);
    addRecentColor(replacementColor);
  };

  const handleDraw = (coords: { x: number; y: number } | null) => {
    if (!coords) return;

    if (currentTool === 'brush' || currentTool === 'eraser') {
      const isErase = currentTool === 'eraser';

      if (lastCoords) {
        const points = getLinePoints(lastCoords.x, lastCoords.y, coords.x, coords.y);
        points.forEach(p => (isErase ? clearPixel(p.x, p.y) : setPixel(p.x, p.y, primaryColor)));
      } else {
        if (isErase) clearPixel(coords.x, coords.y);
        else setPixel(coords.x, coords.y, primaryColor);
      }
      
      if (!isErase) {
        addUsedColor(primaryColor);
        addRecentColor(primaryColor);
      }
      setLastCoords(coords);
    } else if (currentTool === 'bucket') {
      const targetColor = pixels[`${coords.x},${coords.y}`] ?? null;
      floodFill(coords.x, coords.y, targetColor, primaryColor);
    } else if (currentTool === 'eyedropper') {
      const pickedColor = pixels[`${coords.x},${coords.y}`] || '#FFFFFF';
      useEditorStore.getState().setColor(pickedColor);
      useEditorStore.getState().setTool('brush');
    }
  };

  useEffect(() => {
    return () => {
      if (cursorRafRef.current !== null) cancelAnimationFrame(cursorRafRef.current);
    };
  }, []);

  const queueCursorOverlay = (next: { x: number; y: number; visible: boolean }) => {
    cursorPendingRef.current = next;
    if (cursorRafRef.current !== null) return;
    cursorRafRef.current = requestAnimationFrame(() => {
      cursorRafRef.current = null;
      setCursorOverlay(cursorPendingRef.current);
    });
  };

  const updateCursorFromMouseEvent = (e: React.MouseEvent) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    queueCursorOverlay({ x: e.clientX - rect.left, y: e.clientY - rect.top, visible: true });
  };

  const getTouchDistance = (touches: React.TouchList) => {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const getTouchMidpoint = (touches: React.TouchList) => {
    if (touches.length < 2) return { x: 0, y: 0 };
    return {
      x: (touches[0].clientX + touches[1].clientX) / 2,
      y: (touches[0].clientY + touches[1].clientY) / 2,
    };
  };

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length >= 2) {
      // Two-finger gesture: pinch zoom + pan
      e.preventDefault();
      isGestureRef.current = true;
      setIsAutoZoom(false);
      setIsDrawing(false);
      setLastCoords(null);
      const container = containerRef.current;
      if (container) {
        const rect = container.getBoundingClientRect();
        gestureStartRef.current = {
          distance: getTouchDistance(e.touches),
          midpoint: {
            x: getTouchMidpoint(e.touches).x - rect.left,
            y: getTouchMidpoint(e.touches).y - rect.top,
          },
          zoom: zoomRef.current,
          offset: viewOffsetRef.current,
        };
      }
      return;
    }

    if (e.touches.length === 1) {
      if (currentTool === 'hand') {
        e.preventDefault();
        setIsAutoZoom(false);
        setIsDrawing(false);
        setLastCoords(null);
        setIsPanning(true);
        panLastRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        queueCursorOverlay({ x: cursorPendingRef.current.x, y: cursorPendingRef.current.y, visible: false });
        return;
      }
      setIsDrawing(true);
      handleDraw(getCoordinatesFromTouch(e));
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (isGestureRef.current && e.touches.length >= 2) {
      e.preventDefault();
      const start = gestureStartRef.current;
      if (!start) return;

      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const currentDistance = getTouchDistance(e.touches);
      const currentMidpoint = getTouchMidpoint(e.touches);
      const screenMidpoint = {
        x: currentMidpoint.x - rect.left,
        y: currentMidpoint.y - rect.top,
      };

      // Calculate zoom
      if (currentDistance > 0 && start.distance > 0) {
        const scale = currentDistance / start.distance;
        const newZoom = clampZoom(Math.round(start.zoom * scale));
        const nextScale = newZoom / 10;

        // Calculate pan delta
        const dx = screenMidpoint.x - start.midpoint.x;
        const dy = screenMidpoint.y - start.midpoint.y;

        // Convert start midpoint to world coordinates
        const startScale = start.zoom / 10;
        const worldX = (start.midpoint.x - start.offset.x) / startScale;
        const worldY = (start.midpoint.y - start.offset.y) / startScale;

        setZoom(newZoom);
        setViewOffset({
          x: screenMidpoint.x - worldX * nextScale + dx,
          y: screenMidpoint.y - worldY * nextScale + dy,
        });
      }
      return;
    }

    if (e.touches.length === 1 && isPanning) {
      e.preventDefault();
      const last = panLastRef.current;
      if (!last) return;
      const dx = e.touches[0].clientX - last.x;
      const dy = e.touches[0].clientY - last.y;
      panLastRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      setViewOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      return;
    }

    if (isDrawing) {
      handleDraw(getCoordinatesFromTouch(e));
    }
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length < 2 && isGestureRef.current) {
      isGestureRef.current = false;
      gestureStartRef.current = null;
    }
    if (e.touches.length === 0) {
      if (isGestureRef.current) {
        isGestureRef.current = false;
        gestureStartRef.current = null;
      }
      if (isPanning) {
        setIsPanning(false);
        panLastRef.current = null;
      }
      if (isDrawing) {
        saveHistory();
      }
      setIsDrawing(false);
      setLastCoords(null);
    }
  };

  const onMouseDown = (e: React.MouseEvent) => {
    if ((currentTool === 'hand' && e.button === 0) || e.button === 1 || e.button === 2) {
      e.preventDefault();
      setIsAutoZoom(false);
      setIsDrawing(false);
      setLastCoords(null);
      setIsPanning(true);
      panLastRef.current = { x: e.clientX, y: e.clientY };
      queueCursorOverlay({ x: cursorPendingRef.current.x, y: cursorPendingRef.current.y, visible: false });
      return;
    }
    setIsDrawing(true);
    handleDraw(getCoordinates(e));
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      e.preventDefault();
      const last = panLastRef.current;
      if (!last) return;
      const dx = e.clientX - last.x;
      const dy = e.clientY - last.y;
      panLastRef.current = { x: e.clientX, y: e.clientY };
      setViewOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      return;
    }
    updateCursorFromMouseEvent(e);
    if (isDrawing) {
      handleDraw(getCoordinates(e));
    }
  };

  const onMouseUp = () => {
    if (isPanning) {
      setIsPanning(false);
      panLastRef.current = null;
      return;
    }
    if (isDrawing) {
      saveHistory();
    }
    setIsDrawing(false);
    setLastCoords(null);
  };

  useEffect(() => {
    if (!isPanning) return;

    const handleWindowMouseMove = (e: MouseEvent) => {
      const last = panLastRef.current;
      if (!last) return;
      const dx = e.clientX - last.x;
      const dy = e.clientY - last.y;
      panLastRef.current = { x: e.clientX, y: e.clientY };
      setViewOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
    };

    const endPan = () => {
      setIsPanning(false);
      panLastRef.current = null;
    };

    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', endPan);
    window.addEventListener('blur', endPan);
    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', endPan);
      window.removeEventListener('blur', endPan);
    };
  }, [isPanning]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      setIsAutoZoom(false);

      if (e.ctrlKey || e.metaKey) {
        const rect = container.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const zoomNow = zoomRef.current;
        const offsetNow = viewOffsetRef.current;
        const scale = zoomNow / 10;
        const worldX = (mouseX - offsetNow.x) / scale;
        const worldY = (mouseY - offsetNow.y) / scale;

        const factor = Math.exp(-e.deltaY / 80);
        const nextZoom = clampZoom(Math.round(zoomNow * factor));
        if (nextZoom === zoomNow) return;

        const nextScale = nextZoom / 10;
        setZoom(nextZoom);
        setViewOffset({
          x: mouseX - worldX * nextScale,
          y: mouseY - worldY * nextScale,
        });
        return;
      }

      let dx = e.deltaX;
      let dy = e.deltaY;
      if (e.deltaMode === 1) {
        dx *= 16;
        dy *= 16;
      } else if (e.deltaMode === 2) {
        dx *= container.clientWidth;
        dy *= container.clientHeight;
      }

      const panSpeed = EDITOR_CONFIG.PAN_SPEED;
      setViewOffset(prev => ({ x: prev.x - dx * panSpeed, y: prev.y - dy * panSpeed }));
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [setZoom]);

  const zoomByStep = (direction: 'in' | 'out') => {
    const container = containerRef.current;
    if (!container) return;
    setIsAutoZoom(false);
    const anchorX = container.clientWidth / 2;
    const anchorY = container.clientHeight / 2;
    const scale = zoom / 10;
    const worldX = (anchorX - viewOffset.x) / scale;
    const worldY = (anchorY - viewOffset.y) / scale;
    const step = EDITOR_CONFIG.ZOOM_STEP;
    const nextZoom = clampZoom(direction === 'in' ? zoom + step : zoom - step);
    const nextScale = nextZoom / 10;
    setZoom(nextZoom);
    setViewOffset({
      x: anchorX - worldX * nextScale,
      y: anchorY - worldY * nextScale,
    });
  };

  const isOverlayTool = currentTool === 'brush' || currentTool === 'bucket' || currentTool === 'eraser' || currentTool === 'eyedropper';
  const CursorIcon =
    currentTool === 'brush'
      ? Pencil
      : currentTool === 'bucket'
        ? PaintBucket
        : currentTool === 'eraser'
          ? Eraser
          : currentTool === 'eyedropper'
            ? Pipette
            : null;

  const cursorClass = isPanning ? 'cursor-grabbing' : currentTool === 'hand' ? 'cursor-grab' : currentTool === 'text' ? 'cursor-text' : isOverlayTool ? 'cursor-none' : 'cursor-crosshair';
  const scale = zoom / 10;
  const cursorHotspot =
    currentTool === 'brush'
      ? CURSOR_CONFIG.BRUSH_HOTSPOT
      : currentTool === 'eyedropper'
        ? CURSOR_CONFIG.EYEDROPPER_HOTSPOT
        : { x: CURSOR_CONFIG.ICON_SIZE / 2, y: CURSOR_CONFIG.ICON_SIZE / 2 };
  const cursorIconSize = currentTool === 'eraser' || currentTool === 'bucket' ? scale : CURSOR_CONFIG.ICON_SIZE;
  const cursorHotspotScaled =
    currentTool === 'eraser' || currentTool === 'bucket'
      ? { x: cursorIconSize / 2, y: cursorIconSize / 2 }
      : cursorHotspot;

  const onCanvasLeave = () => {
    if (!isPanning) onMouseUp();
    queueCursorOverlay({ x: cursorPendingRef.current.x, y: cursorPendingRef.current.y, visible: false });
  };

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div ref={containerRef} className="absolute inset-0 overflow-hidden bg-background">
        <canvas
          ref={canvasRef}
          className={`absolute inset-0 h-full w-full touch-none ${cursorClass}`}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onCanvasLeave}
          onContextMenu={(e) => {
            if (isPanning || currentTool === 'hand') e.preventDefault();
          }}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        />
        {CursorIcon && cursorOverlay.visible && !isPanning && (
          <div
            className="pointer-events-none absolute z-10 text-foreground"
            style={{
              left: cursorOverlay.x - cursorHotspotScaled.x,
              top: cursorOverlay.y - cursorHotspotScaled.y,
              color: currentTool === 'brush' ? primaryColor : undefined,
            }}
          >
            {currentTool === 'brush' ? (
              (() => {
                const hex = primaryColor.replace('#', '');
                const r = parseInt(hex.substring(0, 2), 16);
                const g = parseInt(hex.substring(2, 4), 16);
                const b = parseInt(hex.substring(4, 6), 16);
                const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
                const shadowColor = luminance > 0.5 ? '#bbbbbb' : '#ffffff';
                return (
                  <Brush
                    size={CURSOR_CONFIG.ICON_SIZE}
                    strokeWidth={2}
                    style={{ color: primaryColor, filter: `drop-shadow(0 0 1px ${shadowColor}) drop-shadow(0 0 1px ${shadowColor})` }}
                  />
                );
              })()
            ) : (
              <CursorIcon
                size={cursorIconSize}
                style={
                  currentTool === 'eraser' || currentTool === 'bucket' || currentTool === 'eyedropper'
                    ? { filter: 'drop-shadow(0 0 1px white) drop-shadow(0 0 1px white)' }
                    : undefined
                }
              />
            )}
          </div>
        )}
      </div>

      <div className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6 flex items-center gap-1 sm:gap-2 rounded-lg border border-border bg-popover text-popover-foreground shadow-sm p-1 z-20">
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
        <div className="text-xs font-medium w-10 sm:w-12 text-center text-muted-foreground">
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
        <div className="w-px h-4 bg-border mx-0.5 sm:mx-1" />
        <Button 
          variant="ghost" 
          size="icon" 
          className={`h-8 w-8 ${isAutoZoom ? 'text-primary' : 'text-muted-foreground'}`}
          onClick={() => setIsAutoZoom(true)}
          title="Fit to Screen"
        >
          <Maximize size={16} />
        </Button>
      </div>
    </div>
  );
}
