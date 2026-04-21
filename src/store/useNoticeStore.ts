import { create } from "zustand";

interface NoticeState {
  paletteRemapNotice: {
    id: number;
    fromLabel: string;
    toLabel: string;
    paletteName: string;
  } | null;
  showPaletteRemapNotice: (notice: {
    fromLabel: string;
    toLabel: string;
    paletteName: string;
  }) => void;
  clearPaletteRemapNotice: () => void;
}

export const useNoticeStore = create<NoticeState>()((set) => ({
  paletteRemapNotice: null,
  showPaletteRemapNotice: (notice) =>
    set({
      paletteRemapNotice: {
        id: Date.now(),
        ...notice,
      },
    }),
  clearPaletteRemapNotice: () => set({ paletteRemapNotice: null }),
}));
