import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SystemPaletteId } from '@/lib/palettes';
import { normalizeHex } from '@/lib/utils';
import { PALETTE_CONFIG } from '@/lib/constants';

export type PaletteTabId = "used" | "recent" | "all";

interface PaletteState {
  currentPaletteId: SystemPaletteId;
  recentColors: string[];
  usedColors: string[];
  customPalette: string[];
  activeTab: PaletteTabId;
  selectedUsedColor: string | null;
  usedTabFlashAt: number;
  setCurrentPaletteId: (id: SystemPaletteId) => void;
  addRecentColor: (color: string) => void;
  addUsedColor: (color: string) => void;
  setCustomPalette: (colors: string[]) => void;
  setActiveTab: (tab: PaletteTabId) => void;
  setSelectedUsedColor: (color: string | null) => void;
  flashUsedTab: () => void;
}

export const usePaletteStore = create<PaletteState>()(
  persist(
    (set) => ({
      currentPaletteId: 'MARD',
      recentColors: [],
      usedColors: [],
      customPalette: [],
      activeTab: "all",
      selectedUsedColor: null,
      usedTabFlashAt: 0,
      setActiveTab: (tab) => set({ activeTab: tab }),
      setSelectedUsedColor: (color) => set({ selectedUsedColor: color ? normalizeHex(color) : null }),
      flashUsedTab: () => set({ usedTabFlashAt: Date.now() }),
      setCurrentPaletteId: (id) => set({ currentPaletteId: id }),
      addRecentColor: (color) => set((state) => {
        const normalizedColor = normalizeHex(color);
        if (state.recentColors.some((c) => normalizeHex(c) === normalizedColor)) {
          return {
            recentColors: [normalizedColor, ...state.recentColors.filter((c) => normalizeHex(c) !== normalizedColor)].slice(0, PALETTE_CONFIG.RECENT_COLORS_LIMIT),
          };
        }
        return {
          recentColors: [normalizedColor, ...state.recentColors].slice(0, PALETTE_CONFIG.RECENT_COLORS_LIMIT),
        };
      }),
      addUsedColor: (color) => set((state) => {
        const normalizedColor = normalizeHex(color);
        if (state.usedColors.some((c) => normalizeHex(c) === normalizedColor)) return state;
        return {
          usedColors: [normalizedColor, ...state.usedColors].slice(0, PALETTE_CONFIG.USED_COLORS_LIMIT),
        };
      }),
      setCustomPalette: (colors) => set({ customPalette: colors }),
    }),
    {
      name: PALETTE_CONFIG.STORAGE_KEY,
      partialize: (state) => ({
        currentPaletteId: state.currentPaletteId,
        recentColors: state.recentColors,
        usedColors: state.usedColors,
        customPalette: state.customPalette,
      }),
    }
  )
);
