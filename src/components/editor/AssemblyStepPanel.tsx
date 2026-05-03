import { Check, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { cn, isDarkColor } from "@/lib/utils"

type StepItem = {
  color: string
  label: string
  count: number
}

type Props = {
  activeIndex: number
  activeStep: StepItem | null
  completedColors: Set<string>
  onPrevious: () => void
  onNext: () => void
  onSelectStep: (index: number) => void
  onMarkComplete: () => void
  steps: StepItem[]
  beadCountText: (count: number) => string
  emptyText: string
  markCompleteText: string
  completedText: string
}

export default function AssemblyStepPanel({
  activeIndex,
  activeStep,
  completedColors,
  onPrevious,
  onNext,
  onSelectStep,
  onMarkComplete,
  steps,
  beadCountText,
  emptyText,
  markCompleteText,
  completedText,
}: Props) {
  const activeStepCompleted = activeStep
    ? completedColors.has(activeStep.color)
    : false

  return (
    <div
      data-assembly-step-panel="true"
      className="absolute top-3 left-1/2 flex max-h-[calc(100%-24px)] w-[min(380px,calc(100%-24px))] -translate-x-1/2 cursor-default flex-col overflow-hidden rounded-2xl border border-black/10 bg-background/94 shadow-sm backdrop-blur sm:right-3 sm:left-auto sm:max-h-[min(540px,calc(100%-24px))] sm:translate-x-0"
      onPointerDownCapture={(event) => {
        event.stopPropagation()
      }}
      onTouchStartCapture={(event) => {
        event.stopPropagation()
      }}
      onTouchMoveCapture={(event) => {
        event.stopPropagation()
      }}
      onWheelCapture={(event) => {
        event.stopPropagation()
      }}
    >
      <div className="shrink-0 px-4 pt-4">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="size-11 shrink-0 rounded-full"
            disabled={activeIndex === 0 || steps.length === 0}
            onClick={onPrevious}
          >
            <ChevronLeft className="size-5" />
          </Button>

          <div className="flex min-w-0 flex-1 items-center gap-2">
            <span
              className="size-10 shrink-0 rounded-md border-2 border-gray-400/20"
              style={{
                backgroundColor: activeStep
                  ? `#${activeStep.color}`
                  : "transparent",
              }}
            />
            <div className="min-w-0">
              <span className="block text-lg leading-5 font-bold text-foreground">
                {activeStep?.label ?? "--"}
              </span>
              <span className="block truncate text-sm text-muted-foreground">
                {activeStep ? beadCountText(activeStep.count) : emptyText}
              </span>
            </div>
          </div>

          <Button
            className={cn(
              "h-10 w-auto rounded-md border border-gray-400/20 px-3 text-sm font-semibold whitespace-nowrap shadow-[1px_1px_0_rgba(0,0,0,0.12)]",
              activeStepCompleted &&
                "border-gray-400/20 bg-emerald-600 hover:bg-emerald-600/90"
            )}
            disabled={!activeStep}
            onClick={onMarkComplete}
          >
            {activeStepCompleted && <Check className="size-4" />}
            {activeStepCompleted ? completedText : markCompleteText}
          </Button>

          <Button
            variant="outline"
            size="icon"
            className="size-11 shrink-0 rounded-full"
            disabled={activeIndex >= steps.length - 1 || steps.length === 0}
            onClick={onNext}
          >
            <ChevronRight className="size-5" />
          </Button>
        </div>

        <Separator className="mt-4" />
      </div>

      <div className="max-h-[7.5rem] min-h-0 flex-none [touch-action:pan-y] overflow-y-auto overscroll-contain px-4 pt-2 pb-4 sm:max-h-none sm:flex-1">
        <div className="grid grid-cols-6 gap-2 sm:[grid-template-columns:repeat(auto-fill,minmax(46px,1fr))]">
          {steps.map((step, index) => {
            const selected = index === activeIndex
            const completed = completedColors.has(step.color)
            return (
              <button
                key={step.color}
                type="button"
                onClick={() => onSelectStep(index)}
                className="group relative flex flex-col items-center gap-1 p-0.5 transition-transform hover:scale-105 active:scale-95 sm:p-1"
              >
                <div
                  className={cn(
                    "relative aspect-square w-full rounded-md border-2 transition-shadow",
                    selected
                      ? "border-primary ring-2 ring-primary/25"
                      : "border-gray-400/20"
                  )}
                  style={{ backgroundColor: `#${step.color}` }}
                >
                  <span
                    className={cn(
                      "absolute inset-0 flex items-center justify-center text-[8px] font-bold transition-colors sm:text-[9px] md:text-[10px]",
                      isDarkColor(`#${step.color}`)
                        ? "text-white"
                        : "text-black/60"
                    )}
                  >
                    {step.label}
                  </span>
                  {completed && (
                    <div className="absolute -top-0.5 -right-0.5 flex size-3 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm sm:-top-1 sm:-right-1 sm:size-4">
                      <Check className="size-2 sm:size-2.5" />
                    </div>
                  )}
                  <span className="absolute -right-1 -bottom-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-foreground/80 px-1 text-[9px] leading-none font-semibold text-background tabular-nums shadow-sm">
                    {step.count}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
