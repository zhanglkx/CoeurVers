/** True when VITE_UNSPLASH_ACCESS_KEY is set (Tabliss-style random Unsplash). */
export const hasUnsplashApi = Boolean(String(import.meta.env.VITE_UNSPLASH_ACCESS_KEY ?? "").trim())

/**
 * 从任意 URL 推导出 /favicon.ico 的地址，失败时返回空字符串
 */
export const getFaviconUrl = (url: string): string => {
  try {
    const urlObj = new URL(url)
    return `${urlObj.protocol}//${urlObj.host}/favicon.ico`
  } catch {
    return ""
  }
}
