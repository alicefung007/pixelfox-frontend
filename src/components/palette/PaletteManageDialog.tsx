import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Bookmark, Check, Save, Search, Settings2, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  SYSTEM_PALETTES,
  getSystemPalette,
  type SystemPaletteId,
  type PaletteSwatch,
} from "@/lib/palettes";
import { usePaletteStore } from "@/store/usePaletteStore";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm?: (selectedColors: string[]) => void;
};

type SchemeId = "all" | "used" | "recent";

function normalizeHex(hex: string) {
  return hex.trim().toUpperCase();
}

function hexLabel(hex: string) {
  const v = normalizeHex(hex);
  return v.startsWith("#") ? v.slice(1) : v;
}

export default function PaletteManageDialog({
  open,
  onOpenChange,
  onConfirm,
}: Props) {
  const { t } = useTranslation();
  const { recentColors, usedColors } = usePaletteStore();
  const [scheme, setScheme] = useState<SchemeId>("all");
  const [search, setSearch] = useState("");
  const [systemFilter, setSystemFilter] = useState<SystemPaletteId>("MARD");
  const [groupMode, setGroupMode] = useState<"letters" | "palette">("letters");
  const [selected, setSelected] = useState<Set<string>>(() => new Set());

  const activePalette = getSystemPalette(systemFilter) ?? SYSTEM_PALETTES[0];
  const paletteColors = activePalette?.swatches ?? [];

  const schemeOptions = useMemo(() => {
    return [
      {
        id: "all" as const,
        label: t("palette.manageDialog.schemeAll", { count: paletteColors.length }),
      },
      {
        id: "used" as const,
        label: t("palette.manageDialog.schemeUsed", { count: usedColors.length }),
      },
      {
        id: "recent" as const,
        label: t("palette.manageDialog.schemeRecent", { count: recentColors.length }),
      },
    ];
  }, [t, paletteColors.length, usedColors.length, recentColors.length]);

  const visibleColors = useMemo(() => {
    const base: PaletteSwatch[] =
      scheme === "all"
        ? paletteColors
        : scheme === "used"
          ? usedColors.map((c) => ({ label: hexLabel(c), color: c }))
          : recentColors.map((c) => ({ label: hexLabel(c), color: c }));

    const q = search.trim().toLowerCase();
    if (!q) return base;

    return base.filter((c) => {
      const label = c.label.toLowerCase();
      const color = c.color.toLowerCase();
      return label.includes(q) || color.includes(q);
    });
  }, [scheme, paletteColors, usedColors, recentColors, search]);

  const selectedCount = selected.size;

  const handleToggleColor = (color: string) => {
    const key = normalizeHex(color);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleSelectAllVisible = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const c of visibleColors) next.add(normalizeHex(c.color));
      return next;
    });
  };

  const handleClear = () => setSelected(new Set());

  const handleConfirm = () => {
    const colors = Array.from(selected);
    onConfirm?.(colors);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[980px] w-[calc(100vw-32px)] max-h-[calc(100vh-32px)] p-0 overflow-hidden flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <DialogTitle className="flex items-center gap-2">
                <span className="inline-flex size-7 items-center justify-center rounded-full bg-pink-500/10 text-pink-500">
                  <Settings2 className="size-4" />
                </span>
                <span>{t("palette.manageDialog.title")}</span>
              </DialogTitle>
              <DialogDescription className="mt-1">
                {t("palette.manageDialog.description")}
              </DialogDescription>
            </div>
            <DialogClose asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <X className="size-4" />
              </Button>
            </DialogClose>
          </div>
        </DialogHeader>

        <Separator />

        <div className="px-6 pt-4 pb-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground shrink-0">
              <Bookmark className="size-4" />
              <span>{t("palette.manageDialog.schemes")}</span>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 justify-between gap-2">
                  <span className="truncate">
                    {schemeOptions.find((o) => o.id === scheme)?.label}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuRadioGroup
                  value={scheme}
                  onValueChange={(v) => setScheme(v as SchemeId)}
                >
                  {schemeOptions.map((opt) => (
                    <DropdownMenuRadioItem key={opt.id} value={opt.id}>
                      {opt.label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <Separator />

        <div className="flex-1 min-h-0 flex flex-col">
          <div className="px-6 py-4 flex items-center gap-3 shrink-0">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("palette.manageDialog.searchPlaceholder")}
                className="pl-9"
              />
            </div>

            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-2"
              onClick={handleSelectAllVisible}
            >
              <Check className="size-4" />
              {t("palette.manageDialog.selectAll")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-2"
              onClick={handleClear}
            >
              <Trash2 className="size-4" />
              {t("palette.manageDialog.clear")}
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-2 text-pink-600 border-pink-300/60 hover:bg-pink-500/10"
            >
              <Save className="size-4" />
              {t("palette.manageDialog.saveScheme")}
            </Button>
          </div>

          <div className="px-6 pb-3 flex items-center justify-between gap-4 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs text-muted-foreground shrink-0">
                {t("palette.manageDialog.systemFilter")}
              </span>
              <div className="flex flex-wrap gap-2">
                {SYSTEM_PALETTES.map((p) => {
                  const active = systemFilter === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSystemFilter(p.id)}
                      className={cn(
                        "h-7 rounded-full px-3 text-xs font-semibold transition-colors border",
                        active
                          ? "bg-pink-500 text-white border-pink-500"
                          : "bg-muted/40 text-muted-foreground border-border hover:bg-muted"
                      )}
                    >
                      {p.i18nKey ? t(p.i18nKey) : p.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <Tabs
              value={groupMode}
              onValueChange={(v) => setGroupMode(v as "letters" | "palette")}
            >
              <TabsList className="h-8 bg-muted/50 p-1">
                <TabsTrigger value="letters" className="text-[10px] h-6 px-3">
                  {t("palette.manageDialog.groupLetters")}
                </TabsTrigger>
                <TabsTrigger value="palette" className="text-[10px] h-6 px-3">
                  {t("palette.manageDialog.groupPalette")}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="px-6 pb-6 flex-1 min-h-0">
            <ScrollArea className="h-full rounded-3xl border border-border/50 bg-background/40">
              <div className="p-4 grid grid-cols-[repeat(auto-fill,minmax(72px,1fr))] gap-4">
                {visibleColors.map((swatch) => {
                  const key = normalizeHex(swatch.color);
                  const isSelected = selected.has(key);
                  return (
                    <button
                      key={`${swatch.label}-${key}`}
                      type="button"
                      onClick={() => handleToggleColor(swatch.color)}
                      className={cn(
                        "group flex flex-col items-center gap-2 rounded-2xl p-2 transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/30",
                        isSelected ? "bg-pink-500/5" : "hover:bg-muted/40"
                      )}
                    >
                      <div
                        className={cn(
                          "relative h-14 w-full rounded-2xl shadow-sm ring-1 ring-foreground/5",
                          isSelected ? "ring-2 ring-pink-500" : ""
                        )}
                        style={{ backgroundColor: swatch.color }}
                      >
                        {isSelected && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="size-8 rounded-full bg-pink-500 text-white flex items-center justify-center shadow-md">
                              <Check className="size-4" />
                            </div>
                          </div>
                        )}
                      </div>
                      <span className="text-[11px] font-semibold text-muted-foreground group-hover:text-foreground">
                        {swatch.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        </div>

        <Separator />

        <div className="px-6 py-4 flex items-center justify-end gap-3">
          <DialogClose asChild>
            <Button variant="outline">{t("palette.manageDialog.cancel")}</Button>
          </DialogClose>
          <Button onClick={handleConfirm} disabled={selectedCount === 0}>
            {t("palette.manageDialog.confirm", { count: selectedCount })}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
