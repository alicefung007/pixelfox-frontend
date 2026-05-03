import React from "react"
import { useEditorStore } from "@/store/useEditorStore"
import { getLinePoints } from "@/lib/utils"
import { computeFloodFill } from "./geometry"

export function useToolActions(params: {
  pixels: Record<string, string>
  width: number
  height: number
  currentTool: string
  primaryColor: string
  setPixelFast: (x: number, y: number, color: string) => void
  clearPixelFast: (x: number, y: number) => void
  setPixels: (pixels: Record<string, string>) => void
  addUsedColor: (color: string) => void
  addRecentColor: (color: string) => void
  lastCoords: { x: number; y: number } | null
  setLastCoords: (coords: { x: number; y: number } | null) => void
  strokeColorRegisteredRef: React.MutableRefObject<boolean>
}) {
  const {
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
  } = params

  const floodFill = (
    startX: number,
    startY: number,
    targetColor: string | null,
    replacementColor: string
  ) => {
    const next = computeFloodFill(
      pixels,
      width,
      height,
      startX,
      startY,
      targetColor,
      replacementColor
    )
    if (!next) return
    setPixels(next)
    addUsedColor(replacementColor)
    addRecentColor(replacementColor)
  }

  const handleDraw = (coords: { x: number; y: number } | null) => {
    if (!coords) return

    // Brush and eraser interpolate between points so quick drags do not leave gaps.
    if (currentTool === "brush" || currentTool === "eraser") {
      const isErase = currentTool === "eraser"

      if (lastCoords) {
        const points = getLinePoints(
          lastCoords.x,
          lastCoords.y,
          coords.x,
          coords.y
        )
        points.forEach((p) =>
          isErase
            ? clearPixelFast(p.x, p.y)
            : setPixelFast(p.x, p.y, primaryColor)
        )
      } else {
        if (isErase) clearPixelFast(coords.x, coords.y)
        else setPixelFast(coords.x, coords.y, primaryColor)
      }

      if (!isErase && !strokeColorRegisteredRef.current) {
        addUsedColor(primaryColor)
        addRecentColor(primaryColor)
        strokeColorRegisteredRef.current = true
      }
      setLastCoords(coords)
    } else if (currentTool === "bucket") {
      // Bucket commits through setPixels, then history is saved when the pointer interaction ends.
      const targetColor = pixels[`${coords.x},${coords.y}`] ?? null
      floodFill(coords.x, coords.y, targetColor, primaryColor)
      if (!strokeColorRegisteredRef.current) {
        addUsedColor(primaryColor)
        addRecentColor(primaryColor)
        strokeColorRegisteredRef.current = true
      }
    } else if (currentTool === "eyedropper") {
      // Eyedropper returns to brush after picking to keep drawing flow fast.
      const pickedColor = pixels[`${coords.x},${coords.y}`] || "#FFFFFF"
      useEditorStore.getState().setColor(pickedColor)
      useEditorStore.getState().setTool("brush")
    }
  }

  return { handleDraw }
}
