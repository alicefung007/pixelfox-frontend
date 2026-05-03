# Project Specification: pixelfox

## 1. Project Overview

A modern pixel art editor interface (pixelfox.art) built using a modern React stack. The project aims to provide a pixel-based art creation environment with features like brush tools, bucket fill, color palettes, and zoomable canvas.

## 2. Tech Stack

- **Frontend Framework**: React 19 (Vite)
- **Language**: TypeScript
- **Styling**: Tailwind CSS (with `@tailwindcss/vite` v4 support)
- **UI Components**: shadcn-ui (Radix UI)
- **Icons**: Lucide React / Hugeicons (already in project)
- **State Management**: Zustand
- **Routing**: React Router DOM v7
- **i18n**: react-i18next + i18next

## 3. Key Features

- **Canvas Editor**: Interactive pixel grid with zoom and pan support.
- **Drawing Tools**: Brush, Bucket, Eraser, Eyedropper, Text.
- **Color Palette**: Preset color swatches, "Used Colors", and "Recent" history.
- **Side Panels**:
  - Actions: Upload, Save, Share, Assembly, 3D Preview.
  - History: Undo/Redo.
  - Export/Clear.
  - Settings: Canvas dimensions and properties.
- **Top Navbar**: Global navigation (Editor, Gallery, Upscaler) and user/system controls.
- **Responsiveness**: Desktop-first design optimized for high-density editing tasks.
- **Multi-language**: Support for English and Chinese (i18n).

## 4. Architecture

### 4.1 State Management (Zustand)

- `useEditorStore`: Tracks canvas state (pixels, size, history), current tool, zoom level, and primary/secondary colors.
- `useUIStore`: Tracks UI-related state like active panels or theme.

### 4.2 Component Hierarchy

- `AppLayout`: Main container with `Navbar`, `Sidebar`, and `MainView`.
- `Navbar`: Global actions and navigation.
- `Sidebar`:
  - `ActionPanel`: File-level operations.
  - `ToolPanel`: Brush, Bucket, etc.
  - `SettingsPanel`: Canvas configuration.
- `CanvasContainer`:
  - `PixelGrid`: The interactive drawing area.
  - `ZoomControls`: +/- and percentage display.
- `PaletteContainer`:
  - `ColorGrid`: Swatches.
  - `ColorTabs`: Used, Recent, All.

### 4.3 Routing

- `/editor`: The main drawing interface (default).
- `/gallery`: Placeholder for community art.
- `/upscaler`: Placeholder for AI upscaling tool.

### 4.4 i18n Strategy

- Localization files stored in `src/i18n/locales/{en|zh}.json`.
- `t()` hook used for all UI strings.

## 5. Design Tokens (Based on shadcn-ui)

- Primary color: Vibrant pink/purple gradient for key buttons (Export).
- Background: Light/Dark mode compatible using shadcn-ui's theme variables.
- Borders: Subtle separators for panels.

## 6. Code Standards & Conventions

### 6.1 Configuration Management

All hardcoded magic numbers and constants MUST be centralized in `src/lib/constants.ts`.

#### Configuration Categories:

- **EDITOR_CONFIG**: Canvas editor settings (dimensions, zoom, colors)
- **PALETTE_CONFIG**: Color palette limits and storage
- **CANVAS_CONFIG**: Grid rendering settings
- **CURSOR_CONFIG**: Cursor icon settings
- **PANEL_CONFIG**: Panel layout settings

#### Usage Pattern:

```typescript
import { EDITOR_CONFIG } from "@/lib/constants"

// ✅ Correct
const zoom = EDITOR_CONFIG.DEFAULT_ZOOM

// ❌ Incorrect
const zoom = 160
```

### 6.2 Utility Functions

Reusable utility functions MUST be centralized in `src/lib/utils.ts`.

#### Available Utilities:

- `cn()`: Class name merging (clsx + tailwind-merge)
- `normalizeHex()`: Normalize hex color strings
- `hexLabel()`: Convert hex to display label
- `isDarkColor()`: Determine if a color is dark (luminance calculation)
- `clampZoom()`: Clamp zoom value to valid range
- `getLinePoints()`: Bresenham's line algorithm for pixel drawing

#### Usage Pattern:

```typescript
import { normalizeHex, isDarkColor, clampZoom } from "@/lib/utils"

// ✅ Correct
const normalized = normalizeHex("#ff0000")
const isDark = isDarkColor("#000000")
const clampedZoom = clampZoom(500)

// ❌ Incorrect - local function definition
function normalizeHex(hex: string) {
  return hex.trim().toUpperCase().replace(/^#/, "")
}
```

### 6.3 Component Organization

- Components should be placed in `src/components/{feature}/`
- Each feature folder contains related components
- Shared UI components in `src/components/ui/`
- Use index.ts for barrel exports when appropriate

### 6.4 State Management (Zustand)

- Store files in `src/store/`
- Use `persist` middleware for localStorage persistence
- Configuration keys MUST use constants from `constants.ts`

### 6.5 Type Definitions

- Palette types in `src/lib/palettes/types.ts`
- Use TypeScript interfaces for state shapes
- Export types alongside implementations

### 6.6 Import Conventions

```typescript
// External libraries
import { create } from "zustand"

// Internal utilities
import { normalizeHex, cn } from "@/lib/utils"
import { EDITOR_CONFIG, PALETTE_CONFIG } from "@/lib/constants"

// Components
import { Button } from "@/components/ui/button"
import PixelCanvas from "@/components/editor/PixelCanvas"

// Types
import type { PaletteDefinition } from "@/lib/palettes/types"
```

## 7. Configuration Reference

### EDITOR_CONFIG

```typescript
{
  DEFAULT_WIDTH: 30,          // Default canvas width
  DEFAULT_HEIGHT: 30,          // Default canvas height
  DEFAULT_ZOOM: 160,           // Initial zoom percentage
  MIN_ZOOM: 10,                // Minimum zoom (100%)
  MAX_ZOOM: 1000,              // Maximum zoom (1000%)
  DEFAULT_PRIMARY_COLOR: '#F77C31',  // Default brush color
  PAN_SPEED: 1.5,              // Pan speed multiplier
  AUTO_FIT_PADDING: 96,        // Auto-fit padding in pixels
  ZOOM_STEP: 10               // Zoom increment per step
}
```

### PALETTE_CONFIG

```typescript
{
  RECENT_COLORS_LIMIT: 20,     // Max recent colors to track
  USED_COLORS_LIMIT: 50,       // Max used colors to track
  STORAGE_KEY: 'pixelfox-palette-storage'  // localStorage key
}
```

### CANVAS_CONFIG

```typescript
{
  GRID_LINE_WIDTH: 1,          // Base grid line width
  GRID_COLOR: 'rgba(0, 0, 0, 0.05)',
  BOLD_LINE_WIDTH: 1.5,        // 5px interval line multiplier
  MAJOR_LINE_WIDTH: 3,         // 10px interval line multiplier
  GRID_INTERVAL_5: 5,         // First emphasis interval
  GRID_INTERVAL_10: 10,        // Second emphasis interval
  CHECKER_LIGHT: '#FFFFFF',
  CHECKER_DARK: '#F0F0F0',
  BORDER_COLOR: 'rgba(0, 0, 0, 0.15)'
}
```

### CURSOR_CONFIG

```typescript
{
  ICON_SIZE: 18,              // Cursor icon size in pixels
  BRUSH_HOTSPOT: { x: 3, y: 15 },
  EYEDROPPER_HOTSPOT: { x: 4, y: 16 }
}
```

### PANEL_CONFIG

```typescript
{
  DEFAULT_HEIGHT: 280,         // Default palette panel height
  MIN_HEIGHT: 100,            // Minimum panel height
  MAX_HEIGHT: 600,             // Maximum panel height
  STORAGE_KEY: 'palette-height'
}
```
