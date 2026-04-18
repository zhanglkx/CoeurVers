/** True when VITE_UNSPLASH_ACCESS_KEY is set (Tabliss-style random Unsplash). */
export const hasUnsplashApi = Boolean(String(import.meta.env.VITE_UNSPLASH_ACCESS_KEY ?? "").trim())

export const getFaviconUrl = (url: string): string => {
  try {
    const urlObj = new URL(url)
    return `${urlObj.protocol}//${urlObj.host}/favicon.ico`
  } catch {
    return ""
  }
}

export const checkFaviconExists = async (url: string): Promise<boolean> => {
  try {
    const faviconUrl = getFaviconUrl(url)
    if (!faviconUrl) return false

    return new Promise<boolean>((resolve) => {
      const img = new Image()

      img.onload = () => resolve(true)
      img.onerror = () => resolve(false)
      img.src = faviconUrl
      setTimeout(() => resolve(false), 3000)
    })
  } catch {
    return false
  }
}
