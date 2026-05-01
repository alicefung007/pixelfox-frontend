import type React from "react"
import type { Point } from "./types"

type CanvasCoordinatesParams = {
  clientX: number
  clientY: number
  rect: DOMRect
  viewOffset: Point
  zoom: number
  width: number
  height: number
}

export const getCanvasCoordinates = ({
  clientX,
  clientY,
  rect,
  viewOffset,
  zoom,
  width,
  height,
}: CanvasCoordinatesParams): Point | null => {
  const viewX = clientX - rect.left
  const viewY = clientY - rect.top
  const scale = zoom / 10
  // Convert viewport coordinates into pixel-art coordinates.
  const x = Math.floor((viewX - viewOffset.x) / scale)
  const y = Math.floor((viewY - viewOffset.y) / scale)

  if (x >= 0 && x < width && y >= 0 && y < height) {
    return { x, y }
  }
  return null
}

export const getCanvasAnchorFromCoords = (
  coords: Point,
  viewOffset: Point,
  zoom: number
): Point => {
  const scale = zoom / 10
  return {
    x: viewOffset.x + (coords.x + 0.5) * scale,
    y: viewOffset.y + (coords.y + 0.5) * scale,
  }
}

export const getTouchDistance = (touches: React.TouchList) => {
  if (touches.length < 2) return 0
  const dx = touches[0].clientX - touches[1].clientX
  const dy = touches[0].clientY - touches[1].clientY
  return Math.sqrt(dx * dx + dy * dy)
}

export const getTouchMidpoint = (touches: React.TouchList): Point => {
  if (touches.length < 2) return { x: 0, y: 0 }
  return {
    x: (touches[0].clientX + touches[1].clientX) / 2,
    y: (touches[0].clientY + touches[1].clientY) / 2,
  }
}

export const getCursorShadowColor = (primaryColor: string) => {
  // Pick a contrasting drop shadow for cursors that inherit the active color.
  const hex = primaryColor.replace("#", "")
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.5 ? "#bbbbbb" : "#ffffff"
}
