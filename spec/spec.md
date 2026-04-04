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
