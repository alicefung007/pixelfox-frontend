import { useTranslation } from "react-i18next";
import { Brush, Download, Eraser, Hand, PaintBucket, Pipette, Redo2, Trash2, Undo2, WandSparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useEditorStore } from "@/store/useEditorStore";
import type { ToolType } from "@/store/useEditorStore";

type Props = {
  onExport?: () => void;
  className?: string;
};

const tools: { id: ToolType; icon: React.ReactNode; labelKey: string }[] = [
  { id: "brush", icon: <Brush size={16} />, labelKey: "sidebar.brush" },
  { id: "bucket", icon: <PaintBucket size={16} />, labelKey: "sidebar.bucket" },
  { id: "hand", icon: <Hand size={16} />, labelKey: "sidebar.hand" },
  { id: "eraser", icon: <Eraser size={16} />, labelKey: "sidebar.eraser" },
  { id: "eyedropper", icon: <Pipette size={16} />, labelKey: "sidebar.eyedropper" },
  { id: "wand", icon: <WandSparkles size={16} />, labelKey: "sidebar.wand" },
];

export default function MobileEditorQuickActions({ onExport, className }: Props) {
  const { t } = useTranslation();
  const currentTool = useEditorStore((state) => state.currentTool);
  const setTool = useEditorStore((state) => state.setTool);
  const undo = useEditorStore((state) => state.undo);
  const redo = useEditorStore((state) => state.redo);
  const canUndo = useEditorStore((state) => state.historyIndex > 0);
  const canRedo = useEditorStore((state) => state.historyIndex < state.history.length - 1);
  const clear = useEditorStore((state) => state.clear);
  const hasPixels = useEditorStore((state) => Object.keys(state.pixels).length > 0);

  return (
    <div className={cn("border-b bg-background/95 px-2 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/80", className)}>
      <div className="flex items-center gap-1.5 overflow-x-auto">
        <Button
          variant="outline"
          size="icon-sm"
          className="h-8 w-8 shrink-0"
          onClick={undo}
          disabled={!canUndo}
          aria-label={t("sidebar.undo")}
          title={t("sidebar.undo")}
        >
          <Undo2 size={16} />
        </Button>
        <Button
          variant="outline"
          size="icon-sm"
          className="h-8 w-8 shrink-0"
          onClick={redo}
          disabled={!canRedo}
          aria-label={t("sidebar.redo")}
          title={t("sidebar.redo")}
        >
          <Redo2 size={16} />
        </Button>
        <Button
          variant="outline"
          size="icon-sm"
          className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
          onClick={clear}
          aria-label={t("sidebar.clear")}
          title={t("sidebar.clear")}
        >
          <Trash2 size={16} />
        </Button>
        <Button
          size="icon-sm"
          className="h-8 w-8 shrink-0 bg-gradient-to-r from-primary to-primary/80 text-white hover:opacity-90"
          disabled={!hasPixels}
          onClick={onExport}
          aria-label={t("sidebar.export")}
          title={t("sidebar.export")}
        >
          <Download size={16} />
        </Button>

        <div className="ml-auto flex shrink-0 items-center gap-1 rounded-md border border-border bg-background p-0.5">
          {tools.map((tool) => (
            <Button
              key={tool.id}
              variant={currentTool === tool.id ? "secondary" : "ghost"}
              size="icon-sm"
              onClick={() => setTool(tool.id)}
              className={cn(
                "h-7 w-7 shrink-0",
                currentTool === tool.id && "bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary"
              )}
              aria-label={t(tool.labelKey)}
              title={t(tool.labelKey)}
            >
              {tool.icon}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
