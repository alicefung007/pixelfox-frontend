import { useState, useEffect, useRef } from "react";
import PixelCanvas from "@/components/editor/PixelCanvas";
import PalettePanel from "@/components/palette/PalettePanel";

const DEFAULT_PALETTE_HEIGHT = 280;
const MIN_PALETTE_HEIGHT = 100;
const MAX_PALETTE_HEIGHT = 600;

export default function Editor() {
  const [paletteHeight, setPaletteHeight] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem("palette-height");
      return saved ? parseInt(saved, 10) : DEFAULT_PALETTE_HEIGHT;
    }
    return DEFAULT_PALETTE_HEIGHT;
  });
  const isResizing = useRef(false);
  const lastTouchY = useRef(0);
  const handleMouseMoveRef = useRef<((e: MouseEvent) => void) | null>(null);
  const handleMouseUpRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    localStorage.setItem("palette-height", paletteHeight.toString());
  }, [paletteHeight]);

  useEffect(() => {
    handleMouseMoveRef.current = (e: MouseEvent) => {
      if (!isResizing.current) return;
      const newHeight = window.innerHeight - e.clientY;
      if (newHeight >= MIN_PALETTE_HEIGHT && newHeight <= MAX_PALETTE_HEIGHT) {
        setPaletteHeight(newHeight);
      }
    };

    handleMouseUpRef.current = () => {
      isResizing.current = false;
      if (handleMouseMoveRef.current) {
        document.removeEventListener("mousemove", handleMouseMoveRef.current);
      }
      if (handleMouseUpRef.current) {
        document.removeEventListener("mouseup", handleMouseUpRef.current);
      }
    };
  }, []);

  const handleMouseDown = () => {
    isResizing.current = true;
    document.addEventListener("mousemove", handleMouseMoveRef.current!);
    document.addEventListener("mouseup", handleMouseUpRef.current!);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    isResizing.current = true;
    lastTouchY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isResizing.current) return;
    const currentY = e.touches[0].clientY;
    const deltaY = lastTouchY.current - currentY;
    lastTouchY.current = currentY;
    
    setPaletteHeight((prev) => {
      const newHeight = prev + deltaY;
      if (newHeight >= MIN_PALETTE_HEIGHT && newHeight <= MAX_PALETTE_HEIGHT) {
        return newHeight;
      }
      return prev;
    });
  };

  const handleTouchEnd = () => {
    isResizing.current = false;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 relative overflow-hidden">
        <PixelCanvas />
      </div>
      
      <div 
        className="h-2 sm:h-1 w-full cursor-ns-resize hover:bg-pink-500/50 active:bg-pink-500 transition-colors z-10 touch-none select-none"
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      />

      <div style={{ height: `${paletteHeight}px` }} className="shrink-0 overflow-hidden bg-background">
        <PalettePanel />
      </div>
    </div>
  );
}
