import {
  type PointerEvent,
  type TouchEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import confetti from "canvas-confetti"
import { useTranslation } from "react-i18next"
import { Check, Minus, Plus, SlidersHorizontal, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import AssemblyStepPanel from "@/components/editor/AssemblyStepPanel"
import { getSystemPalette, type PaletteSwatch } from "@/lib/palettes"
import {
  clampPatternGridInterval,
  getNearWhiteSwatches,
  PATTERN_GRID_COLORS,
  sanitizePatternGridColor,
} from "@/components/editor/pattern-dialog-shared"
import {
  cn,
  hexToRgb,
  isDarkColor,
  isLikelyMouseWheel,
  normalizeHex,
} from "@/lib/utils"
import { useEditorStore } from "@/store/useEditorStore"
import { usePaletteStore } from "@/store/usePaletteStore"

type Props = {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  standalone?: boolean
}

type AssemblyStep = {
  color: string
  label: string
  count: number
}

type AssemblySettings = {
  showGrid: boolean
  showMinorGrid: boolean
  gridInterval: number
  gridColor: string
  showAxis: boolean
  showColorCode: boolean
  excludedColorCodes: string[]
  mirrorFlip: boolean
}

type RenderResult = {
  dataUrl: string
  width: number
  height: number
}

type AssemblyPreviewMetrics = {
  cellSize: number
  contentWidth: number
  contentHeight: number
  edgePadding: number
  width: number
  height: number
}

type AssemblyProgress = {
  activeIndex: number
  completedColors: string[]
}

const AXIS_TEXT_COLOR = "#94A3B8"
const ASSEMBLY_SETTINGS_STORAGE_KEY = "pixelfox-assembly-dialog-settings"
const ASSEMBLY_PROGRESS_STORAGE_KEY_PREFIX = "pixelfox-assembly-progress"
const PREVIEW_MIN_SCALE = 0.1
const PREVIEW_MAX_SCALE = 10
const PREVIEW_SCALE_STEP = 0.12
const PREVIEW_PAN_SPEED = 1
const ASSEMBLY_AXIS_SIZE = 32
const ASSEMBLY_PREVIEW_MARGIN = 24
const ASSEMBLY_PREVIEW_CELL_SIZE = 40
const ASSEMBLY_MIN_CELL_SIZE = 8
const ASSEMBLY_MAX_EDGE = 122880
const ASSEMBLY_STEP_PANEL_BREAKPOINT = 640
const DEFAULT_ASSEMBLY_SETTINGS: AssemblySettings = {
  showGrid: true,
  showMinorGrid: true,
  gridInterval: 10,
  gridColor: PATTERN_GRID_COLORS[0],
  showAxis: false,
  showColorCode: false,
  excludedColorCodes: [],
  mirrorFlip: false,
}

function getAssemblyCellLabelFontSize(cellSize: number, labelLength: number) {
  return Math.max(
    8,
    Math.min(14, Math.floor(cellSize / Math.max(labelLength * 0.62, 2.8)))
  )
}

function getAssemblyPreviewMetrics({
  width,
  height,
  showAxis,
}: {
  width: number
  height: number
  showAxis: boolean
}): AssemblyPreviewMetrics {
  const axisSize = showAxis ? ASSEMBLY_AXIS_SIZE : 0
  const edgePadding = axisSize + ASSEMBLY_PREVIEW_MARGIN
  const cellSize = Math.max(
    ASSEMBLY_MIN_CELL_SIZE,
    Math.min(
      ASSEMBLY_PREVIEW_CELL_SIZE,
      Math.floor(
        (ASSEMBLY_MAX_EDGE - edgePadding * 2) / Math.max(width, height, 1)
      )
    )
  )
  const contentWidth = width * cellSize
  const contentHeight = height * cellSize

  return {
    cellSize,
    contentWidth,
    contentHeight,
    edgePadding,
    width: contentWidth + edgePadding * 2,
    height: contentHeight + edgePadding * 2,
  }
}

function shouldOpenAssemblySettingsByDefault() {
  if (typeof window === "undefined") return false
  return window.matchMedia(`(min-width: ${ASSEMBLY_STEP_PANEL_BREAKPOINT}px)`)
    .matches
}

function getDefaultPreviewOffset(viewportSize: {
  width: number
  height: number
}) {
  if (viewportSize.width <= 0 || viewportSize.height <= 0) return { x: 0, y: 0 }

  if (viewportSize.width < ASSEMBLY_STEP_PANEL_BREAKPOINT) {
    return {
      x: 0,
      y: Math.min(72, Math.round(viewportSize.height * 0.14)),
    }
  }

  return {
    x: -Math.min(36, Math.round(viewportSize.width * 0.03)),
    y: 0,
  }
}

function getFallbackLabel(index: number) {
  const letter = String.fromCharCode(65 + Math.floor(index / 9))
  return `${letter}${(index % 9) + 1}`
}

function hashString(value: string) {
  let hash = 2166136261
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(36)
}

function getAssemblyProgressStorageKey({
  currentPaletteId,
  height,
  pixels,
  width,
}: {
  currentPaletteId: string
  height: number
  pixels: Record<string, string>
  width: number
}) {
  const pixelSignature = Object.entries(pixels)
    .map(([key, color]) => `${key}:${normalizeHex(color)}`)
    .sort()
    .join("|")
  const signature = `${currentPaletteId}:${width}x${height}:${pixelSignature}`
  return `${ASSEMBLY_PROGRESS_STORAGE_KEY_PREFIX}:${hashString(signature)}`
}

function loadAssemblyProgress(storageKey: string): AssemblyProgress | null {
  if (typeof window === "undefined") return null

  try {
    const raw = window.localStorage.getItem(storageKey)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<AssemblyProgress>
    if (!Array.isArray(parsed.completedColors)) return null
    return {
      activeIndex: Number.isFinite(parsed.activeIndex)
        ? Math.max(0, Math.floor(parsed.activeIndex ?? 0))
        : 0,
      completedColors: parsed.completedColors.map(normalizeHex),
    }
  } catch {
    return null
  }
}

function saveAssemblyProgress(storageKey: string, progress: AssemblyProgress) {
  if (typeof window === "undefined") return

  try {
    window.localStorage.setItem(storageKey, JSON.stringify(progress))
  } catch {
    // Ignore storage quota or privacy-mode failures; assembly still works in memory.
  }
}

function loadAssemblySettings(): AssemblySettings {
  if (typeof window === "undefined") return DEFAULT_ASSEMBLY_SETTINGS

  try {
    const raw = window.localStorage.getItem(ASSEMBLY_SETTINGS_STORAGE_KEY)
    if (!raw) return DEFAULT_ASSEMBLY_SETTINGS
    const parsed = JSON.parse(raw) as Partial<AssemblySettings>

    return {
      showGrid: parsed.showGrid ?? DEFAULT_ASSEMBLY_SETTINGS.showGrid,
      showMinorGrid:
        parsed.showMinorGrid ?? DEFAULT_ASSEMBLY_SETTINGS.showMinorGrid,
      gridInterval: clampPatternGridInterval(
        typeof parsed.gridInterval === "number"
          ? parsed.gridInterval
          : Number.NaN,
        DEFAULT_ASSEMBLY_SETTINGS.gridInterval
      ),
      gridColor: sanitizePatternGridColor(
        parsed.gridColor,
        DEFAULT_ASSEMBLY_SETTINGS.gridColor
      ),
      showAxis: parsed.showAxis ?? DEFAULT_ASSEMBLY_SETTINGS.showAxis,
      showColorCode:
        parsed.showColorCode ?? DEFAULT_ASSEMBLY_SETTINGS.showColorCode,
      excludedColorCodes: Array.isArray(parsed.excludedColorCodes)
        ? parsed.excludedColorCodes
        : [],
      mirrorFlip: parsed.mirrorFlip ?? DEFAULT_ASSEMBLY_SETTINGS.mirrorFlip,
    }
  } catch {
    return DEFAULT_ASSEMBLY_SETTINGS
  }
}

function getContrastText(color: string) {
  const rgb = hexToRgb(color)
  if (!rgb) return "#0F172A"
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255
  return luminance > 0.62 ? "rgba(15,23,42,0.72)" : "rgba(255,255,255,0.96)"
}

function drawVerticalGridLine(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  height: number,
  width: number
) {
  const alignedWidth = Math.max(1, Math.round(width))
  const startX = Math.round(x - alignedWidth / 2)
  ctx.fillRect(startX, Math.round(y), alignedWidth, Math.round(height))
}

function drawHorizontalGridLine(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number
) {
  const alignedHeight = Math.max(1, Math.round(height))
  const startY = Math.round(y - alignedHeight / 2)
  ctx.fillRect(Math.round(x), startY, Math.round(width), alignedHeight)
}

function clampPreviewScale(scale: number) {
  return Math.min(
    PREVIEW_MAX_SCALE,
    Math.max(PREVIEW_MIN_SCALE, Number(scale.toFixed(2)))
  )
}

function getTouchDistance(touches: TouchEvent<HTMLDivElement>["touches"]) {
  if (touches.length < 2) return 0
  const dx = touches[0].clientX - touches[1].clientX
  const dy = touches[0].clientY - touches[1].clientY
  return Math.sqrt(dx * dx + dy * dy)
}

function getTouchMidpoint(touches: TouchEvent<HTMLDivElement>["touches"]) {
  if (touches.length < 2) return { x: 0, y: 0 }
  return {
    x: (touches[0].clientX + touches[1].clientX) / 2,
    y: (touches[0].clientY + touches[1].clientY) / 2,
  }
}

function drawAssemblyPreview(
  canvas: HTMLCanvasElement,
  {
    pixels,
    width,
    height,
    activeColor,
    activeLabel,
    showGrid,
    showMinorGrid,
    gridInterval,
    gridColor,
    showAxis,
    showBorder = true,
    showColorCode,
    excludedColorCodes,
    mirrorFlip,
  }: {
    pixels: Record<string, string>
    width: number
    height: number
    activeColor: string | null
    activeLabel: string | null
    showGrid: boolean
    showMinorGrid: boolean
    gridInterval: number
    gridColor: string
    showAxis: boolean
    showBorder?: boolean
    showColorCode: boolean
    excludedColorCodes: Set<string>
    mirrorFlip: boolean
  }
) {
  const {
    cellSize,
    contentWidth,
    contentHeight,
    edgePadding,
    width: canvasWidth,
    height: canvasHeight,
  } = getAssemblyPreviewMetrics({ width, height, showAxis })

  if (canvas.width !== canvasWidth) canvas.width = canvasWidth
  if (canvas.height !== canvasHeight) canvas.height = canvasHeight

  const ctx = canvas.getContext("2d")
  if (!ctx) return

  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = "#FFFFFF"
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  const offsetX = edgePadding
  const offsetY = edgePadding

  ctx.save()
  ctx.translate(offsetX, offsetY)
  ctx.imageSmoothingEnabled = false

  ctx.fillStyle = "#FFFFFF"
  ctx.fillRect(0, 0, contentWidth, contentHeight)

  const normalizedActiveColor = activeColor ? normalizeHex(activeColor) : null
  const cellLabelFontSize = getAssemblyCellLabelFontSize(
    cellSize,
    activeLabel?.length ?? 2
  )
  for (const [key, color] of Object.entries(pixels)) {
    const [x, y] = key.split(",").map(Number)
    if (Number.isNaN(x) || Number.isNaN(y)) continue
    if (x < 0 || y < 0 || x >= width || y >= height) continue
    const isActive =
      !normalizedActiveColor || normalizeHex(color) === normalizedActiveColor
    const drawX = mirrorFlip ? width - 1 - x : x

    ctx.globalAlpha = isActive ? 1 : 0.18
    ctx.fillStyle = color
    ctx.fillRect(drawX * cellSize, y * cellSize, cellSize, cellSize)
  }
  ctx.globalAlpha = 1

  if (
    showColorCode &&
    normalizedActiveColor &&
    !excludedColorCodes.has(normalizedActiveColor) &&
    activeLabel &&
    cellSize >= 20
  ) {
    ctx.save()
    ctx.font = `700 ${cellLabelFontSize}px Geist, sans-serif`
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillStyle = getContrastText(`#${normalizedActiveColor}`)
    for (const [key, color] of Object.entries(pixels)) {
      if (normalizeHex(color) !== normalizedActiveColor) continue
      const [x, y] = key.split(",").map(Number)
      if (Number.isNaN(x) || Number.isNaN(y)) continue
      const drawX = mirrorFlip ? width - 1 - x : x
      ctx.fillText(
        activeLabel,
        drawX * cellSize + cellSize / 2,
        y * cellSize + cellSize / 2
      )
    }
    ctx.restore()
  }

  if (showGrid) {
    if (showMinorGrid) {
      ctx.globalAlpha = 0.28
      ctx.fillStyle = gridColor
      for (let x = 0; x <= width; x++) {
        drawVerticalGridLine(ctx, x * cellSize, 0, contentHeight, 2)
      }
      for (let y = 0; y <= height; y++) {
        drawHorizontalGridLine(ctx, 0, y * cellSize, contentWidth, 2)
      }
      ctx.globalAlpha = 1
    }

    ctx.fillStyle = gridColor
    for (let x = 0; x <= width; x += gridInterval) {
      drawVerticalGridLine(ctx, x * cellSize, 0, contentHeight, 2)
    }
    if (width % gridInterval !== 0) {
      drawVerticalGridLine(ctx, contentWidth, 0, contentHeight, 2)
    }
    for (let y = 0; y <= height; y += gridInterval) {
      drawHorizontalGridLine(ctx, 0, y * cellSize, contentWidth, 2)
    }
    if (height % gridInterval !== 0) {
      drawHorizontalGridLine(ctx, 0, contentHeight, contentWidth, 2)
    }
  } else if (showBorder) {
    ctx.strokeStyle = "rgba(15,23,42,0.16)"
    ctx.lineWidth = 1
    ctx.strokeRect(0.5, 0.5, contentWidth - 1, contentHeight - 1)
  }

  if (showAxis && cellSize >= 12) {
    ctx.save()
    ctx.fillStyle = AXIS_TEXT_COLOR
    ctx.font = `600 ${cellLabelFontSize}px Geist, sans-serif`
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    for (let x = 0; x < width; x++) {
      const sourceX = mirrorFlip ? width - x : x + 1
      ctx.fillText(String(sourceX), x * cellSize + cellSize / 2, -14)
      ctx.fillText(
        String(sourceX),
        x * cellSize + cellSize / 2,
        contentHeight + 14
      )
    }

    ctx.textAlign = "right"
    for (let y = 0; y < height; y++) {
      ctx.fillText(String(y + 1), -8, y * cellSize + cellSize / 2)
    }
    ctx.textAlign = "left"
    for (let y = 0; y < height; y++) {
      ctx.fillText(String(y + 1), contentWidth + 8, y * cellSize + cellSize / 2)
    }
    ctx.restore()
  }

  if (showBorder) {
    ctx.lineWidth = 2
    ctx.strokeStyle = "rgba(17, 24, 39, 0.35)"
    ctx.strokeRect(0, 0, contentWidth, contentHeight)
  }
  ctx.restore()

  return
}

function renderAssemblyThumbnail({
  pixels,
  mirrorFlip,
  width,
}: {
  pixels: Record<string, string>
  mirrorFlip: boolean
  width: number
}): RenderResult | null {
  if (typeof document === "undefined") return null

  const entries = Object.entries(pixels)
    .map(([key, color]) => {
      const [x, y] = key.split(",").map(Number)
      const drawX = mirrorFlip ? width - 1 - x : x
      return { drawX, y, color }
    })
    .filter(({ drawX, y }) => !Number.isNaN(drawX) && !Number.isNaN(y))

  if (entries.length === 0) return null

  const minX = Math.min(...entries.map(({ drawX }) => drawX))
  const maxX = Math.max(...entries.map(({ drawX }) => drawX))
  const minY = Math.min(...entries.map(({ y }) => y))
  const maxY = Math.max(...entries.map(({ y }) => y))
  const cellSize = ASSEMBLY_PREVIEW_CELL_SIZE
  const contentWidth = (maxX - minX + 1) * cellSize
  const contentHeight = (maxY - minY + 1) * cellSize
  const canvas = document.createElement("canvas")
  canvas.width = contentWidth
  canvas.height = contentHeight

  const ctx = canvas.getContext("2d")
  if (!ctx) return null

  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.imageSmoothingEnabled = false

  for (const { drawX, y, color } of entries) {
    ctx.fillStyle = color
    ctx.fillRect(
      (drawX - minX) * cellSize,
      (y - minY) * cellSize,
      cellSize,
      cellSize
    )
  }

  return {
    dataUrl: canvas.toDataURL("image/png"),
    width: canvas.width,
    height: canvas.height,
  }
}

export default function AssemblyDialog({
  open = true,
  onOpenChange,
  standalone = false,
}: Props) {
  const { t } = useTranslation()
  const pixels = useEditorStore((state) => state.pixels)
  const width = useEditorStore((state) => state.width)
  const height = useEditorStore((state) => state.height)
  const currentPaletteId = usePaletteStore((state) => state.currentPaletteId)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [completionOpen, setCompletionOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [completedColors, setCompletedColors] = useState<Set<string>>(
    () => new Set()
  )
  const currentPalette = useMemo(
    () => getSystemPalette(currentPaletteId),
    [currentPaletteId]
  )
  const nearWhiteSwatches = useMemo<PaletteSwatch[]>(
    () => getNearWhiteSwatches(currentPalette),
    [currentPalette]
  )
  const persistedSettings = useMemo(() => loadAssemblySettings(), [])
  const [showGrid, setShowGrid] = useState(persistedSettings.showGrid)
  const [showMinorGrid, setShowMinorGrid] = useState(
    persistedSettings.showMinorGrid
  )
  const [gridInterval, setGridInterval] = useState(
    persistedSettings.gridInterval
  )
  const [draftGridInterval, setDraftGridInterval] = useState([
    persistedSettings.gridInterval,
  ])
  const [gridColor, setGridColor] = useState(persistedSettings.gridColor)
  const [showAxis, setShowAxis] = useState(persistedSettings.showAxis)
  const [showColorCode, setShowColorCode] = useState(
    persistedSettings.showColorCode
  )
  const [excludedColorCodes, setExcludedColorCodes] = useState<Set<string>>(
    () => new Set(persistedSettings.excludedColorCodes.map(normalizeHex))
  )
  const [mirrorFlip, setMirrorFlip] = useState(persistedSettings.mirrorFlip)
  const [previewScale, setPreviewScale] = useState(1)
  const [previewOffset, setPreviewOffset] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [previewViewportElement, setPreviewViewportElement] =
    useState<HTMLDivElement | null>(null)
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 })
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const previewViewportRef = useRef<HTMLDivElement | null>(null)
  const previewScaleRef = useRef(previewScale)
  const previewOffsetRef = useRef(previewOffset)
  const previewGestureRef = useRef<{
    distance: number
    midpoint: { x: number; y: number }
    scale: number
    offset: { x: number; y: number }
  } | null>(null)
  const previewDragRef = useRef<{
    pointerId: number
    startX: number
    startY: number
    offset: { x: number; y: number }
  } | null>(null)
  const completionShownRef = useRef(false)
  const handleClose = () => onOpenChange?.(false)

  const steps = useMemo<AssemblyStep[]>(() => {
    const usage = new Map<string, number>()
    for (const color of Object.values(pixels)) {
      const normalizedColor = normalizeHex(color)
      usage.set(normalizedColor, (usage.get(normalizedColor) ?? 0) + 1)
    }

    const palette = getSystemPalette(currentPaletteId)
    const paletteLabels = new Map(
      palette?.swatches.map((swatch) => [
        normalizeHex(swatch.color),
        swatch.label,
      ]) ?? []
    )

    return Array.from(usage.entries())
      .filter(([color]) => !excludedColorCodes.has(normalizeHex(color)))
      .map(([color, count], index) => ({
        color,
        count,
        label: paletteLabels.get(color) ?? getFallbackLabel(index),
      }))
      .sort(
        (a, b) =>
          b.count - a.count ||
          a.label.localeCompare(b.label, undefined, { numeric: true })
      )
  }, [currentPaletteId, excludedColorCodes, pixels])

  const clampedActiveIndex = Math.min(
    activeIndex,
    Math.max(steps.length - 1, 0)
  )
  const activeStep = steps[clampedActiveIndex] ?? null
  const totalBeadCount = steps.reduce((total, step) => total + step.count, 0)
  const completedBeadCount = steps.reduce(
    (total, step) => total + (completedColors.has(step.color) ? step.count : 0),
    0
  )
  const progress =
    totalBeadCount === 0
      ? 0
      : Number(((completedBeadCount / totalBeadCount) * 100).toFixed(2))
  const assemblyProgressStorageKey = useMemo(
    () =>
      getAssemblyProgressStorageKey({
        currentPaletteId,
        height,
        pixels,
        width,
      }),
    [currentPaletteId, height, pixels, width]
  )
  const excludedColorCodeList = useMemo(
    () => Array.from(excludedColorCodes),
    [excludedColorCodes]
  )
  const previewResult = useMemo(
    () =>
      steps.length === 0
        ? null
        : getAssemblyPreviewMetrics({
            width,
            height,
            showAxis,
          }),
    [height, showAxis, steps.length, width]
  )
  const completionPreviewResult = useMemo(
    () =>
      steps.length === 0
        ? null
        : renderAssemblyThumbnail({
            pixels,
            width,
            mirrorFlip,
          }),
    [mirrorFlip, pixels, steps.length, width]
  )

  useEffect(() => {
    const canvas = previewCanvasRef.current
    if (!canvas || !previewResult) return

    drawAssemblyPreview(canvas, {
      pixels,
      width,
      height,
      activeColor: activeStep?.color ?? null,
      activeLabel: activeStep?.label ?? null,
      showGrid,
      showMinorGrid,
      gridInterval,
      gridColor,
      showAxis,
      showColorCode,
      excludedColorCodes,
      mirrorFlip,
    })
  }, [
    activeStep?.color,
    activeStep?.label,
    excludedColorCodes,
    gridColor,
    gridInterval,
    height,
    mirrorFlip,
    pixels,
    previewResult,
    showAxis,
    showColorCode,
    showGrid,
    showMinorGrid,
    width,
  ])

  useEffect(() => {
    if (!completionOpen) return

    const fire = (options: confetti.Options) => {
      void confetti({
        disableForReducedMotion: true,
        ...options,
      })
    }

    fire({
      particleCount: 90,
      spread: 70,
      origin: { x: 0.5, y: 0.62 },
    })

    const bursts = [
      window.setTimeout(() => {
        fire({
          particleCount: 45,
          angle: 60,
          spread: 55,
          origin: { x: 0.08, y: 0.72 },
        })
      }, 180),
      window.setTimeout(() => {
        fire({
          particleCount: 45,
          angle: 120,
          spread: 55,
          origin: { x: 0.92, y: 0.72 },
        })
      }, 280),
    ]

    return () => {
      bursts.forEach(window.clearTimeout)
    }
  }, [completionOpen])

  useEffect(() => {
    if (!open) return
    const defaultColor = nearWhiteSwatches[0]?.color
    queueMicrotask(() => {
      setExcludedColorCodes((current) => {
        if (current.size > 0) return current
        return defaultColor ? new Set([normalizeHex(defaultColor)]) : new Set()
      })
    })
  }, [nearWhiteSwatches, open])

  useEffect(() => {
    if (typeof window === "undefined") return
    window.localStorage.setItem(
      ASSEMBLY_SETTINGS_STORAGE_KEY,
      JSON.stringify({
        showGrid,
        showMinorGrid,
        gridInterval,
        gridColor,
        showAxis,
        showColorCode,
        excludedColorCodes: excludedColorCodeList,
        mirrorFlip,
      } satisfies AssemblySettings)
    )
  }, [
    excludedColorCodeList,
    gridColor,
    gridInterval,
    mirrorFlip,
    showAxis,
    showColorCode,
    showGrid,
    showMinorGrid,
  ])

  useEffect(() => {
    previewScaleRef.current = previewScale
  }, [previewScale])

  useEffect(() => {
    previewOffsetRef.current = previewOffset
  }, [previewOffset])

  const resetPreviewTransform = useCallback(() => {
    const element = previewViewportRef.current
    const defaultOffset = getDefaultPreviewOffset({
      width: element?.clientWidth ?? viewportSize.width,
      height: element?.clientHeight ?? viewportSize.height,
    })
    previewScaleRef.current = 1
    previewOffsetRef.current = defaultOffset
    setPreviewScale(1)
    setPreviewOffset(defaultOffset)
  }, [viewportSize.height, viewportSize.width])

  useEffect(() => {
    if (!open) return
    queueMicrotask(() => resetPreviewTransform())
  }, [open, resetPreviewTransform])

  useEffect(() => {
    const el = previewViewportElement
    if (!el) return
    const update = () =>
      setViewportSize({ width: el.clientWidth, height: el.clientHeight })
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [previewViewportElement])

  const baseImageSize = useMemo(() => {
    if (!previewResult) return null
    if (viewportSize.width <= 0 || viewportSize.height <= 0) return null
    const sW = (viewportSize.width * 0.9) / previewResult.width
    const sH = (viewportSize.height * 0.9) / previewResult.height
    const scale = Math.min(sW, sH)
    return {
      width: previewResult.width * scale,
      height: previewResult.height * scale,
    }
  }, [previewResult, viewportSize.width, viewportSize.height])

  const persistProgress = useCallback(
    (nextActiveIndex: number, nextCompletedColors: Set<string>) => {
      saveAssemblyProgress(assemblyProgressStorageKey, {
        activeIndex: nextActiveIndex,
        completedColors: Array.from(nextCompletedColors),
      })
    },
    [assemblyProgressStorageKey]
  )

  const restorePersistedProgress = useCallback(() => {
    const persisted = loadAssemblyProgress(assemblyProgressStorageKey)
    const stepColors = new Set(steps.map((step) => normalizeHex(step.color)))
    const restoredCompletedColors = new Set(
      (persisted?.completedColors ?? []).filter((color) =>
        stepColors.has(normalizeHex(color))
      )
    )
    const restoredActiveIndex = Math.min(
      Math.max(persisted?.activeIndex ?? 0, 0),
      Math.max(steps.length - 1, 0)
    )

    setActiveIndex(restoredActiveIndex)
    setCompletedColors(restoredCompletedColors)
    setCompletionOpen(false)
    completionShownRef.current =
      restoredCompletedColors.size > 0 &&
      restoredCompletedColors.size >= steps.length
  }, [assemblyProgressStorageKey, steps])

  useEffect(() => {
    if (!open) return
    queueMicrotask(() => {
      restorePersistedProgress()
      setSettingsOpen(standalone && shouldOpenAssemblySettingsByDefault())
    })
  }, [open, restorePersistedProgress, standalone])

  const goToStep = (direction: -1 | 1) => {
    const nextActiveIndex = Math.min(
      Math.max(clampedActiveIndex + direction, 0),
      Math.max(steps.length - 1, 0)
    )
    setActiveIndex(nextActiveIndex)
    persistProgress(nextActiveIndex, completedColors)
  }

  const markComplete = () => {
    if (!activeStep) return
    const alreadyCompleted = completedColors.has(activeStep.color)
    const nextCompletedColors = new Set(completedColors)
    let nextActiveIndex = clampedActiveIndex

    if (alreadyCompleted) {
      nextCompletedColors.delete(activeStep.color)
      setCompletionOpen(false)
      completionShownRef.current = false
    } else {
      nextCompletedColors.add(activeStep.color)
      nextActiveIndex = Math.min(
        clampedActiveIndex + 1,
        Math.max(steps.length - 1, 0)
      )
    }

    const nextCompletedBeadCount = alreadyCompleted
      ? completedBeadCount - activeStep.count
      : completedBeadCount + activeStep.count
    const willComplete =
      totalBeadCount > 0 && nextCompletedBeadCount >= totalBeadCount

    setCompletedColors(nextCompletedColors)
    persistProgress(nextActiveIndex, nextCompletedColors)
    if (willComplete && !completionShownRef.current) {
      completionShownRef.current = true
      setCompletionOpen(true)
    }
    setActiveIndex(nextActiveIndex)
  }

  const selectStep = (index: number) => {
    setActiveIndex(index)
    persistProgress(index, completedColors)
  }

  const handleToggleExcludedColor = (color: string) => {
    const key = normalizeHex(color)
    setExcludedColorCodes((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const handleGridIntervalChange = (value: number[]) => {
    setDraftGridInterval(value)
  }

  const handleGridIntervalCommit = (value: number[]) => {
    const nextValue = value[0] ?? gridInterval
    setDraftGridInterval([nextValue])
    setGridInterval(nextValue)
  }

  const zoomPreviewAtPoint = (
    nextScale: number,
    anchor: { x: number; y: number }
  ) => {
    const element = previewViewportRef.current
    if (!element) return

    const rect = element.getBoundingClientRect()
    const currentScale = previewScaleRef.current
    const currentOffset = previewOffsetRef.current
    const clampedScale = clampPreviewScale(nextScale)
    const anchorX = anchor.x - rect.left
    const anchorY = anchor.y - rect.top
    const centerX = rect.width / 2
    const centerY = rect.height / 2

    if (clampedScale === currentScale) return

    const worldX = (anchorX - centerX - currentOffset.x) / currentScale
    const worldY = (anchorY - centerY - currentOffset.y) / currentScale

    const nextOffset = {
      x: anchorX - centerX - worldX * clampedScale,
      y: anchorY - centerY - worldY * clampedScale,
    }

    previewScaleRef.current = clampedScale
    previewOffsetRef.current = nextOffset
    setPreviewScale(clampedScale)
    setPreviewOffset(nextOffset)
  }

  const panPreviewByDelta = (dx: number, dy: number) => {
    const nextOffset = {
      x: previewOffsetRef.current.x - dx * PREVIEW_PAN_SPEED,
      y: previewOffsetRef.current.y - dy * PREVIEW_PAN_SPEED,
    }
    previewOffsetRef.current = nextOffset
    setPreviewOffset(nextOffset)
  }

  const stepPreviewScale = (delta: number) => {
    const element = previewViewportRef.current
    if (!element) return
    const rect = element.getBoundingClientRect()
    zoomPreviewAtPoint(previewScaleRef.current + delta, {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    })
  }

  const stopPreviewDrag = () => {
    previewDragRef.current = null
    setIsDragging(false)
  }

  const handlePreviewPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!previewResult) return
    if (event.pointerType !== "mouse") return
    if (event.button !== 0) return
    if (event.target instanceof HTMLElement && event.target.closest("button"))
      return
    if (
      event.target instanceof Element &&
      event.target.closest('[data-assembly-step-panel="true"]')
    ) {
      return
    }

    previewDragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      offset: previewOffsetRef.current,
    }
    setIsDragging(true)
    event.currentTarget.setPointerCapture(event.pointerId)
    event.preventDefault()
  }

  const handlePreviewPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = previewDragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return

    const nextOffset = {
      x: drag.offset.x + (event.clientX - drag.startX),
      y: drag.offset.y + (event.clientY - drag.startY),
    }

    previewOffsetRef.current = nextOffset
    setPreviewOffset(nextOffset)
  }

  const handlePreviewPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const drag = previewDragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    stopPreviewDrag()
  }

  const handlePreviewPointerCancel = (event: PointerEvent<HTMLDivElement>) => {
    const drag = previewDragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    stopPreviewDrag()
  }

  const handlePreviewTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    if (!previewResult) return
    if (event.touches.length < 2) return

    event.preventDefault()
    const element = previewViewportRef.current
    if (!element) return
    const rect = element.getBoundingClientRect()
    const midpoint = getTouchMidpoint(event.touches)
    previewGestureRef.current = {
      distance: getTouchDistance(event.touches),
      midpoint: {
        x: midpoint.x - rect.left,
        y: midpoint.y - rect.top,
      },
      scale: previewScaleRef.current,
      offset: previewOffsetRef.current,
    }
  }

  const handlePreviewTouchMove = (event: TouchEvent<HTMLDivElement>) => {
    if (!previewResult) return
    if (event.touches.length < 2) return

    event.preventDefault()
    const start = previewGestureRef.current
    const element = previewViewportRef.current
    if (!start || !element) return

    const rect = element.getBoundingClientRect()
    const currentDistance = getTouchDistance(event.touches)
    const midpoint = getTouchMidpoint(event.touches)
    const screenMidpoint = {
      x: midpoint.x - rect.left,
      y: midpoint.y - rect.top,
    }

    if (currentDistance <= 0 || start.distance <= 0) return

    const nextScale = clampPreviewScale(
      start.scale * (currentDistance / start.distance)
    )
    const worldX =
      (start.midpoint.x - rect.width / 2 - start.offset.x) / start.scale
    const worldY =
      (start.midpoint.y - rect.height / 2 - start.offset.y) / start.scale
    const nextOffset = {
      x: screenMidpoint.x - rect.width / 2 - worldX * nextScale,
      y: screenMidpoint.y - rect.height / 2 - worldY * nextScale,
    }

    previewScaleRef.current = nextScale
    previewOffsetRef.current = nextOffset
    setPreviewScale(nextScale)
    setPreviewOffset(nextOffset)
  }

  const handlePreviewTouchEnd = () => {
    previewGestureRef.current = null
  }

  useEffect(() => {
    if (!open) return
    const element = previewViewportElement
    if (!element) return

    const handleNativeWheel = (event: WheelEvent) => {
      if (!previewResult) return
      event.preventDefault()
      event.stopPropagation()
      if (event.ctrlKey || event.metaKey || isLikelyMouseWheel(event)) {
        const factor = Math.exp(-event.deltaY / 80)
        zoomPreviewAtPoint(previewScaleRef.current * factor, {
          x: event.clientX,
          y: event.clientY,
        })
        return
      }

      let dx = event.deltaX
      let dy = event.deltaY
      if (event.deltaMode === 1) {
        dx *= 16
        dy *= 16
      } else if (event.deltaMode === 2) {
        dx *= element.clientWidth
        dy *= element.clientHeight
      }
      panPreviewByDelta(dx, dy)
    }

    const handleDocumentWheel = (event: WheelEvent) => {
      if (!previewResult) return
      const target = event.target
      if (!(target instanceof Node)) return
      if (
        target instanceof Element &&
        target.closest('[data-assembly-step-panel="true"]')
      ) {
        return
      }
      if (!element.contains(target)) return

      event.preventDefault()
      event.stopPropagation()
      if (event.ctrlKey || event.metaKey || isLikelyMouseWheel(event)) {
        const factor = Math.exp(-event.deltaY / 80)
        zoomPreviewAtPoint(previewScaleRef.current * factor, {
          x: event.clientX,
          y: event.clientY,
        })
        return
      }

      let dx = event.deltaX
      let dy = event.deltaY
      if (event.deltaMode === 1) {
        dx *= 16
        dy *= 16
      } else if (event.deltaMode === 2) {
        dx *= element.clientWidth
        dy *= element.clientHeight
      }
      panPreviewByDelta(dx, dy)
    }

    const preventGestureZoom = (event: Event) => {
      if (!previewResult) return
      event.preventDefault()
      event.stopPropagation()
    }

    element.addEventListener("wheel", handleNativeWheel, { passive: false })
    document.addEventListener("wheel", handleDocumentWheel, {
      passive: false,
      capture: true,
    })
    element.addEventListener(
      "gesturestart",
      preventGestureZoom as EventListener,
      { passive: false }
    )
    element.addEventListener(
      "gesturechange",
      preventGestureZoom as EventListener,
      { passive: false }
    )
    element.addEventListener(
      "gestureend",
      preventGestureZoom as EventListener,
      { passive: false }
    )
    document.addEventListener(
      "gesturestart",
      preventGestureZoom as EventListener,
      { passive: false, capture: true }
    )
    document.addEventListener(
      "gesturechange",
      preventGestureZoom as EventListener,
      { passive: false, capture: true }
    )
    document.addEventListener(
      "gestureend",
      preventGestureZoom as EventListener,
      { passive: false, capture: true }
    )

    return () => {
      element.removeEventListener("wheel", handleNativeWheel)
      document.removeEventListener("wheel", handleDocumentWheel, true)
      element.removeEventListener(
        "gesturestart",
        preventGestureZoom as EventListener
      )
      element.removeEventListener(
        "gesturechange",
        preventGestureZoom as EventListener
      )
      element.removeEventListener(
        "gestureend",
        preventGestureZoom as EventListener
      )
      document.removeEventListener(
        "gesturestart",
        preventGestureZoom as EventListener,
        true
      )
      document.removeEventListener(
        "gesturechange",
        preventGestureZoom as EventListener,
        true
      )
      document.removeEventListener(
        "gestureend",
        preventGestureZoom as EventListener,
        true
      )
    }
  }, [open, previewResult, previewViewportElement])

  const content = (
    <>
      {standalone ? (
        <>
          <h1 className="sr-only">{t("editor.assembly.title")}</h1>
          <p className="sr-only">{t("editor.assembly.description")}</p>
        </>
      ) : (
        <>
          <DialogTitle className="sr-only">
            {t("editor.assembly.title")}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {t("editor.assembly.description")}
          </DialogDescription>
        </>
      )}

      <div className="relative grid h-full grid-rows-[72px_1fr] bg-muted/30">
        <header className="grid grid-cols-[52px_minmax(0,1fr)_52px] items-center border-b bg-background px-3 sm:grid-cols-[96px_minmax(0,1fr)_96px] sm:px-5">
          <Popover open={settingsOpen} onOpenChange={setSettingsOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "size-10 justify-self-start rounded-xl",
                  settingsOpen &&
                    "bg-amber-400 text-foreground hover:bg-amber-400/90"
                )}
              >
                <SlidersHorizontal className="size-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              portalled={false}
              align="start"
              side="bottom"
              sideOffset={14}
              onOpenAutoFocus={(event) => event.preventDefault()}
              className="w-[308px] gap-0 rounded-2xl border border-border/60 p-0 shadow-xl"
            >
              <div className="space-y-4 p-6">
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold">
                    {t("editor.assembly.sectionSettings")}
                  </h3>

                  <div className="flex items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <Label className="text-[11px] font-semibold">
                        {t("editor.exportDialog.showAxis")}
                      </Label>
                      <div className="text-[10px] text-muted-foreground">
                        {t("editor.exportDialog.showAxisHint")}
                      </div>
                    </div>
                    <Switch
                      checked={showAxis}
                      onCheckedChange={setShowAxis}
                      className="data-[state=checked]:border-primary data-[state=checked]:bg-primary"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <Label className="text-[11px] font-semibold">
                        {t("editor.exportDialog.mirrorFlip")}
                      </Label>
                      <div className="text-[10px] text-muted-foreground">
                        {t("editor.exportDialog.mirrorFlipHint")}
                      </div>
                    </div>
                    <Switch
                      checked={mirrorFlip}
                      onCheckedChange={setMirrorFlip}
                      className="data-[state=checked]:border-primary data-[state=checked]:bg-primary"
                    />
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <h3 className="text-sm font-semibold">
                    {t("editor.assembly.sectionColor")}
                  </h3>

                  <div className="flex items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <Label className="text-[11px] font-semibold">
                        {t("editor.exportDialog.showColorCode")}
                      </Label>
                      <div className="text-[10px] text-muted-foreground">
                        {t("editor.assembly.showColorCodeHint")}
                      </div>
                    </div>
                    <Switch
                      checked={showColorCode}
                      onCheckedChange={setShowColorCode}
                      className="data-[state=checked]:border-primary data-[state=checked]:bg-primary"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[11px] font-semibold">
                      {t("editor.exportDialog.excludeColors")}
                    </Label>
                    <div className="grid grid-cols-6 gap-2">
                      {nearWhiteSwatches.map((swatch) => {
                        const key = normalizeHex(swatch.color)
                        const isSelected = excludedColorCodes.has(key)
                        return (
                          <button
                            key={`${swatch.label}-${key}`}
                            type="button"
                            onClick={() =>
                              handleToggleExcludedColor(swatch.color)
                            }
                            className="group relative flex flex-col items-center gap-1 p-0.5 transition-transform hover:scale-105 active:scale-95"
                          >
                            <div
                              className={cn(
                                "relative flex h-9 w-9 items-center justify-center rounded-md border-2 transition-shadow",
                                isSelected
                                  ? "border-primary"
                                  : "border-gray-400/20"
                              )}
                              style={{ backgroundColor: swatch.color }}
                            >
                              <span
                                className={cn(
                                  "text-[8px] font-bold transition-colors",
                                  isDarkColor(swatch.color)
                                    ? "text-white"
                                    : "text-black/60"
                                )}
                              >
                                {swatch.label}
                              </span>
                              {isSelected && (
                                <div className="absolute -top-0.5 -right-0.5 flex size-3 items-center justify-center rounded-full bg-primary text-white shadow-sm">
                                  <Check className="size-2" />
                                </div>
                              )}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <h3 className="text-sm font-semibold">
                    {t("editor.assembly.sectionGrid")}
                  </h3>

                  <div className="flex items-center justify-between gap-3">
                    <Label className="text-[11px] font-semibold">
                      {t("editor.exportDialog.showGrid")}
                    </Label>
                    <Switch
                      checked={showGrid}
                      onCheckedChange={setShowGrid}
                      className="data-[state=checked]:border-primary data-[state=checked]:bg-primary"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <Label
                      className={cn(
                        "text-[11px] font-semibold",
                        !showGrid && "text-muted-foreground"
                      )}
                    >
                      {t("editor.exportDialog.showMinorGrid")}
                    </Label>
                    <Switch
                      checked={showMinorGrid}
                      onCheckedChange={setShowMinorGrid}
                      disabled={!showGrid}
                      className="data-[state=checked]:border-primary data-[state=checked]:bg-primary"
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label
                        className={cn(
                          "text-[11px] font-semibold",
                          !showGrid && "text-muted-foreground"
                        )}
                      >
                        {t("editor.exportDialog.gridInterval")}
                      </Label>
                      <span
                        className={cn(
                          "text-[11px] font-medium",
                          !showGrid && "text-muted-foreground"
                        )}
                      >
                        {draftGridInterval[0]}
                      </span>
                    </div>
                    <Slider
                      value={draftGridInterval}
                      onValueChange={handleGridIntervalChange}
                      onValueCommit={handleGridIntervalCommit}
                      min={1}
                      max={30}
                      disabled={!showGrid}
                      className={cn(
                        "[&_[data-slot=slider-range]]:bg-primary",
                        !showGrid && "[&_[data-slot=slider-range]]:bg-muted"
                      )}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label
                      className={cn(
                        "text-[11px] font-semibold",
                        !showGrid && "text-muted-foreground"
                      )}
                    >
                      {t("editor.exportDialog.gridColor")}
                    </Label>
                    <div
                      className={cn(
                        "grid grid-cols-6 gap-2",
                        !showGrid && "pointer-events-none opacity-50"
                      )}
                    >
                      {PATTERN_GRID_COLORS.map((color) => {
                        const selected =
                          color.toLowerCase() === gridColor.toLowerCase()
                        return (
                          <button
                            key={color}
                            type="button"
                            onClick={() => setGridColor(color)}
                            className="group relative flex flex-col items-center gap-1 p-0.5 transition-transform hover:scale-105 active:scale-95"
                            aria-label={color}
                          >
                            <div
                              className={cn(
                                "relative flex h-9 w-9 items-center justify-center rounded-md border-2 transition-shadow",
                                selected
                                  ? "border-primary"
                                  : "border-gray-400/20"
                              )}
                              style={{ backgroundColor: color }}
                            >
                              {selected && (
                                <div className="absolute -top-0.5 -right-0.5 flex size-3 items-center justify-center rounded-full bg-primary text-white shadow-sm">
                                  <Check className="size-2" />
                                </div>
                              )}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <div className="mx-auto flex w-full max-w-[608px] min-w-0 flex-col items-center gap-1.5">
            <div className="flex max-w-full flex-wrap items-center justify-center gap-x-1.5 gap-y-0 text-center text-sm leading-tight text-muted-foreground">
              <span className="shrink-0">{t("editor.assembly.progress")}</span>
              <span className="shrink-0 tabular-nums">
                {progress.toFixed(2)}%
              </span>
              <span className="shrink-0 text-xs tabular-nums">
                {t("editor.assembly.progressBeadCount", {
                  completed: completedBeadCount,
                  total: totalBeadCount,
                })}
              </span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full border border-gray-400/10 bg-muted">
              <div
                className={cn(
                  "h-full rounded-full transition-[width,background-color]",
                  progress >= 100 ? "bg-emerald-600" : "bg-primary"
                )}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="size-10 justify-self-end rounded-full"
            onClick={handleClose}
          >
            <X className="size-5" />
          </Button>
        </header>

        <main className="relative min-h-0 overflow-hidden">
          {steps.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
              {t("editor.assembly.empty")}
            </div>
          ) : (
            <div
              ref={(node) => {
                previewViewportRef.current = node
                setPreviewViewportElement(node)
              }}
              className="relative flex h-full w-full [touch-action:pan-y] items-center justify-center overflow-hidden overscroll-contain bg-muted/60 md:[touch-action:none]"
              onTouchStart={handlePreviewTouchStart}
              onTouchMove={handlePreviewTouchMove}
              onTouchEnd={handlePreviewTouchEnd}
              onTouchCancel={handlePreviewTouchEnd}
              onPointerDown={handlePreviewPointerDown}
              onPointerMove={handlePreviewPointerMove}
              onPointerUp={handlePreviewPointerUp}
              onPointerCancel={handlePreviewPointerCancel}
              onLostPointerCapture={stopPreviewDrag}
              style={{
                cursor: previewResult
                  ? isDragging
                    ? "grabbing"
                    : "grab"
                  : "default",
              }}
            >
              {previewResult ? (
                <div className="flex h-full min-h-0 w-full min-w-0 items-center justify-center overflow-hidden p-3">
                  <canvas
                    ref={previewCanvasRef}
                    aria-label={t("editor.assembly.title")}
                    role="img"
                    className="rounded-xl border border-border/60 object-contain [image-rendering:pixelated]"
                    style={{
                      width: baseImageSize
                        ? `${baseImageSize.width}px`
                        : undefined,
                      height: baseImageSize
                        ? `${baseImageSize.height}px`
                        : undefined,
                      transform: `translate(${previewOffset.x}px, ${previewOffset.y}px) scale(${previewScale})`,
                      transformOrigin: "center center",
                    }}
                  />
                </div>
              ) : null}

              <div className="absolute right-3 bottom-3 flex items-center gap-1 rounded-xl border border-border/60 bg-background/92 p-1.5 shadow-sm backdrop-blur">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-lg"
                  onClick={() => stepPreviewScale(-PREVIEW_SCALE_STEP)}
                  disabled={!previewResult || previewScale <= PREVIEW_MIN_SCALE}
                >
                  <Minus className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-8 min-w-14 rounded-lg px-2 text-xs font-semibold tabular-nums"
                  onClick={resetPreviewTransform}
                  disabled={!previewResult}
                >
                  {Math.round(previewScale * 100)}%
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-lg"
                  onClick={() => stepPreviewScale(PREVIEW_SCALE_STEP)}
                  disabled={!previewResult || previewScale >= PREVIEW_MAX_SCALE}
                >
                  <Plus className="size-4" />
                </Button>
              </div>

              <AssemblyStepPanel
                activeIndex={clampedActiveIndex}
                activeStep={activeStep}
                completedColors={completedColors}
                onPrevious={() => goToStep(-1)}
                onNext={() => goToStep(1)}
                onSelectStep={selectStep}
                onMarkComplete={markComplete}
                steps={steps}
                beadCountText={(count) =>
                  t("editor.assembly.beadCount", { count })
                }
                emptyText={t("editor.assembly.noStep")}
                markCompleteText={t("editor.assembly.markComplete")}
                completedText={t("editor.assembly.completed")}
              />
            </div>
          )}
        </main>

        {completionOpen && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-background/70 p-6 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-xl border border-border/70 bg-background p-6 text-center shadow-xl">
              {completionPreviewResult ? (
                <img
                  src={completionPreviewResult.dataUrl}
                  alt={t("editor.assembly.title")}
                  className="mx-auto h-auto max-h-48 max-w-full object-contain [image-rendering:pixelated]"
                />
              ) : (
                <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm">
                  <Check className="size-7" />
                </div>
              )}
              <div className="mt-4 space-y-2">
                <h2 className="text-xl font-semibold text-foreground">
                  {t("editor.assembly.completionTitle")}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {t("editor.assembly.completionDescription")}
                </p>
              </div>
              <div className="mt-5 rounded-lg bg-muted px-4 py-3 text-sm font-semibold text-foreground tabular-nums">
                {t("editor.assembly.completionStats", {
                  count: totalBeadCount,
                })}
              </div>
              <Button
                className="mt-5 w-full"
                onClick={() => setCompletionOpen(false)}
              >
                {t("editor.assembly.completionDismiss")}
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  )

  if (standalone) {
    return (
      <div className="h-full w-full overflow-hidden bg-background">
        {content}
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-[100dvh] w-screen max-w-none translate-x-[-50%] translate-y-[-50%] gap-0 overflow-hidden rounded-none border-0 bg-background p-0 shadow-none">
        {content}
      </DialogContent>
    </Dialog>
  )
}
