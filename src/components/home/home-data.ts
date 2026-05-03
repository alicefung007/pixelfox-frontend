import type { LucideIcon } from "lucide-react"
import {
  Box,
  BookOpenCheck,
  Brush,
  Download,
  FolderArchive,
  ImageUp,
  Layers,
  PackageCheck,
  Palette,
} from "lucide-react"

export const SITE_NAME = "PixelFox"
export const SITE_URL = "https://pixelfox.art/"

export type HomeNavItem = {
  key: string
  href: string
}

export type HomeFeature = {
  key: string
  icon: LucideIcon
}

export type HomeWorkflowStep = {
  key: string
}

export const homeNavItems: HomeNavItem[] = [
  {
    key: "features",
    href: "#features",
  },
  {
    key: "workflow",
    href: "#workflow",
  },
  {
    key: "useCases",
    href: "#use-cases",
  },
  {
    key: "faq",
    href: "#faq",
  },
]

export const featureItems: HomeFeature[] = [
  {
    key: "photo",
    icon: ImageUp,
  },
  {
    key: "palette",
    icon: Palette,
  },
  {
    key: "drawing",
    icon: Brush,
  },
  {
    key: "preview",
    icon: Box,
  },
  {
    key: "assembly",
    icon: Layers,
  },
  {
    key: "export",
    icon: Download,
  },
]

export const workflowSteps: HomeWorkflowStep[] = [
  {
    key: "upload",
  },
  {
    key: "convert",
  },
  {
    key: "edit",
  },
  {
    key: "preview",
  },
  {
    key: "export",
  },
]

export const useCaseItems: HomeFeature[] = [
  {
    key: "personal",
    icon: Brush,
  },
  {
    key: "brand",
    icon: PackageCheck,
  },
  {
    key: "teaching",
    icon: BookOpenCheck,
  },
  {
    key: "archive",
    icon: FolderArchive,
  },
]

export const faqItems = [
  {
    key: "patterns",
  },
  {
    key: "editing",
  },
  {
    key: "export",
  },
]
