import PixelCanvas from "@/components/editor/PixelCanvas";
import PalettePanel from "@/components/palette/PalettePanel";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

export default function Editor() {
  return (
    <div className="h-full">
      <div className="hidden h-full md:block">
        <ResizablePanelGroup
          direction="horizontal"
          autoSaveId="pixelfox-editor-layout-desktop-right-palette"
          className="h-full"
        >
          <ResizablePanel defaultSize="72%" minSize="40%" className="relative overflow-hidden">
            <PixelCanvas />
          </ResizablePanel>
          <ResizableHandle
            withHandle
            className="aria-[orientation=vertical]:w-2 sm:aria-[orientation=vertical]:w-1"
          />
          <ResizablePanel
            defaultSize="28%"
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
          <ResizablePanel defaultSize="68%" minSize="45%" className="relative overflow-hidden">
            <PixelCanvas />
          </ResizablePanel>
          <ResizableHandle withHandle className="aria-[orientation=horizontal]:h-2" />
          <ResizablePanel defaultSize="32%" minSize="20%" maxSize="55%" className="overflow-hidden bg-background">
            <PalettePanel />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}
