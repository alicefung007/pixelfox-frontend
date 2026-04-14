import { useState } from "react";
import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import UploadPhotoDialog from "@/components/editor/UploadPhotoDialog";
import { useEditorStore } from "@/store/useEditorStore";
import { usePaletteStore } from "@/store/usePaletteStore";
import type { ColorMatchResult } from "@/lib/image-processor";
import type { SystemPaletteId } from "@/lib/palettes";

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const { setPixels, setSize, saveHistory } = useEditorStore();
  const { setCurrentPaletteId, setActiveTab } = usePaletteStore();

  const handleGenerate = (result: ColorMatchResult, paletteId: SystemPaletteId) => {
    const pixels: Record<string, string> = {};
    const { imageData, width, height } = result;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const offset = (y * width + x) * 4;
        const r = imageData.data[offset];
        const g = imageData.data[offset + 1];
        const b = imageData.data[offset + 2];
        const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
        pixels[`${x},${y}`] = hex;
      }
    }

    setSize(width, height);
    setPixels(pixels);
    setCurrentPaletteId(paletteId);
    setActiveTab("used");
    saveHistory();
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      <Navbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onUpload={() => setUploadOpen(true)}
        />
        <main className="flex-1 flex flex-col relative overflow-hidden">
          <Outlet />
        </main>
      </div>
      <UploadPhotoDialog open={uploadOpen} onOpenChange={setUploadOpen} onGenerate={handleGenerate} />
    </div>
  );
}
