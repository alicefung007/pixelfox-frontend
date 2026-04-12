import { create } from 'zustand';
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
  zoom: number;
  history: HistoryEntry[];
  historyIndex: number;

  setPixel: (x: number, y: number, color: string) => void;
  clearPixel: (x: number, y: number) => void;
  saveHistory: () => void;
  setPixels: (pixels: Record<string, string>) => void;
  setSize: (width: number, height: number) => void;
  setTool: (tool: ToolType) => void;
  setColor: (color: string) => void;
  setZoom: (zoom: number) => void;
  undo: () => void;
  redo: () => void;
  clear: () => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  pixels: {},
  width: EDITOR_CONFIG.DEFAULT_WIDTH,
  height: EDITOR_CONFIG.DEFAULT_HEIGHT,
  currentTool: 'brush',
  primaryColor: EDITOR_CONFIG.DEFAULT_PRIMARY_COLOR,
  zoom: EDITOR_CONFIG.DEFAULT_ZOOM,
  history: [{ pixels: {}, width: EDITOR_CONFIG.DEFAULT_WIDTH, height: EDITOR_CONFIG.DEFAULT_HEIGHT }],
  historyIndex: 0,

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

  setSize: (width, height) => set({ width, height }),

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
}));
