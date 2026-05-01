import { Brush, Eraser, PaintBucket, Pencil, Pipette, WandSparkles } from 'lucide-react';
import { CURSOR_CONFIG } from '@/lib/constants';
import type { CursorOverlayState, ResizeDragState } from './types';

type Props = {
  currentTool: string;
  cursorOverlay: CursorOverlayState;
  isPanning: boolean;
  resizeDrag: ResizeDragState | null;
  primaryColor: string;
  primaryThemeColor: string;
};

export default function CursorOverlay({
  currentTool,
  cursorOverlay,
  isPanning,
  resizeDrag,
  primaryColor,
  primaryThemeColor,
}: Props) {
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

  if (!CursorIcon || !cursorOverlay.visible || isPanning || resizeDrag) return null;

  const defaultCursorHotspot = { x: CURSOR_CONFIG.ICON_SIZE / 2, y: CURSOR_CONFIG.ICON_SIZE / 2 };
  const cursorHotspot =
    currentTool in CURSOR_CONFIG.HOTSPOTS
      ? CURSOR_CONFIG.HOTSPOTS[currentTool as keyof typeof CURSOR_CONFIG.HOTSPOTS]
      : defaultCursorHotspot;
  const cursorIconSize = CURSOR_CONFIG.ICON_SIZE;
  const cursorHotspotScaled = cursorHotspot;
  const usesPrimaryColorCursor = currentTool === 'brush' || currentTool === 'bucket';
  const cursorShadowColor = (() => {
    // Pick a contrasting drop shadow for cursors that inherit the active color.
    const hex = primaryColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? '#bbbbbb' : '#ffffff';
  })();

  return (
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
  );
}
