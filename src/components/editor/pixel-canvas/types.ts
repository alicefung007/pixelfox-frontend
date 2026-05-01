import type { CSSProperties } from "react"
import type { ToolType } from "@/store/useEditorStore"

export type { ToolType }

export type Point = {
  x: number
  y: number
}

export type ResizeEdge = "left" | "right" | "top" | "bottom"

export type ResizeDrag = {
  edge: ResizeEdge
  startClientX: number
  startClientY: number
  startWidth: number
  startHeight: number
  startOffset: Point
  previewSize: number
}

export type WandSelection = Point & {
  color: string
  keys: string[]
}

export type CursorOverlay = Point & {
  visible: boolean
}

export type CanvasScreenRect = {
  left: number
  top: number
  width: number
  height: number
}

export type ResizePreview = {
  panelStyle: CSSProperties
  labelStyle: CSSProperties
  colorClass: string
  value: string
}

export type ResizeHandle = {
  edge: ResizeEdge
  className: string
  style: CSSProperties
  barStyle: CSSProperties
}
