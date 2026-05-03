import { createElement } from "react"
import type { TFunction } from "i18next"
import { CheckCircle2, X } from "lucide-react"
import { toast } from "sonner"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import type { PaletteDefinition } from "@/lib/palettes"
import { hexLabel, normalizeHex } from "@/lib/utils"

function getSwatchLabel(color: string, palette: PaletteDefinition) {
  const normalized = normalizeHex(color)
  const swatch = palette.swatches.find(
    (item) => normalizeHex(item.color) === normalized
  )
  return swatch?.label ?? hexLabel(color)
}

export function showPaletteRemapToast(params: {
  fromColor: string
  toColor: string
  palette: PaletteDefinition
  t: TFunction
}) {
  const { fromColor, toColor, palette, t } = params
  if (normalizeHex(fromColor) === normalizeHex(toColor)) return

  toast(t("palette.remapNotice.title"), {
    description: t("palette.remapNotice.description", {
      from: getSwatchLabel(fromColor, palette),
      to: getSwatchLabel(toColor, palette),
      palette: palette.i18nKey ? t(palette.i18nKey) : palette.name,
    }),
    duration: 2800,
  })
}

export function showUsedColorReplaceToast(params: {
  fromColor: string
  toColor: string
  palette: PaletteDefinition
  t: TFunction
}) {
  const { fromColor, toColor, palette, t } = params
  if (normalizeHex(fromColor) === normalizeHex(toColor)) return

  const description = t("palette.replaceNotice.description", {
    from: getSwatchLabel(fromColor, palette),
    to: getSwatchLabel(toColor, palette),
  })

  toast.custom(
    (id) =>
      createElement(
        Alert,
        {
          className:
            "relative pr-9 sm:w-[320px] border-emerald-500/40 bg-emerald-50 text-emerald-900 shadow-lg dark:border-emerald-500/40 dark:bg-emerald-950/60 dark:text-emerald-100 [&>svg]:text-emerald-600 dark:[&>svg]:text-emerald-400",
        },
        createElement(CheckCircle2, { className: "size-4" }),
        createElement(AlertTitle, null, t("palette.replaceNotice.title")),
        createElement(AlertDescription, null, description),
        createElement(
          "button",
          {
            type: "button",
            "aria-label": "Close",
            onClick: () => toast.dismiss(id),
            className:
              "absolute right-2 top-2 inline-flex size-6 items-center justify-center rounded-md text-emerald-700/70 transition-colors hover:bg-emerald-500/10 hover:text-emerald-900 dark:text-emerald-300/70 dark:hover:text-emerald-50",
          },
          createElement(X, { className: "size-3.5" })
        )
      ),
    { duration: 2400 }
  )
}
