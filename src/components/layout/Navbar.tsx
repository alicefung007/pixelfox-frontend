import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";
import { 
  User, 
  Bell, 
  Languages, 
  Sun,
  Moon,
  Monitor,
  Check,
  Menu
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme-provider";
import i18n from "@/i18n/config";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";

type Props = {
  onMenuClick?: () => void;
};

type NavItem =
  | { label: string; path: string; disabled?: false }
  | { label: string; disabled: true };

export default function Navbar({ onMenuClick }: Props) {
  const { t } = useTranslation();
  const location = useLocation();
  const { theme, setTheme } = useTheme();

  const languages = [
    { code: 'en', label: 'English' },
    { code: 'zh', label: '简体中文' },
    { code: 'ko', label: '한국어' },
    { code: 'ja', label: '日本語' },
  ];

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  const navItems: NavItem[] = [
    { label: t("nav.editor"), path: "/" },
    { label: t("nav.explore"), disabled: true },
  ];

  return (
    <nav className="relative h-14 sm:h-16 border-b flex items-center justify-between px-3 sm:px-4 bg-background z-50">
      <div className="flex items-center gap-2 sm:gap-4 md:gap-8">
        {onMenuClick && (
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground h-9 w-9 md:hidden"
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
              <span className="text-[10px] font-medium leading-none text-muted-foreground/50">(Coming soon...)</span>
            </span>
          ) : (
            <Link
              key={item.path}
              to={item.path}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors hover:bg-primary/10 hover:text-primary ${
                location.pathname === item.path ? "bg-primary/10 text-primary" : "text-muted-foreground"
              }`}
            >
              {item.label}
            </Link>
          )
        )}
      </div>

      <div className="flex items-center gap-1 sm:gap-2">
        <Button variant="ghost" size="icon" className="text-muted-foreground h-9 w-9">
          <User className="h-[18px] w-[18px]" />
        </Button>
        <Button variant="ghost" size="icon" className="text-muted-foreground h-9 w-9">
          <Bell className="h-[18px] w-[18px]" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="text-muted-foreground h-9 w-9">
              <Languages className="h-[18px] w-[18px]" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {languages.map((lang) => (
              <DropdownMenuItem
                key={lang.code}
                onClick={() => changeLanguage(lang.code)}
                className="flex items-center justify-between"
              >
                {lang.label}
                {i18n.language === lang.code && (
                  <Check className="h-4 w-4 ml-2 opacity-50" />
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="text-muted-foreground h-9 w-9">
              {theme === "system" ? (
                <Monitor className="h-[18px] w-[18px]" />
              ) : theme === "dark" ? (
                <Moon className="h-[18px] w-[18px]" />
              ) : (
                <Sun className="h-[18px] w-[18px]" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuRadioGroup value={theme} onValueChange={(v) => setTheme(v as "light" | "dark" | "system")}>
              <DropdownMenuRadioItem value="light" className="flex items-center gap-2">
                <Sun className="h-4 w-4" />
                {t("nav.theme.light")}
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="dark" className="flex items-center gap-2">
                <Moon className="h-4 w-4" />
                {t("nav.theme.dark")}
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="system" className="flex items-center gap-2">
                <Monitor className="h-4 w-4" />
                {t("nav.theme.system")}
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
}
