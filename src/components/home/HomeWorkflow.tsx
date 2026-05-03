import { CheckCircle2 } from "lucide-react"

import { workflowSteps } from "@/components/home/home-data"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"

export default function HomeWorkflow() {
  return (
    <section
      id="workflow"
      aria-labelledby="home-workflow-title"
      className="scroll-fade-in border-b bg-muted/35 py-16 sm:py-20 lg:py-24"
    >
      <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 sm:px-6 lg:px-8">
        <header className="max-w-3xl">
          <p className="text-sm font-medium text-primary">创作流程</p>
          <h2
            id="home-workflow-title"
            className="mt-3 text-3xl font-semibold tracking-normal text-balance sm:text-4xl"
          >
            从照片到拼豆成品的完整链路
          </h2>
          <p className="mt-4 text-base leading-7 text-muted-foreground">
            首页按真实使用流程组织内容，搜索引擎和新用户都能快速理解 PixelFox
            如何完成拼豆图纸设计、配色校准和拼搭执行。
          </p>
        </header>

        <Carousel
          aria-label="PixelFox 拼豆图纸创作流程轮播"
          className="-mx-4 overflow-visible"
        >
          <CarouselContent>
            {workflowSteps.map((step) => (
              <CarouselItem
                key={step.eyebrow}
                className="basis-[88%] sm:basis-[48%] lg:basis-[31%]"
              >
                <Card className="h-full border-border/70 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                  <CardHeader>
                    <p className="text-sm font-medium text-primary">
                      {step.eyebrow}
                    </p>
                    <CardTitle asChild>
                      <h3>{step.title}</h3>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="leading-7 text-muted-foreground">
                      {step.description}
                    </p>
                    <p className="mt-5 flex items-center gap-2 text-sm font-medium">
                      <CheckCircle2 className="size-4 text-emerald-500" />
                      可在编辑器中直接完成
                    </p>
                  </CardContent>
                </Card>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="-left-8 sm:-left-10" />
          <CarouselNext className="-right-8 sm:-right-10" />
        </Carousel>
      </div>
    </section>
  )
}
