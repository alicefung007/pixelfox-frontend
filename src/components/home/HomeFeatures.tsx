import { useTranslation } from "react-i18next"

import { featureItems } from "@/components/home/home-data"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function HomeFeatures() {
  const { t } = useTranslation()

  return (
    <section
      id="features"
      aria-labelledby="home-features-title"
      className="scroll-fade-in border-b py-16 sm:py-20 lg:py-24"
    >
      <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 sm:px-6 lg:px-8">
        <header className="max-w-3xl">
          <p className="text-sm font-medium text-primary">
            {t("home.features.eyebrow")}
          </p>
          <h2
            id="home-features-title"
            className="mt-3 text-3xl font-semibold tracking-normal text-balance sm:text-4xl"
          >
            {t("home.features.title")}
          </h2>
          <p className="mt-4 text-base leading-7 text-muted-foreground">
            {t("home.features.description")}
          </p>
        </header>

        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {featureItems.map((feature) => {
            const Icon = feature.icon

            return (
              <li key={feature.key}>
                <Card className="h-full border-border/70 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                  <CardHeader>
                    <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="size-5" />
                    </span>
                    <CardTitle asChild>
                      <h3>{t(`home.features.items.${feature.key}.title`)}</h3>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="leading-7 text-muted-foreground">
                      {t(`home.features.items.${feature.key}.description`)}
                    </p>
                  </CardContent>
                </Card>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
