import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";
import { 
  User, 
  Bell, 
  Languages, 
  Sun,
  Moon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme-provider";
import i18n from "@/i18n/config";

export default function Navbar() {
  const { t } = useTranslation();
  const location = useLocation();
  const { theme, setTheme } = useTheme();

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'zh' : 'en';
    i18n.changeLanguage(newLang);
  };

  const navItems = [
    { label: t("nav.editor"), path: "/" },
    { label: t("nav.gallery"), path: "/gallery" },
    { label: t("nav.upscaler"), path: "/upscaler" },
  ];

  return (
    <nav className="h-16 border-b flex items-center justify-between px-4 bg-background z-50">
      <div className="flex items-center gap-8">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-pink-500 rounded flex items-center justify-center text-white font-bold text-xs">PX</div>
          <span className="font-bold text-lg tracking-tight">pixelfox<span className="text-pink-500">.art</span></span>
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

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="text-muted-foreground h-9 w-9">
          <User className="h-[18px] w-[18px]" />
        </Button>
        <Button variant="ghost" size="icon" className="text-muted-foreground h-9 w-9">
          <Bell className="h-[18px] w-[18px]" />
        </Button>
        <Button variant="ghost" size="icon" className="text-muted-foreground h-9 w-9" onClick={toggleLanguage}>
          <Languages className="h-[18px] w-[18px]" />
        </Button>
        <Button 
          variant="ghost" 
          size="icon" 
          className="text-muted-foreground h-9 w-9"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          {theme === "dark" ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
        </Button>
      </div>
    </nav>
  );
}
