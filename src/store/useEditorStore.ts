import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { EDITOR_CONFIG } from '@/lib/constants';
import { clampZoom } from '@/lib/utils';

export type ToolType = 'brush' | 'bucket' | 'hand' | 'eraser' | 'eyedropper' | 'wand' | 'text';

interface HistoryEntry {
  pixels: Record<string, string>;
  width: number;
  height: number;
}

interface EditorState {
  pixels: Record<string, string>; // key: "x,y", value: hex color
  width: number;
  height: number;
  currentTool: ToolType;
  primaryColor: string;
  backgroundColor: string | null;
  zoom: number;
  history: HistoryEntry[];
  historyIndex: number;
  uploadOpen: boolean;
  exportOpen: boolean;

  setPixel: (x: number, y: number, color: string) => void;
  clearPixel: (x: number, y: number) => void;
  saveHistory: () => void;
  setPixels: (pixels: Record<string, string>) => void;
  setSize: (width: number, height: number) => void;
  resizeFromEdge: (edge: 'left' | 'right' | 'top' | 'bottom', nextSize: number) => void;
  setTool: (tool: ToolType) => void;
  setColor: (color: string) => void;
  setBackgroundColor: (color: string | null) => void;
  setZoom: (zoom: number) => void;
  undo: () => void;
  redo: () => void;
  clear: () => void;
  setUploadOpen: (open: boolean) => void;
  setExportOpen: (open: boolean) => void;
}

const DEFAULT_WIDTH = EDITOR_CONFIG.DEFAULT_WIDTH;
const DEFAULT_HEIGHT = EDITOR_CONFIG.DEFAULT_HEIGHT;
const EDITOR_STORAGE_KEY = 'pixelfox-editor-storage';
const EDITOR_CANVAS_STORAGE_KEY = 'pixelfox-editor-canvas-storage';
const LEGACY_DEFAULT_PRIMARY_COLOR = '#FF61A6';
const MAX_HISTORY_ENTRIES = 30;

const createInitialHistoryEntry = (): HistoryEntry => ({
  pixels: {},
  width: DEFAULT_WIDTH,
  height: DEFAULT_HEIGHT,
});

const limitHistory = (
  history: HistoryEntry[],
  historyIndex: number
): { history: HistoryEntry[]; historyIndex: number } => {
  if (history.length <= MAX_HISTORY_ENTRIES) {
    return { history, historyIndex };
  }

  const overflow = history.length - MAX_HISTORY_ENTRIES;
  const nextHistory = history.slice(overflow);
  return {
    history: nextHistory,
    historyIndex: Math.max(0, historyIndex - overflow),
  };
};

const sanitizeHistory = (
  history: HistoryEntry[] | undefined,
  fallbackPixels: Record<string, string>,
  fallbackWidth: number,
  fallbackHeight: number
): { history: HistoryEntry[]; historyIndex: number } => {
  if (!Array.isArray(history) || history.length === 0) {
    return {
      history: [{ pixels: { ...fallbackPixels }, width: fallbackWidth, height: fallbackHeight }],
      historyIndex: 0,
    };
  }

  const sanitizedHistory = history
    .filter((entry): entry is HistoryEntry => Boolean(entry))
    .map((entry) => ({
      pixels: entry.pixels ?? {},
      width: entry.width ?? fallbackWidth,
      height: entry.height ?? fallbackHeight,
    }));

  if (sanitizedHistory.length === 0) {
    return {
      history: [{ pixels: { ...fallbackPixels }, width: fallbackWidth, height: fallbackHeight }],
      historyIndex: 0,
    };
  }

  return limitHistory(sanitizedHistory, sanitizedHistory.length - 1);
};

const sanitizePersistedEditorState = (
  persistedState: Partial<EditorState> | undefined
): Partial<EditorState> => {
  const width = persistedState?.width ?? DEFAULT_WIDTH;
  const height = persistedState?.height ?? DEFAULT_HEIGHT;
  const pixels = persistedState?.pixels ?? {};
  const { history, historyIndex } = sanitizeHistory(
    persistedState?.history,
    pixels,
    width,
    height
  );

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
  };
};

type PersistedCanvasState = Pick<EditorState, 'pixels' | 'width' | 'height' | 'history' | 'historyIndex'>;

const getDefaultCanvasState = (): PersistedCanvasState => ({
  pixels: {},
  width: DEFAULT_WIDTH,
  height: DEFAULT_HEIGHT,
  history: [createInitialHistoryEntry()],
  historyIndex: 0,
});

const loadPersistedCanvasState = (fallback?: Partial<EditorState>): PersistedCanvasState => {
  const fallbackState = sanitizePersistedEditorState(fallback);

  if (typeof window === 'undefined') {
    return {
      pixels: fallbackState.pixels ?? {},
      width: fallbackState.width ?? DEFAULT_WIDTH,
      height: fallbackState.height ?? DEFAULT_HEIGHT,
      history: fallbackState.history ?? [createInitialHistoryEntry()],
      historyIndex: fallbackState.historyIndex ?? 0,
    };
  }

  try {
    const raw = window.localStorage.getItem(EDITOR_CANVAS_STORAGE_KEY);
    if (!raw) {
      return {
        pixels: fallbackState.pixels ?? {},
        width: fallbackState.width ?? DEFAULT_WIDTH,
        height: fallbackState.height ?? DEFAULT_HEIGHT,
        history: fallbackState.history ?? [createInitialHistoryEntry()],
        historyIndex: fallbackState.historyIndex ?? 0,
      };
    }

    const parsed = JSON.parse(raw) as Partial<EditorState>;
    const sanitized = sanitizePersistedEditorState(parsed);
    return {
      pixels: sanitized.pixels ?? {},
      width: sanitized.width ?? DEFAULT_WIDTH,
      height: sanitized.height ?? DEFAULT_HEIGHT,
      history: sanitized.history ?? [createInitialHistoryEntry()],
      historyIndex: sanitized.historyIndex ?? 0,
    };
  } catch {
    return {
      pixels: fallbackState.pixels ?? {},
      width: fallbackState.width ?? DEFAULT_WIDTH,
      height: fallbackState.height ?? DEFAULT_HEIGHT,
      history: fallbackState.history ?? [createInitialHistoryEntry()],
      historyIndex: fallbackState.historyIndex ?? 0,
    };
  }
};

const persistCanvasState = (state: PersistedCanvasState) => {
  if (typeof window === 'undefined') return;

  const persistAttempt = (history: HistoryEntry[], historyIndex: number) =>
    JSON.stringify({
      pixels: state.pixels,
      width: state.width,
      height: state.height,
      history,
      historyIndex,
    });

  const limited = limitHistory(state.history, state.historyIndex);
  let history = limited.history;
  let historyIndex = limited.historyIndex;

  while (history.length > 0) {
    try {
      window.localStorage.setItem(
        EDITOR_CANVAS_STORAGE_KEY,
        persistAttempt(history, Math.min(historyIndex, history.length - 1))
      );
      return;
    } catch (error) {
      if (!(error instanceof DOMException) || error.name !== 'QuotaExceededError') {
        return;
      }

      if (history.length === 1) {
        return;
      }

      history = history.slice(1);
      historyIndex = Math.max(0, historyIndex - 1);
    }
  }
};

const initialCanvasState = loadPersistedCanvasState(getDefaultCanvasState());

export const useEditorStore = create<EditorState>()(
  persist(
    (set) => ({
  pixels: initialCanvasState.pixels,
  width: initialCanvasState.width,
  height: initialCanvasState.height,
  currentTool: 'brush',
  primaryColor: EDITOR_CONFIG.DEFAULT_PRIMARY_COLOR,
  backgroundColor: null,
  zoom: EDITOR_CONFIG.DEFAULT_ZOOM,
  history: initialCanvasState.history,
  historyIndex: initialCanvasState.historyIndex,
  uploadOpen: false,
  exportOpen: false,

  setPixel: (x, y, color) => set((state) => {
    const key = `${x},${y}`;
    if (state.pixels[key] === color) return state;
    return {
      pixels: { ...state.pixels, [key]: color }
    };
  }),

  clearPixel: (x, y) => set((state) => {
    const key = `${x},${y}`;
    if (!(key in state.pixels)) return state;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { [key]: _, ...rest } = state.pixels;
    return { pixels: rest };
  }),

  setPixels: (newPixels) => set({ pixels: newPixels }),

  setSize: (nextWidth, nextHeight) => set((state) => {
    const width = Math.max(1, Math.min(200, Math.floor(nextWidth)));
    const height = Math.max(1, Math.min(200, Math.floor(nextHeight)));
    if (state.width === width && state.height === height) return state;

    let pixels = state.pixels;
    if (width < state.width || height < state.height) {
      const cropped: Record<string, string> = {};
      for (const [key, color] of Object.entries(state.pixels)) {
        const [x, y] = key.split(',').map(Number);
        if (x >= 0 && y >= 0 && x < width && y < height) {
          cropped[key] = color;
        }
      }
      pixels = cropped;
    }

    return { width, height, pixels };
  }),

  resizeFromEdge: (edge, nextSize) => set((state) => {
    const clampedSize = Math.max(1, Math.min(200, Math.floor(nextSize)));
    const nextWidth = edge === 'left' || edge === 'right' ? clampedSize : state.width;
    const nextHeight = edge === 'top' || edge === 'bottom' ? clampedSize : state.height;

    if (state.width === nextWidth && state.height === nextHeight) return state;

    const shiftX = edge === 'left' ? nextWidth - state.width : 0;
    const shiftY = edge === 'top' ? nextHeight - state.height : 0;
    const nextPixels: Record<string, string> = {};

    for (const [key, color] of Object.entries(state.pixels)) {
      const [x, y] = key.split(',').map(Number);
      const translatedX = x + shiftX;
      const translatedY = y + shiftY;

      if (
        translatedX >= 0 &&
        translatedY >= 0 &&
        translatedX < nextWidth &&
        translatedY < nextHeight
      ) {
        nextPixels[`${translatedX},${translatedY}`] = color;
      }
    }

    return {
      width: nextWidth,
      height: nextHeight,
      pixels: nextPixels,
    };
  }),

  saveHistory: () => set((state) => {
    const currentPixels = state.pixels;
    const lastHistoryEntry = state.history[state.historyIndex];

    if (
      JSON.stringify(currentPixels) === JSON.stringify(lastHistoryEntry.pixels) &&
      state.width === lastHistoryEntry.width &&
      state.height === lastHistoryEntry.height
    ) {
      return state;
    }

    const newHistory = state.history.slice(0, state.historyIndex + 1);
    newHistory.push({ pixels: { ...currentPixels }, width: state.width, height: state.height });
    const limitedHistory = limitHistory(newHistory, newHistory.length - 1);
    const nextState = {
      history: limitedHistory.history,
      historyIndex: limitedHistory.historyIndex,
    };
    persistCanvasState({
      pixels: currentPixels,
      width: state.width,
      height: state.height,
      history: limitedHistory.history,
      historyIndex: limitedHistory.historyIndex,
    });
    return nextState;
  }),

  setTool: (tool) => set({ currentTool: tool }),

  setColor: (color) => set({ primaryColor: color }),

  setBackgroundColor: (color) => set({ backgroundColor: color }),

  setZoom: (zoom) => set({ zoom: clampZoom(zoom) }),

  undo: () => set((state) => {
    if (state.historyIndex > 0) {
      const newIndex = state.historyIndex - 1;
      const entry = state.history[newIndex];
      const nextState = {
        historyIndex: newIndex,
        pixels: entry.pixels,
        width: entry.width,
        height: entry.height,
      };
      persistCanvasState({
        pixels: entry.pixels,
        width: entry.width,
        height: entry.height,
        history: state.history,
        historyIndex: newIndex,
      });
      return nextState;
    }
    return state;
  }),

  redo: () => set((state) => {
    if (state.historyIndex < state.history.length - 1) {
      const newIndex = state.historyIndex + 1;
      const entry = state.history[newIndex];
      const nextState = {
        historyIndex: newIndex,
        pixels: entry.pixels,
        width: entry.width,
        height: entry.height,
      };
      persistCanvasState({
        pixels: entry.pixels,
        width: entry.width,
        height: entry.height,
        history: state.history,
        historyIndex: newIndex,
      });
      return nextState;
    }
    return state;
  }),

  clear: () => set((state) => {
    const newHistory = state.history.slice(0, state.historyIndex + 1);
    newHistory.push({ pixels: {}, width: state.width, height: state.height });
    const limitedHistory = limitHistory(newHistory, newHistory.length - 1);
    const nextState = {
      pixels: {},
      history: limitedHistory.history,
      historyIndex: limitedHistory.historyIndex,
    };
    persistCanvasState({
      pixels: {},
      width: state.width,
      height: state.height,
      history: limitedHistory.history,
      historyIndex: limitedHistory.historyIndex,
    });
    return nextState;
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
  migrate: (persistedState) => ({
    ...sanitizePersistedEditorState(persistedState as Partial<EditorState>),
    ...loadPersistedCanvasState(persistedState as Partial<EditorState>),
  }),
}
));
