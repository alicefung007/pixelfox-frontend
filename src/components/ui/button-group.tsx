import * as React from "react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

function ButtonGroup({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="button-group"
      role="group"
      className={cn("inline-flex w-fit items-center gap-1 rounded-lg", className)}
      {...props}
    />
  )
}

function ButtonGroupButton({
  className,
  variant = "ghost",
  size = "sm",
  type = "button",
  ...props
}: React.ComponentProps<typeof Button>) {
  return (
    <Button
      data-slot="button-group-button"
      variant={variant}
      size={size}
      type={type}
      className={cn("rounded-md", className)}
      {...props}
    />
  )
}

export { ButtonGroup, ButtonGroupButton }
