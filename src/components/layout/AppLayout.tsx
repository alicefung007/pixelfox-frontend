import { useState, useCallback } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import Navbar from "./Navbar";
import { useEditorStore } from "@/store/useEditorStore";
import { usePaletteStore } from "@/store/usePaletteStore";
import type { ColorMatchResult } from "@/lib/image-processor";
import type { SystemPaletteId } from "@/lib/palettes";
import { getSystemPalette } from "@/lib/palettes";
import { resolvePaletteColor } from "@/lib/palette-color";
import { showPaletteRemapToast } from "@/lib/palette-notice";
import { useTranslation } from "react-i18next";

export default function AppLayout() {
  const { t } = useTranslation();
  const location = useLocation();
  const isEditorPage = location.pathname === "/";
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { setPixels, setSize, saveHistory, setColor, primaryColor, uploadOpen, setUploadOpen, exportOpen, setExportOpen } = useEditorStore();
  const { setCurrentPaletteId, setActiveTab, flashUsedTab } = usePaletteStore();

  const handleGenerate = useCallback((result: ColorMatchResult, paletteId: SystemPaletteId) => {
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
    const targetPalette = getSystemPalette(paletteId);
    if (targetPalette) {
      const resolvedColor = resolvePaletteColor(primaryColor, targetPalette);
      setColor(resolvedColor);
      showPaletteRemapToast({
        fromColor: primaryColor,
        toColor: resolvedColor,
        palette: targetPalette,
        t,
      });
    }
    setCurrentPaletteId(paletteId);
    saveHistory();
    setTimeout(() => {
      setActiveTab("used");
      flashUsedTab();
    }, 350);
  }, [setPixels, setSize, saveHistory, setColor, primaryColor, setCurrentPaletteId, setActiveTab, flashUsedTab, t]);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      <Navbar onMenuClick={isEditorPage ? () => setSidebarOpen(!sidebarOpen) : undefined} />
      <Toaster position="top-right" />
      <main className="flex-1 flex flex-col relative overflow-hidden">
        <Outlet context={{
          sidebarOpen,
          setSidebarOpen,
          uploadOpen,
          setUploadOpen,
          exportOpen,
          setExportOpen,
          handleGenerate
        }} />
      </main>
    </div>
  );
}
