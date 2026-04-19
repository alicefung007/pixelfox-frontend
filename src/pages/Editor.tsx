import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import PixelCanvas from "@/components/editor/PixelCanvas";
import PalettePanel from "@/components/palette/PalettePanel";
import Sidebar from "@/components/layout/Sidebar";
import UploadPhotoDialog from "@/components/editor/UploadPhotoDialog";
import Preview3DDialog from "@/components/editor/Preview3DDialog";
import ExportPatternDialog from "@/components/editor/ExportPatternDialog";
import { useToolShortcuts } from "@/hooks/useToolShortcuts";
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
  handleGenerate: (result: any, paletteId: any) => void;
};

export default function Editor() {
  useToolShortcuts();
  const { sidebarOpen, setSidebarOpen, uploadOpen, setUploadOpen, exportOpen, setExportOpen, handleGenerate } = useOutletContext<EditorContext>();
  const [preview3DOpen, setPreview3DOpen] = useState(false);

  return (
    <div className="h-full flex">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onUpload={() => setUploadOpen(true)}
        onPreview3D={() => setPreview3DOpen(true)}
        onExport={() => setExportOpen(true)}
      />

      <div className="flex-1 h-full">
        <div className="hidden h-full md:block">
          <ResizablePanelGroup
            direction="horizontal"
            autoSaveId="pixelfox-editor-layout-desktop-right-palette"
            className="h-full"
          >
            <ResizablePanel defaultSize="55%" minSize="40%" className="relative overflow-hidden">
              <PixelCanvas />
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
              <PalettePanel />
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>

        <div className="h-full md:hidden">
          <ResizablePanelGroup
            direction="vertical"
            autoSaveId="pixelfox-editor-layout-mobile-bottom-palette"
            className="h-full"
          >
            <ResizablePanel defaultSize="45%" minSize="45%" className="relative overflow-hidden">
              <PixelCanvas />
            </ResizablePanel>
            <ResizableHandle withHandle className="aria-[orientation=horizontal]:h-2" />
            <ResizablePanel defaultSize="55%" minSize="20%" maxSize="55%" className="overflow-hidden bg-background">
              <PalettePanel />
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </div>

      <UploadPhotoDialog open={uploadOpen} onOpenChange={setUploadOpen} onGenerate={handleGenerate} />
      <Preview3DDialog open={preview3DOpen} onOpenChange={setPreview3DOpen} />
      <ExportPatternDialog open={exportOpen} onOpenChange={setExportOpen} />
    </div>
  );
}
