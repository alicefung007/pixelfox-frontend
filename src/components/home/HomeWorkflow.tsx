import { CheckCircle2 } from "lucide-react"
import { useTranslation } from "react-i18next"

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
  const { t } = useTranslation()

  return (
    <section
      id="workflow"
      aria-labelledby="home-workflow-title"
      className="scroll-fade-in border-b bg-muted/35 py-16 sm:py-20 lg:py-24"
    >
      <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 sm:px-6 lg:px-8">
        <header className="max-w-3xl">
          <p className="text-sm font-medium text-primary">
            {t("home.workflow.eyebrow")}
          </p>
          <h2
            id="home-workflow-title"
            className="mt-3 text-3xl font-semibold tracking-normal text-balance sm:text-4xl"
          >
            {t("home.workflow.title")}
          </h2>
          <p className="mt-4 text-base leading-7 text-muted-foreground">
            {t("home.workflow.description")}
          </p>
        </header>

        <Carousel
          aria-label={t("home.workflow.carouselLabel")}
          className="-mx-4 overflow-hidden sm:overflow-visible"
        >
          <CarouselContent>
            {workflowSteps.map((step) => (
              <CarouselItem
                key={step.key}
                className="basis-full sm:basis-[48%] lg:basis-[31%]"
              >
                <Card className="h-full border-border/70 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                  <CardHeader>
                    <p className="text-sm font-medium text-primary">
                      {t(`home.workflow.steps.${step.key}.eyebrow`)}
                    </p>
                    <CardTitle asChild>
                      <h3>{t(`home.workflow.steps.${step.key}.title`)}</h3>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="leading-7 text-muted-foreground">
                      {t(`home.workflow.steps.${step.key}.description`)}
                    </p>
                    <p className="mt-5 flex min-w-0 items-start gap-2 text-sm font-medium">
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                      {t("home.workflow.editorReady")}
                    </p>
                  </CardContent>
                </Card>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="hidden sm:-left-5 sm:inline-flex lg:-left-10" />
          <CarouselNext className="hidden sm:-right-5 sm:inline-flex lg:-right-10" />
        </Carousel>
      </div>
    </section>
  )
}
