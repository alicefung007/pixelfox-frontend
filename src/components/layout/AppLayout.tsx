import { useState, useCallback } from "react"
import { Outlet, useLocation } from "react-router-dom"
import { Toaster } from "sonner"
import Navbar from "./Navbar"
import { useEditorStore } from "@/store/useEditorStore"
import { usePaletteStore } from "@/store/usePaletteStore"
import type { ColorMatchResult } from "@/lib/image-processor"
import type { SystemPaletteId } from "@/lib/palettes"
import { getSystemPalette } from "@/lib/palettes"
import { resolvePaletteColor } from "@/lib/palette-color"
import { showPaletteRemapToast } from "@/lib/palette-notice"
import { useTranslation } from "react-i18next"

export default function AppLayout() {
  const { t } = useTranslation()
  const location = useLocation()
  const isEditorPage = location.pathname === "/editor"
  const showNavbar = location.pathname !== "/assembly"
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const setPixels = useEditorStore((state) => state.setPixels)
  const setSize = useEditorStore((state) => state.setSize)
  const saveHistory = useEditorStore((state) => state.saveHistory)
  const setColor = useEditorStore((state) => state.setColor)
  const primaryColor = useEditorStore((state) => state.primaryColor)
  const uploadOpen = useEditorStore((state) => state.uploadOpen)
  const setUploadOpen = useEditorStore((state) => state.setUploadOpen)
  const exportOpen = useEditorStore((state) => state.exportOpen)
  const setExportOpen = useEditorStore((state) => state.setExportOpen)
  const setCurrentPaletteId = usePaletteStore(
    (state) => state.setCurrentPaletteId
  )
  const setActiveTab = usePaletteStore((state) => state.setActiveTab)
  const flashUsedTab = usePaletteStore((state) => state.flashUsedTab)

  const handleGenerate = useCallback(
    (result: ColorMatchResult, paletteId: SystemPaletteId) => {
      const pixels: Record<string, string> = {}
      const { imageData, width, height } = result

      // Close the upload dialog before applying store updates triggered by generation.
      setUploadOpen(false)

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const offset = (y * width + x) * 4
          const alpha = imageData.data[offset + 3]
          if (alpha === 0) {
            continue
          }
          const r = imageData.data[offset]
          const g = imageData.data[offset + 1]
          const b = imageData.data[offset + 2]
          const hex = `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`
          pixels[`${x},${y}`] = hex
        }
      }

      setSize(width, height)
      setPixels(pixels)
      const targetPalette = getSystemPalette(paletteId)
      if (targetPalette) {
        const resolvedColor = resolvePaletteColor(primaryColor, targetPalette)
        setColor(resolvedColor)
        showPaletteRemapToast({
          fromColor: primaryColor,
          toColor: resolvedColor,
          palette: targetPalette,
          t,
        })
      }
      setCurrentPaletteId(paletteId)
      saveHistory()
      setTimeout(() => {
        setActiveTab("used")
        flashUsedTab()
      }, 350)
    },
    [
      setPixels,
      setSize,
      saveHistory,
      setColor,
      primaryColor,
      setUploadOpen,
      setCurrentPaletteId,
      setActiveTab,
      flashUsedTab,
      t,
    ]
  )

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      {showNavbar && (
        <Navbar
          onMenuClick={
            isEditorPage ? () => setSidebarOpen(!sidebarOpen) : undefined
          }
        />
      )}
      <Toaster position="top-right" />
      <main className="relative flex flex-1 flex-col overflow-hidden">
        <Outlet
          context={{
            sidebarOpen,
            setSidebarOpen,
            uploadOpen,
            setUploadOpen,
            exportOpen,
            setExportOpen,
            handleGenerate,
          }}
        />
      </main>
    </div>
  )
}
