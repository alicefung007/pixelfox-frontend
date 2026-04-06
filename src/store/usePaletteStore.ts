import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SystemPaletteId } from '@/lib/palettes';

function normalizeHex(hex: string) {
  return hex.trim().toUpperCase().replace(/^#/, "");
}

interface PaletteState {
  currentPaletteId: SystemPaletteId;
  recentColors: string[];
  usedColors: string[];
  customPalette: string[];
  setCurrentPaletteId: (id: SystemPaletteId) => void;
  addRecentColor: (color: string) => void;
  addUsedColor: (color: string) => void;
  setCustomPalette: (colors: string[]) => void;
}

export const usePaletteStore = create<PaletteState>()(
  persist(
    (set) => ({
      currentPaletteId: 'MARD',
      recentColors: [],
      usedColors: [],
      customPalette: [],
      setCurrentPaletteId: (id) => set({ currentPaletteId: id }),
      addRecentColor: (color) => set((state) => {
        const normalizedColor = normalizeHex(color);
        if (state.recentColors.some((c) => normalizeHex(c) === normalizedColor)) {
          return {
            recentColors: [normalizedColor, ...state.recentColors.filter((c) => normalizeHex(c) !== normalizedColor)].slice(0, 20),
          };
        }
        return {
          recentColors: [normalizedColor, ...state.recentColors].slice(0, 20),
        };
      }),
      addUsedColor: (color) => set((state) => {
        const normalizedColor = normalizeHex(color);
        if (state.usedColors.some((c) => normalizeHex(c) === normalizedColor)) return state;
        return {
          usedColors: [normalizedColor, ...state.usedColors].slice(0, 50),
        };
      }),
      setCustomPalette: (colors) => set({ customPalette: colors }),
    }),
    {
      name: 'pixelfox-palette-storage',
    }
  )
);
