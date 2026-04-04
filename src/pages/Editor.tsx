import PixelCanvas from "@/components/editor/PixelCanvas";
import PalettePanel from "@/components/palette/PalettePanel";

export default function Editor() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 relative">
        <PixelCanvas />
      </div>
      <PalettePanel />
    </div>
  );
}
