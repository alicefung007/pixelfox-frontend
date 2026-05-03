import { useTranslation } from "react-i18next"

import { useCaseItems } from "@/components/home/home-data"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function HomeUseCases() {
  const { t } = useTranslation()

  return (
    <section
      id="use-cases"
      aria-labelledby="home-use-cases-title"
      className="scroll-fade-in border-b py-16 sm:py-20 lg:py-24"
    >
      <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 sm:px-6 lg:px-8">
        <header className="max-w-3xl">
          <p className="text-sm font-medium text-primary">
            {t("home.useCases.eyebrow")}
          </p>
          <h2
            id="home-use-cases-title"
            className="mt-3 text-3xl font-semibold tracking-normal text-balance sm:text-4xl"
          >
            {t("home.useCases.title")}
          </h2>
          <p className="mt-4 text-base leading-7 text-muted-foreground">
            {t("home.useCases.description")}
          </p>
        </header>

        <ul className="grid gap-4 md:grid-cols-2">
          {useCaseItems.map((item) => {
            const Icon = item.icon

            return (
              <li key={item.key}>
                <Card className="h-full border-border/70 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                  <CardHeader>
                    <span className="flex size-10 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                      <Icon className="size-5" />
                    </span>
                    <CardTitle asChild>
                      <h3>{t(`home.useCases.items.${item.key}.title`)}</h3>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="leading-7 text-muted-foreground">
                      {t(`home.useCases.items.${item.key}.description`)}
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
