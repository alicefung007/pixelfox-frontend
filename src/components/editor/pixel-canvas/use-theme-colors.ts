import { useEffect, useState } from "react"
import { useTheme } from "@/components/theme-provider"

export function useThemeColors() {
  const { theme } = useTheme()
  const [systemTheme, setSystemTheme] = useState<"dark" | "light">(() => {
    if (typeof window === "undefined" || !("matchMedia" in window))
      return "light"
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light"
  })
  const [primaryThemeColor, setPrimaryThemeColor] = useState(
    "oklch(0.68 0.19 48)"
  )

  useEffect(() => {
    if (theme !== "system") return
    if (!("matchMedia" in window)) return
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
    const handleChange = () =>
      setSystemTheme(mediaQuery.matches ? "dark" : "light")
    handleChange()
    mediaQuery.addEventListener("change", handleChange)
    return () => mediaQuery.removeEventListener("change", handleChange)
  }, [theme])

  useEffect(() => {
    if (typeof window === "undefined") return
    const nextPrimary = getComputedStyle(document.documentElement)
      .getPropertyValue("--primary")
      .trim()
    if (nextPrimary) queueMicrotask(() => setPrimaryThemeColor(nextPrimary))
  }, [theme, systemTheme])

  return { theme, systemTheme, primaryThemeColor }
}
