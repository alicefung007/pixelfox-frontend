import { Maximize, Minus, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"

type Props = {
  zoom: number
  isAutoZoom: boolean
  onZoomStep: (direction: "in" | "out") => void
  onAutoZoom: () => void
}

export default function ZoomToolbar({
  zoom,
  isAutoZoom,
  onZoomStep,
  onAutoZoom,
}: Props) {
  return (
    <div className="absolute right-4 bottom-4 z-20 flex items-center gap-1 rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-sm sm:right-6 sm:bottom-6 sm:gap-2">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground"
        onClick={() => onZoomStep("out")}
      >
        <Minus size={16} />
      </Button>
      <div className="w-10 text-center text-xs font-medium text-muted-foreground sm:w-12">
        {zoom}%
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground"
        onClick={() => onZoomStep("in")}
      >
        <Plus size={16} />
      </Button>
      <div className="mx-0.5 h-4 w-px bg-border sm:mx-1" />
      <Button
        variant="ghost"
        size="icon"
        className={`h-8 w-8 ${isAutoZoom ? "text-primary" : "text-muted-foreground"}`}
        onClick={onAutoZoom}
        title="Fit to Screen"
      >
        <Maximize size={16} />
      </Button>
    </div>
  )
}
