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
  "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1920&q=85&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1418065463697-690104d25d30?w=1920&q=85&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=1920&q=85&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1448375240586-882707db888b?w=1920&q=85&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1511497584788-876760111969?w=1920&q=85&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1475924152014-cd46811b7195?w=1920&q=85&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1920&q=85&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1494500764479-0c8f2919a3d8?w=1920&q=85&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1454496522488-7a8e488e8606?w=1920&q=85&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1465188162913-ecd8dcae8412?w=1920&q=85&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1504608524841-42fe6f032b4b?w=1920&q=85&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1518173946687-a4c8892bbd9f?w=1920&q=85&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1483728642387-6c3bdd6c93e5?w=1920&q=85&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?w=1920&q=85&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1505761671935-60b3a7427bad?w=1920&q=85&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?w=1920&q=85&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1433838552652-f9a46b332c40?w=1920&q=85&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1523712999610-f77fbcfc3843?w=1920&q=85&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=1920&q=85&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=1920&q=85&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1495616811223-4d98c6e9c869?w=1920&q=85&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1505765050516-f72dcac9d60b?w=1920&q=85&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1519682337058-a94d519337bc?w=1920&q=85&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1482192505345-5655af888cc4?w=1920&q=85&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1920&q=85&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1505142468610-359e7d316be0?w=1920&q=85&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1526772662000-3f88f10405ff?w=1920&q=85&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=1920&q=85&auto=format&fit=crop",
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
