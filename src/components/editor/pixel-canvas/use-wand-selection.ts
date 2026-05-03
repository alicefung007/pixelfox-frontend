import { useCallback, useEffect, useState } from "react"
import { normalizeHex } from "@/lib/utils"
import { useEditorStore } from "@/store/useEditorStore"
import type { WandSelection } from "./types"
import { getCanvasAnchorFromCoords, getContiguousColorKeys } from "./geometry"

export function useWandSelection(params: {
  pixels: Record<string, string>
  width: number
  height: number
  zoom: number
  viewOffset: { x: number; y: number }
  setPixels: (pixels: Record<string, string>) => void
  saveHistory: () => void
}) {
  const { pixels, width, height, zoom, viewOffset, setPixels, saveHistory } =
    params
  const [wandSelection, setWandSelectionState] = useState<WandSelection | null>(
    null
  )
  const [wandAnchorSelection, setWandAnchorSelection] =
    useState<WandSelection | null>(null)

  const setWandSelection = useCallback((selection: WandSelection | null) => {
    if (selection) {
      setWandAnchorSelection(selection)
    }
    setWandSelectionState(selection)
  }, [])

  useEffect(() => {
    if (!wandSelection) return

    // Drop the floating wand actions when the selected color region no longer exists.
    const stillValid = wandSelection.keys.some((key) => {
      const color = pixels[key]
      return color && normalizeHex(color) === normalizeHex(wandSelection.color)
    })

    if (!stillValid) {
      queueMicrotask(() => setWandSelection(null))
    }
  }, [pixels, setWandSelection, wandSelection])

  const handleWandSelection = (coords: { x: number; y: number } | null) => {
    if (!coords) return

    // Empty pixels clear the current wand selection instead of opening the action popover.
    const targetColor = pixels[`${coords.x},${coords.y}`] ?? null
    if (!targetColor) {
      setWandSelection(null)
      return
    }

    const normalizedTargetColor = normalizeHex(targetColor)
    const selectedKeys = getContiguousColorKeys(
      pixels,
      width,
      height,
      coords.x,
      coords.y,
      targetColor
    )
    const anchor = getCanvasAnchorFromCoords(coords, zoom, viewOffset)
    useEditorStore.getState().setColor(targetColor)
    setWandSelection({
      ...anchor,
      color: normalizedTargetColor,
      keys: selectedKeys,
    })
  }

  const handleClearWandSelection = useCallback(() => {
    if (!wandSelection) return

    // Rebuild the pixel map so only still-matching selected pixels are removed.
    const selectedKeys = new Set(wandSelection.keys)
    let changed = false
    const currentPixels = useEditorStore.getState().pixels
    const nextPixels: Record<string, string> = {}

    for (const [key, color] of Object.entries(currentPixels)) {
      if (
        selectedKeys.has(key) &&
        normalizeHex(color) === normalizeHex(wandSelection.color)
      ) {
        changed = true
        continue
      }
      nextPixels[key] = color
    }

    if (!changed) return

    setPixels(nextPixels)
    saveHistory()
    setWandSelection(null)
  }, [saveHistory, setPixels, setWandSelection, wandSelection])

  useEffect(() => {
    if (!wandSelection) return

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return
      }

      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (event.key !== "Backspace" && event.key !== "Delete") return

      event.preventDefault()
      event.stopImmediatePropagation()
      handleClearWandSelection()
    }

    window.addEventListener("keydown", handleKeyDown, { capture: true })
    return () =>
      window.removeEventListener("keydown", handleKeyDown, { capture: true })
  }, [handleClearWandSelection, wandSelection])

  return {
    wandSelection,
    wandAnchorSelection,
    setWandSelection,
    handleWandSelection,
    handleClearWandSelection,
  }
}
