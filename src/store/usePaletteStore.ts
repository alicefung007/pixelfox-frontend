import { create } from 'zustand';

interface PaletteState {
  recentColors: string[];
  usedColors: string[];
  addRecentColor: (color: string) => void;
  addUsedColor: (color: string) => void;
}

export const usePaletteStore = create<PaletteState>((set) => ({
  recentColors: [],
  usedColors: [],
  addRecentColor: (color) => set((state) => {
    if (state.recentColors.includes(color)) {
      return {
        recentColors: [color, ...state.recentColors.filter((c) => c !== color)].slice(0, 20),
      };
    }
    return {
      recentColors: [color, ...state.recentColors].slice(0, 20),
    };
  }),
  addUsedColor: (color) => set((state) => {
    if (state.usedColors.includes(color)) return state;
    return {
      usedColors: [color, ...state.usedColors].slice(0, 50),
    };
  }),
}));
