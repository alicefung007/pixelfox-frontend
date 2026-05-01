import React, { useEffect, useState } from 'react';
import type { ResizeDragState, ResizeEdge, CursorOverlayState } from './types';

export function useResizeDrag(params: {
  width: number;
  height: number;
  zoomRef: React.MutableRefObject<number>;
  viewOffsetRef: React.MutableRefObject<{ x: number; y: number }>;
  setViewOffset: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
  setIsAutoZoom: (auto: boolean) => void;
  setIsPanning: (panning: boolean) => void;
  setIsDrawing: (drawing: boolean) => void;
  setLastCoords: (coords: { x: number; y: number } | null) => void;
  strokeColorRegisteredRef: React.MutableRefObject<boolean>;
  cursorPendingRef: React.MutableRefObject<CursorOverlayState>;
  queueCursorOverlay: (next: CursorOverlayState) => void;
  resizeFromEdge: (edge: ResizeEdge, size: number) => void;
  saveHistory: () => void;
}) {
  const {
    width,
    height,
    zoomRef,
    viewOffsetRef,
    setViewOffset,
    setIsAutoZoom,
    setIsPanning,
    setIsDrawing,
    setLastCoords,
    strokeColorRegisteredRef,
    cursorPendingRef,
    queueCursorOverlay,
    resizeFromEdge,
    saveHistory,
  } = params;

  const [resizeDrag, setResizeDrag] = useState<ResizeDragState | null>(null);

  useEffect(() => {
    if (!resizeDrag) return;

    // Resize drag previews dimensions in pixels; the store is updated only on pointer release.
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
  }, [resizeDrag, resizeFromEdge, saveHistory, setViewOffset, zoomRef]);

  const startResize = (edge: ResizeEdge, event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();

    // Lock the resize interaction to the handle, then finish globally on pointerup.
    event.currentTarget.setPointerCapture(event.pointerId);
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

  return { resizeDrag, startResize };
}
