import React, { useEffect } from 'react';
import { normalizeHex } from '@/lib/utils';
import { CANVAS_CONFIG } from '@/lib/constants';
import type { WandSelection } from './types';

export function useCanvasRenderer(params: {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  pixels: Record<string, string>;
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
  const {
    canvasRef,
    containerRef,
    pixels,
    width,
    height,
    zoom,
    viewOffset,
    viewportSize,
    theme,
    systemTheme,
    backgroundColor,
    selectedUsedColor,
    wandSelection,
    primaryThemeColor,
  } = params;

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

    // Draw the transparent checkerboard or the configured solid background first.
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

    // Highlight all pixels matching the selected palette color.
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
  }, [canvasRef, containerRef, pixels, width, height, zoom, viewOffset.x, viewOffset.y, viewportSize.width, viewportSize.height, theme, systemTheme, backgroundColor, selectedUsedColor, wandSelection, primaryThemeColor]);
}
