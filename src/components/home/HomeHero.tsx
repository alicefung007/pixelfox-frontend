import { Link } from "react-router-dom"
import { ArrowRight, Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"

export default function HomeHero() {
  return (
    <section
      id="hero"
      aria-labelledby="home-hero-title"
      className="relative isolate overflow-hidden border-b bg-[radial-gradient(circle_at_50%_0%,color-mix(in_oklch,var(--primary)_24%,transparent),transparent_34%),linear-gradient(180deg,color-mix(in_oklch,var(--muted)_70%,transparent),transparent_42%)]"
    >
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,color-mix(in_oklch,var(--border)_70%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_oklch,var(--border)_70%,transparent)_1px,transparent_1px)] bg-[size:32px_32px] opacity-50" />
      <div className="mx-auto grid min-h-[calc(100svh-7rem)] w-full max-w-7xl content-center gap-10 px-4 py-14 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
        <header className="mx-auto flex max-w-4xl flex-col items-center text-center">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border bg-background/80 px-3 py-1 text-sm text-muted-foreground shadow-sm backdrop-blur">
            <Sparkles className="size-4 text-primary" />
            面向拼豆创作者的在线图纸工作台
          </p>
          <h1
            id="home-hero-title"
            className="max-w-4xl text-4xl leading-tight font-semibold tracking-normal text-balance sm:text-5xl lg:text-6xl"
          >
            PixelFox 拼豆图纸与像素创作平台
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">
            从照片转像素画、拼豆配色管理、3D 预览到高清图纸导出，PixelFox
            帮助个人创作者和手作品牌更快完成可拼搭、可分享、可复用的拼豆设计。
          </p>
          <section
            aria-label="首页主要操作"
            className="mt-8 flex w-full flex-col items-center justify-center gap-3 sm:w-auto sm:flex-row"
          >
            <Button size="lg" asChild className="w-full sm:w-auto">
              <Link to="/editor">
                免费开始创作
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="w-full cursor-not-allowed bg-background/80 sm:w-auto"
              disabled
              aria-label="浏览优秀作品，即将推出"
              title="浏览优秀作品，即将推出"
            >
              <span>浏览优秀作品</span>
              <span className="text-xs font-medium text-muted-foreground">
                即将推出
              </span>
            </Button>
          </section>
        </header>
      </div>
    </section>
  )
}
