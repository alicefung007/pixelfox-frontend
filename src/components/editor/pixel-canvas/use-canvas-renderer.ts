import React, { useEffect, useRef } from 'react';
import { normalizeHex } from '@/lib/utils';
import { CANVAS_CONFIG } from '@/lib/constants';
import type { WandSelection } from './types';

const PIXEL_FILLED_FLAG = 0xff000000;

const packHex = (hex: string): number => {
  const raw = normalizeHex(hex).replace('#', '');
  const full = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw;
  const rgb = parseInt(full, 16);
  if (Number.isNaN(rgb)) return 0;
  return (PIXEL_FILLED_FLAG | rgb) >>> 0;
};

const hexToRgb = (hex: string): [number, number, number] => {
  const normalized = normalizeHex(hex).replace('#', '');
  const full = normalized.length === 3
    ? normalized.split('').map((c) => c + c).join('')
    : normalized;
  const num = parseInt(full, 16);
  return [(num >> 16) & 0xff, (num >> 8) & 0xff, num & 0xff];
};

const createBgCanvas = (
  width: number,
  height: number,
  backgroundColor: string | null,
): HTMLCanvasElement => {
  const c = document.createElement('canvas');
  c.width = Math.max(1, width);
  c.height = Math.max(1, height);
  const cctx = c.getContext('2d')!;
  if (backgroundColor) {
    cctx.fillStyle = backgroundColor;
    cctx.fillRect(0, 0, width, height);
    return c;
  }
  const img = cctx.createImageData(width, height);
  const data = img.data;
  const [lr, lg, lb] = hexToRgb(CANVAS_CONFIG.CHECKER_LIGHT);
  const [dr, dg, db] = hexToRgb(CANVAS_CONFIG.CHECKER_DARK);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const isLight = (x + y) % 2 === 0;
      data[i] = isLight ? lr : dr;
      data[i + 1] = isLight ? lg : dg;
      data[i + 2] = isLight ? lb : db;
      data[i + 3] = 255;
    }
  }
  cctx.putImageData(img, 0, 0);
  return c;
};

const createPixelsCanvasFromBuffer = (
  buffer: Uint32Array,
  width: number,
  height: number,
): HTMLCanvasElement => {
  const c = document.createElement('canvas');
  c.width = Math.max(1, width);
  c.height = Math.max(1, height);
  const cctx = c.getContext('2d')!;
  const img = cctx.createImageData(width, height);
  // Reinterpret the RGBA bytes as a Uint32Array so we can copy the buffer in one pass.
  // ImageData stores bytes in [R,G,B,A] order; on little-endian machines a uint32 reads as 0xAABBGGRR.
  // Our packed values are 0xFFRRGGBB, so we swap R and B per-pixel.
  const out32 = new Uint32Array(img.data.buffer);
  const len = width * height;
  for (let i = 0; i < len; i++) {
    const v = buffer[i];
    if (v === 0) {
      out32[i] = 0;
      continue;
    }
    const r = (v >>> 16) & 0xff;
    const g = (v >>> 8) & 0xff;
    const b = v & 0xff;
    // 0xAABBGGRR (little-endian RGBA bytes)
    out32[i] = (0xff << 24) | (b << 16) | (g << 8) | r;
  }
  cctx.putImageData(img, 0, 0);
  return c;
};

export function useCanvasRenderer(params: {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  pixels: Record<string, string>;
  pixelBuffer: Uint32Array;
  pixelsVersion: number;
  width: number;
  height: number;
  zoom: number;
  viewOffset: { x: number; y: number };
  viewportSize: { width: number; height: number };
  theme: string;
  systemTheme: 'dark' | 'light';
  backgroundColor: string | null;
  selectedUsedColor: string | null;
  wandSelection: WandSelection | null;
  primaryThemeColor: string;
}) {
  const paramsRef = useRef(params);
  const rafIdRef = useRef<number | null>(null);
  const bgCacheRef = useRef<{
    canvas: HTMLCanvasElement;
    width: number;
    height: number;
    backgroundColor: string | null;
  } | null>(null);
  const pixelsCacheRef = useRef<{
    canvas: HTMLCanvasElement;
    width: number;
    height: number;
    version: number;
  } | null>(null);
  useEffect(() => {
    paramsRef.current = params;
  });

  const draw = () => {
    rafIdRef.current = null;
    const {
      canvasRef,
      containerRef,
      pixels,
      pixelBuffer,
      pixelsVersion,
      width,
      height,
      zoom,
      viewOffset,
      theme,
      systemTheme,
      backgroundColor,
      selectedUsedColor,
      wandSelection,
      primaryThemeColor,
    } = paramsRef.current;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const container = containerRef.current;
    if (!container) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const viewW = container.clientWidth;
    const viewH = container.clientHeight;

    // The canvas backing store is scaled for DPR, then all drawing uses CSS pixels.
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

    // Cached background layer (checker or solid bg) drawn as a single image.
    const bgCache = bgCacheRef.current;
    if (
      !bgCache ||
      bgCache.width !== width ||
      bgCache.height !== height ||
      bgCache.backgroundColor !== backgroundColor
    ) {
      bgCacheRef.current = {
        canvas: createBgCanvas(width, height, backgroundColor),
        width,
        height,
        backgroundColor,
      };
    }
    ctx.drawImage(bgCacheRef.current!.canvas, 0, 0);

    // Cached pixels layer rebuilt only when pixelsVersion or size changes.
    const pixelsCache = pixelsCacheRef.current;
    if (
      !pixelsCache ||
      pixelsCache.width !== width ||
      pixelsCache.height !== height ||
      pixelsCache.version !== pixelsVersion
    ) {
      pixelsCacheRef.current = {
        canvas: createPixelsCanvasFromBuffer(pixelBuffer, width, height),
        width,
        height,
        version: pixelsVersion,
      };
    }
    ctx.drawImage(pixelsCacheRef.current!.canvas, 0, 0);

    const effectiveScale = dpr * scale;

    // Highlight all pixels matching the selected palette color.
    if (selectedUsedColor) {
      const targetPacked = packHex(selectedUsedColor);
      const outlineWidth = Math.max(1 / effectiveScale, 0.16);
      const glowInset = outlineWidth / 2;
      const glowSize = Math.max(1 - outlineWidth, 0);

      ctx.save();
      ctx.strokeStyle = primaryThemeColor;
      ctx.lineWidth = outlineWidth;
      for (let y = 0; y < height; y++) {
        const row = y * width;
        for (let x = 0; x < width; x++) {
          if (pixelBuffer[row + x] !== targetPacked) continue;
          ctx.strokeRect(x + glowInset, y + glowInset, glowSize, glowSize);
        }
      }
      ctx.restore();

      ctx.save();
      ctx.fillStyle = primaryThemeColor;
      ctx.globalAlpha = 0.14;
      for (let y = 0; y < height; y++) {
        const row = y * width;
        for (let x = 0; x < width; x++) {
          if (pixelBuffer[row + x] !== targetPacked) continue;
          ctx.fillRect(x + 0.12, y + 0.12, 0.76, 0.76);
        }
      }
      ctx.restore();
    }

    // Highlight only the current contiguous magic-wand selection.
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

    // Grid lines stay visually thin by scaling line widths against the effective zoom.
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
  };

  useEffect(() => {
    if (rafIdRef.current !== null) return;
    rafIdRef.current = requestAnimationFrame(draw);
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [
    params.pixels,
    params.pixelsVersion,
    params.width,
    params.height,
    params.zoom,
    params.viewOffset.x,
    params.viewOffset.y,
    params.viewportSize.width,
    params.viewportSize.height,
    params.theme,
    params.systemTheme,
    params.backgroundColor,
    params.selectedUsedColor,
    params.wandSelection,
    params.primaryThemeColor,
  ]);
}
