import { useEffect } from 'react';
import { useEditorStore } from '@/store/useEditorStore';
import type { ToolType } from '@/store/useEditorStore';

const TOOL_SHORTCUTS: Record<string, ToolType> = {
  b: 'brush',
  g: 'bucket',
  h: 'hand',
  e: 'eraser',
  i: 'eyedropper',
  t: 'text',
};

export function useToolShortcuts() {
  const setTool = useEditorStore((state) => state.setTool);
  const undo = useEditorStore((state) => state.undo);
  const redo = useEditorStore((state) => state.redo);
  const setUploadOpen = useEditorStore((state) => state.setUploadOpen);

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
  }, [setTool, undo, redo, setUploadOpen]);
}
