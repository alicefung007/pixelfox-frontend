# pixelfox

[English](README.md) | [简体中文](README.zh.md) | [日本語](README.ja.md) | [한국어](README.ko.md)

PixelFox is a modern pixel-art / fuse-bead pattern editor interface ([pixelfox.art](https://pixelfox.art)) built with React, TypeScript, and shadcn/ui.

## Business Overview

PixelFox currently implements a client-side pattern editing workspace. The core workflow is:

1. Create a blank canvas or upload an image.
2. Convert the image into a palette-constrained pixel / bead grid, or draw and edit manually.
3. Manage pattern colors through system palettes, canvas-used colors, color replacement, and color deletion.
4. Preview the artwork, export a PNG pattern with branding and color statistics, or enter assembly mode to build step by step by color.

There is no backend business API in the current codebase. Canvas data, editor preferences, palette settings, export settings, and assembly progress are all stored in browser `localStorage`.

## Tech Stack

- **Framework**: React 19
- **Build Tool**: Vite
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Components**: shadcn/ui (Radix UI)
- **State Management**: Zustand
- **Routing**: React Router v7
- **i18n**: i18next
- **3D Preview**: Three.js, React Three Fiber, drei

## Routes

- `/`: Main editor page with canvas, sidebar tools, palette panel, upload dialog, 3D preview dialog, export dialog, and color replacement dialog.
- `/assembly`: Standalone assembly page. It opens the assembly workflow full-screen and returns to `/` when closed.

`AppLayout` is the application shell. It renders the navbar and global toaster, then passes shared upload, export, and image generation state to pages through React Router outlet context.

## Core Business Logic

### Canvas Editing

Canvas state is centralized in `src/store/useEditorStore.ts`.

- `pixels` is the committed pixel map. Keys are `"x,y"` and values are hex colors.
- `pixelBuffer` is a `Uint32Array` optimized for high-frequency drawing. Brush and eraser write to this buffer first, then `saveHistory()` reconciles the buffer back into `pixels`.
- The default canvas size is `30 x 30`, and both width and height are clamped to `1..200` bead cells.
- Undo / redo history stores `{ pixels, width, height }` snapshots and keeps up to 30 in-memory entries.
- The current canvas snapshot is stored under `pixelfox-editor-canvas-storage`. Full history persistence is disabled by default to avoid expensive `localStorage` writes for large canvases.
- Editor preferences such as current tool, primary color, background color, and zoom are stored under `pixelfox-editor-storage`.

Canvas rendering and interaction are coordinated by `src/components/editor/PixelCanvas.tsx` and hooks under `src/components/editor/pixel-canvas/`.

- Brush and eraser interpolate pointer movement to avoid gaps during fast strokes.
- Bucket uses flood fill to fill either same-color regions or connected empty cells.
- Eyedropper picks the current pixel color and automatically returns to brush mode.
- Wand selects a connected same-color region and exposes clear / replace actions.
- Hand tool, wheel, pinch gestures, and toolbar controls support panning and zooming.
- Edge resize handles resize the canvas from a chosen direction and shift or crop existing pixels accordingly.

### Image Upload and Pixel Conversion

The upload flow is implemented by `src/components/editor/UploadPhotoDialog.tsx` and `src/lib/image-processor.ts`.

Users can upload an image, configure output size, lock or unlock aspect ratio, flip / rotate the image, trim background edges, choose a system palette, and adjust color merging strength.

`convertImageToPixelArt()` converts images as follows:

1. Load the source image into an offscreen canvas.
2. Resize it to the target bead dimensions.
3. Pool local pixels according to `poolSize`, choosing the most frequent visible color in each pool.
4. Convert RGB colors into Lab color space.
5. Find the nearest palette swatch using CIEDE2000 distance and a k-d tree.
6. When the color merge threshold is greater than 0, use BFS to merge adjacent regions with close color distance and normalize them to the dominant region color.
7. Return `ImageData`, dimensions, bead count, and palette id.

`AppLayout.handleGenerate()` receives the conversion result, writes non-transparent pixels into editor state, resizes the canvas, switches the current system palette, remaps the active drawing color to the nearest target-palette color, saves history, and highlights the used-colors tab.

### Palette and Color Management

Palette state is centralized in `src/store/usePaletteStore.ts`.

- `currentPaletteId` points to a system palette under `src/lib/palettes/`.
- `usedColors` and `recentColors` are persisted and capped.
- `activeTab` controls whether the palette panel shows all colors or canvas-used colors.
- `selectedUsedColor` tracks the used color currently selected for replacement or deletion.

`src/components/palette/PalettePanel.tsx` owns the main palette workflow.

- The all-colors tab shows all swatches from the active system palette.
- The used-colors tab derives colors and counts from the current canvas snapshot.
- Clicking a swatch updates the editor primary color.
- Deleting a used color removes all matching pixels from the canvas and saves history.
- Dragging one used color onto another replaces all source-color pixels with the target color.
- Switching to a palette that does not contain current canvas colors opens a confirmation dialog. Continuing clears the canvas before switching.

Color replacement is centralized in `src/lib/palette-replace.ts`. It normalizes hex colors, optionally limits replacement to selected pixel keys, updates canvas pixels, saves history, and selects the replacement color when needed.

### Pattern Export

`src/components/editor/ExportPatternDialog.tsx` exports the current canvas as a branded PNG pattern.

Export options include:

- auto-crop to non-empty pixels
- white or transparent background
- major / minor grid lines
- grid interval and color
- axis labels
- per-cell color codes
- mirror flip
- excluding near-white colors from color-code and usage statistics

The export renderer builds a canvas image containing:

- pixel grid content
- optional axes and grid lines
- brand header using `public/logo_with_name.png` or `public/logo.png`
- summary metrics such as palette, size, bead count, and site domain
- color usage badges sorted by usage count

The sidebar disables export when the canvas is empty.

### Assembly Mode

`src/components/editor/AssemblyDialog.tsx` provides step-by-step color-based assembly guidance for the current pattern.

- It counts canvas pixels by normalized color.
- It maps each color to the active palette label, with fallback labels when no palette label exists.
- Steps are sorted by bead count descending, then by label.
- The preview highlights only the active step color and fades other colors.
- Users can mark colors complete, move between steps, zoom / pan the preview, mirror flip, show grids / axes / color codes, and exclude colors such as near-white backgrounds.
- Progress is persisted by pattern signature. The signature hashes palette id, canvas size, and pixel content, so progress is bound to the exact current pattern.
- When all non-excluded colors are completed, a completion dialog is shown and confetti is triggered.

### 3D Preview

`src/components/editor/Preview3DDialog.tsx` uses Three.js to render the current pixel grid as a 3D bead preview. Bead shape constants are defined in `PREVIEW_3D_CONFIG` in `src/lib/constants.ts`.

### Internationalization and Theme

- i18n is configured in `src/i18n/config.ts`.
- Locale files live in `src/i18n/locales/`, currently covering English, Chinese, Korean, and Japanese.
- Theme switching is managed by `src/components/theme-provider.tsx` and exposed from the navbar.

## Important Files

- `src/App.tsx`: Route definitions.
- `src/components/layout/AppLayout.tsx`: Application shell and image generation handoff.
- `src/pages/Editor.tsx`: Main editor composition.
- `src/pages/Assembly.tsx`: Standalone assembly route.
- `src/store/useEditorStore.ts`: Canvas, tools, history, persistence, and dialog state.
- `src/store/usePaletteStore.ts`: Palette, recent / used colors, and palette panel UI state.
- `src/lib/image-processor.ts`: Image pixelization and palette matching algorithm.
- `src/lib/palettes/`: Built-in palette definitions.
- `src/components/editor/PixelCanvas.tsx`: Canvas rendering and interaction orchestration.
- `src/components/palette/PalettePanel.tsx`: Palette tabs, used-color actions, and palette switching.
- `src/components/editor/ExportPatternDialog.tsx`: Pattern image rendering and download.
- `src/components/editor/AssemblyDialog.tsx`: Color-by-color assembly workflow.

## Local Setup

1. Clone the repository.
2. Install dependencies:

   ```bash
   pnpm install
   ```

3. Start the development server:

   ```bash
   pnpm dev
   ```

## Development Commands

- `pnpm dev`: Start the development server.
- `pnpm build`: Build for production.
- `pnpm lint`: Run ESLint.
- `pnpm format`: Format code with Prettier.
- `pnpm typecheck`: Run TypeScript type checking.
