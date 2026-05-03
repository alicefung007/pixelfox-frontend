import { useTranslation } from "react-i18next"
import { Link, useLocation } from "react-router-dom"
import { Languages, Sun, Moon, Monitor, Check, Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTheme } from "@/components/theme-provider"
import i18n from "@/i18n/config"
import FeedbackDialog from "@/components/layout/FeedbackDialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu"

type Props = {
  onMenuClick?: () => void
}

type NavItem =
  | { label: string; path: string; disabled?: false }
  | { label: string; disabled: true }

export default function Navbar({ onMenuClick }: Props) {
  const { t } = useTranslation()
  const location = useLocation()
  const { theme, setTheme } = useTheme()

  const languages = [
    { code: "en", label: "English" },
    { code: "zh", label: "简体中文" },
    { code: "ko", label: "한국어" },
    { code: "ja", label: "日本語" },
  ]

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng)
  }

  const navItems: NavItem[] = [
    { label: t("nav.editor"), path: "/editor" },
    { label: t("nav.explore"), disabled: true },
  ]
  const activeMenuItemClass =
    "bg-primary/10 !text-primary hover:!bg-primary/10 hover:!text-primary focus:!bg-primary/10 focus:!text-primary [&_*]:!text-primary [&_svg]:!text-primary [&[data-highlighted]]:!bg-primary/10 [&[data-highlighted]]:!text-primary [&[data-highlighted]_*]:!text-primary [&:focus_*]:!text-primary"

  return (
    <nav className="relative z-50 flex h-14 items-center justify-between border-b bg-background px-3 sm:h-16 sm:px-4">
      <div className="flex items-center gap-2 sm:gap-4 md:gap-8">
        {onMenuClick && (
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-muted-foreground md:hidden"
            onClick={onMenuClick}
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}

        <div className="flex items-center">
          <img
            src="/logo_with_name.png"
            alt="PixelFox logo"
            className="h-7 w-auto object-contain sm:h-8"
          />
        </div>
      </div>

      <div className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-2 md:flex">
        {navItems.map((item) =>
          item.disabled ? (
            <span
              key={item.label}
              className="flex cursor-not-allowed items-end gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground/60"
              aria-disabled="true"
            >
              <span className="leading-none">{item.label}</span>
              <span className="text-[10px] leading-none font-medium text-muted-foreground/50">
                {t("nav.comingSoon")}
              </span>
            </span>
          ) : (
            <Link
              key={item.path}
              to={item.path}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors hover:bg-primary/10 hover:text-primary ${
                location.pathname === item.path
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground"
              }`}
            >
              {item.label}
            </Link>
          )
        )}
      </div>

      <div className="flex items-center gap-1 sm:gap-2">
        <FeedbackDialog />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-muted-foreground"
              aria-label={t("nav.language")}
              title={t("nav.language")}
            >
              <Languages className="h-[18px] w-[18px]" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44 space-y-1">
            {languages.map((lang) => (
              <DropdownMenuItem
                key={lang.code}
                onClick={() => changeLanguage(lang.code)}
                className={`flex items-center justify-between ${
                  i18n.language === lang.code ? activeMenuItemClass : ""
                }`}
              >
                <span>{lang.label}</span>
                {i18n.language === lang.code && (
                  <Check className="ml-2 h-4 w-4 opacity-90" />
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-muted-foreground"
              aria-label={t("nav.appearance.label")}
              title={t("nav.appearance.label")}
            >
              {theme === "system" ? (
                <Monitor className="h-[18px] w-[18px]" />
              ) : theme === "dark" ? (
                <Moon className="h-[18px] w-[18px]" />
              ) : (
                <Sun className="h-[18px] w-[18px]" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="space-y-1">
            <DropdownMenuRadioGroup
              value={theme}
              onValueChange={(v) => setTheme(v as "light" | "dark" | "system")}
              className="space-y-1"
            >
              <DropdownMenuRadioItem
                value="light"
                className={`flex items-center gap-2 ${
                  theme === "light" ? activeMenuItemClass : ""
                }`}
              >
                <Sun className="h-4 w-4" />
                {t("nav.appearance.light")}
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem
                value="dark"
                className={`flex items-center gap-2 ${
                  theme === "dark" ? activeMenuItemClass : ""
                }`}
              >
                <Moon className="h-4 w-4" />
                {t("nav.appearance.dark")}
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem
                value="system"
                className={`flex items-center gap-2 ${
                  theme === "system" ? activeMenuItemClass : ""
                }`}
              >
                <Monitor className="h-4 w-4" />
                {t("nav.appearance.system")}
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  )
}
