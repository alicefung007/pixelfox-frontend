import React, { useRef, useEffect, useLayoutEffect, useState } from 'react';
import { useEditorStore } from '@/store/useEditorStore';
import { usePaletteStore } from '@/store/usePaletteStore';
import { Minus, Plus, Maximize, Pencil, PaintBucket, Eraser, Pipette, Brush, WandSparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover';
import { useTheme } from '@/components/theme-provider';
import UsedColorActionButtons from '@/components/palette/UsedColorActionButtons';
import { clampZoom, getLinePoints, isLikelyMouseWheel, normalizeHex } from '@/lib/utils';
import { EDITOR_CONFIG, CANVAS_CONFIG, CURSOR_CONFIG, SELECTION_CONFIG } from '@/lib/constants';

type ResizeEdge = 'left' | 'right' | 'top' | 'bottom';

type PixelCanvasProps = {
  onOpenReplaceColorDialog: (sourceColor: string, pixelKeys?: string[]) => void;
};

type WandSelection = {
  x: number;
  y: number;
  color: string;
  keys: string[];
};

const COLOR_NEIGHBOR_OFFSETS =
  SELECTION_CONFIG.COLOR_CONNECTIVITY === 8
    ? [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
        [1, 1],
        [1, -1],
        [-1, 1],
        [-1, -1],
      ]
    : [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ];

export default function PixelCanvas({ onOpenReplaceColorDialog }: PixelCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pixels = useEditorStore((state) => state.pixels);
  const width = useEditorStore((state) => state.width);
  const height = useEditorStore((state) => state.height);
  const backgroundColor = useEditorStore((state) => state.backgroundColor);
  const zoom = useEditorStore((state) => state.zoom);
  const setPixel = useEditorStore((state) => state.setPixel);
  const clearPixel = useEditorStore((state) => state.clearPixel);
  const setPixels = useEditorStore((state) => state.setPixels);
  const resizeFromEdge = useEditorStore((state) => state.resizeFromEdge);
  const currentTool = useEditorStore((state) => state.currentTool);
  const primaryColor = useEditorStore((state) => state.primaryColor);
  const setZoom = useEditorStore((state) => state.setZoom);
  const saveHistory = useEditorStore((state) => state.saveHistory);
  const addUsedColor = usePaletteStore((state) => state.addUsedColor);
  const addRecentColor = usePaletteStore((state) => state.addRecentColor);
  const selectedUsedColor = usePaletteStore((state) => state.selectedUsedColor);
  const [isAutoZoom, setIsAutoZoom] = useState(true);
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const [viewOffset, setViewOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [resizeDrag, setResizeDrag] = useState<{
    edge: ResizeEdge;
    startClientX: number;
    startClientY: number;
    startWidth: number;
    startHeight: number;
    startOffset: { x: number; y: number };
    previewSize: number;
  } | null>(null);
  const panLastRef = useRef<{ x: number; y: number } | null>(null);
  const zoomRef = useRef(zoom);
  const isGestureRef = useRef(false);
  const gestureStartRef = useRef<{ distance: number; midpoint: { x: number; y: number }; zoom: number; offset: { x: number; y: number } } | null>(null);
  const viewOffsetRef = useRef(viewOffset);
  const [cursorOverlay, setCursorOverlay] = useState<{ x: number; y: number; visible: boolean }>({ x: 0, y: 0, visible: false });
  const cursorRafRef = useRef<number | null>(null);
  const cursorPendingRef = useRef<{ x: number; y: number; visible: boolean }>(cursorOverlay);
  const strokeColorRegisteredRef = useRef(false);
  const [primaryThemeColor, setPrimaryThemeColor] = useState('oklch(0.68 0.19 48)');
  const [wandSelection, setWandSelection] = useState<WandSelection | null>(null);
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
    if (!wandSelection) return;

    const stillValid = wandSelection.keys.some((key) => {
      const color = pixels[key];
      return color && normalizeHex(color) === normalizeHex(wandSelection.color);
    });

    if (!stillValid) {
      queueMicrotask(() => setWandSelection(null));
    }
  }, [pixels, wandSelection]);

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
    if (typeof window === 'undefined') return;
    const nextPrimary = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim();
    if (nextPrimary) queueMicrotask(() => setPrimaryThemeColor(nextPrimary));
  }, [theme, systemTheme]);

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

    if (selectedUsedColor) {
      const normalizedSelectedColor = normalizeHex(selectedUsedColor);
      const outlineWidth = Math.max(1 / effectiveScale, 0.16);
      const glowInset = outlineWidth / 2;
      const glowSize = Math.max(1 - outlineWidth, 0);

      ctx.save();
      ctx.strokeStyle = primaryThemeColor;
      ctx.lineWidth = outlineWidth;
      Object.entries(pixels).forEach(([key, color]) => {
        if (normalizeHex(color) !== normalizedSelectedColor) return;
        const [x, y] = key.split(',').map(Number);
        ctx.strokeRect(x + glowInset, y + glowInset, glowSize, glowSize);
      });
      ctx.restore();

      ctx.save();
      ctx.fillStyle = primaryThemeColor;
      ctx.globalAlpha = 0.14;
      Object.entries(pixels).forEach(([key, color]) => {
        if (normalizeHex(color) !== normalizedSelectedColor) return;
        const [x, y] = key.split(',').map(Number);
        ctx.fillRect(x + 0.12, y + 0.12, 0.76, 0.76);
      });
      ctx.restore();
    }

    if (wandSelection) {
      const selectedKeys = new Set(wandSelection.keys);
      const outlineWidth = Math.max(1 / effectiveScale, 0.16);
      const glowInset = outlineWidth / 2;
      const glowSize = Math.max(1 - outlineWidth, 0);

      ctx.save();
      ctx.strokeStyle = primaryThemeColor;
      ctx.lineWidth = outlineWidth;
      for (const key of selectedKeys) {
        const color = pixels[key];
        if (!color || normalizeHex(color) !== normalizeHex(wandSelection.color)) continue;
        const [x, y] = key.split(',').map(Number);
        ctx.strokeRect(x + glowInset, y + glowInset, glowSize, glowSize);
      }
      ctx.restore();

      ctx.save();
      ctx.fillStyle = primaryThemeColor;
      ctx.globalAlpha = 0.14;
      for (const key of selectedKeys) {
        const color = pixels[key];
        if (!color || normalizeHex(color) !== normalizeHex(wandSelection.color)) continue;
        const [x, y] = key.split(',').map(Number);
        ctx.fillRect(x + 0.12, y + 0.12, 0.76, 0.76);
      }
      ctx.restore();
    }

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
  }, [pixels, width, height, zoom, viewOffset.x, viewOffset.y, viewportSize.width, viewportSize.height, theme, systemTheme, backgroundColor, selectedUsedColor, wandSelection, primaryThemeColor]);

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

  const getCanvasAnchorFromCoords = (coords: { x: number; y: number }) => {
    const scale = zoom / 10;
    return {
      x: viewOffset.x + (coords.x + 0.5) * scale,
      y: viewOffset.y + (coords.y + 0.5) * scale,
    };
  };

  const getContiguousColorKeys = (startX: number, startY: number, targetColor: string) => {
    const normalizedTargetColor = normalizeHex(targetColor);
    const queue: [number, number][] = [[startX, startY]];
    const visited = new Set<string>();
    const selectedKeys: string[] = [];

    while (queue.length > 0) {
      const [x, y] = queue.shift()!;
      const key = `${x},${y}`;

      if (x < 0 || x >= width || y < 0 || y >= height) continue;
      if (visited.has(key)) continue;
      visited.add(key);

      const currentColor = pixels[key];
      if (!currentColor || normalizeHex(currentColor) !== normalizedTargetColor) continue;

      selectedKeys.push(key);
      for (const [offsetX, offsetY] of COLOR_NEIGHBOR_OFFSETS) {
        queue.push([x + offsetX, y + offsetY]);
      }
    }

    return selectedKeys;
  };

  const handleWandSelection = (coords: { x: number; y: number } | null) => {
    if (!coords) return;

    const targetColor = pixels[`${coords.x},${coords.y}`] ?? null;
    if (!targetColor) {
      setWandSelection(null);
      return;
    }

    const normalizedTargetColor = normalizeHex(targetColor);
    const selectedKeys = getContiguousColorKeys(coords.x, coords.y, targetColor);
    const anchor = getCanvasAnchorFromCoords(coords);
    useEditorStore.getState().setColor(targetColor);
    setWandSelection({
      ...anchor,
      color: normalizedTargetColor,
      keys: selectedKeys,
    });
  };

  const handleClearWandSelection = () => {
    if (!wandSelection) return;

    const selectedKeys = new Set(wandSelection.keys);
    let changed = false;
    const currentPixels = useEditorStore.getState().pixels;
    const nextPixels: Record<string, string> = {};

    for (const [key, color] of Object.entries(currentPixels)) {
      if (selectedKeys.has(key) && normalizeHex(color) === normalizeHex(wandSelection.color)) {
        changed = true;
        continue;
      }
      nextPixels[key] = color;
    }

    if (!changed) return;

    setPixels(nextPixels);
    saveHistory();
    setWandSelection(null);
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

      for (const [offsetX, offsetY] of COLOR_NEIGHBOR_OFFSETS) {
        queue.push([x + offsetX, y + offsetY]);
      }
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
      
      if (!isErase && !strokeColorRegisteredRef.current) {
        addUsedColor(primaryColor);
        addRecentColor(primaryColor);
        strokeColorRegisteredRef.current = true;
      }
      setLastCoords(coords);
    } else if (currentTool === 'bucket') {
      const targetColor = pixels[`${coords.x},${coords.y}`] ?? null;
      floodFill(coords.x, coords.y, targetColor, primaryColor);
      if (!strokeColorRegisteredRef.current) {
        addUsedColor(primaryColor);
        addRecentColor(primaryColor);
        strokeColorRegisteredRef.current = true;
      }
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
    if (resizeDrag) return;
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
      if (currentTool === 'wand') {
        e.preventDefault();
        setIsDrawing(false);
        setLastCoords(null);
        handleWandSelection(getCoordinatesFromTouch(e));
        return;
      }
      strokeColorRegisteredRef.current = false;
      setIsDrawing(true);
      handleDraw(getCoordinatesFromTouch(e));
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (resizeDrag) return;
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
    if (resizeDrag) return;
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
      strokeColorRegisteredRef.current = false;
      setIsDrawing(false);
      setLastCoords(null);
    }
  };

  const onMouseDown = (e: React.MouseEvent) => {
    if (resizeDrag) return;
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
    if (currentTool === 'wand') {
      e.preventDefault();
      setIsDrawing(false);
      setLastCoords(null);
      handleWandSelection(getCoordinates(e));
      return;
    }
    strokeColorRegisteredRef.current = false;
    setIsDrawing(true);
    handleDraw(getCoordinates(e));
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (resizeDrag) return;
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
    if (isDrawing && e.buttons === 0) {
      saveHistory();
      strokeColorRegisteredRef.current = false;
      setIsDrawing(false);
      setLastCoords(null);
      return;
    }
    if (isDrawing) {
      handleDraw(getCoordinates(e));
    }
  };

  const onMouseUp = () => {
    if (resizeDrag) return;
    if (isPanning) {
      setIsPanning(false);
      panLastRef.current = null;
      return;
    }
    if (isDrawing) {
      saveHistory();
    }
    strokeColorRegisteredRef.current = false;
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
    if (!isDrawing || isPanning) return;

    const finishDrawing = () => {
      strokeColorRegisteredRef.current = false;
      setIsDrawing((drawing) => {
        if (!drawing) return drawing;
        saveHistory();
        return false;
      });
      setLastCoords(null);
    };

    window.addEventListener('mouseup', finishDrawing);
    window.addEventListener('blur', finishDrawing);

    return () => {
      window.removeEventListener('mouseup', finishDrawing);
      window.removeEventListener('blur', finishDrawing);
    };
  }, [isDrawing, isPanning, saveHistory]);

  useEffect(() => {
    if (!resizeDrag) return;

    const handleWindowPointerMove = (event: PointerEvent) => {
      const scale = zoomRef.current / 10;
      if (scale <= 0) return;

      setResizeDrag((current) => {
        if (!current) return current;

        if (current.edge === 'left' || current.edge === 'right') {
          const deltaPixels = Math.round((event.clientX - current.startClientX) / scale);
          const nextWidth =
            current.edge === 'right'
              ? current.startWidth + deltaPixels
              : current.startWidth - deltaPixels;
          const clampedWidth = Math.max(1, Math.min(200, nextWidth));
          return clampedWidth === current.previewSize
            ? current
            : { ...current, previewSize: clampedWidth };
        }

        const deltaPixels = Math.round((event.clientY - current.startClientY) / scale);
        const nextHeight =
          current.edge === 'bottom'
            ? current.startHeight + deltaPixels
            : current.startHeight - deltaPixels;
        const clampedHeight = Math.max(1, Math.min(200, nextHeight));
        return clampedHeight === current.previewSize
          ? current
          : { ...current, previewSize: clampedHeight };
      });
    };

    const finishResize = () => {
      const activeDrag = resizeDrag;
      if (!activeDrag) return;

      if (activeDrag.previewSize !== (activeDrag.edge === 'left' || activeDrag.edge === 'right' ? activeDrag.startWidth : activeDrag.startHeight)) {
        resizeFromEdge(activeDrag.edge, activeDrag.previewSize);

        if (activeDrag.edge === 'left') {
          const widthDelta = activeDrag.previewSize - activeDrag.startWidth;
          const scale = zoomRef.current / 10;
          setViewOffset({
            x: activeDrag.startOffset.x - widthDelta * scale,
            y: activeDrag.startOffset.y,
          });
        }

        if (activeDrag.edge === 'top') {
          const heightDelta = activeDrag.previewSize - activeDrag.startHeight;
          const scale = zoomRef.current / 10;
          setViewOffset({
            x: activeDrag.startOffset.x,
            y: activeDrag.startOffset.y - heightDelta * scale,
          });
        }

        saveHistory();
      }

      setResizeDrag(null);
    };

    window.addEventListener('pointermove', handleWindowPointerMove);
    window.addEventListener('pointerup', finishResize);
    window.addEventListener('pointercancel', finishResize);
    window.addEventListener('blur', finishResize);

    return () => {
      window.removeEventListener('pointermove', handleWindowPointerMove);
      window.removeEventListener('pointerup', finishResize);
      window.removeEventListener('pointercancel', finishResize);
      window.removeEventListener('blur', finishResize);
    };
  }, [resizeDrag, resizeFromEdge, saveHistory]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      setIsAutoZoom(false);

      if (e.ctrlKey || e.metaKey || isLikelyMouseWheel(e)) {
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

  const isOverlayTool = currentTool === 'brush' || currentTool === 'bucket' || currentTool === 'wand' || currentTool === 'eraser' || currentTool === 'eyedropper';
  const CursorIcon =
    currentTool === 'brush'
      ? Pencil
      : currentTool === 'bucket'
        ? PaintBucket
        : currentTool === 'wand'
          ? WandSparkles
          : currentTool === 'eraser'
            ? Eraser
            : currentTool === 'eyedropper'
              ? Pipette
              : null;

  const cursorClass = resizeDrag
    ? resizeDrag.edge === 'left' || resizeDrag.edge === 'right'
      ? 'cursor-ew-resize'
      : 'cursor-ns-resize'
    : isPanning
      ? 'cursor-grabbing'
      : currentTool === 'hand'
        ? 'cursor-grab'
        : currentTool === 'text'
          ? 'cursor-text'
          : isOverlayTool
            ? 'cursor-none'
            : 'cursor-crosshair';
  const scale = zoom / 10;
  const canvasScreenRect = {
    left: viewOffset.x,
    top: viewOffset.y,
    width: width * scale,
    height: height * scale,
  };
  const resizeHandleThickness = 12;
  const resizeHandleGap = 4;
  const resizePreview = resizeDrag
    ? (() => {
        const startSize = resizeDrag.edge === 'left' || resizeDrag.edge === 'right' ? resizeDrag.startWidth : resizeDrag.startHeight;
        const delta = resizeDrag.previewSize - startSize;
        if (delta === 0) return null;

        const magnitude = Math.abs(delta) * scale;
        const isGrow = delta > 0;
        const colorClass = isGrow
          ? 'border-blue-500/90 bg-blue-400/25 text-blue-600'
          : 'border-red-500/90 bg-red-400/20 text-red-500';

        if (resizeDrag.edge === 'left') {
          return {
            panelStyle: {
              left: isGrow ? canvasScreenRect.left - magnitude : canvasScreenRect.left,
              top: canvasScreenRect.top,
              width: magnitude,
              height: canvasScreenRect.height,
            } as React.CSSProperties,
            labelStyle: {
              left: isGrow ? canvasScreenRect.left - magnitude / 2 : canvasScreenRect.left + magnitude / 2,
              top: canvasScreenRect.top + canvasScreenRect.height / 2,
            } as React.CSSProperties,
            colorClass,
            value: `${delta > 0 ? '+' : ''}${delta}`,
          };
        }

        if (resizeDrag.edge === 'right') {
          return {
            panelStyle: {
              left: isGrow ? canvasScreenRect.left + canvasScreenRect.width : canvasScreenRect.left + canvasScreenRect.width - magnitude,
              top: canvasScreenRect.top,
              width: magnitude,
              height: canvasScreenRect.height,
            } as React.CSSProperties,
            labelStyle: {
              left: isGrow ? canvasScreenRect.left + canvasScreenRect.width + magnitude / 2 : canvasScreenRect.left + canvasScreenRect.width - magnitude / 2,
              top: canvasScreenRect.top + canvasScreenRect.height / 2,
            } as React.CSSProperties,
            colorClass,
            value: `${delta > 0 ? '+' : ''}${delta}`,
          };
        }

        if (resizeDrag.edge === 'top') {
          return {
            panelStyle: {
              left: canvasScreenRect.left,
              top: isGrow ? canvasScreenRect.top - magnitude : canvasScreenRect.top,
              width: canvasScreenRect.width,
              height: magnitude,
            } as React.CSSProperties,
            labelStyle: {
              left: canvasScreenRect.left + canvasScreenRect.width / 2,
              top: isGrow ? canvasScreenRect.top - magnitude / 2 : canvasScreenRect.top + magnitude / 2,
            } as React.CSSProperties,
            colorClass,
            value: `${delta > 0 ? '+' : ''}${delta}`,
          };
        }

        return {
          panelStyle: {
            left: canvasScreenRect.left,
            top: isGrow ? canvasScreenRect.top + canvasScreenRect.height : canvasScreenRect.top + canvasScreenRect.height - magnitude,
            width: canvasScreenRect.width,
            height: magnitude,
          } as React.CSSProperties,
          labelStyle: {
            left: canvasScreenRect.left + canvasScreenRect.width / 2,
            top: isGrow ? canvasScreenRect.top + canvasScreenRect.height + magnitude / 2 : canvasScreenRect.top + canvasScreenRect.height - magnitude / 2,
          } as React.CSSProperties,
          colorClass,
          value: `${delta > 0 ? '+' : ''}${delta}`,
        };
      })()
    : null;
  const defaultCursorHotspot = { x: CURSOR_CONFIG.ICON_SIZE / 2, y: CURSOR_CONFIG.ICON_SIZE / 2 };
  const cursorHotspot =
    currentTool in CURSOR_CONFIG.HOTSPOTS
      ? CURSOR_CONFIG.HOTSPOTS[currentTool as keyof typeof CURSOR_CONFIG.HOTSPOTS]
      : defaultCursorHotspot;
  const cursorIconSize = CURSOR_CONFIG.ICON_SIZE;
  const cursorHotspotScaled = cursorHotspot;
  const usesPrimaryColorCursor = currentTool === 'brush' || currentTool === 'bucket';
  const cursorShadowColor = (() => {
    const hex = primaryColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? '#bbbbbb' : '#ffffff';
  })();

  const onCanvasLeave = () => {
    if (!isPanning) onMouseUp();
    queueCursorOverlay({ x: cursorPendingRef.current.x, y: cursorPendingRef.current.y, visible: false });
  };

  const startResize = (edge: ResizeEdge, event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsAutoZoom(false);
    setIsPanning(false);
    setIsDrawing(false);
    setLastCoords(null);
    strokeColorRegisteredRef.current = false;
    queueCursorOverlay({ x: cursorPendingRef.current.x, y: cursorPendingRef.current.y, visible: false });
    setResizeDrag({
      edge,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startWidth: width,
      startHeight: height,
      startOffset: viewOffsetRef.current,
      previewSize: edge === 'left' || edge === 'right' ? width : height,
    });
  };

  const resizeHandles: Array<{
    edge: ResizeEdge;
    className: string;
    style: React.CSSProperties;
    barStyle: React.CSSProperties;
  }> = [
    {
      edge: 'left',
      className: 'cursor-ew-resize',
      style: {
        left: canvasScreenRect.left - resizeHandleThickness - resizeHandleGap,
        top: canvasScreenRect.top,
        width: resizeHandleThickness,
        height: canvasScreenRect.height,
      },
      barStyle: {
        left: resizeHandleThickness / 2,
        top: canvasScreenRect.height / 2,
        width: 5,
        height: 64,
        transform: 'translate(-50%, -50%)',
      },
    },
    {
      edge: 'right',
      className: 'cursor-ew-resize',
      style: {
        left: canvasScreenRect.left + canvasScreenRect.width + resizeHandleGap,
        top: canvasScreenRect.top,
        width: resizeHandleThickness,
        height: canvasScreenRect.height,
      },
      barStyle: {
        left: resizeHandleThickness / 2,
        top: canvasScreenRect.height / 2,
        width: 5,
        height: 64,
        transform: 'translate(-50%, -50%)',
      },
    },
    {
      edge: 'top',
      className: 'cursor-ns-resize',
      style: {
        left: canvasScreenRect.left,
        top: canvasScreenRect.top - resizeHandleThickness - resizeHandleGap,
        width: canvasScreenRect.width,
        height: resizeHandleThickness,
      },
      barStyle: {
        left: canvasScreenRect.width / 2,
        top: resizeHandleThickness / 2,
        width: 64,
        height: 5,
        transform: 'translate(-50%, -50%)',
      },
    },
    {
      edge: 'bottom',
      className: 'cursor-ns-resize',
      style: {
        left: canvasScreenRect.left,
        top: canvasScreenRect.top + canvasScreenRect.height + resizeHandleGap,
        width: canvasScreenRect.width,
        height: resizeHandleThickness,
      },
      barStyle: {
        left: canvasScreenRect.width / 2,
        top: resizeHandleThickness / 2,
        width: 64,
        height: 5,
        transform: 'translate(-50%, -50%)',
      },
    },
  ];

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
        <Popover
          open={Boolean(wandSelection)}
          onOpenChange={(open) => {
            if (open) return;
            setWandSelection(null);
          }}
        >
          {wandSelection && (
            <PopoverAnchor asChild>
              <div
                className="pointer-events-none absolute z-20 size-1"
                style={{
                  left: wandSelection.x,
                  top: wandSelection.y,
                  transform: "translate(-50%, -50%)",
                }}
              />
            </PopoverAnchor>
          )}
          <PopoverContent
            side="top"
            align="center"
            sideOffset={10}
            className="z-[100] flex w-fit flex-row items-center gap-0 rounded-lg border bg-background/95 p-0.5 shadow-sm backdrop-blur-sm"
            onOpenAutoFocus={(event) => event.preventDefault()}
          >
            <UsedColorActionButtons
              selectedColor={wandSelection?.color ?? null}
              onReplace={(sourceColor) => {
                if (!wandSelection) return;
                onOpenReplaceColorDialog(sourceColor, wandSelection.keys);
              }}
              onClear={handleClearWandSelection}
              onClose={() => setWandSelection(null)}
            />
          </PopoverContent>
        </Popover>
        {resizeHandles.map((handle) => (
          <div
            key={handle.edge}
            className={`group absolute z-10 touch-none ${handle.className}`}
            style={handle.style}
            onPointerDown={(event) => startResize(handle.edge, event)}
          >
            <div
              className={`pointer-events-none absolute rounded-full transition-all ${
                resizeDrag?.edge === handle.edge
                  ? 'bg-primary shadow-[0_0_0_4px_color-mix(in_oklab,var(--primary)_14%,transparent)]'
                  : 'bg-primary/45 group-hover:bg-primary group-hover:shadow-[0_0_0_4px_color-mix(in_oklab,var(--primary)_14%,transparent)]'
              }`}
              style={handle.barStyle}
            />
          </div>
        ))}
        {resizePreview && (
          <>
            <div
              className={`pointer-events-none absolute z-10 border-2 border-dashed ${resizePreview.colorClass}`}
              style={resizePreview.panelStyle}
            />
            <div
              className={`pointer-events-none absolute z-20 text-xl font-semibold tabular-nums ${resizePreview.colorClass.split(' ').at(-1)}`}
              style={{ ...resizePreview.labelStyle, transform: 'translate(-50%, -50%)' }}
            >
              {resizePreview.value}
            </div>
          </>
        )}
        {CursorIcon && cursorOverlay.visible && !isPanning && !resizeDrag && (
          <div
            className="pointer-events-none absolute z-10 text-foreground"
            style={{
              left: cursorOverlay.x - cursorHotspotScaled.x,
              top: cursorOverlay.y - cursorHotspotScaled.y,
              color: usesPrimaryColorCursor ? primaryColor : undefined,
            }}
          >
            {currentTool === 'brush' ? (
              <Brush
                size={CURSOR_CONFIG.ICON_SIZE}
                strokeWidth={2}
                style={{ color: primaryColor, filter: `drop-shadow(0 0 1px ${cursorShadowColor}) drop-shadow(0 0 1px ${cursorShadowColor})` }}
              />
            ) : (
              <CursorIcon
                size={cursorIconSize}
                style={
                  currentTool === 'bucket'
                    ? { color: primaryColor, filter: `drop-shadow(0 0 1px ${cursorShadowColor}) drop-shadow(0 0 1px ${cursorShadowColor})` }
                    : currentTool === 'eraser' || currentTool === 'eyedropper'
                      ? { filter: 'drop-shadow(0 0 1px white) drop-shadow(0 0 1px white)' }
                    : undefined
                }
              />
            )}
            <div
              className="absolute rounded-full border border-white/70 shadow-[0_0_0_1px_rgba(0,0,0,0.12)]"
              style={{
                left: cursorHotspotScaled.x,
                top: cursorHotspotScaled.y,
                width: 5,
                height: 5,
                backgroundColor: primaryThemeColor,
                opacity: 0.6,
                transform: 'translate(-50%, -50%)',
              }}
            />
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
