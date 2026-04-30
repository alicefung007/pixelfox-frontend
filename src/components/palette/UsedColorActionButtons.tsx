import { useTranslation } from "react-i18next";
import { Replace, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type UsedColorActionButtonsProps = {
  selectedColor: string | null;
  onReplace: (sourceColor: string) => void;
  onClear: () => void;
  onClose?: () => void;
};

export default function UsedColorActionButtons({
  selectedColor,
  onReplace,
  onClear,
  onClose,
}: UsedColorActionButtonsProps) {
  const { t } = useTranslation();

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 gap-1.5 rounded-md px-2.5 text-xs"
        onClick={() => {
          if (!selectedColor) return;
          onReplace(selectedColor);
          onClose?.();
        }}
      >
        <Replace className="size-3.5" />
        <span>{t("palette.usedActions.replace")}</span>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 gap-1.5 rounded-md px-2.5 text-xs"
        onClick={() => {
          onClear();
          onClose?.();
        }}
      >
        <Trash2 className="size-3.5" />
        <span>{t("palette.usedActions.clear")}</span>
      </Button>
    </>
  );
}
