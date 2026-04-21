import { useEffect } from "react";
import { Info, X } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useNoticeStore } from "@/store/useNoticeStore";

const AUTO_CLOSE_MS = 2800;

export default function PaletteRemapNotice() {
  const { t } = useTranslation();
  const notice = useNoticeStore((state) => state.paletteRemapNotice);
  const clearPaletteRemapNotice = useNoticeStore((state) => state.clearPaletteRemapNotice);

  useEffect(() => {
    if (!notice) return;

    const timer = window.setTimeout(() => {
      clearPaletteRemapNotice();
    }, AUTO_CLOSE_MS);

    return () => window.clearTimeout(timer);
  }, [clearPaletteRemapNotice, notice]);

  if (!notice) return null;

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[120] w-[min(360px,calc(100vw-2rem))]">
      <Alert className="pointer-events-auto border-primary/20 bg-background/95 pr-12 shadow-lg backdrop-blur">
        <Info className="size-4 text-primary" />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-2 top-2 h-7 w-7 rounded-full text-muted-foreground"
          onClick={clearPaletteRemapNotice}
        >
          <X className="size-4" />
        </Button>
        <AlertTitle>{t("palette.remapNotice.title")}</AlertTitle>
        <AlertDescription>
          <p>
            {t("palette.remapNotice.description", {
              from: notice.fromLabel,
              to: notice.toLabel,
              palette: notice.paletteName,
            })}
          </p>
        </AlertDescription>
      </Alert>
    </div>
  );
}
