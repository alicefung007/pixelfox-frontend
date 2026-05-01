import type React from "react"
import type {
  CanvasScreenRect,
  ResizeDrag,
  ResizeEdge,
  ResizeHandle,
  ResizePreview,
} from "./types"

const RESIZE_HANDLE_THICKNESS = 12
const RESIZE_HANDLE_GAP = 4

type CanvasResizeOverlayProps = {
  canvasScreenRect: CanvasScreenRect
  resizeDrag: ResizeDrag | null
  scale: number
  onStartResize: (
    edge: ResizeEdge,
    event: React.PointerEvent<HTMLDivElement>
  ) => void
}

const getResizePreview = (
  resizeDrag: ResizeDrag | null,
  canvasScreenRect: CanvasScreenRect,
  scale: number
): ResizePreview | null => {
  if (!resizeDrag) return null

  const startSize =
    resizeDrag.edge === "left" || resizeDrag.edge === "right"
      ? resizeDrag.startWidth
      : resizeDrag.startHeight
  const delta = resizeDrag.previewSize - startSize
  if (delta === 0) return null

  const magnitude = Math.abs(delta) * scale
  const isGrow = delta > 0
  const colorClass = isGrow
    ? "border-blue-500/90 bg-blue-400/25 text-blue-600"
    : "border-red-500/90 bg-red-400/20 text-red-500"

  if (resizeDrag.edge === "left") {
    return {
      panelStyle: {
        left: isGrow
          ? canvasScreenRect.left - magnitude
          : canvasScreenRect.left,
        top: canvasScreenRect.top,
        width: magnitude,
        height: canvasScreenRect.height,
      },
      labelStyle: {
        left: isGrow
          ? canvasScreenRect.left - magnitude / 2
          : canvasScreenRect.left + magnitude / 2,
        top: canvasScreenRect.top + canvasScreenRect.height / 2,
      },
      colorClass,
      value: `${delta > 0 ? "+" : ""}${delta}`,
    }
  }

  if (resizeDrag.edge === "right") {
    return {
      panelStyle: {
        left: isGrow
          ? canvasScreenRect.left + canvasScreenRect.width
          : canvasScreenRect.left + canvasScreenRect.width - magnitude,
        top: canvasScreenRect.top,
        width: magnitude,
        height: canvasScreenRect.height,
      },
      labelStyle: {
        left: isGrow
          ? canvasScreenRect.left + canvasScreenRect.width + magnitude / 2
          : canvasScreenRect.left + canvasScreenRect.width - magnitude / 2,
        top: canvasScreenRect.top + canvasScreenRect.height / 2,
      },
      colorClass,
      value: `${delta > 0 ? "+" : ""}${delta}`,
    }
  }

  if (resizeDrag.edge === "top") {
    return {
      panelStyle: {
        left: canvasScreenRect.left,
        top: isGrow ? canvasScreenRect.top - magnitude : canvasScreenRect.top,
        width: canvasScreenRect.width,
        height: magnitude,
      },
      labelStyle: {
        left: canvasScreenRect.left + canvasScreenRect.width / 2,
        top: isGrow
          ? canvasScreenRect.top - magnitude / 2
          : canvasScreenRect.top + magnitude / 2,
      },
      colorClass,
      value: `${delta > 0 ? "+" : ""}${delta}`,
    }
  }

  return {
    panelStyle: {
      left: canvasScreenRect.left,
      top: isGrow
        ? canvasScreenRect.top + canvasScreenRect.height
        : canvasScreenRect.top + canvasScreenRect.height - magnitude,
      width: canvasScreenRect.width,
      height: magnitude,
    },
    labelStyle: {
      left: canvasScreenRect.left + canvasScreenRect.width / 2,
      top: isGrow
        ? canvasScreenRect.top + canvasScreenRect.height + magnitude / 2
        : canvasScreenRect.top + canvasScreenRect.height - magnitude / 2,
    },
    colorClass,
    value: `${delta > 0 ? "+" : ""}${delta}`,
  }
}

const getResizeHandles = (
  canvasScreenRect: CanvasScreenRect
): ResizeHandle[] => [
  {
    edge: "left",
    className: "cursor-ew-resize",
    style: {
      left: canvasScreenRect.left - RESIZE_HANDLE_THICKNESS - RESIZE_HANDLE_GAP,
      top: canvasScreenRect.top,
      width: RESIZE_HANDLE_THICKNESS,
      height: canvasScreenRect.height,
    },
    barStyle: {
      left: RESIZE_HANDLE_THICKNESS / 2,
      top: canvasScreenRect.height / 2,
      width: 5,
      height: 64,
      transform: "translate(-50%, -50%)",
    },
  },
  {
    edge: "right",
    className: "cursor-ew-resize",
    style: {
      left: canvasScreenRect.left + canvasScreenRect.width + RESIZE_HANDLE_GAP,
      top: canvasScreenRect.top,
      width: RESIZE_HANDLE_THICKNESS,
      height: canvasScreenRect.height,
    },
    barStyle: {
      left: RESIZE_HANDLE_THICKNESS / 2,
      top: canvasScreenRect.height / 2,
      width: 5,
      height: 64,
      transform: "translate(-50%, -50%)",
    },
  },
  {
    edge: "top",
    className: "cursor-ns-resize",
    style: {
      left: canvasScreenRect.left,
      top: canvasScreenRect.top - RESIZE_HANDLE_THICKNESS - RESIZE_HANDLE_GAP,
      width: canvasScreenRect.width,
      height: RESIZE_HANDLE_THICKNESS,
    },
    barStyle: {
      left: canvasScreenRect.width / 2,
      top: RESIZE_HANDLE_THICKNESS / 2,
      width: 64,
      height: 5,
      transform: "translate(-50%, -50%)",
    },
  },
  {
    edge: "bottom",
    className: "cursor-ns-resize",
    style: {
      left: canvasScreenRect.left,
      top: canvasScreenRect.top + canvasScreenRect.height + RESIZE_HANDLE_GAP,
      width: canvasScreenRect.width,
      height: RESIZE_HANDLE_THICKNESS,
    },
    barStyle: {
      left: canvasScreenRect.width / 2,
      top: RESIZE_HANDLE_THICKNESS / 2,
      width: 64,
      height: 5,
      transform: "translate(-50%, -50%)",
    },
  },
]

export function CanvasResizeOverlay({
  canvasScreenRect,
  resizeDrag,
  scale,
  onStartResize,
}: CanvasResizeOverlayProps) {
  const resizeHandles = getResizeHandles(canvasScreenRect)
  const resizePreview = getResizePreview(resizeDrag, canvasScreenRect, scale)

  return (
    <>
      {resizeHandles.map((handle) => (
        <div
          key={handle.edge}
          className={`group absolute z-10 touch-manipulation-none ${handle.className}`}
          style={handle.style}
          onPointerDown={(event) => onStartResize(handle.edge, event)}
        >
          <div
            className={`pointer-events-none absolute rounded-full transition-all ${
              resizeDrag?.edge === handle.edge
                ? "bg-primary shadow-[0_0_0_4px_color-mix(in_oklab,var(--primary)_14%,transparent)]"
                : "bg-primary/45 group-hover:bg-primary group-hover:shadow-[0_0_0_4px_color-mix(in_oklab,var(--primary)_14%,transparent)]"
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
            className={`pointer-events-none absolute z-20 text-xl font-semibold tabular-nums ${resizePreview.colorClass.split(" ").at(-1)}`}
            style={{
              ...resizePreview.labelStyle,
              transform: "translate(-50%, -50%)",
            }}
          >
            {resizePreview.value}
          </div>
        </>
      )}
    </>
  )
}
