import { useRef, useState } from 'react';
import { useEditorStore } from '@/store/useEditorStore';
import { usePaletteStore } from '@/store/usePaletteStore';
import { clampZoom } from '@/lib/utils';
import { EDITOR_CONFIG } from '@/lib/constants';
import { useThemeColors } from './pixel-canvas/use-theme-colors';
import { useCursorOverlay } from './pixel-canvas/use-cursor-overlay';
import { useViewport } from './pixel-canvas/use-viewport';
import { useCanvasRenderer } from './pixel-canvas/use-canvas-renderer';
import { useWheelZoom } from './pixel-canvas/use-wheel-zoom';
import { useResizeDrag } from './pixel-canvas/use-resize-drag';
import { useWandSelection } from './pixel-canvas/use-wand-selection';
import { useToolActions } from './pixel-canvas/use-tool-actions';
import { usePointerTools } from './pixel-canvas/use-pointer-tools';
import { useTouchGestures } from './pixel-canvas/use-touch-gestures';
import ZoomToolbar from './pixel-canvas/ZoomToolbar';
import WandActionPopover from './pixel-canvas/WandActionPopover';
import ResizeHandles from './pixel-canvas/ResizeHandles';
import CursorOverlay from './pixel-canvas/CursorOverlay';

type PixelCanvasProps = {
  onOpenReplaceColorDialog: (sourceColor: string, pixelKeys?: string[]) => void;
};

export default function PixelCanvas({ onOpenReplaceColorDialog }: PixelCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const pixels = useEditorStore((state) => state.pixels);
  const width = useEditorStore((state) => state.width);
  const height = useEditorStore((state) => state.height);
  const backgroundColor = useEditorStore((state) => state.backgroundColor);
  const zoom = useEditorStore((state) => state.zoom);
  const pixelBuffer = useEditorStore((state) => state.pixelBuffer);
  const pixelsVersion = useEditorStore((state) => state.pixelsVersion);
  const setPixelFast = useEditorStore((state) => state.setPixelFast);
  const clearPixelFast = useEditorStore((state) => state.clearPixelFast);
  const setPixels = useEditorStore((state) => state.setPixels);
  const resizeFromEdge = useEditorStore((state) => state.resizeFromEdge);
  const currentTool = useEditorStore((state) => state.currentTool);
  const primaryColor = useEditorStore((state) => state.primaryColor);
  const setZoom = useEditorStore((state) => state.setZoom);
  const saveHistory = useEditorStore((state) => state.saveHistory);
  const addUsedColor = usePaletteStore((state) => state.addUsedColor);
  const addRecentColor = usePaletteStore((state) => state.addRecentColor);
  const selectedUsedColor = usePaletteStore((state) => state.selectedUsedColor);

  const [isPanning, setIsPanning] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastCoords, setLastCoords] = useState<{ x: number; y: number } | null>(null);

  const panLastRef = useRef<{ x: number; y: number } | null>(null);
  const isGestureRef = useRef(false);
  const gestureStartRef = useRef<{
    distance: number;
    midpoint: { x: number; y: number };
    zoom: number;
    offset: { x: number; y: number };
  } | null>(null);
  const strokeColorRegisteredRef = useRef(false);

  const { theme, systemTheme, primaryThemeColor } = useThemeColors();

  const { isAutoZoom, setIsAutoZoom, viewportSize, viewOffset, setViewOffset, zoomRef, viewOffsetRef } = useViewport({
    containerRef,
    width,
    height,
    zoom,
    setZoom,
  });

  const { cursorOverlay, cursorPendingRef, queueCursorOverlay, updateCursorFromMouseEvent } = useCursorOverlay(containerRef);

  const { wandSelection, wandAnchorSelection, setWandSelection, handleWandSelection, handleClearWandSelection } = useWandSelection({
    pixels,
    width,
    height,
    zoom,
    viewOffset,
    setPixels,
    saveHistory,
  });

  useCanvasRenderer({
    canvasRef,
    containerRef,
    pixels,
    pixelBuffer,
    pixelsVersion,
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
  });

  useWheelZoom({
    containerRef,
    zoomRef,
    viewOffsetRef,
    setZoom,
    setViewOffset,
    setIsAutoZoom,
  });

  const { resizeDrag, startResize } = useResizeDrag({
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
  });

  const { handleDraw } = useToolActions({
    pixels,
    width,
    height,
    currentTool,
    primaryColor,
    setPixelFast,
    clearPixelFast,
    setPixels,
    addUsedColor,
    addRecentColor,
    lastCoords,
    setLastCoords,
    strokeColorRegisteredRef,
  });

  const { onMouseDown, onMouseMove, onMouseUp, onCanvasLeave } = usePointerTools({
    canvasRef,
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
    strokeColorRegisteredRef,
    cursorPendingRef,
    queueCursorOverlay,
    updateCursorFromMouseEvent,
    handleDraw,
    handleWandSelection,
    saveHistory,
  });

  const { onTouchStart, onTouchMove, onTouchEnd } = useTouchGestures({
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
  });

  const zoomByStep = (direction: 'in' | 'out') => {
    const container = containerRef.current;
    if (!container) return;

    // Toolbar zoom keeps the center of the viewport anchored.
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

  return (
    <div className="relative h-full w-full overflow-hidden touch-manipulation-none">
      <div ref={containerRef} className="absolute inset-0 overflow-hidden bg-background touch-manipulation-none">
        <canvas
          ref={canvasRef}
          className={`absolute inset-0 h-full w-full touch-manipulation-none ${cursorClass}`}
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
        <WandActionPopover
          wandSelection={wandSelection}
          anchorSelection={wandAnchorSelection}
          onClose={() => setWandSelection(null)}
          onClear={handleClearWandSelection}
          onOpenReplaceColorDialog={onOpenReplaceColorDialog}
        />
        <ResizeHandles
          canvasScreenRect={canvasScreenRect}
          scale={scale}
          resizeDrag={resizeDrag}
          startResize={startResize}
        />
        <CursorOverlay
          currentTool={currentTool}
          cursorOverlay={cursorOverlay}
          isPanning={isPanning}
          resizeDrag={resizeDrag}
          primaryColor={primaryColor}
          primaryThemeColor={primaryThemeColor}
        />
      </div>

      <ZoomToolbar
        zoom={zoom}
        isAutoZoom={isAutoZoom}
        onZoomStep={zoomByStep}
        onAutoZoom={() => setIsAutoZoom(true)}
      />
    </div>
  );
}
