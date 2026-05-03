import { useEffect } from "react"
import { useTranslation } from "react-i18next"

import { SITE_NAME, SITE_URL } from "@/components/home/home-data"

const ogImage = `${SITE_URL}logo-large.png`
const jsonLdId = "pixelfox-home-jsonld"

const languageMeta: Record<string, { lang: string; ogLocale: string }> = {
  en: { lang: "en", ogLocale: "en_US" },
  zh: { lang: "zh-CN", ogLocale: "zh_CN" },
  ja: { lang: "ja", ogLocale: "ja_JP" },
  ko: { lang: "ko", ogLocale: "ko_KR" },
}

const homeLanguages = Object.keys(languageMeta)

function localizedHomeUrl(lng: string): string {
  const url = new URL(SITE_URL)
  url.searchParams.set("lng", lng)
  return url.toString()
}

function upsertMeta(
  selector: string,
  attributes: Record<string, string>
): void {
  let element = document.head.querySelector<HTMLMetaElement>(selector)

  if (!element) {
    element = document.createElement("meta")
    document.head.appendChild(element)
  }

  Object.entries(attributes).forEach(([key, value]) => {
    element.setAttribute(key, value)
  })
}

function upsertLink(
  selector: string,
  attributes: Record<string, string>
): void {
  let element = document.head.querySelector<HTMLLinkElement>(selector)

  if (!element) {
    element = document.createElement("link")
    document.head.appendChild(element)
  }

  Object.entries(attributes).forEach(([key, value]) => {
    element.setAttribute(key, value)
  })
}

function upsertCanonical(href: string): void {
  let element = document.head.querySelector<HTMLLinkElement>(
    "link[rel='canonical']"
  )

  if (!element) {
    element = document.createElement("link")
    element.rel = "canonical"
    document.head.appendChild(element)
  }

  element.setAttribute("href", href)
}

function upsertLanguageAlternates(): void {
  homeLanguages.forEach((lng) => {
    const meta = languageMeta[lng]
    upsertLink(`link[rel='alternate'][hreflang='${meta.lang}']`, {
      rel: "alternate",
      hreflang: meta.lang,
      href: localizedHomeUrl(lng),
    })
  })
  upsertLink("link[rel='alternate'][hreflang='x-default']", {
    rel: "alternate",
    hreflang: "x-default",
    href: SITE_URL,
  })
}

function upsertOgLocaleAlternates(currentLocale: string): void {
  document
    .querySelectorAll<HTMLMetaElement>("meta[property='og:locale:alternate']")
    .forEach((element) => element.remove())

  homeLanguages
    .map((lng) => languageMeta[lng].ogLocale)
    .filter((locale) => locale !== currentLocale)
    .forEach((locale) => {
      const element = document.createElement("meta")
      element.setAttribute("property", "og:locale:alternate")
      element.setAttribute("content", locale)
      document.head.appendChild(element)
    })
}

function upsertTitle(title: string): void {
  let element = document.head.querySelector<HTMLTitleElement>("title")

  if (!element) {
    element = document.createElement("title")
    document.head.appendChild(element)
  }

  element.replaceChildren(title)
}

function upsertJsonLd(content: string): void {
  let element = document.getElementById(jsonLdId) as HTMLScriptElement | null

  if (!element) {
    element = document.createElement("script")
    element.id = jsonLdId
    element.type = "application/ld+json"
    document.head.appendChild(element)
  }

  element.replaceChildren(content)
}

export default function HomeSeo() {
  const { t, i18n } = useTranslation()
  const currentLanguage = languageMeta[i18n.language] ? i18n.language : "en"
  const meta = languageMeta[currentLanguage]
  const currentUrl = localizedHomeUrl(currentLanguage)
  const title = t("home.seo.title")
  const description = t("home.seo.description")
  const keywords = t("home.seo.keywords")
  const imageAlt = t("home.seo.imageAlt")
  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: SITE_NAME,
    url: currentUrl,
    applicationCategory: "DesignApplication",
    operatingSystem: "Web",
    description,
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
  })

  useEffect(() => {
    document.documentElement.setAttribute("lang", meta.lang)
    upsertTitle(title)

    upsertCanonical(currentUrl)
    upsertLanguageAlternates()
    upsertMeta("meta[name='description']", {
      name: "description",
      content: description,
    })
    upsertMeta("meta[name='keywords']", {
      name: "keywords",
      content: keywords,
    })
    upsertMeta("meta[name='robots']", {
      name: "robots",
      content: "index, follow, max-image-preview:large, max-snippet:-1",
    })
    upsertMeta("meta[property='og:type']", {
      property: "og:type",
      content: "website",
    })
    upsertMeta("meta[property='og:site_name']", {
      property: "og:site_name",
      content: SITE_NAME,
    })
    upsertMeta("meta[property='og:locale']", {
      property: "og:locale",
      content: meta.ogLocale,
    })
    upsertOgLocaleAlternates(meta.ogLocale)
    upsertMeta("meta[property='og:title']", {
      property: "og:title",
      content: title,
    })
    upsertMeta("meta[property='og:description']", {
      property: "og:description",
      content: description,
    })
    upsertMeta("meta[property='og:url']", {
      property: "og:url",
      content: currentUrl,
    })
    upsertMeta("meta[property='og:image']", {
      property: "og:image",
      content: ogImage,
    })
    upsertMeta("meta[property='og:image:alt']", {
      property: "og:image:alt",
      content: imageAlt,
    })
    upsertMeta("meta[name='twitter:card']", {
      name: "twitter:card",
      content: "summary_large_image",
    })
    upsertMeta("meta[name='twitter:title']", {
      name: "twitter:title",
      content: title,
    })
    upsertMeta("meta[name='twitter:description']", {
      name: "twitter:description",
      content: description,
    })
    upsertMeta("meta[name='twitter:image']", {
      name: "twitter:image",
      content: ogImage,
    })
    upsertJsonLd(jsonLd)
  }, [
    currentUrl,
    description,
    imageAlt,
    keywords,
    jsonLd,
    meta.lang,
    meta.ogLocale,
    title,
  ])

  return null
}
