"use client"

import * as React from "react"
import { ArrowLeft, ArrowRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type CarouselContextValue = {
  viewportRef: React.RefObject<HTMLDivElement | null>
  canScrollPrev: boolean
  canScrollNext: boolean
  scrollPrev: () => void
  scrollNext: () => void
}

const CarouselContext = React.createContext<CarouselContextValue | null>(null)

function useCarousel() {
  const context = React.useContext(CarouselContext)

  if (!context) {
    throw new Error("Carousel components must be used within <Carousel />")
  }

  return context
}

function Carousel({
  className,
  children,
  ...props
}: React.ComponentProps<"section">) {
  const viewportRef = React.useRef<HTMLDivElement | null>(null)
  const [canScrollPrev, setCanScrollPrev] = React.useState(false)
  const [canScrollNext, setCanScrollNext] = React.useState(false)

  const updateScrollState = React.useCallback(() => {
    const viewport = viewportRef.current
    if (!viewport) return

    const maxScrollLeft = viewport.scrollWidth - viewport.clientWidth
    setCanScrollPrev(viewport.scrollLeft > 1)
    setCanScrollNext(viewport.scrollLeft < maxScrollLeft - 1)
  }, [])

  const scrollByPage = React.useCallback((direction: -1 | 1) => {
    const viewport = viewportRef.current
    if (!viewport) return

    viewport.scrollBy({
      left: viewport.clientWidth * 0.9 * direction,
      behavior: "smooth",
    })
  }, [])

  const scrollPrev = React.useCallback(() => scrollByPage(-1), [scrollByPage])
  const scrollNext = React.useCallback(() => scrollByPage(1), [scrollByPage])

  React.useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return undefined

    updateScrollState()
    viewport.addEventListener("scroll", updateScrollState, { passive: true })

    const observer = new ResizeObserver(updateScrollState)
    observer.observe(viewport)

    return () => {
      viewport.removeEventListener("scroll", updateScrollState)
      observer.disconnect()
    }
  }, [updateScrollState])

  const value = React.useMemo(
    () => ({
      viewportRef,
      canScrollPrev,
      canScrollNext,
      scrollPrev,
      scrollNext,
    }),
    [canScrollPrev, canScrollNext, scrollPrev, scrollNext]
  )

  return (
    <CarouselContext.Provider value={value}>
      <section
        data-slot="carousel"
        className={cn("relative", className)}
        {...props}
      >
        {children}
      </section>
    </CarouselContext.Provider>
  )
}

function CarouselContent({ className, ...props }: React.ComponentProps<"div">) {
  const { viewportRef } = useCarousel()

  return (
    <div
      ref={viewportRef}
      data-slot="carousel-viewport"
      className="scrollbar-hide scroll-px-4 overflow-x-auto overflow-y-hidden overscroll-x-contain px-4 py-4"
      onWheel={(event) => {
        const viewport = viewportRef.current
        if (!viewport) return

        const delta =
          Math.abs(event.deltaX) > Math.abs(event.deltaY)
            ? event.deltaX
            : event.deltaY

        if (delta === 0) return

        const maxScrollLeft = viewport.scrollWidth - viewport.clientWidth
        const nextScrollLeft = viewport.scrollLeft + delta
        const canScrollInDirection =
          (delta > 0 && viewport.scrollLeft < maxScrollLeft - 1) ||
          (delta < 0 && viewport.scrollLeft > 1)

        if (!canScrollInDirection) return

        event.preventDefault()
        viewport.scrollLeft = nextScrollLeft
      }}
    >
      <div
        data-slot="carousel-content"
        className={cn(
          "flex snap-x snap-proximity gap-4 overflow-visible",
          className
        )}
        {...props}
      />
    </div>
  )
}

function CarouselItem({
  className,
  ...props
}: React.ComponentProps<"article">) {
  return (
    <article
      data-slot="carousel-item"
      role="group"
      aria-roledescription="slide"
      className={cn("min-w-0 shrink-0 grow-0 basis-full snap-start", className)}
      {...props}
    />
  )
}

function CarouselPrevious({
  className,
  onClick,
  disabled,
  children,
  ...props
}: React.ComponentProps<typeof Button>) {
  const { canScrollPrev, scrollPrev } = useCarousel()

  return (
    <Button
      data-slot="carousel-previous"
      variant="outline"
      size="icon"
      className={cn(
        "absolute top-1/2 left-2 z-10 -translate-y-1/2 rounded-full bg-background/90 shadow-md backdrop-blur",
        className
      )}
      disabled={disabled || !canScrollPrev}
      aria-label="上一项"
      onClick={(event) => {
        onClick?.(event)
        if (!event.defaultPrevented) {
          scrollPrev()
        }
      }}
      {...props}
    >
      {children ?? <ArrowLeft className="size-4" />}
    </Button>
  )
}

function CarouselNext({
  className,
  onClick,
  disabled,
  children,
  ...props
}: React.ComponentProps<typeof Button>) {
  const { canScrollNext, scrollNext } = useCarousel()

  return (
    <Button
      data-slot="carousel-next"
      variant="outline"
      size="icon"
      className={cn(
        "absolute top-1/2 right-2 z-10 -translate-y-1/2 rounded-full bg-background/90 shadow-md backdrop-blur",
        className
      )}
      disabled={disabled || !canScrollNext}
      aria-label="下一项"
      onClick={(event) => {
        onClick?.(event)
        if (!event.defaultPrevented) {
          scrollNext()
        }
      }}
      {...props}
    >
      {children ?? <ArrowRight className="size-4" />}
    </Button>
  )
}

export {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
}
