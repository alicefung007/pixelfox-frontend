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

  const navItems = [
    { label: t("nav.editor"), path: "/" },
    { label: t("nav.gallery"), path: "/gallery" },
    { label: t("nav.upscaler"), path: "/upscaler" },
  ];

  return (
    <nav className="h-14 sm:h-16 border-b flex items-center justify-between px-3 sm:px-4 bg-background z-50">
      <div className="flex items-center gap-2 sm:gap-4 md:gap-8">
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground h-9 w-9 md:hidden"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
        </Button>

        <div className="flex items-center gap-2">
          <div className="w-7 h-7 sm:w-8 sm:h-8 bg-pink-500 rounded flex items-center justify-center text-white font-bold text-[10px] sm:text-xs">PX</div>
          <span className="font-bold text-base sm:text-lg tracking-tight hidden sm:inline">pixelfox<span className="text-pink-500">.art</span></span>
        </div>
        
        <div className="hidden md:flex items-center gap-6">
          {navItems.map((item) => (
            <Link 
              key={item.path} 
              to={item.path}
              className={`text-sm font-medium transition-colors hover:text-primary ${
                location.pathname === item.path ? "text-primary" : "text-muted-foreground"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
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
