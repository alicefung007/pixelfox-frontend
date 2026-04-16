import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Upload,
  Save,
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
  X,
  Link,
  Unlink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
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
  const { currentTool, setTool, undo, redo, clear, width, height, setSize, saveHistory, backgroundColor, setBackgroundColor } = useEditorStore();

  const actionButtons = [
    { icon: <Upload size={18} />, label: t("sidebar.upload"), shortcut: "⌘ U", onClick: onUpload },
    { icon: <Save size={18} />, label: t("sidebar.save"), shortcut: "⌘ S" },
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
            height={height}
            onSizeChange={setSize}
            onSizeCommit={saveHistory}
            backgroundColor={backgroundColor}
            onBackgroundColorChange={setBackgroundColor}
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
            height={height}
            onSizeChange={setSize}
            onSizeCommit={saveHistory}
            backgroundColor={backgroundColor}
            onBackgroundColorChange={setBackgroundColor}
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
  height: number;
  onSizeChange: (width: number, height: number) => void;
  onSizeCommit: () => void;
  backgroundColor: string | null;
  onBackgroundColorChange: (color: string | null) => void;
  undo: () => void;
  redo: () => void;
  clear: () => void;
  t: (key: string) => string;
  onAction?: () => void;
};

function SidebarContent({
  actionButtons,
  tools,
  currentTool,
  onToolChange,
  width,
  height,
  onSizeChange,
  onSizeCommit,
  backgroundColor,
  onBackgroundColorChange,
  undo,
  redo,
  clear,
  t,
  onAction
}: SidebarContentProps) {
  const [draftWidth, setDraftWidth] = useState(width);
  const [draftHeight, setDraftHeight] = useState(height);
  const [aspectRatioLocked, setAspectRatioLocked] = useState(true);
  const [aspectRatio, setAspectRatio] = useState(width / height);

  useEffect(() => {
    setDraftWidth(width);
  }, [width]);

  useEffect(() => {
    setDraftHeight(height);
  }, [height]);

  useEffect(() => {
    if (aspectRatioLocked) {
      setAspectRatio(draftWidth / draftHeight);
    }
  }, [aspectRatioLocked, draftWidth, draftHeight]);

  const backgroundOptions = useMemo(() => {
    return [
      { key: "transparent", color: null as string | null },
      { key: "white", color: "#FFFFFF" },
      { key: "gray", color: "#9CA3AF" },
      { key: "beige", color: "#FEF3C7" },
      { key: "pink", color: "#FBCFE8" },
      { key: "blue", color: "#DBEAFE" },
      { key: "green", color: "#D1FAE5" },
    ];
  }, []);

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

      <div className="space-y-4 px-2 pb-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-muted-foreground uppercase block">
              {t("sidebar.canvasSize")}
            </span>
            <Button
              variant={aspectRatioLocked ? "secondary" : "ghost"}
              size="icon-xs"
              className={aspectRatioLocked ? "" : "text-muted-foreground"}
              onClick={() => {
                if (!aspectRatioLocked) {
                  setDraftHeight(draftWidth);
                  onSizeChange(draftWidth, draftWidth);
                  onSizeCommit();
                }
                setAspectRatioLocked(!aspectRatioLocked);
              }}
              title={aspectRatioLocked ? t("editor.uploadDialog.unlockAspectRatio") : t("editor.uploadDialog.lockAspectRatio")}
            >
              {aspectRatioLocked ? <Link className="size-3.5" /> : <Unlink className="size-3.5" />}
            </Button>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{t("sidebar.width")}</span>
              <span className="text-xs font-medium tabular-nums">{draftWidth}</span>
            </div>
            <Slider
              value={[draftWidth]}
              onValueChange={([val]) => {
                setDraftWidth(val);
                if (aspectRatioLocked) {
                  setDraftHeight(Math.round(val / aspectRatio));
                }
              }}
              onValueCommit={([val]) => {
                const newWidth = val;
                const newHeight = aspectRatioLocked ? Math.round(newWidth / aspectRatio) : draftHeight;
                setDraftWidth(newWidth);
                setDraftHeight(newHeight);
                onSizeChange(newWidth, newHeight);
                onSizeCommit();
              }}
              min={1}
              max={200}
              className="[&_[data-slot=slider-range]]:bg-pink-500"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{t("sidebar.height")}</span>
              <span className="text-xs font-medium tabular-nums">{draftHeight}</span>
            </div>
            <Slider
              value={[draftHeight]}
              onValueChange={([val]) => {
                setDraftHeight(val);
                if (aspectRatioLocked) {
                  setDraftWidth(Math.round(val * aspectRatio));
                }
              }}
              onValueCommit={([val]) => {
                const newHeight = val;
                const newWidth = aspectRatioLocked ? Math.round(newHeight * aspectRatio) : draftWidth;
                setDraftHeight(newHeight);
                setDraftWidth(newWidth);
                onSizeChange(newWidth, newHeight);
                onSizeCommit();
              }}
              min={1}
              max={200}
              className="[&_[data-slot=slider-range]]:bg-pink-500"
            />
          </div>
        </div>

        <div className="space-y-2">
          <span className="text-[10px] font-bold text-muted-foreground uppercase block">
            {t("sidebar.backgroundColor")}
          </span>
          <div className="flex flex-wrap gap-2">
            {backgroundOptions.map((opt) => {
              const selected = backgroundColor === opt.color;
              const isTransparent = opt.color === null;
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => onBackgroundColorChange(opt.color)}
                  className={cn(
                    "h-9 w-9 rounded-md border ring-offset-background transition",
                    selected ? "ring-2 ring-pink-500 border-pink-500" : "hover:ring-2 hover:ring-ring/30"
                  )}
                  style={
                    isTransparent
                      ? {
                          backgroundColor: "#FFFFFF",
                          backgroundImage:
                            "linear-gradient(45deg, #E5E7EB 25%, transparent 25%), linear-gradient(-45deg, #E5E7EB 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #E5E7EB 75%), linear-gradient(-45deg, transparent 75%, #E5E7EB 75%)",
                          backgroundSize: "10px 10px",
                          backgroundPosition: "0 0, 0 5px, 5px -5px, -5px 0px",
                        }
                      : { backgroundColor: opt.color ?? undefined }
                  }
                  aria-label={isTransparent ? t("sidebar.transparent") : opt.color ?? ""}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
