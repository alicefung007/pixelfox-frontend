import { useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { Replace, Search, X } from "lucide-react"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { usePaletteStore } from "@/store/usePaletteStore"
import { replaceCanvasColor } from "@/lib/palette-replace"
import { showUsedColorReplaceToast } from "@/lib/palette-notice"
import { getSystemPalette } from "@/lib/palettes"
import { cn, getRgbColorDistance, isDarkColor, normalizeHex } from "@/lib/utils"

type PaletteReplaceColorDialogProps = {
  open: boolean
  sourceColor: string | null
  pixelKeys?: string[]
  onOpenChange: (open: boolean) => void
}

function getColorSimilarity(colorA: string, colorB: string) {
  return -getRgbColorDistance(colorA, colorB)
}

function isHexSearchMatch(swatchColor: string, keyword: string) {
  const normalizedKeyword = keyword.trim().toLowerCase()
  if (!normalizedKeyword) return false

  const normalizedColor = normalizeHex(swatchColor).toLowerCase()
  const hashColor = `#${normalizedColor}`
  return (
    hashColor.includes(normalizedKeyword) ||
    normalizedColor.includes(normalizedKeyword)
  )
}

function isNameSearchMatch(swatchLabel: string, keyword: string) {
  const normalizedKeyword = keyword.trim().toLowerCase()
  if (!normalizedKeyword) return false
  return swatchLabel.toLowerCase().includes(normalizedKeyword)
}

export default function PaletteReplaceColorDialog({
  open,
  sourceColor,
  pixelKeys,
  onOpenChange,
}: PaletteReplaceColorDialogProps) {
  const { t } = useTranslation()
  const [search, setSearch] = useState("")
  const hasSearch = search.trim().length > 0
  const currentPaletteId = usePaletteStore((state) => state.currentPaletteId)
  const palette = getSystemPalette(currentPaletteId)!
  const normalizedSourceColor = useMemo(
    () => (sourceColor ? normalizeHex(sourceColor) : null),
    [sourceColor]
  )
  const filteredSwatches = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    if (!keyword) return palette.swatches

    return palette.swatches.filter((swatch) => {
      const normalizedColor = `#${normalizeHex(swatch.color)}`
      return (
        swatch.label.toLowerCase().includes(keyword) ||
        normalizedColor.toLowerCase().includes(keyword) ||
        normalizeHex(swatch.color).toLowerCase().includes(keyword)
      )
    })
  }, [palette.swatches, search])
  const similarSwatches = useMemo(() => {
    if (!normalizedSourceColor) return []

    return [...filteredSwatches]
      .filter((swatch) => normalizeHex(swatch.color) !== normalizedSourceColor)
      .sort(
        (a, b) =>
          getColorSimilarity(b.color, normalizedSourceColor) -
          getColorSimilarity(a.color, normalizedSourceColor)
      )
      .slice(0, 9)
  }, [filteredSwatches, normalizedSourceColor])

  useEffect(() => {
    if (!open && search) {
      queueMicrotask(() => setSearch(""))
    }
  }, [open, search])

  const handleReplaceColor = (nextColor: string) => {
    if (!sourceColor) return

    const result = replaceCanvasColor({
      sourceColor,
      replacementColor: nextColor,
      pixelKeys,
      selectReplacementColor: true,
    })

    if (!result.changed) {
      onOpenChange(false)
      return
    }

    showUsedColorReplaceToast({
      fromColor: sourceColor,
      toColor: result.replacementColor,
      palette,
      t,
    })
    onOpenChange(false)
  }

  const renderSwatchGrid = (
    swatches: typeof filteredSwatches,
    keyPrefix: string
  ) => (
    <div className="grid grid-cols-6 gap-2 sm:[grid-template-columns:repeat(auto-fill,minmax(52px,1fr))] sm:gap-3">
      {swatches.map((swatch) => {
        const isCurrent = normalizedSourceColor === normalizeHex(swatch.color)
        const isNameMatched = hasSearch && isNameSearchMatch(swatch.label, search)
        const isHexMatched =
          hasSearch && !isNameMatched && isHexSearchMatch(swatch.color, search)

        return (
          <div
            key={`${keyPrefix}-${swatch.label}-${normalizeHex(swatch.color)}`}
            className="flex flex-col items-center gap-1 p-1 transition-transform hover:scale-105 active:scale-95"
          >
            <button
              type="button"
              className={cn(
                "relative flex h-9 w-9 items-center justify-center rounded-md border-2 sm:aspect-square sm:h-auto sm:w-full",
                isCurrent
                  ? "border-primary ring-2 ring-primary/25"
                  : "border-gray-400/20"
              )}
              style={{ backgroundColor: swatch.color }}
              onClick={() => handleReplaceColor(swatch.color)}
            >
              <span
                className={cn(
                  "text-[8px] font-bold transition-colors sm:text-[9px] md:text-[10px]",
                  isDarkColor(swatch.color) ? "text-white" : "text-black/60"
                )}
              >
                {swatch.label}
              </span>
              {isHexMatched && (
                <span className="absolute -right-1 -bottom-1 rounded-full bg-foreground/85 px-1 py-0.5 text-[8px] font-semibold leading-none text-background shadow-sm">
                  HEX
                </span>
              )}
            </button>
          </div>
        )
      })}
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-[calc(100vw-32px)] max-h-[calc(100vh-32px)] overflow-hidden p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-3">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <DialogTitle className="flex items-center gap-2">
                <span className="inline-flex size-7 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Replace className="size-4" />
                </span>
                <span>{t("palette.replaceDialog.title")}</span>
              </DialogTitle>
              <DialogDescription className="mt-1">
                {t("palette.replaceDialog.description", {
                  palette: palette.i18nKey ? t(palette.i18nKey) : palette.name,
                })}
              </DialogDescription>
            </div>
            <DialogClose asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <X className="size-4" />
              </Button>
            </DialogClose>
          </div>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto px-6 pb-6">
          <div className="pt-2 pb-4">
            <div className="relative">
              <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t("palette.replaceDialog.searchPlaceholder")}
                className="pl-9"
              />
            </div>
          </div>

          {filteredSwatches.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
              {t("palette.replaceDialog.empty")}
            </div>
          ) : (
            <div className="flex flex-col gap-5 py-1">
              {!hasSearch && similarSwatches.length > 0 && (
                <section className="flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      {t("palette.replaceDialog.similarGroup")}
                    </span>
                    <Separator className="flex-1" />
                  </div>
                  {renderSwatchGrid(similarSwatches, "similar")}
                </section>
              )}

              <section className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    {t("palette.replaceDialog.allGroup")}
                  </span>
                  <Separator className="flex-1" />
                </div>
                {renderSwatchGrid(filteredSwatches, "all")}
              </section>
            </div>
          )}
        </div>

        <DialogFooter className="border-t border-border/60 bg-muted/20 px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("palette.replaceDialog.cancel")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
