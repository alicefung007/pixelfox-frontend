import React, {
  useRef,
  useCallback,
  useEffect,
  useLayoutEffect,
  useState,
} from "react"
import { useEditorStore } from "@/store/useEditorStore"
import { usePaletteStore } from "@/store/usePaletteStore"
import { useTheme } from "@/components/theme-provider"
import {
  clampZoom,
  getLinePoints,
  isLikelyMouseWheel,
  normalizeHex,
} from "@/lib/utils"
import { EDITOR_CONFIG } from "@/lib/constants"
import { CanvasCursorOverlay } from "./pixel-canvas/CanvasCursorOverlay"
import { CanvasResizeOverlay } from "./pixel-canvas/CanvasResizeOverlay"
import { CanvasZoomControls } from "./pixel-canvas/CanvasZoomControls"
import { WandSelectionPopover } from "./pixel-canvas/WandSelectionPopover"
import { renderPixelCanvas } from "./pixel-canvas/canvasRenderer"
import {
  getCanvasAnchorFromCoords,
  getCanvasCoordinates,
  getTouchDistance,
  getTouchMidpoint,
} from "./pixel-canvas/geometry"
import {
  floodFillPixels,
  getContiguousColorKeys,
} from "./pixel-canvas/selection"
import type {
  CursorOverlay,
  ResizeDrag,
  ResizeEdge,
  WandSelection,
} from "./pixel-canvas/types"

type PixelCanvasProps = {
  onOpenReplaceColorDialog: (sourceColor: string, pixelKeys?: string[]) => void
}

export default function PixelCanvas({
  onOpenReplaceColorDialog,
}: PixelCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const pixels = useEditorStore((state) => state.pixels)
  const width = useEditorStore((state) => state.width)
  const height = useEditorStore((state) => state.height)
  const backgroundColor = useEditorStore((state) => state.backgroundColor)
  const zoom = useEditorStore((state) => state.zoom)
  const setPixel = useEditorStore((state) => state.setPixel)
  const clearPixel = useEditorStore((state) => state.clearPixel)
  const setPixels = useEditorStore((state) => state.setPixels)
  const resizeFromEdge = useEditorStore((state) => state.resizeFromEdge)
  const currentTool = useEditorStore((state) => state.currentTool)
  const primaryColor = useEditorStore((state) => state.primaryColor)
  const setZoom = useEditorStore((state) => state.setZoom)
  const saveHistory = useEditorStore((state) => state.saveHistory)
  const addUsedColor = usePaletteStore((state) => state.addUsedColor)
  const addRecentColor = usePaletteStore((state) => state.addRecentColor)
  const selectedUsedColor = usePaletteStore((state) => state.selectedUsedColor)

  // Viewport state: auto-fit centers the canvas, manual pan/zoom disables it.
  const [isAutoZoom, setIsAutoZoom] = useState(true)
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 })
  const [viewOffset, setViewOffset] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [resizeDrag, setResizeDrag] = useState<ResizeDrag | null>(null)
  const panLastRef = useRef<{ x: number; y: number } | null>(null)

  // Native/global event handlers need fresh zoom and offset values without re-binding.
  const zoomRef = useRef(zoom)
  const isGestureRef = useRef(false)
  const gestureStartRef = useRef<{
    distance: number
    midpoint: { x: number; y: number }
    zoom: number
    offset: { x: number; y: number }
  } | null>(null)
  const viewOffsetRef = useRef(viewOffset)

  // Cursor updates are animation-frame throttled so mousemove does not force every React render.
  const [cursorOverlay, setCursorOverlay] = useState<CursorOverlay>({
    x: 0,
    y: 0,
    visible: false,
  })
  const cursorRafRef = useRef<number | null>(null)
  const cursorPendingRef = useRef<CursorOverlay>(cursorOverlay)
  const strokeColorRegisteredRef = useRef(false)
  const [primaryThemeColor, setPrimaryThemeColor] = useState(
    "oklch(0.68 0.19 48)"
  )
  const [wandSelection, setWandSelection] = useState<WandSelection | null>(null)
  const { theme } = useTheme()
  const [systemTheme, setSystemTheme] = useState<"dark" | "light">(() => {
    if (typeof window === "undefined" || !("matchMedia" in window))
      return "light"
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light"
  })

  useEffect(() => {
    zoomRef.current = zoom
  }, [zoom])

  useEffect(() => {
    viewOffsetRef.current = viewOffset
  }, [viewOffset])

  useEffect(() => {
    cursorPendingRef.current = cursorOverlay
  }, [cursorOverlay])

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
  }, [pixels, wandSelection])

  useEffect(() => {
    if (theme !== "system") return
    if (!("matchMedia" in window)) return
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
    const handleChange = () =>
      setSystemTheme(mediaQuery.matches ? "dark" : "light")
    handleChange()
    mediaQuery.addEventListener("change", handleChange)
    return () => mediaQuery.removeEventListener("change", handleChange)
  }, [theme])

  useEffect(() => {
    if (typeof window === "undefined") return
    const nextPrimary = getComputedStyle(document.documentElement)
      .getPropertyValue("--primary")
      .trim()
    if (nextPrimary) queueMicrotask(() => setPrimaryThemeColor(nextPrimary))
  }, [theme, systemTheme])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Fit zoom is based on the current container size and pixel-art dimensions.
    const updateZoomToFit = () => {
      if (!isAutoZoom) return
      if (container.offsetParent === null) return
      if (container.clientWidth === 0 || container.clientHeight === 0) return

      const availableWidth =
        container.clientWidth - EDITOR_CONFIG.AUTO_FIT_PADDING
      const availableHeight =
        container.clientHeight - EDITOR_CONFIG.AUTO_FIT_PADDING
      if (availableWidth <= 0 || availableHeight <= 0) return

      const scaleX = availableWidth / width
      const scaleY = availableHeight / height
      const nextZoom = clampZoom(Math.floor(Math.min(scaleX, scaleY) * 10))
      setZoom(nextZoom)
    }

    const resizeObserver = new ResizeObserver(updateZoomToFit)
    resizeObserver.observe(container)

    updateZoomToFit()

    return () => resizeObserver.disconnect()
  }, [width, height, setZoom, isAutoZoom])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const updateViewport = () => {
      setViewportSize({
        width: container.clientWidth,
        height: container.clientHeight,
      })
    }

    const resizeObserver = new ResizeObserver(updateViewport)
    resizeObserver.observe(container)
    updateViewport()
    return () => resizeObserver.disconnect()
  }, [])

  useLayoutEffect(() => {
    if (!isAutoZoom) return
    if (viewportSize.width === 0 || viewportSize.height === 0) return

    // Keep the canvas centered after auto-fit recalculates zoom or viewport size changes.
    const scale = zoom / 10
    const contentWidth = width * scale
    const contentHeight = height * scale
    const x = (viewportSize.width - contentWidth) / 2
    const y = (viewportSize.height - contentHeight) / 2
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setViewOffset({ x, y })
  }, [isAutoZoom, viewportSize.width, viewportSize.height, zoom, width, height])
  const [isDrawing, setIsDrawing] = useState(false)
  const [lastCoords, setLastCoords] = useState<{ x: number; y: number } | null>(
    null
  )

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const container = containerRef.current
    if (!container) return

    renderPixelCanvas({
      canvas,
      container,
      pixels,
      width,
      height,
      zoom,
      viewOffset,
      theme,
      systemTheme,
      backgroundColor,
      selectedUsedColor,
      wandSelection,
      primaryThemeColor,
    })
  }, [
    pixels,
    width,
    height,
    zoom,
    viewOffset,
    viewportSize.width,
    viewportSize.height,
    theme,
    systemTheme,
    backgroundColor,
    selectedUsedColor,
    wandSelection,
    primaryThemeColor,
  ])

  const getCoordinates = (e: React.MouseEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return null
    return getCanvasCoordinates({
      clientX: e.clientX,
      clientY: e.clientY,
      rect: canvas.getBoundingClientRect(),
      viewOffset,
      zoom,
      width,
      height,
    })
  }

  const getCoordinatesFromTouch = (e: React.TouchEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return null
    return getCanvasCoordinates({
      clientX: e.touches[0].clientX,
      clientY: e.touches[0].clientY,
      rect: canvas.getBoundingClientRect(),
      viewOffset,
      zoom,
      width,
      height,
    })
  }

  const handleWandSelection = (coords: { x: number; y: number } | null) => {
    if (!coords) return

    // Empty pixels clear the current wand selection instead of opening the action popover.
    const targetColor = pixels[`${coords.x},${coords.y}`] ?? null
    if (!targetColor) {
      setWandSelection(null)
      return
    }

    const normalizedTargetColor = normalizeHex(targetColor)
    const selectedKeys = getContiguousColorKeys({
      startX: coords.x,
      startY: coords.y,
      targetColor,
      width,
      height,
      pixels,
    })
    const anchor = getCanvasAnchorFromCoords(coords, viewOffset, zoom)
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
  }, [saveHistory, setPixels, wandSelection])

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

  const floodFill = (
    startX: number,
    startY: number,
    targetColor: string | null,
    replacementColor: string
  ) => {
    const newPixels = floodFillPixels({
      startX,
      startY,
      targetColor,
      replacementColor,
      width,
      height,
      pixels,
    })
    if (!newPixels) return

    setPixels(newPixels)
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
          isErase ? clearPixel(p.x, p.y) : setPixel(p.x, p.y, primaryColor)
        )
      } else {
        if (isErase) clearPixel(coords.x, coords.y)
        else setPixel(coords.x, coords.y, primaryColor)
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

  useEffect(() => {
    return () => {
      if (cursorRafRef.current !== null)
        cancelAnimationFrame(cursorRafRef.current)
    }
  }, [])

  const queueCursorOverlay = (next: {
    x: number
    y: number
    visible: boolean
  }) => {
    cursorPendingRef.current = next
    if (cursorRafRef.current !== null) return

    // Coalesce cursor overlay updates to one React state update per frame.
    cursorRafRef.current = requestAnimationFrame(() => {
      cursorRafRef.current = null
      setCursorOverlay(cursorPendingRef.current)
    })
  }

  const updateCursorFromMouseEvent = (e: React.MouseEvent) => {
    const container = containerRef.current
    if (!container) return
    const rect = container.getBoundingClientRect()
    queueCursorOverlay({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      visible: true,
    })
  }

  const onTouchStart = (e: React.TouchEvent) => {
    if (resizeDrag) return
    if (e.touches.length >= 2) {
      // Two-finger gesture: pinch zoom + pan.
      e.preventDefault()
      isGestureRef.current = true
      setIsAutoZoom(false)
      setIsDrawing(false)
      setLastCoords(null)
      const container = containerRef.current
      if (container) {
        const rect = container.getBoundingClientRect()
        gestureStartRef.current = {
          distance: getTouchDistance(e.touches),
          midpoint: {
            x: getTouchMidpoint(e.touches).x - rect.left,
            y: getTouchMidpoint(e.touches).y - rect.top,
          },
          zoom: zoomRef.current,
          offset: viewOffsetRef.current,
        }
      }
      return
    }

    if (e.touches.length === 1) {
      if (currentTool === "hand") {
        e.preventDefault()
        setIsAutoZoom(false)
        setIsDrawing(false)
        setLastCoords(null)
        setIsPanning(true)
        panLastRef.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
        }
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
        handleWandSelection(getCoordinatesFromTouch(e))
        return
      }
      strokeColorRegisteredRef.current = false
      setIsDrawing(true)
      handleDraw(getCoordinatesFromTouch(e))
    }
  }

  const onTouchMove = (e: React.TouchEvent) => {
    if (resizeDrag) return
    if (isGestureRef.current && e.touches.length >= 2) {
      e.preventDefault()
      const start = gestureStartRef.current
      if (!start) return

      const container = containerRef.current
      if (!container) return

      const rect = container.getBoundingClientRect()
      const currentDistance = getTouchDistance(e.touches)
      const currentMidpoint = getTouchMidpoint(e.touches)
      const screenMidpoint = {
        x: currentMidpoint.x - rect.left,
        y: currentMidpoint.y - rect.top,
      }

      // Calculate zoom
      if (currentDistance > 0 && start.distance > 0) {
        const scale = currentDistance / start.distance
        const newZoom = clampZoom(Math.round(start.zoom * scale))
        const nextScale = newZoom / 10

        // Preserve the world point under the gesture midpoint while zooming.
        const dx = screenMidpoint.x - start.midpoint.x
        const dy = screenMidpoint.y - start.midpoint.y

        const startScale = start.zoom / 10
        const worldX = (start.midpoint.x - start.offset.x) / startScale
        const worldY = (start.midpoint.y - start.offset.y) / startScale

        setZoom(newZoom)
        setViewOffset({
          x: screenMidpoint.x - worldX * nextScale + dx,
          y: screenMidpoint.y - worldY * nextScale + dy,
        })
      }
      return
    }

    if (e.touches.length === 1 && isPanning) {
      e.preventDefault()
      const last = panLastRef.current
      if (!last) return
      const dx = e.touches[0].clientX - last.x
      const dy = e.touches[0].clientY - last.y
      panLastRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
      setViewOffset((prev) => ({ x: prev.x + dx, y: prev.y + dy }))
      return
    }

    if (isDrawing) {
      handleDraw(getCoordinatesFromTouch(e))
    }
  }

  const onTouchEnd = (e: React.TouchEvent) => {
    if (resizeDrag) return
    if (e.touches.length < 2 && isGestureRef.current) {
      isGestureRef.current = false
      gestureStartRef.current = null
    }
    if (e.touches.length === 0) {
      if (isGestureRef.current) {
        isGestureRef.current = false
        gestureStartRef.current = null
      }
      if (isPanning) {
        setIsPanning(false)
        panLastRef.current = null
      }
      if (isDrawing) {
        saveHistory()
      }
      strokeColorRegisteredRef.current = false
      setIsDrawing(false)
      setLastCoords(null)
    }
  }

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
      handleWandSelection(getCoordinates(e))
      return
    }
    strokeColorRegisteredRef.current = false
    setIsDrawing(true)
    handleDraw(getCoordinates(e))
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
      handleDraw(getCoordinates(e))
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
  }, [isPanning])

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
  }, [isDrawing, isPanning, saveHistory])

  useEffect(() => {
    if (!resizeDrag) return

    // Resize drag previews dimensions in pixels; the store is updated only on pointer release.
    const handleWindowPointerMove = (event: PointerEvent) => {
      const scale = zoomRef.current / 10
      if (scale <= 0) return

      setResizeDrag((current) => {
        if (!current) return current

        if (current.edge === "left" || current.edge === "right") {
          const deltaPixels = Math.round(
            (event.clientX - current.startClientX) / scale
          )
          const nextWidth =
            current.edge === "right"
              ? current.startWidth + deltaPixels
              : current.startWidth - deltaPixels
          const clampedWidth = Math.max(1, Math.min(200, nextWidth))
          return clampedWidth === current.previewSize
            ? current
            : { ...current, previewSize: clampedWidth }
        }

        const deltaPixels = Math.round(
          (event.clientY - current.startClientY) / scale
        )
        const nextHeight =
          current.edge === "bottom"
            ? current.startHeight + deltaPixels
            : current.startHeight - deltaPixels
        const clampedHeight = Math.max(1, Math.min(200, nextHeight))
        return clampedHeight === current.previewSize
          ? current
          : { ...current, previewSize: clampedHeight }
      })
    }

    const finishResize = () => {
      const activeDrag = resizeDrag
      if (!activeDrag) return

      if (
        activeDrag.previewSize !==
        (activeDrag.edge === "left" || activeDrag.edge === "right"
          ? activeDrag.startWidth
          : activeDrag.startHeight)
      ) {
        resizeFromEdge(activeDrag.edge, activeDrag.previewSize)

        if (activeDrag.edge === "left") {
          const widthDelta = activeDrag.previewSize - activeDrag.startWidth
          const scale = zoomRef.current / 10
          setViewOffset({
            x: activeDrag.startOffset.x - widthDelta * scale,
            y: activeDrag.startOffset.y,
          })
        }

        if (activeDrag.edge === "top") {
          const heightDelta = activeDrag.previewSize - activeDrag.startHeight
          const scale = zoomRef.current / 10
          setViewOffset({
            x: activeDrag.startOffset.x,
            y: activeDrag.startOffset.y - heightDelta * scale,
          })
        }

        saveHistory()
      }

      setResizeDrag(null)
    }

    window.addEventListener("pointermove", handleWindowPointerMove)
    window.addEventListener("pointerup", finishResize)
    window.addEventListener("pointercancel", finishResize)
    window.addEventListener("blur", finishResize)

    return () => {
      window.removeEventListener("pointermove", handleWindowPointerMove)
      window.removeEventListener("pointerup", finishResize)
      window.removeEventListener("pointercancel", finishResize)
      window.removeEventListener("blur", finishResize)
    }
  }, [resizeDrag, resizeFromEdge, saveHistory])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Wheel input zooms around the pointer for mouse wheels, and pans for trackpad scroll.
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      setIsAutoZoom(false)

      if (e.ctrlKey || e.metaKey || isLikelyMouseWheel(e)) {
        const rect = container.getBoundingClientRect()
        const mouseX = e.clientX - rect.left
        const mouseY = e.clientY - rect.top

        const zoomNow = zoomRef.current
        const offsetNow = viewOffsetRef.current
        const scale = zoomNow / 10
        const worldX = (mouseX - offsetNow.x) / scale
        const worldY = (mouseY - offsetNow.y) / scale

        const factor = Math.exp(-e.deltaY / 80)
        const nextZoom = clampZoom(Math.round(zoomNow * factor))
        if (nextZoom === zoomNow) return

        const nextScale = nextZoom / 10
        setZoom(nextZoom)
        setViewOffset({
          x: mouseX - worldX * nextScale,
          y: mouseY - worldY * nextScale,
        })
        return
      }

      let dx = e.deltaX
      let dy = e.deltaY
      if (e.deltaMode === 1) {
        dx *= 16
        dy *= 16
      } else if (e.deltaMode === 2) {
        dx *= container.clientWidth
        dy *= container.clientHeight
      }

      const panSpeed = EDITOR_CONFIG.PAN_SPEED
      setViewOffset((prev) => ({
        x: prev.x - dx * panSpeed,
        y: prev.y - dy * panSpeed,
      }))
    }

    container.addEventListener("wheel", handleWheel, { passive: false })
    return () => container.removeEventListener("wheel", handleWheel)
  }, [setZoom])

  const zoomByStep = (direction: "in" | "out") => {
    const container = containerRef.current
    if (!container) return

    // Toolbar zoom keeps the center of the viewport anchored.
    setIsAutoZoom(false)
    const anchorX = container.clientWidth / 2
    const anchorY = container.clientHeight / 2
    const scale = zoom / 10
    const worldX = (anchorX - viewOffset.x) / scale
    const worldY = (anchorY - viewOffset.y) / scale
    const step = EDITOR_CONFIG.ZOOM_STEP
    const nextZoom = clampZoom(direction === "in" ? zoom + step : zoom - step)
    const nextScale = nextZoom / 10
    setZoom(nextZoom)
    setViewOffset({
      x: anchorX - worldX * nextScale,
      y: anchorY - worldY * nextScale,
    })
  }

  const isOverlayTool =
    currentTool === "brush" ||
    currentTool === "bucket" ||
    currentTool === "wand" ||
    currentTool === "eraser" ||
    currentTool === "eyedropper"
  const cursorClass = resizeDrag
    ? resizeDrag.edge === "left" || resizeDrag.edge === "right"
      ? "cursor-ew-resize"
      : "cursor-ns-resize"
    : isPanning
      ? "cursor-grabbing"
      : currentTool === "hand"
        ? "cursor-grab"
        : currentTool === "text"
          ? "cursor-text"
          : isOverlayTool
            ? "cursor-none"
            : "cursor-crosshair"
  const scale = zoom / 10
  const canvasScreenRect = {
    left: viewOffset.x,
    top: viewOffset.y,
    width: width * scale,
    height: height * scale,
  }

  const onCanvasLeave = () => {
    if (!isPanning) onMouseUp()
    queueCursorOverlay({
      x: cursorPendingRef.current.x,
      y: cursorPendingRef.current.y,
      visible: false,
    })
  }

  const startResize = (
    edge: ResizeEdge,
    event: React.PointerEvent<HTMLDivElement>
  ) => {
    event.preventDefault()
    event.stopPropagation()

    // Lock the resize interaction to the handle, then finish globally on pointerup.
    event.currentTarget.setPointerCapture(event.pointerId)
    setIsAutoZoom(false)
    setIsPanning(false)
    setIsDrawing(false)
    setLastCoords(null)
    strokeColorRegisteredRef.current = false
    queueCursorOverlay({
      x: cursorPendingRef.current.x,
      y: cursorPendingRef.current.y,
      visible: false,
    })
    setResizeDrag({
      edge,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startWidth: width,
      startHeight: height,
      startOffset: viewOffsetRef.current,
      previewSize: edge === "left" || edge === "right" ? width : height,
    })
  }

  return (
    <div className="relative h-full w-full touch-manipulation-none overflow-hidden">
      <div
        ref={containerRef}
        className="absolute inset-0 touch-manipulation-none overflow-hidden bg-background"
      >
        <canvas
          ref={canvasRef}
          className={`absolute inset-0 h-full w-full touch-manipulation-none ${cursorClass}`}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onCanvasLeave}
          onContextMenu={(e) => {
            if (isPanning || currentTool === "hand") e.preventDefault()
          }}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        />
        <WandSelectionPopover
          selection={wandSelection}
          onOpenChange={(open) => {
            if (open) return
            setWandSelection(null)
          }}
          onReplace={onOpenReplaceColorDialog}
          onClear={handleClearWandSelection}
          onClose={() => setWandSelection(null)}
        />
        <CanvasResizeOverlay
          canvasScreenRect={canvasScreenRect}
          resizeDrag={resizeDrag}
          scale={scale}
          onStartResize={startResize}
        />
        <CanvasCursorOverlay
          currentTool={currentTool}
          cursorOverlay={cursorOverlay}
          isPanning={isPanning}
          isResizing={Boolean(resizeDrag)}
          primaryColor={primaryColor}
          primaryThemeColor={primaryThemeColor}
        />
      </div>

      <CanvasZoomControls
        zoom={zoom}
        isAutoZoom={isAutoZoom}
        onZoomOut={() => zoomByStep("out")}
        onZoomIn={() => zoomByStep("in")}
        onFitToScreen={() => setIsAutoZoom(true)}
      />
    </div>
  )
}
