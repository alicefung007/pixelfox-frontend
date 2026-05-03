import { Link } from "react-router-dom"
import { ArrowRight } from "lucide-react"
import { useTranslation } from "react-i18next"

import { homeNavItems } from "@/components/home/home-data"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

export default function HomeFooter() {
  const { t } = useTranslation()

  return (
    <footer id="contact" className="bg-background">
      <section
        aria-labelledby="home-contact-title"
        className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_auto] lg:items-center lg:px-8"
      >
        <header className="max-w-2xl">
          <p className="text-sm font-medium text-primary">
            {t("home.footer.ctaEyebrow")}
          </p>
          <h2
            id="home-contact-title"
            className="mt-3 text-3xl font-semibold tracking-normal text-balance sm:text-4xl"
          >
            {t("home.footer.ctaTitle")}
          </h2>
          <p className="mt-4 text-base leading-7 text-muted-foreground">
            {t("home.footer.ctaDescription")}
          </p>
        </header>
        <section
          aria-label={t("home.footer.actionsLabel")}
          className="flex flex-col gap-3 sm:flex-row lg:justify-end"
        >
          <Button size="lg" asChild>
            <Link to="/editor">
              {t("home.cta.primary")}
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </section>
      </section>

      <Separator />

      <section className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_auto] lg:px-8">
        <section aria-label={t("home.footer.brandLabel")} className="max-w-md">
          <img
            src="/home/pixelfox-wordmark-276.png"
            srcSet="/home/pixelfox-wordmark-276.png 1x, /home/pixelfox-wordmark-552.png 2x"
            alt={t("home.brand.footerWordmarkAlt")}
            title={t("home.brand.title")}
            width={138}
            height={30}
            loading="lazy"
            decoding="async"
            className="h-7 w-auto object-contain"
          />
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            {t("home.footer.brandDescription")}
          </p>
        </section>

        <nav
          aria-label={t("home.footer.linksLabel")}
          className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4"
        >
          {homeNavItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              title={t(`home.nav.items.${item.key}.description`)}
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              {t(`home.nav.items.${item.key}.label`)}
            </a>
          ))}
          <Link
            to="/editor"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            {t("home.footer.editorLink")}
          </Link>
        </nav>
      </section>

      <Separator />

      <section className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <p>© 2026 PixelFox. All rights reserved.</p>
        <p>{t("home.footer.tagline")}</p>
      </section>
    </footer>
  )
}
