import { useLayoutEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Bookmark, Check, Save, Search, Settings2, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
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
import { cn, normalizeHex, hexLabel, isDarkColor } from "@/lib/utils";
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
  onPaletteChange?: (paletteId: SystemPaletteId) => void;
};

type SchemeId = "all" | "used" | "recent";

export default function PaletteManageDialog({
  open,
  onOpenChange,
  onConfirm,
  onPaletteChange,
}: Props) {
  const { t } = useTranslation();
  const { currentPaletteId, recentColors, usedColors } = usePaletteStore();
  const [scheme, setScheme] = useState<SchemeId>("all");
  const [search, setSearch] = useState("");
  const [systemFilter, setSystemFilter] = useState<SystemPaletteId>(currentPaletteId);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());

  useLayoutEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSystemFilter(currentPaletteId);
      const palette = getSystemPalette(currentPaletteId);
      const allPaletteColors = palette?.swatches.map((s) => normalizeHex(s.color)) ?? [];
      const usedNormalized = usedColors.map(normalizeHex);
      const defaultSelected = [...new Set([...allPaletteColors, ...usedNormalized])];
      setSelected(new Set(defaultSelected));
    }
  }, [open, currentPaletteId, usedColors]);

  const activePalette = getSystemPalette(systemFilter) ?? SYSTEM_PALETTES[0];
  const paletteColors = useMemo(() => activePalette?.swatches ?? [], [activePalette]);

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
    onPaletteChange?.(systemFilter);
    const colors = Array.from(selected);
    onConfirm?.(colors);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[980px] w-[calc(100vw-32px)] max-h-[calc(100vh-32px)] p-0 overflow-hidden flex flex-col gap-0">
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

        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="px-6 pt-4 pb-6 flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-4">
                <div className="relative flex-1 min-w-0">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={t("palette.manageDialog.searchPlaceholder")}
                    className="pl-9"
                  />
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 gap-1 sm:gap-2"
                    onClick={handleSelectAllVisible}
                  >
                    <Check className="size-4" />
                    <span className="hidden sm:hidden md:inline">{t("palette.manageDialog.selectAll")}</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 gap-1 sm:gap-2"
                    onClick={handleClear}
                  >
                    <Trash2 className="size-4" />
                    <span className="hidden sm:hidden md:inline">{t("palette.manageDialog.clear")}</span>
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 gap-1 sm:gap-2 text-pink-600 border-pink-300/60 hover:bg-pink-500/10"
                  >
                    <Save className="size-4" />
                    <span className="hidden sm:inline">{t("palette.manageDialog.saveScheme")}</span>
                  </Button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                <div className="flex items-start gap-2 min-w-0 w-full flex-nowrap -mx-2 px-2">
                  <span className="text-xs text-muted-foreground shrink-0 mt-0.5">
                    {t("palette.manageDialog.presetPlansFilter")}
                  </span>
                  <div className="flex gap-2 flex-wrap min-w-0">
                    {SYSTEM_PALETTES.map((p) => {
                      const active = systemFilter === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setSystemFilter(p.id);
                            const newPalette = getSystemPalette(p.id);
                            const allColors = newPalette?.swatches.map((s) => normalizeHex(s.color)) ?? [];
                            setSelected(new Set(allColors));
                          }}
                          className={cn(
                            "h-7 rounded-full px-3 text-xs font-semibold transition-colors border shrink-0",
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

                {/* <Tabs
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
                </Tabs> */}
              </div>

              <div className="rounded-3xl bg-background/40 p-1">
                <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 xl:grid-cols-14 gap-2 sm:gap-3">
                {visibleColors.map((swatch) => {
                  const key = normalizeHex(swatch.color);
                  const isSelected = selected.has(key);
                  return (
                    <button
                      key={`${swatch.label}-${key}`}
                      type="button"
                      onClick={() => handleToggleColor(swatch.color)}
                      className="group flex flex-col items-center gap-1 p-1 transition-transform hover:scale-105 active:scale-95 relative"
                    >
                      <div
                        className={cn(
                          "relative w-9 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-md shadow-sm ring-1 ring-foreground/5 transition-shadow flex items-center justify-center",
                          isSelected ? "ring-2 ring-pink-500" : ""
                        )}
                        style={{ backgroundColor: swatch.color }}
                      >
                        <span className={cn(
                          "text-[8px] sm:text-[9px] md:text-[10px] font-bold transition-colors",
                          isDarkColor(swatch.color) ? "text-white" : "text-black/70"
                        )}>
                          {swatch.label}
                        </span>
                        {isSelected && (
                          <div className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 size-3 sm:size-4 rounded-full bg-pink-500 text-white flex items-center justify-center shadow-sm">
                            <Check className="size-2 sm:size-2.5" />
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
              </div>
            </div>
        </div>

        <Separator />

        <div className="px-4 sm:px-6 py-3 sm:py-4 flex flex-col-reverse sm:flex-row items-center justify-end gap-2 sm:gap-3">
          <DialogClose asChild>
            <Button variant="outline" className="w-full sm:w-auto">{t("palette.manageDialog.cancel")}</Button>
          </DialogClose>
          <Button onClick={handleConfirm} disabled={selectedCount === 0} className="w-full sm:w-auto">
            {t("palette.manageDialog.confirm", { count: selectedCount })}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
