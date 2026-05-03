import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import { EDITOR_CONFIG } from "@/lib/constants"
import { clampZoom } from "@/lib/utils"

export type ToolType =
  | "brush"
  | "bucket"
  | "hand"
  | "eraser"
  | "eyedropper"
  | "wand"
  | "text"

interface HistoryEntry {
  pixels: Record<string, string>
  width: number
  height: number
}

interface EditorState {
  pixels: Record<string, string> // key: "x,y", value: hex color
  pixelBuffer: Uint32Array // length=width*height; 0=empty, else 0xFFRRGGBB
  pixelsVersion: number // bumped on any pixel mutation; used by renderer caches
  width: number
  height: number
  currentTool: ToolType
  primaryColor: string
  backgroundColor: string | null
  zoom: number
  history: HistoryEntry[]
  historyIndex: number
  uploadOpen: boolean
  exportOpen: boolean

  setPixel: (x: number, y: number, color: string) => void
  clearPixel: (x: number, y: number) => void
  setPixelFast: (x: number, y: number, color: string) => void
  clearPixelFast: (x: number, y: number) => void
  saveHistory: () => void
  setPixels: (pixels: Record<string, string>) => void
  setSize: (width: number, height: number) => void
  resizeFromEdge: (
    edge: "left" | "right" | "top" | "bottom",
    nextSize: number
  ) => void
  setTool: (tool: ToolType) => void
  setColor: (color: string) => void
  setBackgroundColor: (color: string | null) => void
  setZoom: (zoom: number) => void
  undo: () => void
  redo: () => void
  clear: () => void
  setUploadOpen: (open: boolean) => void
  setExportOpen: (open: boolean) => void
}

const DEFAULT_WIDTH = EDITOR_CONFIG.DEFAULT_WIDTH
const DEFAULT_HEIGHT = EDITOR_CONFIG.DEFAULT_HEIGHT

const PIXEL_FILLED_FLAG = 0xff000000

const packPixelHex = (hex: string): number => {
  const raw = hex.startsWith("#") ? hex.slice(1) : hex
  const full =
    raw.length === 3
      ? raw
          .split("")
          .map((c) => c + c)
          .join("")
      : raw
  const rgb = parseInt(full, 16)
  if (Number.isNaN(rgb)) return 0
  return (PIXEL_FILLED_FLAG | rgb) >>> 0
}

const unpackPixelHex = (v: number): string => {
  const rgb = v & 0xffffff
  return "#" + rgb.toString(16).padStart(6, "0").toUpperCase()
}

const buildBufferFromPixels = (
  pixels: Record<string, string>,
  width: number,
  height: number
): Uint32Array => {
  const buf = new Uint32Array(Math.max(1, width * height))
  for (const key in pixels) {
    const commaIdx = key.indexOf(",")
    if (commaIdx < 0) continue
    const x = +key.slice(0, commaIdx)
    const y = +key.slice(commaIdx + 1)
    if (x < 0 || y < 0 || x >= width || y >= height) continue
    buf[y * width + x] = packPixelHex(pixels[key])
  }
  return buf
}

const areRecordsEqual = (
  a: Record<string, string>,
  b: Record<string, string>
): boolean => {
  if (a === b) return true
  const keysA = Object.keys(a)
  if (keysA.length !== Object.keys(b).length) return false
  for (const k of keysA) {
    if (a[k] !== b[k]) return false
  }
  return true
}

const buildPixelsFromBuffer = (
  buf: Uint32Array,
  width: number,
  height: number
): Record<string, string> => {
  const result: Record<string, string> = {}
  for (let y = 0; y < height; y++) {
    const row = y * width
    for (let x = 0; x < width; x++) {
      const v = buf[row + x]
      if (v !== 0) result[`${x},${y}`] = unpackPixelHex(v)
    }
  }
  return result
}
const EDITOR_STORAGE_KEY = "pixelfox-editor-storage"
const EDITOR_CANVAS_STORAGE_KEY = "pixelfox-editor-canvas-storage"
const LEGACY_DEFAULT_PRIMARY_COLOR = "#FF61A6"
const MAX_HISTORY_ENTRIES = 30

const createInitialHistoryEntry = (): HistoryEntry => ({
  pixels: {},
  width: DEFAULT_WIDTH,
  height: DEFAULT_HEIGHT,
})

const limitHistory = (
  history: HistoryEntry[],
  historyIndex: number
): { history: HistoryEntry[]; historyIndex: number } => {
  if (history.length <= MAX_HISTORY_ENTRIES) {
    return { history, historyIndex }
  }

  const overflow = history.length - MAX_HISTORY_ENTRIES
  const nextHistory = history.slice(overflow)
  return {
    history: nextHistory,
    historyIndex: Math.max(0, historyIndex - overflow),
  }
}

const sanitizeHistory = (
  history: HistoryEntry[] | undefined,
  fallbackPixels: Record<string, string>,
  fallbackWidth: number,
  fallbackHeight: number
): { history: HistoryEntry[]; historyIndex: number } => {
  if (!Array.isArray(history) || history.length === 0) {
    return {
      history: [
        {
          pixels: { ...fallbackPixels },
          width: fallbackWidth,
          height: fallbackHeight,
        },
      ],
      historyIndex: 0,
    }
  }

  const sanitizedHistory = history
    .filter((entry): entry is HistoryEntry => Boolean(entry))
    .map((entry) => ({
      pixels: entry.pixels ?? {},
      width: entry.width ?? fallbackWidth,
      height: entry.height ?? fallbackHeight,
    }))

  if (sanitizedHistory.length === 0) {
    return {
      history: [
        {
          pixels: { ...fallbackPixels },
          width: fallbackWidth,
          height: fallbackHeight,
        },
      ],
      historyIndex: 0,
    }
  }

  return limitHistory(sanitizedHistory, sanitizedHistory.length - 1)
}

const sanitizePersistedEditorState = (
  persistedState: Partial<EditorState> | undefined
): Partial<EditorState> => {
  const width = persistedState?.width ?? DEFAULT_WIDTH
  const height = persistedState?.height ?? DEFAULT_HEIGHT
  const pixels = persistedState?.pixels ?? {}
  const { history, historyIndex } = sanitizeHistory(
    persistedState?.history,
    pixels,
    width,
    height
  )

  return {
    ...persistedState,
    primaryColor:
      !persistedState?.primaryColor ||
      persistedState.primaryColor.toUpperCase() === LEGACY_DEFAULT_PRIMARY_COLOR
        ? EDITOR_CONFIG.DEFAULT_PRIMARY_COLOR
        : persistedState.primaryColor,
    pixels,
    width,
    height,
    history,
    historyIndex: Math.min(
      Math.max(persistedState?.historyIndex ?? historyIndex, 0),
      history.length - 1
    ),
    uploadOpen: false,
    exportOpen: false,
  }
}

type PersistedCanvasState = Pick<
  EditorState,
  "pixels" | "width" | "height" | "history" | "historyIndex"
>

const getDefaultCanvasState = (): PersistedCanvasState => ({
  pixels: {},
  width: DEFAULT_WIDTH,
  height: DEFAULT_HEIGHT,
  history: [createInitialHistoryEntry()],
  historyIndex: 0,
})

const loadPersistedCanvasState = (
  fallback?: Partial<EditorState>
): PersistedCanvasState => {
  const fallbackState = sanitizePersistedEditorState(fallback)

  if (typeof window === "undefined") {
    return {
      pixels: fallbackState.pixels ?? {},
      width: fallbackState.width ?? DEFAULT_WIDTH,
      height: fallbackState.height ?? DEFAULT_HEIGHT,
      history: fallbackState.history ?? [createInitialHistoryEntry()],
      historyIndex: fallbackState.historyIndex ?? 0,
    }
  }

  try {
    const raw = window.localStorage.getItem(EDITOR_CANVAS_STORAGE_KEY)
    if (!raw) {
      return {
        pixels: fallbackState.pixels ?? {},
        width: fallbackState.width ?? DEFAULT_WIDTH,
        height: fallbackState.height ?? DEFAULT_HEIGHT,
        history: fallbackState.history ?? [createInitialHistoryEntry()],
        historyIndex: fallbackState.historyIndex ?? 0,
      }
    }

    const parsed = JSON.parse(raw) as Partial<EditorState>
    const sanitized = sanitizePersistedEditorState(parsed)
    return {
      pixels: sanitized.pixels ?? {},
      width: sanitized.width ?? DEFAULT_WIDTH,
      height: sanitized.height ?? DEFAULT_HEIGHT,
      history: sanitized.history ?? [createInitialHistoryEntry()],
      historyIndex: sanitized.historyIndex ?? 0,
    }
  } catch {
    return {
      pixels: fallbackState.pixels ?? {},
      width: fallbackState.width ?? DEFAULT_WIDTH,
      height: fallbackState.height ?? DEFAULT_HEIGHT,
      history: fallbackState.history ?? [createInitialHistoryEntry()],
      historyIndex: fallbackState.historyIndex ?? 0,
    }
  }
}

const writeCanvasStateToStorage = (state: PersistedCanvasState) => {
  if (typeof window === "undefined") return

  if (!EDITOR_CONFIG.PERSIST_HISTORY) {
    // Persist only the current snapshot. Cheap regardless of history depth.
    const payload = JSON.stringify({
      pixels: state.pixels,
      width: state.width,
      height: state.height,
      history: [
        { pixels: state.pixels, width: state.width, height: state.height },
      ],
      historyIndex: 0,
    })
    try {
      window.localStorage.setItem(EDITOR_CANVAS_STORAGE_KEY, payload)
    } catch {
      // Quota exceeded or storage disabled: skip silently.
    }
    return
  }

  // Full-history persistence: serialize the entire undo stack and shrink it on
  // QuotaExceededError by dropping the oldest entries until it fits.
  const persistAttempt = (history: HistoryEntry[], historyIndex: number) =>
    JSON.stringify({
      pixels: state.pixels,
      width: state.width,
      height: state.height,
      history,
      historyIndex,
    })

  const limited = limitHistory(state.history, state.historyIndex)
  let history = limited.history
  let historyIndex = limited.historyIndex

  const persistLimit = Math.max(1, EDITOR_CONFIG.PERSIST_HISTORY_LIMIT)
  if (history.length > persistLimit) {
    const overflow = history.length - persistLimit
    history = history.slice(overflow)
    historyIndex = Math.max(0, historyIndex - overflow)
  }

  while (history.length > 0) {
    try {
      window.localStorage.setItem(
        EDITOR_CANVAS_STORAGE_KEY,
        persistAttempt(history, Math.min(historyIndex, history.length - 1))
      )
      return
    } catch (error) {
      if (
        !(error instanceof DOMException) ||
        error.name !== "QuotaExceededError"
      ) {
        return
      }

      if (history.length === 1) {
        return
      }

      history = history.slice(1)
      historyIndex = Math.max(0, historyIndex - 1)
    }
  }
}

const PERSIST_DEBOUNCE_MS = 500
let persistTimer: ReturnType<typeof setTimeout> | null = null
// pendingPersistState: queued by persistCanvasState, drained when the debounce timer fires.
// inFlightPersistState: handed off to requestIdleCallback but not yet written to storage.
// Both are tracked separately so beforeunload can flush whichever one represents the
// latest unsaved state (otherwise a refresh inside the idle window loses the last stroke).
let pendingPersistState: PersistedCanvasState | null = null
let inFlightPersistState: PersistedCanvasState | null = null

type IdleCallbackHandle = number
type IdleDeadline = { didTimeout: boolean; timeRemaining: () => number }
type IdleWindow = Window & {
  requestIdleCallback?: (
    cb: (deadline: IdleDeadline) => void,
    opts?: { timeout: number }
  ) => IdleCallbackHandle
}

const flushPersist = () => {
  persistTimer = null
  const state = pendingPersistState
  pendingPersistState = null
  if (!state) return
  inFlightPersistState = state
  const idleWindow = window as IdleWindow
  const doWrite = () => {
    writeCanvasStateToStorage(state)
    if (inFlightPersistState === state) inFlightPersistState = null
  }
  if (typeof idleWindow.requestIdleCallback === "function") {
    idleWindow.requestIdleCallback(doWrite, { timeout: 1000 })
  } else {
    doWrite()
  }
}

const persistCanvasState = (state: PersistedCanvasState) => {
  if (typeof window === "undefined") return
  pendingPersistState = state
  if (persistTimer !== null) return
  persistTimer = setTimeout(flushPersist, PERSIST_DEBOUNCE_MS)
}

if (typeof window !== "undefined") {
  const flushOnUnload = () => {
    if (persistTimer !== null) {
      clearTimeout(persistTimer)
      persistTimer = null
    }
    // Pending (newest, not yet drained) wins over in-flight (older, idle-callback queued).
    const toWrite = pendingPersistState ?? inFlightPersistState
    if (toWrite) {
      writeCanvasStateToStorage(toWrite)
      pendingPersistState = null
      inFlightPersistState = null
    }
  }
  window.addEventListener("beforeunload", flushOnUnload)
  // pagehide is more reliable than beforeunload on mobile / bfcache scenarios.
  window.addEventListener("pagehide", flushOnUnload)
}

const initialCanvasState = loadPersistedCanvasState(getDefaultCanvasState())

export const useEditorStore = create<EditorState>()(
  persist(
    (set) => ({
      pixels: initialCanvasState.pixels,
      pixelBuffer: buildBufferFromPixels(
        initialCanvasState.pixels,
        initialCanvasState.width,
        initialCanvasState.height
      ),
      pixelsVersion: 0,
      width: initialCanvasState.width,
      height: initialCanvasState.height,
      currentTool: "brush",
      primaryColor: EDITOR_CONFIG.DEFAULT_PRIMARY_COLOR,
      backgroundColor: null,
      zoom: EDITOR_CONFIG.DEFAULT_ZOOM,
      history: initialCanvasState.history,
      historyIndex: initialCanvasState.historyIndex,
      uploadOpen: false,
      exportOpen: false,

      setPixel: (x, y, color) =>
        set((state) => {
          if (x < 0 || y < 0 || x >= state.width || y >= state.height)
            return state
          const key = `${x},${y}`
          if (state.pixels[key] === color) return state
          const idx = y * state.width + x
          state.pixelBuffer[idx] = packPixelHex(color)
          return {
            pixels: { ...state.pixels, [key]: color },
            pixelsVersion: state.pixelsVersion + 1,
          }
        }),

      clearPixel: (x, y) =>
        set((state) => {
          if (x < 0 || y < 0 || x >= state.width || y >= state.height)
            return state
          const key = `${x},${y}`
          if (!(key in state.pixels)) return state
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { [key]: _, ...rest } = state.pixels
          state.pixelBuffer[y * state.width + x] = 0
          return { pixels: rest, pixelsVersion: state.pixelsVersion + 1 }
        }),

      // Hot-path: buffer-only writes, O(1), no Record clone. Record reconciles in saveHistory.
      setPixelFast: (x, y, color) =>
        set((state) => {
          if (x < 0 || y < 0 || x >= state.width || y >= state.height)
            return state
          const idx = y * state.width + x
          const packed = packPixelHex(color)
          if (state.pixelBuffer[idx] === packed) return state
          state.pixelBuffer[idx] = packed
          return { pixelsVersion: state.pixelsVersion + 1 }
        }),

      clearPixelFast: (x, y) =>
        set((state) => {
          if (x < 0 || y < 0 || x >= state.width || y >= state.height)
            return state
          const idx = y * state.width + x
          if (state.pixelBuffer[idx] === 0) return state
          state.pixelBuffer[idx] = 0
          return { pixelsVersion: state.pixelsVersion + 1 }
        }),

      setPixels: (newPixels) =>
        set((state) => ({
          pixels: newPixels,
          pixelBuffer: buildBufferFromPixels(
            newPixels,
            state.width,
            state.height
          ),
          pixelsVersion: state.pixelsVersion + 1,
        })),

      setSize: (nextWidth, nextHeight) =>
        set((state) => {
          const width = Math.max(1, Math.min(200, Math.floor(nextWidth)))
          const height = Math.max(1, Math.min(200, Math.floor(nextHeight)))
          if (state.width === width && state.height === height) return state

          let pixels = state.pixels
          if (width < state.width || height < state.height) {
            const cropped: Record<string, string> = {}
            for (const [key, color] of Object.entries(state.pixels)) {
              const [x, y] = key.split(",").map(Number)
              if (x >= 0 && y >= 0 && x < width && y < height) {
                cropped[key] = color
              }
            }
            pixels = cropped
          }

          return {
            width,
            height,
            pixels,
            pixelBuffer: buildBufferFromPixels(pixels, width, height),
            pixelsVersion: state.pixelsVersion + 1,
          }
        }),

      resizeFromEdge: (edge, nextSize) =>
        set((state) => {
          const clampedSize = Math.max(1, Math.min(200, Math.floor(nextSize)))
          const nextWidth =
            edge === "left" || edge === "right" ? clampedSize : state.width
          const nextHeight =
            edge === "top" || edge === "bottom" ? clampedSize : state.height

          if (state.width === nextWidth && state.height === nextHeight)
            return state

          const shiftX = edge === "left" ? nextWidth - state.width : 0
          const shiftY = edge === "top" ? nextHeight - state.height : 0
          const nextPixels: Record<string, string> = {}

          for (const [key, color] of Object.entries(state.pixels)) {
            const [x, y] = key.split(",").map(Number)
            const translatedX = x + shiftX
            const translatedY = y + shiftY

            if (
              translatedX >= 0 &&
              translatedY >= 0 &&
              translatedX < nextWidth &&
              translatedY < nextHeight
            ) {
              nextPixels[`${translatedX},${translatedY}`] = color
            }
          }

          return {
            width: nextWidth,
            height: nextHeight,
            pixels: nextPixels,
            pixelBuffer: buildBufferFromPixels(
              nextPixels,
              nextWidth,
              nextHeight
            ),
            pixelsVersion: state.pixelsVersion + 1,
          }
        }),

      saveHistory: () =>
        set((state) => {
          // Reconcile pixels Record from the buffer (which is the source of truth during fast-path strokes).
          const reconciledPixels = buildPixelsFromBuffer(
            state.pixelBuffer,
            state.width,
            state.height
          )
          const lastHistoryEntry = state.history[state.historyIndex]

          if (
            state.width === lastHistoryEntry.width &&
            state.height === lastHistoryEntry.height &&
            areRecordsEqual(reconciledPixels, lastHistoryEntry.pixels)
          ) {
            // Still update Record reference if buffer-driven changes produced an equal-but-new map.
            if (state.pixels === reconciledPixels) return state
            return { pixels: reconciledPixels }
          }

          const newHistory = state.history.slice(0, state.historyIndex + 1)
          newHistory.push({
            pixels: reconciledPixels,
            width: state.width,
            height: state.height,
          })
          const limitedHistory = limitHistory(newHistory, newHistory.length - 1)
          const nextState = {
            pixels: reconciledPixels,
            history: limitedHistory.history,
            historyIndex: limitedHistory.historyIndex,
          }
          persistCanvasState({
            pixels: reconciledPixels,
            width: state.width,
            height: state.height,
            history: limitedHistory.history,
            historyIndex: limitedHistory.historyIndex,
          })
          return nextState
        }),

      setTool: (tool) => set({ currentTool: tool }),

      setColor: (color) => set({ primaryColor: color }),

      setBackgroundColor: (color) => set({ backgroundColor: color }),

      setZoom: (zoom) => set({ zoom: clampZoom(zoom) }),

      undo: () =>
        set((state) => {
          if (state.historyIndex > 0) {
            const newIndex = state.historyIndex - 1
            const entry = state.history[newIndex]
            const nextState = {
              historyIndex: newIndex,
              pixels: entry.pixels,
              width: entry.width,
              height: entry.height,
              pixelBuffer: buildBufferFromPixels(
                entry.pixels,
                entry.width,
                entry.height
              ),
              pixelsVersion: state.pixelsVersion + 1,
            }
            persistCanvasState({
              pixels: entry.pixels,
              width: entry.width,
              height: entry.height,
              history: state.history,
              historyIndex: newIndex,
            })
            return nextState
          }
          return state
        }),

      redo: () =>
        set((state) => {
          if (state.historyIndex < state.history.length - 1) {
            const newIndex = state.historyIndex + 1
            const entry = state.history[newIndex]
            const nextState = {
              historyIndex: newIndex,
              pixels: entry.pixels,
              width: entry.width,
              height: entry.height,
              pixelBuffer: buildBufferFromPixels(
                entry.pixels,
                entry.width,
                entry.height
              ),
              pixelsVersion: state.pixelsVersion + 1,
            }
            persistCanvasState({
              pixels: entry.pixels,
              width: entry.width,
              height: entry.height,
              history: state.history,
              historyIndex: newIndex,
            })
            return nextState
          }
          return state
        }),

      clear: () =>
        set((state) => {
          const newHistory = state.history.slice(0, state.historyIndex + 1)
          newHistory.push({
            pixels: {},
            width: state.width,
            height: state.height,
          })
          const limitedHistory = limitHistory(newHistory, newHistory.length - 1)
          const nextState = {
            pixels: {},
            pixelBuffer: new Uint32Array(
              Math.max(1, state.width * state.height)
            ),
            pixelsVersion: state.pixelsVersion + 1,
            history: limitedHistory.history,
            historyIndex: limitedHistory.historyIndex,
          }
          persistCanvasState({
            pixels: {},
            width: state.width,
            height: state.height,
            history: limitedHistory.history,
            historyIndex: limitedHistory.historyIndex,
          })
          return nextState
        }),

      setUploadOpen: (open) => set({ uploadOpen: open }),
      setExportOpen: (open) => set({ exportOpen: open }),
    }),
    {
      name: EDITOR_STORAGE_KEY,
      version: 3,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        backgroundColor: state.backgroundColor,
        primaryColor: state.primaryColor,
        currentTool: state.currentTool,
        zoom: state.zoom,
      }),
      migrate: (persistedState) => {
        const sanitized = sanitizePersistedEditorState(
          persistedState as Partial<EditorState>
        )
        const canvas = loadPersistedCanvasState(
          persistedState as Partial<EditorState>
        )
        return {
          ...sanitized,
          ...canvas,
          pixelBuffer: buildBufferFromPixels(
            canvas.pixels,
            canvas.width,
            canvas.height
          ),
          pixelsVersion: 0,
        }
      },
    }
  )
)
