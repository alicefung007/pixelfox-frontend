import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover"
import UsedColorActionButtons from "@/components/palette/UsedColorActionButtons"
import type { WandSelection } from "./types"

type WandSelectionPopoverProps = {
  selection: WandSelection | null
  onOpenChange: (open: boolean) => void
  onReplace: (sourceColor: string, pixelKeys: string[]) => void
  onClear: () => void
  onClose: () => void
}

export function WandSelectionPopover({
  selection,
  onOpenChange,
  onReplace,
  onClear,
  onClose,
}: WandSelectionPopoverProps) {
  return (
    <Popover open={Boolean(selection)} onOpenChange={onOpenChange}>
      {selection && (
        <PopoverAnchor asChild>
          <div
            className="pointer-events-none absolute z-20 size-1"
            style={{
              left: selection.x,
              top: selection.y,
              transform: "translate(-50%, -50%)",
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
          selectedColor={selection?.color ?? null}
          onReplace={(sourceColor) => {
            if (!selection) return
            onReplace(sourceColor, selection.keys)
          }}
          onClear={onClear}
          onClose={onClose}
        />
      </PopoverContent>
    </Popover>
  )
}
