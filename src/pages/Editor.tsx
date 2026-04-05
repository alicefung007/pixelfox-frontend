import { useState, useEffect } from "react";
import PixelCanvas from "@/components/editor/PixelCanvas";
import PalettePanel from "@/components/palette/PalettePanel";

const DEFAULT_PALETTE_HEIGHT = 280;
const MIN_PALETTE_HEIGHT = 100;
const MAX_PALETTE_HEIGHT = 600;

export default function Editor() {
  const [paletteHeight, setPaletteHeight] = useState(() => {
    const saved = localStorage.getItem("palette-height");
    return saved ? parseInt(saved, 10) : DEFAULT_PALETTE_HEIGHT;
  });
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    localStorage.setItem("palette-height", paletteHeight.toString());
  }, [paletteHeight]);

  useEffect(() => {
    if (!isResizing) return;
    const handleMouseMove = (e: MouseEvent) => {
      const newHeight = window.innerHeight - e.clientY;
      if (newHeight >= MIN_PALETTE_HEIGHT && newHeight <= MAX_PALETTE_HEIGHT) {
        setPaletteHeight(newHeight);
      }
    };
    const handleMouseUp = () => {
      setIsResizing(false);
    };
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    document.body.style.cursor = "ns-resize";
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "default";
    };
  }, [isResizing]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 relative overflow-hidden">
        <PixelCanvas />
      </div>
      
      {/* Resize Handle */}
      <div 
        className="h-1 w-full cursor-ns-resize hover:bg-pink-500/50 transition-colors active:bg-pink-500 z-10"
        onMouseDown={handleMouseDown}
      />

      <div style={{ height: `${paletteHeight}px` }} className="shrink-0 overflow-hidden bg-background">
        <PalettePanel />
      </div>
    </div>
  );
}
