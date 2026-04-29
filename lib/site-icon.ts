/** Resolve a usable favicon / site icon URL for display and storage (img src). */

function normalizePageUrl(input: string): string | null {
  let u = input.trim()
  if (!u) return null
  if (!/^https?:\/\//i.test(u)) u = `https://${u}`
  try {
    const parsed = new URL(u)
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null
    return parsed.href
  } catch {
    return null
  }
}

import { ICON_CHECK_TIMEOUT_MS } from "./app-constants"

function imageLoads(src: string, timeoutMs = ICON_CHECK_TIMEOUT_MS): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image()
    let done = false
    const finish = (ok: boolean) => {
      if (done) return
      done = true
      resolve(ok)
    }
    img.onload = () => finish(true)
    img.onerror = () => finish(false)
    img.src = src
    setTimeout(() => finish(false), timeoutMs)
  })
}

/**
 * Tries direct /favicon.ico, then DuckDuckGo host icon, then Google s2.
 * Returns the first URL that successfully loads as an image.
 */
export async function fetchBestSiteIconUrl(pageUrl: string): Promise<string | null> {
  const href = normalizePageUrl(pageUrl)
  if (!href) return null

  let origin: string
  let host: string
  try {
    const u = new URL(href)
    origin = u.origin
    host = u.hostname
  } catch {
    return null
  }

  const candidates = [
    `${origin}/favicon.ico`,
    `https://icons.duckduckgo.com/ip3/${host}.ico`,
    `https://www.google.com/s2/favicons?sz=128&domain=${encodeURIComponent(host)}`,
  ]

  for (const url of candidates) {
    if (await imageLoads(url)) return url
  }
  return null
}
