import * as React from "react"
import { GripVertical } from "lucide-react"
import {
  Group,
  Panel,
  Separator,
  useDefaultLayout,
} from "react-resizable-panels"

import { cn } from "@/lib/utils"

type GroupProps = React.ComponentProps<typeof Group>

function ResizablePanelGroup({
  autoSaveId,
  direction = "horizontal",
  className,
  defaultLayout,
  onLayoutChanged,
  ...props
}: Omit<GroupProps, "orientation"> & {
  autoSaveId?: string
  direction?: "horizontal" | "vertical"
}) {
  const persisted = useDefaultLayout({ id: autoSaveId ?? "__unused__" })

  return (
    <Group
      className={cn("h-full w-full", className)}
      defaultLayout={autoSaveId ? persisted.defaultLayout : defaultLayout}
      onLayoutChanged={autoSaveId ? persisted.onLayoutChanged : onLayoutChanged}
      orientation={direction}
      {...props}
    />
  )
}

const ResizablePanel = Panel

function ResizableHandle({
  className,
  withHandle,
  ...props
}: React.ComponentProps<typeof Separator> & {
  withHandle?: boolean
}) {
  return (
    <Separator
      className={cn(
        "relative flex items-center justify-center bg-border hover:bg-pink-500/50 active:bg-pink-500 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 aria-[orientation=vertical]:w-px aria-[orientation=vertical]:h-full aria-[orientation=horizontal]:h-px aria-[orientation=horizontal]:w-full",
        className
      )}
      {...props}
    >
      {withHandle ? (
        <div className="z-10 flex h-4 w-3 items-center justify-center rounded-sm border bg-background">
          <GripVertical className="h-2.5 w-2.5 text-muted-foreground aria-[orientation=horizontal]:rotate-90" />
        </div>
      ) : null}
    </Separator>
  )
}

export { ResizablePanelGroup, ResizablePanel, ResizableHandle }
