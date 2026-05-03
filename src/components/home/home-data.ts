import type { LucideIcon } from "lucide-react"
import {
  BookOpenCheck,
  Brush,
  Download,
  Eye,
  FolderArchive,
  ImageUp,
  Layers,
  PackageCheck,
  Palette,
} from "lucide-react"

export const SITE_NAME = "PixelFox"
export const SITE_URL = "https://pixelfox.art/"
export const SITE_TITLE = "PixelFox | 拼豆图纸与像素画编辑器"
export const SITE_DESCRIPTION =
  "PixelFox 是面向拼豆创作者、像素画爱好者和手作品牌的在线拼豆图纸编辑器，支持照片转像素画、色板管理、3D 预览、分色拼搭和高清图纸导出。"
export const SITE_KEYWORDS =
  "PixelFox,拼豆图纸,拼豆设计,拼豆图纸编辑器,像素画编辑器,照片转像素画,拼豆配色,拼豆教程,拼豆制作工具,perler beads pattern"

export type HomeNavItem = {
  label: string
  href: string
  description: string
}

export type HomeFeature = {
  title: string
  description: string
  icon: LucideIcon
}

export type HomeWorkflowStep = {
  eyebrow: string
  title: string
  description: string
}

export const homeNavItems: HomeNavItem[] = [
  {
    label: "产品能力",
    href: "#features",
    description: "了解 PixelFox 的拼豆图纸编辑能力",
  },
  {
    label: "创作流程",
    href: "#workflow",
    description: "查看从照片到图纸的完整流程",
  },
  {
    label: "适用场景",
    href: "#use-cases",
    description: "浏览个人创作和手作品牌的使用场景",
  },
  {
    label: "常见问题",
    href: "#faq",
    description: "查看拼豆图纸制作的常见问题",
  },
]

export const featureItems: HomeFeature[] = [
  {
    title: "照片智能转拼豆图纸",
    description:
      "上传图片后可调整尺寸、裁边、翻转和旋转，并把照片转换为受系统色板约束的像素画网格。",
    icon: ImageUp,
  },
  {
    title: "专业色板与配色管理",
    description:
      "内置多套拼豆色板，支持已用色统计、最近颜色、拖拽替换和跨色板近似映射。",
    icon: Palette,
  },
  {
    title: "像素级绘制工具",
    description:
      "画笔、油漆桶、魔棒、吸色器、橡皮擦和手型工具覆盖手绘、修图和局部调整。",
    icon: Brush,
  },
  {
    title: "3D 拼豆预览",
    description:
      "在导出前用 3D 视角检查拼豆质感、轮廓和整体效果，减少返工成本。",
    icon: Eye,
  },
  {
    title: "分色拼搭流程",
    description:
      "按颜色生成装裱步骤，支持进度记录、镜像翻转、坐标和色号辅助，适合实体拼搭。",
    icon: Layers,
  },
  {
    title: "高清图纸导出",
    description:
      "导出带品牌信息、网格、坐标、色号和用色统计的 PNG 拼豆图纸，便于保存和分享。",
    icon: Download,
  },
]

export const workflowSteps: HomeWorkflowStep[] = [
  {
    eyebrow: "01 上传",
    title: "导入照片或新建画布",
    description: "从空白画布开始手绘，也可以上传照片作为拼豆图纸的起点。",
  },
  {
    eyebrow: "02 转换",
    title: "设置尺寸与目标色板",
    description:
      "控制图纸宽高、裁边和颜色合并强度，让像素结果适配实际拼豆数量。",
  },
  {
    eyebrow: "03 编辑",
    title: "逐格修图并管理颜色",
    description: "使用画笔、魔棒和色板工具处理边缘、背景、阴影和局部色差。",
  },
  {
    eyebrow: "04 预览",
    title: "检查 3D 效果与分色步骤",
    description: "在导出前查看拼豆立体效果，并确认每个颜色步骤都清晰可执行。",
  },
  {
    eyebrow: "05 导出",
    title: "生成高清拼豆图纸",
    description:
      "导出带网格、坐标、色号和用色统计的 PNG 图纸，方便打印或分享。",
  },
]

export const useCaseItems: HomeFeature[] = [
  {
    title: "个人拼豆创作",
    description:
      "把头像、宠物、动漫角色或纪念照片整理成可拼搭图纸，降低从灵感到成品的门槛。",
    icon: Brush,
  },
  {
    title: "手作品牌打样",
    description:
      "快速评估尺寸、颜色和材料用量，为定制订单、教程内容和小批量产品做前期方案。",
    icon: PackageCheck,
  },
  {
    title: "教学与社群分享",
    description:
      "用清晰网格、坐标和颜色步骤组织教学素材，让新手也能跟着图纸完成作品。",
    icon: BookOpenCheck,
  },
  {
    title: "长期图纸资产管理",
    description:
      "统一导出格式和品牌信息，便于后续整理作品库、发布教程和沉淀可复用图纸。",
    icon: FolderArchive,
  },
]

export const faqItems = [
  {
    question: "PixelFox 适合做哪些拼豆图纸？",
    answer:
      "PixelFox 适合制作头像、宠物、徽章、摆件、钥匙扣、装饰画和小型手作周边。你可以从照片转换开始，也可以直接在像素画布上逐格绘制。",
  },
  {
    question: "照片转像素画后还能继续编辑吗？",
    answer:
      "可以。转换完成后，图纸会进入编辑器画布，你可以继续用画笔、油漆桶、魔棒、吸色器和颜色替换工具调整细节。",
  },
  {
    question: "导出的拼豆图纸包含哪些信息？",
    answer:
      "导出图纸可包含品牌头图、像素网格、坐标轴、色号、尺寸、拼豆数量和用色统计，适合打印、存档和分享给拼搭者。",
  },
]

export const homeJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: SITE_NAME,
  url: SITE_URL,
  applicationCategory: "DesignApplication",
  operatingSystem: "Web",
  description: SITE_DESCRIPTION,
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  publisher: {
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}logo.png`,
  },
}
