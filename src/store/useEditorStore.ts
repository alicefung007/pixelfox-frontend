import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { EDITOR_CONFIG } from '@/lib/constants';
import { clampZoom } from '@/lib/utils';

export type ToolType = 'brush' | 'bucket' | 'hand' | 'eraser' | 'eyedropper' | 'text';

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

  setPixel: (x: number, y: number, color: string) => void;
  clearPixel: (x: number, y: number) => void;
  saveHistory: () => void;
  setPixels: (pixels: Record<string, string>) => void;
  setSize: (width: number, height: number) => void;
  setTool: (tool: ToolType) => void;
  setColor: (color: string) => void;
  setBackgroundColor: (color: string | null) => void;
  setZoom: (zoom: number) => void;
  undo: () => void;
  redo: () => void;
  clear: () => void;
  setUploadOpen: (open: boolean) => void;
}

const DEFAULT_WIDTH = EDITOR_CONFIG.DEFAULT_WIDTH;
const DEFAULT_HEIGHT = EDITOR_CONFIG.DEFAULT_HEIGHT;

const createInitialHistoryEntry = (): HistoryEntry => ({
  pixels: {},
  width: DEFAULT_WIDTH,
  height: DEFAULT_HEIGHT,
});

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

  return {
    history: sanitizedHistory,
    historyIndex: sanitizedHistory.length - 1,
  };
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
    pixels,
    width,
    height,
    history,
    historyIndex: Math.min(
      Math.max(persistedState?.historyIndex ?? historyIndex, 0),
      history.length - 1
    ),
    uploadOpen: false,
  };
};

export const useEditorStore = create<EditorState>()(
  persist(
    (set) => ({
  pixels: {},
  width: DEFAULT_WIDTH,
  height: DEFAULT_HEIGHT,
  currentTool: 'brush',
  primaryColor: EDITOR_CONFIG.DEFAULT_PRIMARY_COLOR,
  backgroundColor: null,
  zoom: EDITOR_CONFIG.DEFAULT_ZOOM,
  history: [createInitialHistoryEntry()],
  historyIndex: 0,
  uploadOpen: false,

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
    return {
      history: newHistory,
      historyIndex: newHistory.length - 1,
    };
  }),

  setTool: (tool) => set({ currentTool: tool }),

  setColor: (color) => set({ primaryColor: color }),

  setBackgroundColor: (color) => set({ backgroundColor: color }),

  setZoom: (zoom) => set({ zoom: clampZoom(zoom) }),

  undo: () => set((state) => {
    if (state.historyIndex > 0) {
      const newIndex = state.historyIndex - 1;
      const entry = state.history[newIndex];
      return {
        historyIndex: newIndex,
        pixels: entry.pixels,
        width: entry.width,
        height: entry.height,
      };
    }
    return state;
  }),

  redo: () => set((state) => {
    if (state.historyIndex < state.history.length - 1) {
      const newIndex = state.historyIndex + 1;
      const entry = state.history[newIndex];
      return {
        historyIndex: newIndex,
        pixels: entry.pixels,
        width: entry.width,
        height: entry.height,
      };
    }
    return state;
  }),

  clear: () => set((state) => {
    const newHistory = state.history.slice(0, state.historyIndex + 1);
    newHistory.push({ pixels: {}, width: state.width, height: state.height });
    return {
      pixels: {},
      history: newHistory,
      historyIndex: newHistory.length - 1,
    };
  }),

  setUploadOpen: (open) => set({ uploadOpen: open }),
}),
{
  name: 'pixelfox-editor-storage',
  version: 2,
  storage: createJSONStorage(() => localStorage),
  partialize: (state) => ({
    pixels: state.pixels,
    width: state.width,
    height: state.height,
    history: state.history,
    historyIndex: state.historyIndex,
    backgroundColor: state.backgroundColor,
    primaryColor: state.primaryColor,
    currentTool: state.currentTool,
    zoom: state.zoom,
  }),
  migrate: (persistedState) => sanitizePersistedEditorState(persistedState as Partial<EditorState>),
}
));
