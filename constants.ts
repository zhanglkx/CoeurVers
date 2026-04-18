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
