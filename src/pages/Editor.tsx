import { useEffect, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import PixelCanvas from "@/components/editor/PixelCanvas";
import MobileEditorQuickActions from "@/components/editor/MobileEditorQuickActions";
import PalettePanel from "@/components/palette/PalettePanel";
import PaletteReplaceColorDialog from "@/components/palette/PaletteReplaceColorDialog";
import Sidebar from "@/components/layout/Sidebar";
import UploadPhotoDialog from "@/components/editor/UploadPhotoDialog";
import Preview3DDialog from "@/components/editor/Preview3DDialog";
import ExportPatternDialog from "@/components/editor/ExportPatternDialog";
import { useToolShortcuts } from "@/hooks/useToolShortcuts";
import type { ColorMatchResult } from "@/lib/image-processor";
import type { SystemPaletteId } from "@/lib/palettes";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

type EditorContext = {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  uploadOpen: boolean;
  setUploadOpen: (open: boolean) => void;
  exportOpen: boolean;
  setExportOpen: (open: boolean) => void;
  handleGenerate: (result: ColorMatchResult, paletteId: SystemPaletteId) => void;
};

type ReplaceTarget = {
  sourceColor: string;
  pixelKeys?: string[];
};

export default function Editor() {
  useToolShortcuts();
  const navigate = useNavigate();
  const { sidebarOpen, setSidebarOpen, uploadOpen, setUploadOpen, exportOpen, setExportOpen, handleGenerate } = useOutletContext<EditorContext>();
  const [preview3DOpen, setPreview3DOpen] = useState(false);
  const [replaceTarget, setReplaceTarget] = useState<ReplaceTarget | null>(null);
  const [isDesktopViewport, setIsDesktopViewport] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.matchMedia("(min-width: 768px)").matches;
  });

  const handleReplaceDialogOpenChange = (open: boolean) => {
    if (open) return;
    setReplaceTarget(null);
  };

  const openReplaceDialog = (sourceColor: string, pixelKeys?: string[]) => {
    setReplaceTarget({ sourceColor, pixelKeys });
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mediaQuery = window.matchMedia("(min-width: 768px)");
    const updateViewportMode = () => setIsDesktopViewport(mediaQuery.matches);
    updateViewportMode();
    mediaQuery.addEventListener("change", updateViewportMode);
    return () => mediaQuery.removeEventListener("change", updateViewportMode);
  }, []);

  return (
    <div className="h-full flex">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onUpload={() => setUploadOpen(true)}
        onAssembly={() => navigate("/assembly")}
        onPreview3D={() => setPreview3DOpen(true)}
        onExport={() => setExportOpen(true)}
      />

      <div className="flex-1 h-full">
        {isDesktopViewport ? (
          <ResizablePanelGroup
            direction="horizontal"
            autoSaveId="pixelfox-editor-layout-desktop-right-palette"
            className="h-full"
          >
            <ResizablePanel defaultSize="55%" minSize="40%" className="relative overflow-hidden">
              <PixelCanvas onOpenReplaceColorDialog={openReplaceDialog} />
            </ResizablePanel>
            <ResizableHandle
              withHandle
              className="aria-[orientation=vertical]:w-2 sm:aria-[orientation=vertical]:w-1"
            />
            <ResizablePanel
              defaultSize="45%"
              minSize="18%"
              maxSize="45%"
              className="overflow-hidden bg-background"
            >
              <PalettePanel onOpenReplaceColorDialog={openReplaceDialog} />
            </ResizablePanel>
          </ResizablePanelGroup>
        ) : (
          <ResizablePanelGroup
            direction="vertical"
            autoSaveId="pixelfox-editor-layout-mobile-bottom-palette"
            className="h-full"
          >
            <ResizablePanel defaultSize="45%" minSize="45%" className="overflow-hidden">
              <div className="flex h-full flex-col">
                <MobileEditorQuickActions onExport={() => setExportOpen(true)} />
                <div className="relative min-h-0 flex-1 overflow-hidden">
                  <PixelCanvas onOpenReplaceColorDialog={openReplaceDialog} />
                </div>
              </div>
            </ResizablePanel>
            <ResizableHandle withHandle className="aria-[orientation=horizontal]:h-2" />
            <ResizablePanel defaultSize="55%" minSize="20%" maxSize="55%" className="overflow-hidden bg-background">
              <PalettePanel onOpenReplaceColorDialog={openReplaceDialog} />
            </ResizablePanel>
          </ResizablePanelGroup>
        )}
      </div>

      <UploadPhotoDialog open={uploadOpen} onOpenChange={setUploadOpen} onGenerate={handleGenerate} />
      <Preview3DDialog open={preview3DOpen} onOpenChange={setPreview3DOpen} />
      <ExportPatternDialog open={exportOpen} onOpenChange={setExportOpen} />
      <PaletteReplaceColorDialog
        open={replaceTarget !== null}
        sourceColor={replaceTarget?.sourceColor ?? null}
        pixelKeys={replaceTarget?.pixelKeys}
        onOpenChange={handleReplaceDialogOpenChange}
      />
    </div>
  );
}
