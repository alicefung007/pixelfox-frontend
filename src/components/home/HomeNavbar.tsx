import { Link } from "react-router-dom"
import { ArrowRight, Menu } from "lucide-react"

import { homeNavItems } from "@/components/home/home-data"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "@/components/ui/navigation-menu"
import { Separator } from "@/components/ui/separator"

export default function HomeNavbar() {
  return (
    <header className="sticky top-0 z-50 border-b bg-background/85 backdrop-blur-xl supports-[backdrop-filter]:bg-background/75">
      <nav
        aria-label="官网主导航"
        className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8"
      >
        <a
          href="#hero"
          className="inline-flex items-center rounded-md focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none"
          aria-label="PixelFox 官网首页"
        >
          <img
            src="/home/pixelfox-wordmark-276.png"
            srcSet="/home/pixelfox-wordmark-276.png 1x, /home/pixelfox-wordmark-552.png 2x"
            alt="PixelFox 拼豆图纸编辑器品牌标识"
            title="PixelFox 拼豆图纸编辑器"
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
                  <a href={item.href} title={item.description}>
                    {item.label}
                  </a>
                </NavigationMenuLink>
              </NavigationMenuItem>
            ))}
          </NavigationMenuList>
        </NavigationMenu>

        <section
          aria-label="官网快捷操作"
          className="hidden items-center gap-2 sm:flex"
        >
          <Button asChild>
            <Link to="/editor">
              免费开始创作
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </section>

        <Dialog>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="sm:hidden"
              aria-label="打开移动端导航"
              title="打开移动端导航"
            >
              <Menu className="size-5" />
            </Button>
          </DialogTrigger>
          <DialogContent className="top-4 left-1/2 max-h-[calc(100svh-2rem)] max-w-[calc(100%-2rem)] translate-y-0 overflow-y-auto rounded-2xl p-5 sm:hidden">
            <DialogHeader>
              <DialogTitle>PixelFox</DialogTitle>
              <DialogDescription>
                拼豆图纸、像素画编辑与分色拼搭工具。
              </DialogDescription>
            </DialogHeader>
            <Separator />
            <nav aria-label="移动端官网导航" className="grid gap-1">
              {homeNavItems.map((item) => (
                <DialogClose asChild key={item.href}>
                  <a
                    href={item.href}
                    className="rounded-lg px-3 py-3 text-sm font-medium transition-colors hover:bg-muted"
                    title={item.description}
                  >
                    {item.label}
                  </a>
                </DialogClose>
              ))}
            </nav>
            <Separator />
            <section aria-label="移动端快捷操作" className="grid gap-2">
              <DialogClose asChild>
                <Button asChild>
                  <Link to="/editor">
                    免费开始创作
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </DialogClose>
            </section>
          </DialogContent>
        </Dialog>
      </nav>
    </header>
  )
}
