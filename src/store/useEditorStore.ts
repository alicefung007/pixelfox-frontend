import { create } from 'zustand';

export type ToolType = 'brush' | 'bucket' | 'hand' | 'eraser' | 'eyedropper' | 'text';

interface EditorState {
  pixels: Record<string, string>; // key: "x,y", value: hex color
  width: number;
  height: number;
  currentTool: ToolType;
  primaryColor: string;
  zoom: number;
  history: Record<string, string>[];
  historyIndex: number;

  setPixel: (x: number, y: number, color: string) => void;
  clearPixel: (x: number, y: number) => void;
  saveHistory: () => void;
  setPixels: (pixels: Record<string, string>) => void;
  setTool: (tool: ToolType) => void;
  setColor: (color: string) => void;
  setZoom: (zoom: number) => void;
  undo: () => void;
  redo: () => void;
  clear: () => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  pixels: {},
  width: 32,
  height: 32,
  currentTool: 'brush',
  primaryColor: '#FF61A6',
  zoom: 160,
  history: [{}],
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
    const { [key]: _removed, ...rest } = state.pixels;
    return { pixels: rest };
  }),

  setPixels: (newPixels) => set({ pixels: newPixels }),

  saveHistory: () => set((state) => {
    // Check if the current state is different from the last history entry
    const currentPixels = state.pixels;
    const lastHistoryEntry = state.history[state.historyIndex];
    
    // Simple deep equality check for the objects
    if (JSON.stringify(currentPixels) === JSON.stringify(lastHistoryEntry)) {
      return state;
    }

    const newHistory = state.history.slice(0, state.historyIndex + 1);
    newHistory.push({ ...currentPixels });
    return {
      history: newHistory,
      historyIndex: newHistory.length - 1,
    };
  }),

  setTool: (tool) => set({ currentTool: tool }),
  
  setColor: (color) => set({ primaryColor: color }),
  
  setZoom: (zoom) => set({ zoom: Math.max(10, Math.min(1000, zoom)) }),

  undo: () => set((state) => {
    if (state.historyIndex > 0) {
      const newIndex = state.historyIndex - 1;
      return {
        historyIndex: newIndex,
        pixels: state.history[newIndex],
      };
    }
    return state;
  }),

  redo: () => set((state) => {
    if (state.historyIndex < state.history.length - 1) {
      const newIndex = state.historyIndex + 1;
      return {
        historyIndex: newIndex,
        pixels: state.history[newIndex],
      };
    }
    return state;
  }),

  clear: () => set((state) => {
    const newHistory = state.history.slice(0, state.historyIndex + 1);
    newHistory.push({});
    return {
      pixels: {},
      history: newHistory,
      historyIndex: newHistory.length - 1,
    };
  }),
}));
