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
import { useEditorStore } from "@/store/useEditorStore"
import { usePaletteStore } from "@/store/usePaletteStore"
import { getSystemPalette } from "@/lib/palettes"
import { cn, isDarkColor, normalizeHex } from "@/lib/utils"

type PaletteReplaceColorDialogProps = {
  open: boolean
  sourceColor: string | null
  onOpenChange: (open: boolean) => void
}

export default function PaletteReplaceColorDialog({
  open,
  sourceColor,
  onOpenChange,
}: PaletteReplaceColorDialogProps) {
  const { t } = useTranslation()
  const [search, setSearch] = useState("")
  const currentPaletteId = usePaletteStore((state) => state.currentPaletteId)
  const setSelectedUsedColor = usePaletteStore(
    (state) => state.setSelectedUsedColor
  )
  const setColor = useEditorStore((state) => state.setColor)
  const setPixels = useEditorStore((state) => state.setPixels)
  const saveHistory = useEditorStore((state) => state.saveHistory)
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

  useEffect(() => {
    if (!open && search) {
      queueMicrotask(() => setSearch(""))
    }
  }, [open, search])

  const handleReplaceColor = (nextColor: string) => {
    if (!normalizedSourceColor) return

    const replacementColor = `#${normalizeHex(nextColor)}`
    if (normalizedSourceColor === normalizeHex(replacementColor)) {
      onOpenChange(false)
      return
    }

    let changed = false
    const currentPixels = useEditorStore.getState().pixels
    const nextPixels: Record<string, string> = {}
    for (const [key, color] of Object.entries(currentPixels)) {
      if (normalizeHex(color) === normalizedSourceColor) {
        nextPixels[key] = replacementColor
        changed = true
      } else {
        nextPixels[key] = color
      }
    }

    if (!changed) {
      onOpenChange(false)
      return
    }

    setPixels(nextPixels)
    saveHistory()
    setColor(replacementColor)
    setSelectedUsedColor(replacementColor)
    onOpenChange(false)
  }

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
            <div className="grid grid-cols-6 gap-2 py-1 sm:[grid-template-columns:repeat(auto-fill,minmax(52px,1fr))] sm:gap-3">
              {filteredSwatches.map((swatch) => {
                const isCurrent =
                  normalizedSourceColor === normalizeHex(swatch.color)

                return (
                  <div
                    key={`${swatch.label}-${normalizeHex(swatch.color)}`}
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
                          isDarkColor(swatch.color)
                            ? "text-white"
                            : "text-black/60"
                        )}
                      >
                        {swatch.label}
                      </span>
                    </button>
                  </div>
                )
              })}
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
