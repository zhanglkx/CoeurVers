/**
 * Tabliss-style backgrounds: Unsplash random when API key is set,
 * otherwise curated landscape URLs (user can pick favorites + slideshow).
 */

const UNSPLASH_RANDOM_ENDPOINT = "https://api.unsplash.com/photos/random"

/** Landscape photos — stable images.unsplash.com URLs (similar to Tabliss curation). */
export const CURATED_WALLPAPER_URLS: readonly string[] = [
  "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=85&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=1920&q=85&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1920&q=85&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1920&q=85&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1920&q=85&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1433086966358-54859d0ed716?w=1920&q=85&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=1920&q=85&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1920&q=85&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=1920&q=85&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=1920&q=85&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1920&q=85&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1920&q=85&auto=format&fit=crop",
] as const

export const CURATED_WALLPAPER_ITEMS: { id: string; url: string }[] = CURATED_WALLPAPER_URLS.map((url, i) => ({
  id: `curated-${i}`,
  url,
}))

export const CURATED_URL_SET: ReadonlySet<string> = new Set(CURATED_WALLPAPER_URLS)

export function filterToCuratedFavorites(urls: string[]): string[] {
  return urls.filter((u) => typeof u === "string" && CURATED_URL_SET.has(u))
}

export interface BackgroundFetchResult {
  imageUrl: string
  creditLabel: string | null
  creditLink: string | null
}

function pickCuratedUrl(): BackgroundFetchResult {
  const i = Math.floor(Math.random() * CURATED_WALLPAPER_URLS.length)
  const imageUrl = CURATED_WALLPAPER_URLS[i]
  return {
    imageUrl,
    creditLabel: "Unsplash",
    creditLink: "https://unsplash.com/?utm_source=coeurvers&utm_medium=referral",
  }
}

export const CURATED_ATTRIBUTION: Pick<BackgroundFetchResult, "creditLabel" | "creditLink"> = {
  creditLabel: "Unsplash",
  creditLink: "https://unsplash.com/?utm_source=coeurvers&utm_medium=referral",
}

export async function fetchTablissStyleBackground(): Promise<BackgroundFetchResult> {
  const accessKey = import.meta.env.VITE_UNSPLASH_ACCESS_KEY as string | undefined
  if (!accessKey?.trim()) return pickCuratedUrl()

  try {
    const params = new URLSearchParams({
      orientation: "landscape",
      content_filter: "high",
    })
    const res = await fetch(`${UNSPLASH_RANDOM_ENDPOINT}?${params}`, {
      headers: { Authorization: `Client-ID ${accessKey.trim()}` },
    })
    if (!res.ok) return pickCuratedUrl()

    const data = (await res.json()) as {
      urls?: { raw?: string; regular?: string }
      user?: { name?: string; links?: { html?: string } }
      links?: { html?: string }
    }

    const raw = data.urls?.raw
    const regular = data.urls?.regular
    const imageUrl = raw
      ? `${raw}&w=1920&q=85&auto=format&fit=crop`
      : regular || pickCuratedUrl().imageUrl

    const name = data.user?.name
    const profile = data.user?.links?.html
    const photoPage = data.links?.html

    return {
      imageUrl,
      creditLabel: name ? `${name} / Unsplash` : "Unsplash",
      creditLink: photoPage || profile || "https://unsplash.com/?utm_source=coeurvers&utm_medium=referral",
    }
  } catch {
    return pickCuratedUrl()
  }
}
