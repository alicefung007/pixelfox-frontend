import { useEffect } from "react"

import {
  SITE_DESCRIPTION,
  SITE_KEYWORDS,
  SITE_NAME,
  SITE_TITLE,
  SITE_URL,
  homeJsonLd,
} from "@/components/home/home-data"

const ogImage = `${SITE_URL}logo-large.png`

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

function upsertCanonical(): void {
  let element = document.head.querySelector<HTMLLinkElement>(
    "link[rel='canonical']"
  )

  if (!element) {
    element = document.createElement("link")
    element.rel = "canonical"
    document.head.appendChild(element)
  }

  element.href = SITE_URL
}

export default function HomeSeo() {
  useEffect(() => {
    document.documentElement.lang = "zh-CN"
    document.title = SITE_TITLE

    upsertCanonical()
    upsertMeta("meta[name='description']", {
      name: "description",
      content: SITE_DESCRIPTION,
    })
    upsertMeta("meta[name='keywords']", {
      name: "keywords",
      content: SITE_KEYWORDS,
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
    upsertMeta("meta[property='og:title']", {
      property: "og:title",
      content: SITE_TITLE,
    })
    upsertMeta("meta[property='og:description']", {
      property: "og:description",
      content: SITE_DESCRIPTION,
    })
    upsertMeta("meta[property='og:url']", {
      property: "og:url",
      content: SITE_URL,
    })
    upsertMeta("meta[property='og:image']", {
      property: "og:image",
      content: ogImage,
    })
    upsertMeta("meta[name='twitter:card']", {
      name: "twitter:card",
      content: "summary_large_image",
    })
    upsertMeta("meta[name='twitter:title']", {
      name: "twitter:title",
      content: SITE_TITLE,
    })
    upsertMeta("meta[name='twitter:description']", {
      name: "twitter:description",
      content: SITE_DESCRIPTION,
    })
    upsertMeta("meta[name='twitter:image']", {
      name: "twitter:image",
      content: ogImage,
    })
  }, [])

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(homeJsonLd),
      }}
    />
  )
}
