import { useLayoutEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Bookmark, Check, Palette, Save, Search, Trash2, X } from "lucide-react";
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

  const groupedColors = useMemo(() => {
    const groups = new Map<string, PaletteSwatch[]>();

    for (const swatch of visibleColors) {
      const firstChar = swatch.label.trim().charAt(0).toUpperCase();
      const groupKey = /^[A-Z]$/.test(firstChar) ? firstChar : "#";
      const existing = groups.get(groupKey);
      if (existing) existing.push(swatch);
      else groups.set(groupKey, [swatch]);
    }

    return Array.from(groups.entries())
      .sort(([a], [b]) => {
        if (a === "#") return 1;
        if (b === "#") return -1;
        return a.localeCompare(b);
      })
      .map(([label, colors]) => ({ label, colors }));
  }, [visibleColors]);

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

  const handleSelectGroup = (colors: PaletteSwatch[]) => {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const color of colors) next.add(normalizeHex(color.color));
      return next;
    });
  };

  const handleClearGroup = (colors: PaletteSwatch[]) => {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const color of colors) next.delete(normalizeHex(color.color));
      return next;
    });
  };

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
                <span className="inline-flex size-7 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Palette className="size-4" />
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
          <div className="px-6 pt-4 pb-6 flex flex-col gap-2">
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

                <div className="flex w-full items-center sm:w-auto">
                  <div className="flex flex-1 justify-start">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1 whitespace-nowrap px-2 text-xs sm:h-9 sm:gap-2 sm:px-3 sm:text-sm"
                      onClick={handleSelectAllVisible}
                    >
                      <Check className="size-3.5 sm:size-4" />
                      <span>{t("palette.manageDialog.selectAll")}</span>
                    </Button>
                  </div>
                  <div className="flex flex-1 justify-center px-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1 whitespace-nowrap px-2 text-xs sm:h-9 sm:gap-2 sm:px-3 sm:text-sm"
                      onClick={handleClear}
                    >
                      <Trash2 className="size-3.5 sm:size-4" />
                      <span>{t("palette.manageDialog.clear")}</span>
                    </Button>
                  </div>
                  <div className="flex flex-1 justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1 whitespace-nowrap px-2 text-xs sm:h-9 sm:gap-2 sm:px-3 sm:text-sm text-primary border-primary/60 hover:bg-primary/10"
                    >
                      <Save className="size-3.5 sm:size-4" />
                      <span>{t("palette.manageDialog.saveScheme")}</span>
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                <div className="min-w-0 w-full overflow-x-auto pb-1 sm:overflow-visible sm:pb-0">
                  <div className="flex min-w-max items-start gap-2 sm:min-w-0 sm:w-full sm:flex-nowrap">
                    <span className="mt-0.5 shrink-0 text-xs text-muted-foreground">
                      {t("palette.manageDialog.presetPlansFilter")}
                    </span>
                    <div className="overflow-hidden rounded-md sm:min-w-0 sm:flex-1">
                      <div
                        className="grid max-h-16 min-w-0 grid-flow-col grid-rows-2 gap-2 overflow-y-hidden sm:max-h-none sm:flex sm:flex-wrap"
                        style={{ gridAutoColumns: "calc((100vw - 8rem) / 2)" }}
                      >
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
                              "h-7 min-w-0 rounded-md px-3 text-xs font-semibold transition-colors border shrink-0",
                              active
                                ? "bg-primary text-white border-primary"
                                : "bg-muted/40 text-muted-foreground border-border hover:bg-muted"
                            )}
                          >
                            <span className="block truncate">{p.i18nKey ? t(p.i18nKey) : p.name}</span>
                          </button>
                        );
                      })}
                      </div>
                    </div>
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

              <div className="rounded-md bg-background/40 p-1">
                <div className="flex flex-col gap-4">
                  {groupedColors.map((group) => (
                    <div key={group.label} className="flex flex-col gap-3">
                      <div className="flex items-center gap-3">
                        <span className="shrink-0 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                          {group.label}
                        </span>
                        <Separator className="flex-1" />
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs text-muted-foreground hover:text-muted-foreground sm:px-2.5"
                            onClick={() => handleSelectGroup(group.colors)}
                          >
                            {t("palette.manageDialog.selectAll")}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs text-muted-foreground hover:text-muted-foreground sm:px-2.5"
                            onClick={() => handleClearGroup(group.colors)}
                          >
                            {t("palette.manageDialog.clear")}
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-6 gap-2 sm:grid-cols-8 sm:gap-3 md:grid-cols-10 lg:grid-cols-12 xl:grid-cols-14">
                        {group.colors.map((swatch) => {
                          const key = normalizeHex(swatch.color);
                          const isSelected = selected.has(key);
                          return (
                            <button
                              key={`${group.label}-${swatch.label}-${key}`}
                              type="button"
                              onClick={() => handleToggleColor(swatch.color)}
                              className="group relative flex flex-col items-center gap-1 p-1 transition-transform hover:scale-105 active:scale-95"
                            >
                              <div
                                className={cn(
                                  "relative flex h-9 w-9 items-center justify-center rounded-md border-2 transition-shadow sm:h-10 sm:w-10 md:h-12 md:w-12",
                                  isSelected ? "border-primary" : "border-gray-400/20"
                                )}
                                style={{ backgroundColor: swatch.color }}
                              >
                                <span
                                  className={cn(
                                    "text-[8px] font-bold transition-colors sm:text-[9px] md:text-[10px]",
                                    isDarkColor(swatch.color) ? "text-white" : "text-black/60"
                                  )}
                                >
                                  {swatch.label}
                                </span>
                                {isSelected && (
                                  <div className="absolute -right-0.5 -top-0.5 flex size-3 items-center justify-center rounded-full bg-primary text-white shadow-sm sm:-right-1 sm:-top-1 sm:size-4">
                                    <Check className="size-2 sm:size-2.5" />
                                  </div>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
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
