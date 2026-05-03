import { useTranslation } from "react-i18next"

import HomeFaq from "@/components/home/HomeFaq"
import HomeFeatures from "@/components/home/HomeFeatures"
import HomeFooter from "@/components/home/HomeFooter"
import HomeHero from "@/components/home/HomeHero"
import HomeNavbar from "@/components/home/HomeNavbar"
import HomeSeo from "@/components/home/HomeSeo"
import HomeUseCases from "@/components/home/HomeUseCases"
import HomeWorkflow from "@/components/home/HomeWorkflow"

export default function Home() {
  const { t } = useTranslation()

  return (
    <>
      <HomeSeo />
      <div className="min-h-screen overflow-x-hidden bg-background text-foreground">
        <a
          href="#main-content"
          className="sr-only z-[60] rounded-md bg-background px-4 py-2 text-sm font-medium shadow focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          {t("home.skipToContent")}
        </a>
        <HomeNavbar />
        <main id="main-content">
          <HomeHero />
          <HomeFeatures />
          <HomeWorkflow />
          <HomeUseCases />
          <HomeFaq />
        </main>
        <HomeFooter />
      </div>
    </>
  )
}
