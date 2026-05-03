import React, { useEffect } from "react"
import { getCoordinates } from "./geometry"
import type { CursorOverlayState } from "./types"

export function usePointerTools(params: {
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  zoom: number
  viewOffset: { x: number; y: number }
  width: number
  height: number
  currentTool: string
  resizeDrag: unknown
  isPanning: boolean
  setIsPanning: (panning: boolean) => void
  panLastRef: React.MutableRefObject<{ x: number; y: number } | null>
  setIsAutoZoom: (auto: boolean) => void
  isDrawing: boolean
  setIsDrawing: React.Dispatch<React.SetStateAction<boolean>>
  setLastCoords: (coords: { x: number; y: number } | null) => void
  setViewOffset: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>
  strokeColorRegisteredRef: React.MutableRefObject<boolean>
  cursorPendingRef: React.MutableRefObject<CursorOverlayState>
  queueCursorOverlay: (next: CursorOverlayState) => void
  updateCursorFromMouseEvent: (e: React.MouseEvent) => void
  handleDraw: (coords: { x: number; y: number } | null) => void
  handleWandSelection: (coords: { x: number; y: number } | null) => void
  saveHistory: () => void
}) {
  const {
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
  } = params

  const onMouseDown = (e: React.MouseEvent) => {
    if (resizeDrag) return
    if (
      (currentTool === "hand" && e.button === 0) ||
      e.button === 1 ||
      e.button === 2
    ) {
      e.preventDefault()
      setIsAutoZoom(false)
      setIsDrawing(false)
      setLastCoords(null)
      setIsPanning(true)
      panLastRef.current = { x: e.clientX, y: e.clientY }
      queueCursorOverlay({
        x: cursorPendingRef.current.x,
        y: cursorPendingRef.current.y,
        visible: false,
      })
      return
    }
    if (currentTool === "wand") {
      e.preventDefault()
      setIsDrawing(false)
      setLastCoords(null)
      handleWandSelection(
        getCoordinates(canvasRef.current, e, zoom, viewOffset, width, height)
      )
      return
    }
    strokeColorRegisteredRef.current = false
    setIsDrawing(true)
    handleDraw(
      getCoordinates(canvasRef.current, e, zoom, viewOffset, width, height)
    )
  }

  const onMouseMove = (e: React.MouseEvent) => {
    if (resizeDrag) return
    if (isPanning) {
      e.preventDefault()
      const last = panLastRef.current
      if (!last) return
      const dx = e.clientX - last.x
      const dy = e.clientY - last.y
      panLastRef.current = { x: e.clientX, y: e.clientY }
      setViewOffset((prev) => ({ x: prev.x + dx, y: prev.y + dy }))
      return
    }
    updateCursorFromMouseEvent(e)
    if (isDrawing && e.buttons === 0) {
      saveHistory()
      strokeColorRegisteredRef.current = false
      setIsDrawing(false)
      setLastCoords(null)
      return
    }
    if (isDrawing) {
      handleDraw(
        getCoordinates(canvasRef.current, e, zoom, viewOffset, width, height)
      )
    }
  }

  const onMouseUp = () => {
    if (resizeDrag) return
    if (isPanning) {
      setIsPanning(false)
      panLastRef.current = null
      return
    }
    if (isDrawing) {
      saveHistory()
    }
    strokeColorRegisteredRef.current = false
    setIsDrawing(false)
    setLastCoords(null)
  }

  const onCanvasLeave = () => {
    if (!isPanning) onMouseUp()
    queueCursorOverlay({
      x: cursorPendingRef.current.x,
      y: cursorPendingRef.current.y,
      visible: false,
    })
  }

  useEffect(() => {
    if (!isPanning) return

    // Continue panning even if the pointer leaves the canvas.
    const handleWindowMouseMove = (e: MouseEvent) => {
      const last = panLastRef.current
      if (!last) return
      const dx = e.clientX - last.x
      const dy = e.clientY - last.y
      panLastRef.current = { x: e.clientX, y: e.clientY }
      setViewOffset((prev) => ({ x: prev.x + dx, y: prev.y + dy }))
    }

    const endPan = () => {
      setIsPanning(false)
      panLastRef.current = null
    }

    window.addEventListener("mousemove", handleWindowMouseMove)
    window.addEventListener("mouseup", endPan)
    window.addEventListener("blur", endPan)
    return () => {
      window.removeEventListener("mousemove", handleWindowMouseMove)
      window.removeEventListener("mouseup", endPan)
      window.removeEventListener("blur", endPan)
    }
  }, [isPanning, panLastRef, setIsPanning, setViewOffset])

  useEffect(() => {
    if (!isDrawing || isPanning) return

    // A drawing stroke should still be committed if the mouseup happens outside the canvas.
    const finishDrawing = () => {
      strokeColorRegisteredRef.current = false
      setIsDrawing((drawing) => {
        if (!drawing) return drawing
        saveHistory()
        return false
      })
      setLastCoords(null)
    }

    window.addEventListener("mouseup", finishDrawing)
    window.addEventListener("blur", finishDrawing)

    return () => {
      window.removeEventListener("mouseup", finishDrawing)
      window.removeEventListener("blur", finishDrawing)
    }
  }, [
    isDrawing,
    isPanning,
    saveHistory,
    setIsDrawing,
    setLastCoords,
    strokeColorRegisteredRef,
  ])

  return { onMouseDown, onMouseMove, onMouseUp, onCanvasLeave }
}
