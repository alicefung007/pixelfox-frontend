import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover';
import UsedColorActionButtons from '@/components/palette/UsedColorActionButtons';
import type { WandSelection } from './types';

type Props = {
  wandSelection: WandSelection | null;
  anchorSelection: WandSelection | null;
  onClose: () => void;
  onClear: () => void;
  onOpenReplaceColorDialog: (sourceColor: string, pixelKeys?: string[]) => void;
};

export default function WandActionPopover({
  wandSelection,
  anchorSelection,
  onClose,
  onClear,
  onOpenReplaceColorDialog,
}: Props) {
  const anchoredSelection = wandSelection ?? anchorSelection;

  return (
    <Popover
      open={Boolean(wandSelection)}
      onOpenChange={(open) => {
        if (open) return;
        onClose();
      }}
    >
      {anchoredSelection && (
        <PopoverAnchor asChild>
          <div
            className="pointer-events-none absolute z-20 size-1"
            style={{
              left: anchoredSelection.x,
              top: anchoredSelection.y,
              transform: 'translate(-50%, -50%)',
            }}
          />
        </PopoverAnchor>
      )}
      <PopoverContent
        side="top"
        align="center"
        sideOffset={10}
        className="flex w-fit flex-row items-center gap-0 rounded-lg border bg-background/95 p-0.5 shadow-sm backdrop-blur-sm"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <UsedColorActionButtons
          selectedColor={anchoredSelection?.color ?? null}
          onReplace={(sourceColor) => {
            if (!anchoredSelection) return;
            onOpenReplaceColorDialog(sourceColor, anchoredSelection.keys);
          }}
          onClear={onClear}
          onClose={onClose}
        />
      </PopoverContent>
    </Popover>
  );
}
