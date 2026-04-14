import { useTranslation } from "react-i18next";
import {
  Upload,
  Save,
  Share2,
  Layers,
  Box,
  Undo2,
  Redo2,
  Download,
  Trash2,
  Settings,
  ChevronRight,
  Brush,
  PaintBucket,
  Hand,
  Eraser,
  Pipette,
  Type,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useEditorStore } from "@/store/useEditorStore";
import type { ToolType } from "@/store/useEditorStore";
import { cn } from "@/lib/utils";

type Props = {
  isOpen?: boolean;
  onClose?: () => void;
  onUpload?: () => void;
  onPreview3D?: () => void;
};

export default function Sidebar({ isOpen = true, onClose, onUpload, onPreview3D }: Props) {
  const { t } = useTranslation();
  const { currentTool, setTool, undo, redo, clear, width } = useEditorStore();

  const actionButtons = [
    { icon: <Upload size={18} />, label: t("sidebar.upload"), shortcut: "⌘ U", onClick: onUpload },
    { icon: <Save size={18} />, label: t("sidebar.save"), shortcut: "⌘ S" },
    { icon: <Share2 size={18} />, label: t("sidebar.share"), shortcut: "⌥ ⌘ S" },
    { icon: <Layers size={18} />, label: t("sidebar.assembly") },
    { icon: <Box size={18} />, label: t("sidebar.preview3d"), onClick: onPreview3D },
  ];

  const tools: { id: ToolType; icon: React.ReactNode; label: string; shortcut: string }[] = [
    { id: 'brush', icon: <Brush size={18} />, label: t("sidebar.brush"), shortcut: "B" },
    { id: 'bucket', icon: <PaintBucket size={18} />, label: t("sidebar.bucket"), shortcut: "G" },
    { id: 'hand', icon: <Hand size={18} />, label: t("sidebar.hand"), shortcut: "H" },
    { id: 'eraser', icon: <Eraser size={18} />, label: t("sidebar.eraser"), shortcut: "E" },
    { id: 'eyedropper', icon: <Pipette size={18} />, label: t("sidebar.eyedropper"), shortcut: "I" },
    { id: 'text', icon: <Type size={18} />, label: t("sidebar.text"), shortcut: "T" },
  ];

  return (
    <>
      <aside className={cn(
        "w-64 border-r bg-background flex flex-col h-[calc(100vh-56px)] md:h-[calc(100vh-64px)] overflow-hidden shrink-0",
        "hidden md:flex"
      )}>
        <ScrollArea className="flex-1">
          <SidebarContent
            actionButtons={actionButtons}
            tools={tools}
            currentTool={currentTool}
            onToolChange={setTool}
            width={width}
            undo={undo}
            redo={redo}
            clear={clear}
            t={t}
          />
        </ScrollArea>
      </aside>

      <div
        className={cn(
          "fixed inset-0 z-50 bg-black/50 md:hidden transition-opacity duration-200",
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      <aside className={cn(
        "fixed left-0 top-14 bottom-0 w-72 border-r bg-background flex flex-col z-50 md:hidden",
        "transition-transform duration-200 ease-out",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center justify-between p-3 border-b">
          <span className="text-sm font-semibold">{t("sidebar.tools")}</span>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
            <X size={18} />
          </Button>
        </div>
        <ScrollArea className="flex-1">
          <SidebarContent
            actionButtons={actionButtons}
            tools={tools}
            currentTool={currentTool}
            onToolChange={setTool}
            width={width}
            undo={undo}
            redo={redo}
            clear={clear}
            t={t}
            onAction={onClose}
          />
        </ScrollArea>
      </aside>
    </>
  );
}

type SidebarContentProps = {
  actionButtons: { icon: React.ReactNode; label: string; shortcut?: string; onClick?: () => void }[];
  tools: { id: ToolType; icon: React.ReactNode; label: string; shortcut: string }[];
  currentTool: ToolType;
  onToolChange: (tool: ToolType) => void;
  width: number;
  undo: () => void;
  redo: () => void;
  clear: () => void;
  t: (key: string) => string;
  onAction?: () => void;
};

function SidebarContent({ actionButtons, tools, currentTool, onToolChange, width, undo, redo, clear, t, onAction }: SidebarContentProps) {
  return (
    <div className="p-3 space-y-4">
      <div className="space-y-1">
        {actionButtons.map((btn, i) => (
          <Button
            key={i}
            variant="ghost"
            className="w-full justify-between h-9 px-2 text-sm font-normal"
            onClick={() => {
              btn.onClick?.();
              onAction?.();
            }}
          >
            <div className="flex items-center gap-2">
              {btn.icon}
              <span>{btn.label}</span>
            </div>
            {btn.shortcut && <span className="text-[10px] text-muted-foreground uppercase">{btn.shortcut}</span>}
          </Button>
        ))}
      </div>

      <Separator />

      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" size="sm" className="h-9 gap-1 sm:gap-2" onClick={undo}>
          <Undo2 size={16} />
          <span className="hidden sm:inline text-xs">{t("sidebar.undo")}</span>
        </Button>
        <Button variant="outline" size="sm" className="h-9 gap-1 sm:gap-2" onClick={redo}>
          <Redo2 size={16} />
          <span className="hidden sm:inline text-xs">{t("sidebar.redo")}</span>
        </Button>
      </div>

      <div className="space-y-2">
        <Button className="w-full justify-between h-10 bg-gradient-to-r from-pink-500 to-violet-500 hover:opacity-90 border-none text-white font-medium" onClick={onAction}>
          <div className="flex items-center gap-2">
            <Download size={18} />
            <span>{t("sidebar.export")}</span>
          </div>
          <span className="text-[10px] opacity-80 uppercase hidden sm:inline">⌘ E</span>
        </Button>
        <Button variant="outline" className="w-full justify-between h-9 px-2 text-sm font-normal" onClick={clear}>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Trash2 size={18} />
            <span>{t("sidebar.clear")}</span>
          </div>
          <span className="text-[10px] text-muted-foreground uppercase hidden sm:inline">⌘ ⌫</span>
        </Button>
      </div>

      <Separator />

      <Button variant="ghost" className="w-full justify-between h-9 px-2 text-sm font-normal" onClick={onAction}>
        <div className="flex items-center gap-2">
          <Settings size={18} />
          <span>{t("sidebar.settings")}</span>
        </div>
        <ChevronRight size={16} className="text-muted-foreground" />
      </Button>

      <div className="space-y-1">
        <span className="text-[10px] font-bold text-muted-foreground uppercase px-2 mb-1 block">
          {t("sidebar.tools")}
        </span>
        {tools.map((tool) => (
          <Button 
            key={tool.id} 
            variant={currentTool === tool.id ? "secondary" : "ghost"} 
            onClick={() => {
              onToolChange(tool.id);
              onAction?.();
            }}
            className={`w-full justify-between h-9 px-2 text-sm font-normal ${
              currentTool === tool.id ? "bg-pink-500/10 text-pink-500 hover:bg-pink-500/20 hover:text-pink-500" : ""
            }`}
          >
            <div className="flex items-center gap-2">
              {tool.icon}
              <span>{tool.label}</span>
            </div>
            <span className="text-[10px] text-muted-foreground uppercase hidden sm:inline">{tool.shortcut}</span>
          </Button>
        ))}
      </div>

      <Separator />

      <div className="space-y-2 px-2 pb-4">
         <span className="text-[10px] font-bold text-muted-foreground uppercase block">
          {t("sidebar.canvasSize")}
        </span>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{t("sidebar.width")}</span>
          <span className="text-xs font-medium">{width}</span>
        </div>
      </div>
    </div>
  );
}
