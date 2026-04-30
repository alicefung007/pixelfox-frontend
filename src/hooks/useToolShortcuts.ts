import { useEffect } from 'react';
import { useEditorStore } from '@/store/useEditorStore';
import { usePaletteStore } from '@/store/usePaletteStore';
import type { ToolType } from '@/store/useEditorStore';
import { normalizeHex } from '@/lib/utils';

const TOOL_SHORTCUTS: Record<string, ToolType> = {
  b: 'brush',
  g: 'bucket',
  w: 'wand',
  h: 'hand',
  e: 'eraser',
  i: 'eyedropper',
  t: 'text',
};

export function useToolShortcuts() {
  const setTool = useEditorStore((state) => state.setTool);
  const undo = useEditorStore((state) => state.undo);
  const redo = useEditorStore((state) => state.redo);
  const clear = useEditorStore((state) => state.clear);
  const setPixels = useEditorStore((state) => state.setPixels);
  const saveHistory = useEditorStore((state) => state.saveHistory);
  const setUploadOpen = useEditorStore((state) => state.setUploadOpen);
  const setExportOpen = useEditorStore((state) => state.setExportOpen);
  const hasPixels = useEditorStore((state) => Object.keys(state.pixels).length > 0);
  const selectedUsedColor = usePaletteStore((state) => state.selectedUsedColor);
  const setSelectedUsedColor = usePaletteStore((state) => state.setSelectedUsedColor);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Ignore if user is typing in an input field
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      // Check for Ctrl/Cmd + Z (undo)
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }

      // Check for Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y (redo)
      if ((e.metaKey || e.ctrlKey) && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
        return;
      }

      // Check for Ctrl/Cmd + U (upload photo)
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'u') {
        e.preventDefault();
        setUploadOpen(true);
        return;
      }

      // Check for Ctrl/Cmd + Backspace/Delete (clear canvas)
      if ((e.metaKey || e.ctrlKey) && (e.key === 'Backspace' || e.key === 'Delete')) {
        e.preventDefault();
        clear();
        return;
      }

      // Clear the selected Used Colors swatch with Delete/Backspace.
      if (!e.metaKey && !e.ctrlKey && !e.altKey && (e.key === 'Backspace' || e.key === 'Delete') && selectedUsedColor) {
        e.preventDefault();
        const normalizedSelectedColor = normalizeHex(selectedUsedColor);
        let changed = false;
        const currentPixels = useEditorStore.getState().pixels;
        const nextPixels: Record<string, string> = {};

        for (const [key, color] of Object.entries(currentPixels)) {
          if (normalizeHex(color) === normalizedSelectedColor) {
            changed = true;
            continue;
          }
          nextPixels[key] = color;
        }

        if (changed) {
          setPixels(nextPixels);
          saveHistory();
        }
        setSelectedUsedColor(null);
        return;
      }

      // Check for Ctrl/Cmd + E (export pattern)
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        if (hasPixels) {
          setExportOpen(true);
        }
        return;
      }

      // Tool shortcuts (only when no modifier keys are pressed)
      if (e.metaKey || e.ctrlKey || e.altKey) {
        return;
      }

      const key = e.key.toLowerCase();
      const tool = TOOL_SHORTCUTS[key];
      if (tool) {
        e.preventDefault();
        setTool(tool);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setTool, undo, redo, clear, setPixels, saveHistory, setUploadOpen, setExportOpen, hasPixels, selectedUsedColor, setSelectedUsedColor]);
}
