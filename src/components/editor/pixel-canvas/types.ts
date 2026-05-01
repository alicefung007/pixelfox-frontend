export type ResizeEdge = 'left' | 'right' | 'top' | 'bottom';

export type WandSelection = {
  x: number;
  y: number;
  color: string;
  keys: string[];
};

export type ResizeDragState = {
  edge: ResizeEdge;
  startClientX: number;
  startClientY: number;
  startWidth: number;
  startHeight: number;
  startOffset: { x: number; y: number };
  previewSize: number;
};

export type CursorOverlayState = { x: number; y: number; visible: boolean };
