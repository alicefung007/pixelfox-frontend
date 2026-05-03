import { Link } from "react-router-dom"
import { ArrowRight, Check, Languages, Menu } from "lucide-react"
import { useTranslation } from "react-i18next"

import { homeNavItems } from "@/components/home/home-data"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "@/components/ui/navigation-menu"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import i18n from "@/i18n/config"

const languages = [
  { code: "en", label: "English" },
  { code: "zh", label: "简体中文" },
  { code: "ko", label: "한국어" },
  { code: "ja", label: "日本語" },
]

export default function HomeNavbar() {
  const { t } = useTranslation()

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng)
    const url = new URL(window.location.href)
    url.searchParams.set("lng", lng)
    window.history.replaceState(null, "", url)
  }

  return (
    <header className="sticky top-0 z-50 border-b bg-background/85 backdrop-blur-xl supports-[backdrop-filter]:bg-background/75">
      <nav
        aria-label={t("home.nav.mainLabel")}
        className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8"
      >
        <a
          href="#hero"
          className="inline-flex items-center rounded-md focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none"
          aria-label={t("home.nav.homeAria")}
        >
          <img
            src="/home/pixelfox-wordmark-276.png"
            srcSet="/home/pixelfox-wordmark-276.png 1x, /home/pixelfox-wordmark-552.png 2x"
            alt={t("home.brand.wordmarkAlt")}
            title={t("home.brand.title")}
            width={138}
            height={30}
            decoding="async"
            className="h-7 w-auto object-contain sm:h-8"
          />
        </a>

        <NavigationMenu className="hidden lg:flex">
          <NavigationMenuList>
            {homeNavItems.map((item) => (
              <NavigationMenuItem key={item.href}>
                <NavigationMenuLink asChild>
                  <a
                    href={item.href}
                    title={t(`home.nav.items.${item.key}.description`)}
                  >
                    {t(`home.nav.items.${item.key}.label`)}
                  </a>
                </NavigationMenuLink>
              </NavigationMenuItem>
            ))}
          </NavigationMenuList>
        </NavigationMenu>

        <section
          aria-label={t("home.nav.actionsLabel")}
          className="hidden items-center gap-2 sm:flex"
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label={t("nav.language")}
                title={t("nav.language")}
              >
                <Languages className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44 space-y-1">
              {languages.map((lang) => (
                <DropdownMenuItem
                  key={lang.code}
                  onClick={() => changeLanguage(lang.code)}
                  className="flex items-center justify-between"
                >
                  <span>{lang.label}</span>
                  {i18n.language === lang.code && (
                    <Check className="ml-2 size-4 opacity-90" />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button asChild>
            <Link to="/editor">
              {t("home.cta.primary")}
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </section>

        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="sm:hidden"
              aria-label={t("home.nav.openMobile")}
              title={t("home.nav.openMobile")}
            >
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent
            className="sm:hidden"
            onCloseAutoFocus={(event) => event.preventDefault()}
          >
            <SheetHeader className="px-5 pt-5 pr-12">
              <SheetTitle>PixelFox</SheetTitle>
              <SheetDescription>
                {t("home.nav.mobileDescription")}
              </SheetDescription>
            </SheetHeader>
            <Separator />
            <nav
              aria-label={t("home.nav.mobileLabel")}
              className="grid gap-1 overflow-y-auto px-3"
            >
              {homeNavItems.map((item) => (
                <SheetClose asChild key={item.href}>
                  <a
                    href={item.href}
                    className="rounded-lg px-3 py-3 text-sm font-medium transition-colors hover:bg-muted"
                    title={t(`home.nav.items.${item.key}.description`)}
                  >
                    {t(`home.nav.items.${item.key}.label`)}
                  </a>
                </SheetClose>
              ))}
            </nav>
            <Separator />
            <SheetFooter
              aria-label={t("home.nav.mobileActionsLabel")}
              className="px-5 pb-5"
            >
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="justify-between">
                    <span>{t("nav.language")}</span>
                    <Languages className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44 space-y-1">
                  {languages.map((lang) => (
                    <DropdownMenuItem
                      key={lang.code}
                      onClick={() => changeLanguage(lang.code)}
                      className="flex items-center justify-between"
                    >
                      <span>{lang.label}</span>
                      {i18n.language === lang.code && (
                        <Check className="ml-2 size-4 opacity-90" />
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <SheetClose asChild>
                <Button asChild>
                  <Link to="/editor">
                    {t("home.cta.primary")}
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </SheetClose>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </nav>
    </header>
  )
}
