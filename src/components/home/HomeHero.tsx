import { Link } from "react-router-dom"
import { ArrowRight, Sparkles } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"

export default function HomeHero() {
  const { t } = useTranslation()

  return (
    <section
      id="hero"
      aria-labelledby="home-hero-title"
      className="relative isolate overflow-hidden border-b bg-[radial-gradient(circle_at_50%_0%,color-mix(in_oklch,var(--primary)_24%,transparent),transparent_34%),linear-gradient(180deg,color-mix(in_oklch,var(--muted)_70%,transparent),transparent_42%)]"
    >
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,color-mix(in_oklch,var(--border)_70%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_oklch,var(--border)_70%,transparent)_1px,transparent_1px)] bg-[size:32px_32px] opacity-50" />
      <div className="mx-auto grid min-h-[calc(100svh-7rem)] w-full max-w-7xl content-center gap-10 px-4 py-14 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
        <header className="mx-auto flex max-w-4xl flex-col items-center text-center">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border bg-background/80 px-3 py-1 text-sm text-muted-foreground shadow-sm backdrop-blur">
            <Sparkles className="size-4 text-primary" />
            {t("home.hero.eyebrow")}
          </p>
          <h1
            id="home-hero-title"
            className="max-w-4xl text-4xl leading-tight font-semibold tracking-normal text-balance sm:text-5xl lg:text-6xl"
          >
            {t("home.hero.title")}
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">
            {t("home.hero.description")}
          </p>
          <section
            aria-label={t("home.hero.actionsLabel")}
            className="mt-8 flex w-full flex-col items-center justify-center gap-3 sm:w-auto sm:flex-row"
          >
            <Button size="lg" asChild className="w-full sm:w-auto">
              <Link to="/editor">
                {t("home.cta.primary")}
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="w-full cursor-not-allowed bg-background/80 sm:w-auto"
              disabled
              aria-label={t("home.cta.galleryAria")}
              title={t("home.cta.galleryAria")}
            >
              <span>{t("home.cta.gallery")}</span>
              <span className="text-xs font-medium text-muted-foreground">
                {t("home.cta.comingSoon")}
              </span>
            </Button>
          </section>
        </header>
      </div>
    </section>
  )
}
