import { Link } from "react-router-dom"
import { ArrowRight } from "lucide-react"

import { homeNavItems } from "@/components/home/home-data"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

export default function HomeFooter() {
  return (
    <footer id="contact" className="bg-background">
      <section
        aria-labelledby="home-contact-title"
        className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_auto] lg:items-center lg:px-8"
      >
        <header className="max-w-2xl">
          <p className="text-sm font-medium text-primary">开始创作</p>
          <h2
            id="home-contact-title"
            className="mt-3 text-3xl font-semibold tracking-normal text-balance sm:text-4xl"
          >
            准备把灵感变成可拼搭的拼豆图纸？
          </h2>
          <p className="mt-4 text-base leading-7 text-muted-foreground">
            进入编辑器新建画布、上传照片并调整配色，快速生成适合制作和分享的拼豆图纸。
          </p>
        </header>
        <section
          aria-label="页脚主要操作"
          className="flex flex-col gap-3 sm:flex-row lg:justify-end"
        >
          <Button size="lg" asChild>
            <Link to="/editor">
              免费开始创作
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </section>
      </section>

      <Separator />

      <section className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_auto] lg:px-8">
        <section aria-label="PixelFox 品牌信息" className="max-w-md">
          <img
            src="/home/pixelfox-wordmark-276.png"
            srcSet="/home/pixelfox-wordmark-276.png 1x, /home/pixelfox-wordmark-552.png 2x"
            alt="PixelFox 拼豆图纸编辑器页脚品牌标识"
            title="PixelFox 拼豆图纸编辑器"
            width={138}
            height={30}
            loading="lazy"
            decoding="async"
            className="h-7 w-auto object-contain"
          />
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            PixelFox
            帮助创作者把照片、灵感和配色方案整理成清晰可拼搭的拼豆图纸。
          </p>
        </section>

        <nav
          aria-label="页脚内部链接"
          className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4"
        >
          {homeNavItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              title={item.description}
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              {item.label}
            </a>
          ))}
          <Link
            to="/editor"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            在线编辑器
          </Link>
        </nav>
      </section>

      <Separator />

      <section className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <p>© 2026 PixelFox. All rights reserved.</p>
        <p>拼豆图纸编辑器、像素画创作工具、照片转像素画平台。</p>
      </section>
    </footer>
  )
}
