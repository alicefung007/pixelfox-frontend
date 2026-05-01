import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover';
import UsedColorActionButtons from '@/components/palette/UsedColorActionButtons';
import type { WandSelection } from './types';

type Props = {
  wandSelection: WandSelection | null;
  onClose: () => void;
  onClear: () => void;
  onOpenReplaceColorDialog: (sourceColor: string, pixelKeys?: string[]) => void;
};

export default function WandActionPopover({ wandSelection, onClose, onClear, onOpenReplaceColorDialog }: Props) {
  return (
    <Popover
      open={Boolean(wandSelection)}
      onOpenChange={(open) => {
        if (open) return;
        onClose();
      }}
    >
      {wandSelection && (
        <PopoverAnchor asChild>
          <div
            className="pointer-events-none absolute z-20 size-1"
            style={{
              left: wandSelection.x,
              top: wandSelection.y,
              transform: 'translate(-50%, -50%)',
            }}
          />
        </PopoverAnchor>
      )}
      <PopoverContent
        side="top"
        align="center"
        sideOffset={10}
        className="z-[100] flex w-fit flex-row items-center gap-0 rounded-lg border bg-background/95 p-0.5 shadow-sm backdrop-blur-sm"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <UsedColorActionButtons
          selectedColor={wandSelection?.color ?? null}
          onReplace={(sourceColor) => {
            if (!wandSelection) return;
            onOpenReplaceColorDialog(sourceColor, wandSelection.keys);
          }}
          onClear={onClear}
          onClose={onClose}
        />
      </PopoverContent>
    </Popover>
  );
}
