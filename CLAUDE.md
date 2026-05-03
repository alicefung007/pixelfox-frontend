# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

pixelfox is a pixel art editor web application (pixelfox.art) built with React 19, TypeScript, and Tailwind CSS v4. It allows users to create pixel art from photos using predefined color palettes (MARD, COCO, MANMAN, etc.) via CIEDE2000 color matching.

## Commands

```bash
pnpm install      # Install dependencies (run once after cloning)
pnpm dev          # Start development server
pnpm build        # Build for production (typecheck + vite build)
pnpm lint         # Run ESLint
pnpm format       # Format code with Prettier
pnpm typecheck    # Run TypeScript type checking
pnpm preview      # Preview production build
```

## Tech Stack

- **Framework**: React 19 + Vite 7
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4 (uses `@tailwindcss/vite` plugin)
- **UI Components**: shadcn/ui (Radix UI based, configured via `components.json`)
- **State Management**: Zustand with persist middleware
- **Routing**: React Router v7
- **i18n**: i18next with English, Chinese, Korean, Japanese locales
- **3D Preview**: React Three Fiber + @react-three/drei
- **Icons**: hugeicons/react

## Architecture

### State Management (Zustand)

Two main stores in `src/store/`:

- **`useEditorStore`**: Canvas state (pixels map, dimensions, history/undo-redo), current tool, primary color, zoom level
- **`usePaletteStore`**: Palette selection, used/recent colors, custom palette, persisted to localStorage

Pixel data is stored as `Record<string, string>` where key is `"x,y"` and value is hex color.

### Routing

`App.tsx` defines routes under `AppLayout`:

- `/` — Editor page (main pixel canvas + palette)
- `/gallery` — Placeholder
- `/upscaler` — Placeholder

### Image Processing Pipeline

`src/lib/image-processor.ts` handles converting photos to pixel art:

1. Image loaded and resized maintaining aspect ratio
2. Pooling (default 2x2 pixels → 1 bead)
3. K-d tree based nearest-color matching using CIEDE2000 color difference
4. BFS region merging for smoothing

Color palettes are defined in `src/lib/palettes/` with a `PaletteDefinition` type.

### Component Organization

```
src/components/
  editor/       # PixelCanvas, UploadPhotoDialog, Preview3DDialog
  layout/       # AppLayout, Navbar, Sidebar
  palette/      # PalettePanel, PaletteManageDialog
  ui/           # shadcn/ui components (button, dialog, tabs, etc.)

src/lib/
  constants.ts  # All magic numbers centralized here
  utils.ts      # Shared utilities (cn, normalizeHex, clampZoom, etc.)
  palettes/     # Palette definitions (mard.ts, coco.ts, etc.)
  image-processor.ts
```

## Code Standards

### Formatting

Prettier is the source of truth for formatting. Before finishing any code
change, run:

```bash
pnpm format
```

Use the repository `.prettierrc` settings:

- `printWidth`: 80
- `tabWidth`: 2
- `semi`: false
- `singleQuote`: false
- `trailingComma`: `es5`
- `endOfLine`: `lf`
- `prettier-plugin-tailwindcss` enabled
- Tailwind classes are sorted using `src/index.css`
- Tailwind-aware functions: `cn`, `cva`

Do not hand-format files against a different style. If a formatting-only diff
appears, prefer applying Prettier to the touched files or running `pnpm format`
once for the repo.

### Constants (`src/lib/constants.ts`)

All magic numbers MUST be centralized here. No hardcoded values in components.

Categories: `EDITOR_CONFIG`, `PALETTE_CONFIG`, `CANVAS_CONFIG`, `CURSOR_CONFIG`, `PANEL_CONFIG`

### Utilities (`src/lib/utils.ts`)

Shared utilities: `cn()` (clsx+tailwind-merge), `normalizeHex`, `isDarkColor`, `clampZoom`, `getLinePoints` (Bresenham's algorithm).

### shadcn/ui Components

Components are in `src/components/ui/` and use the `cn()` utility. The `components.json` at root configures shadcn settings including:

- Style: `radix-luma`
- Icon library: `hugeicons`
- Component prefix: none
- Tailwind CSS variables enabled

### Import Conventions

```typescript
import { create } from "zustand"
import { cn, normalizeHex } from "@/lib/utils"
import { EDITOR_CONFIG } from "@/lib/constants"
import { Button } from "@/components/ui/button"
import type { PaletteDefinition } from "@/lib/palettes/types"
```

## Key Configuration Files

- `components.json` — shadcn/ui configuration
- `vite.config.ts` — Vite with @tailwindcss/vite plugin, @ path alias
- `eslint.config.js` — ESLint flat config with TypeScript, React Hooks, React Refresh
- `.prettierrc` — Prettier with tailwindcss plugin
- `src/lib/palettes/types.ts` — Palette type definitions
