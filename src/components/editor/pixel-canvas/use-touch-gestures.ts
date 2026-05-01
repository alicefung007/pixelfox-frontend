import React from 'react';
import { clampZoom } from '@/lib/utils';
import { getCoordinatesFromTouch } from './geometry';
import type { CursorOverlayState, ResizeDragState } from './types';

export function useTouchGestures(params: {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  zoom: number;
  viewOffset: { x: number; y: number };
  width: number;
  height: number;
  currentTool: string;
  resizeDrag: ResizeDragState | null;
  isPanning: boolean;
  setIsPanning: (panning: boolean) => void;
  panLastRef: React.MutableRefObject<{ x: number; y: number } | null>;
  setIsAutoZoom: (auto: boolean) => void;
  isDrawing: boolean;
  setIsDrawing: (drawing: boolean) => void;
  setLastCoords: (coords: { x: number; y: number } | null) => void;
  setViewOffset: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
  setZoom: (z: number) => void;
  zoomRef: React.MutableRefObject<number>;
  viewOffsetRef: React.MutableRefObject<{ x: number; y: number }>;
  isGestureRef: React.MutableRefObject<boolean>;
  gestureStartRef: React.MutableRefObject<{
    distance: number;
    midpoint: { x: number; y: number };
    zoom: number;
    offset: { x: number; y: number };
  } | null>;
  strokeColorRegisteredRef: React.MutableRefObject<boolean>;
  cursorPendingRef: React.MutableRefObject<CursorOverlayState>;
  queueCursorOverlay: (next: CursorOverlayState) => void;
  handleDraw: (coords: { x: number; y: number } | null) => void;
  handleWandSelection: (coords: { x: number; y: number } | null) => void;
  saveHistory: () => void;
}) {
  const {
    canvasRef,
    containerRef,
    zoom,
    viewOffset,
    width,
    height,
    currentTool,
    resizeDrag,
    isPanning,
    setIsPanning,
    panLastRef,
    setIsAutoZoom,
    isDrawing,
    setIsDrawing,
    setLastCoords,
    setViewOffset,
    setZoom,
    zoomRef,
    viewOffsetRef,
    isGestureRef,
    gestureStartRef,
    strokeColorRegisteredRef,
    cursorPendingRef,
    queueCursorOverlay,
    handleDraw,
    handleWandSelection,
    saveHistory,
  } = params;

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
      // Two-finger gesture: pinch zoom + pan.
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
        handleWandSelection(getCoordinatesFromTouch(canvasRef.current, e, zoom, viewOffset, width, height));
        return;
      }
      strokeColorRegisteredRef.current = false;
      setIsDrawing(true);
      handleDraw(getCoordinatesFromTouch(canvasRef.current, e, zoom, viewOffset, width, height));
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

        // Preserve the world point under the gesture midpoint while zooming.
        const dx = screenMidpoint.x - start.midpoint.x;
        const dy = screenMidpoint.y - start.midpoint.y;

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
      handleDraw(getCoordinatesFromTouch(canvasRef.current, e, zoom, viewOffset, width, height));
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

  return { onTouchStart, onTouchMove, onTouchEnd };
}
