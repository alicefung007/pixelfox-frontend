# Project Tasks: pixelfox Implementation

## Phase 1: Infrastructure Setup

- [ ] Install dependencies (`react-router-dom`, `zustand`, `i18next`, `react-i18next`, `lucide-react`)
- [ ] Initialize i18n config (`src/i18n/config.ts`) and create English/Chinese locale JSON files.
- [ ] Configure routing with `react-router-dom` and set up the `AppLayout` wrapper.
- [ ] Verify shadcn-ui components are ready (Button, Card, Tabs, Popover, etc.).

## Phase 2: Core UI Layout

- [ ] Build `Navbar` component with brand logo, main navigation (Editor, Gallery, Upscaler), and user/system actions.
- [ ] Build `Sidebar` component:
  - [ ] Implement `ActionPanel` for file-level buttons (Upload, Save, etc.).
  - [ ] Implement `ToolPanel` for brush, bucket, and other drawing tools.
  - [ ] Implement `SettingsPanel` for canvas dimensions.
- [ ] Build `AppLayout` to integrate `Navbar`, `Sidebar`, and a main view container.

## Phase 3: Canvas Editor & Palette

- [ ] Implement `useEditorStore` with Zustand for pixel data and current drawing tool state.
- [ ] Build `PixelCanvas` component:
  - [ ] Render interactive pixel grid with pan/zoom.
  - [ ] Add `ZoomControls` for zooming in/out.
- [ ] Build `PalettePanel` component:
  - [ ] Render color swatches.
  - [ ] Implement "Used Colors" and "Recent" tabs.
  - [ ] Add color picker functionality.

## Phase 4: Interactive Logic & i18n

- [ ] Implement drawing logic:
  - [ ] Brush tool: Update individual pixels.
  - [ ] Bucket tool: Flood fill algorithm.
  - [ ] Eraser tool: Reset pixels to background color.
- [ ] Implement Undo/Redo logic using a simple history stack.
- [ ] Localize all UI strings (English and Chinese).
- [ ] Ensure theme-switching (Dark/Light mode) works across all components.

## Phase 5: Polishing & Finalization

- [ ] Add smooth transitions and animations (hover effects, tool transitions).
- [ ] Optimize canvas performance for larger grids.
- [ ] Conduct final UI review against the reference image.
- [ ] Final bug fixes and code cleanup.
