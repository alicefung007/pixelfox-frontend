import { featureItems } from "@/components/home/home-data"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function HomeFeatures() {
  return (
    <section
      id="features"
      aria-labelledby="home-features-title"
      className="scroll-fade-in border-b py-16 sm:py-20 lg:py-24"
    >
      <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 sm:px-6 lg:px-8">
        <header className="max-w-3xl">
          <p className="text-sm font-medium text-primary">产品能力</p>
          <h2
            id="home-features-title"
            className="mt-3 text-3xl font-semibold tracking-normal text-balance sm:text-4xl"
          >
            为拼豆创作者设计的核心能力
          </h2>
          <p className="mt-4 text-base leading-7 text-muted-foreground">
            PixelFox 把拼豆图纸制作中的像素转换、真实色板、图纸修整、3D
            预览和分色拼搭集中在同一个工作台，减少重复导入导出和手工统计。
          </p>
        </header>

        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {featureItems.map((feature) => {
            const Icon = feature.icon

            return (
              <li key={feature.title}>
                <Card className="h-full border-border/70 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                  <CardHeader>
                    <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="size-5" />
                    </span>
                    <CardTitle asChild>
                      <h3>{feature.title}</h3>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="leading-7 text-muted-foreground">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
