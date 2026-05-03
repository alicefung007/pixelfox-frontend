import i18n from "i18next"
import { initReactI18next } from "react-i18next"
import en from "./locales/en.json"
import zh from "./locales/zh.json"
import ko from "./locales/ko.json"
import ja from "./locales/ja.json"

const supportedLanguages = ["en", "zh", "ko", "ja"] as const
type SupportedLanguage = (typeof supportedLanguages)[number]

function isSupportedLanguage(value: string | null): value is SupportedLanguage {
  return supportedLanguages.includes(value as SupportedLanguage)
}

function normalizeLanguage(value: string | null): SupportedLanguage | null {
  const normalizedLanguage = value?.toLowerCase().split("-")[0] ?? null

  if (isSupportedLanguage(normalizedLanguage)) {
    return normalizedLanguage
  }

  return null
}

function getSavedLanguage(): string | null {
  try {
    return localStorage.getItem("i18nextLng")
  } catch {
    return null
  }
}

function getInitialLanguage(): SupportedLanguage {
  const urlLanguage = normalizeLanguage(
    new URLSearchParams(window.location.search).get("lng")
  )
  if (urlLanguage) {
    return urlLanguage
  }

  const savedLanguage = normalizeLanguage(getSavedLanguage())
  if (savedLanguage) {
    return savedLanguage
  }

  return "en"
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    zh: { translation: zh },
    ko: { translation: ko },
    ja: { translation: ja },
  },
  lng: getInitialLanguage(),
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
})

i18n.on("languageChanged", (lng) => {
  try {
    localStorage.setItem("i18nextLng", lng)
  } catch {
    // Ignore storage failures so language switching still works in memory.
  }
})

export default i18n
