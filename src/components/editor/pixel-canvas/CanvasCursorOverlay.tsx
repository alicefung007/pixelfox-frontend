import {
  Brush,
  Eraser,
  PaintBucket,
  Pencil,
  Pipette,
  WandSparkles,
} from "lucide-react"
import { CURSOR_CONFIG } from "@/lib/constants"
import { getCursorShadowColor } from "./geometry"
import type { CursorOverlay, ToolType } from "./types"

type CanvasCursorOverlayProps = {
  currentTool: ToolType
  cursorOverlay: CursorOverlay
  isPanning: boolean
  isResizing: boolean
  primaryColor: string
  primaryThemeColor: string
}

export function CanvasCursorOverlay({
  currentTool,
  cursorOverlay,
  isPanning,
  isResizing,
  primaryColor,
  primaryThemeColor,
}: CanvasCursorOverlayProps) {
  const CursorIcon =
    currentTool === "brush"
      ? Pencil
      : currentTool === "bucket"
        ? PaintBucket
        : currentTool === "wand"
          ? WandSparkles
          : currentTool === "eraser"
            ? Eraser
            : currentTool === "eyedropper"
              ? Pipette
              : null

  if (!CursorIcon || !cursorOverlay.visible || isPanning || isResizing)
    return null

  const defaultCursorHotspot = {
    x: CURSOR_CONFIG.ICON_SIZE / 2,
    y: CURSOR_CONFIG.ICON_SIZE / 2,
  }
  const cursorHotspot =
    currentTool in CURSOR_CONFIG.HOTSPOTS
      ? CURSOR_CONFIG.HOTSPOTS[
          currentTool as keyof typeof CURSOR_CONFIG.HOTSPOTS
        ]
      : defaultCursorHotspot
  const usesPrimaryColorCursor =
    currentTool === "brush" || currentTool === "bucket"
  const cursorShadowColor = getCursorShadowColor(primaryColor)
  const primaryColorCursorStyle = {
    color: primaryColor,
    filter: `drop-shadow(0 0 1px ${cursorShadowColor}) drop-shadow(0 0 1px ${cursorShadowColor})`,
  }

  return (
    <div
      className="pointer-events-none absolute z-10 text-foreground"
      style={{
        left: cursorOverlay.x - cursorHotspot.x,
        top: cursorOverlay.y - cursorHotspot.y,
        color: usesPrimaryColorCursor ? primaryColor : undefined,
      }}
    >
      {currentTool === "brush" ? (
        <Brush
          size={CURSOR_CONFIG.ICON_SIZE}
          strokeWidth={2}
          style={primaryColorCursorStyle}
        />
      ) : (
        <CursorIcon
          size={CURSOR_CONFIG.ICON_SIZE}
          style={
            currentTool === "bucket"
              ? primaryColorCursorStyle
              : currentTool === "eraser" || currentTool === "eyedropper"
                ? {
                    filter:
                      "drop-shadow(0 0 1px white) drop-shadow(0 0 1px white)",
                  }
                : undefined
          }
        />
      )}
      <div
        className="absolute rounded-full border border-white/70 shadow-[0_0_0_1px_rgba(0,0,0,0.12)]"
        style={{
          left: cursorHotspot.x,
          top: cursorHotspot.y,
          width: 5,
          height: 5,
          backgroundColor: primaryThemeColor,
          opacity: 0.6,
          transform: "translate(-50%, -50%)",
        }}
      />
    </div>
  )
}
