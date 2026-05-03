export const EDITOR_CONFIG = {
  DEFAULT_WIDTH: 30,
  DEFAULT_HEIGHT: 30,
  DEFAULT_ZOOM: 160,
  MIN_ZOOM: 10,
  MAX_ZOOM: 1000,
  DEFAULT_PRIMARY_COLOR: "#F77C31",
  PAN_SPEED: 1.5,
  AUTO_FIT_PADDING: 96,
  ZOOM_STEP: 10,
  // When true, the full undo/redo history is serialized into localStorage on every
  // saveHistory. This restores history across page reloads but the JSON blob can
  // grow to tens of MB on large canvases (200×200 with many filled pixels), which
  // blocks the main thread when the debounced persist fires during user interaction.
  // Set to false to persist only the current canvas snapshot.
  PERSIST_HISTORY: false,
  // When PERSIST_HISTORY is true, cap how many of the most recent history entries
  // are written to localStorage. The in-memory undo stack is independent of this.
  PERSIST_HISTORY_LIMIT: 5,
} as const

export const PALETTE_CONFIG = {
  RECENT_COLORS_LIMIT: 20,
  USED_COLORS_LIMIT: 50,
  STORAGE_KEY: "pixelfox-palette-storage",
} as const

export const CANVAS_CONFIG = {
  GRID_LINE_WIDTH: 1,
  GRID_COLOR: "rgba(0, 0, 0, 0.05)",
  BOLD_LINE_WIDTH: 1.5,
  MAJOR_LINE_WIDTH: 3,
  GRID_INTERVAL_5: 5,
  GRID_INTERVAL_10: 10,
  CHECKER_LIGHT: "#FFFFFF",
  CHECKER_DARK: "#F0F0F0",
  BORDER_COLOR: "rgba(0, 0, 0, 0.15)",
} as const

export const CURSOR_CONFIG = {
  ICON_SIZE: 24,
  HOTSPOTS: {
    brush: { x: 2, y: 21 },
    bucket: { x: 20, y: 20 },
    eraser: { x: 8, y: 21 },
    eyedropper: { x: 2, y: 22 },
    wand: { x: 22, y: 2 },
  },
} as const

export const SELECTION_CONFIG = {
  COLOR_CONNECTIVITY: 4 as 4 | 8,
} as const

export const PREVIEW_3D_CONFIG = {
  BEAD_DEPTH: 0.9,
  CYLINDER: {
    OUTER_RADIUS: 0.47,
    INNER_RADIUS: 0.2,
    BEVEL_SIZE: 0.02,
    BEVEL_THICKNESS: 0.02,
    BEVEL_SEGMENTS: 1,
    CURVE_SEGMENTS: 16,
  },
  ROUNDED_CUBE: {
    SIZE: 0.9,
    CORNER_RADIUS: 0.08,
    CORNER_SEGMENTS: 4,
  },
} as const

export type BeadShape = "cylinder" | "roundedCube"

export const PANEL_CONFIG = {
  DEFAULT_HEIGHT: 280,
  MIN_HEIGHT: 100,
  MAX_HEIGHT: 600,
  STORAGE_KEY: "palette-height",
} as const

export const FEEDBACK_CONFIG = {
  EMAIL: import.meta.env.VITE_FEEDBACK_EMAIL || "pixelfox@gmail.com",
} as const
