import { useState, useEffect, useMemo, useRef } from "react"
import type { AppSettings } from "../types"
import { hasUnsplashApi } from "../constants"
import {
  fetchTablissStyleBackground,
  getEffectiveCuratedWallpaperUrls,
  type BackgroundFetchResult,
} from "../services/background"
import { getCachedWallpaperObjectUrl, putWallpaperBlob, fetchAndCacheWallpaper } from "../services/wallpaper-cache"

export const FALLBACK_BG = "/wallpaper-fallback.jpeg"

const SLIDESHOW_MIN_INTERVAL_SEC = 15

export function useWallpaperDisplay(settings: AppSettings) {
  const [unsplashBg, setUnsplashBg] = useState<BackgroundFetchResult | null>(null)
  const [slideIndex, setSlideIndex] = useState(0)
  const [displayBgUrl, setDisplayBgUrl] = useState(FALLBACK_BG)
  const wallpaperLoadGenRef = useRef(0)
  const wallpaperObjectUrlRef = useRef<string | null>(null)

  const effectiveCuratedUrls = useMemo(
    () => getEffectiveCuratedWallpaperUrls(settings.wallpaperFavoriteUrls),
    [settings.wallpaperFavoriteUrls],
  )

  const curatedWallpaperUrl = useMemo(() => {
    const list = effectiveCuratedUrls
    if (list.length === 0) return FALLBACK_BG
    if (settings.wallpaperPlayback === "fixed") return list[settings.wallpaperFixedIndex % list.length]
    return list[slideIndex % list.length]
  }, [effectiveCuratedUrls, settings.wallpaperPlayback, settings.wallpaperFixedIndex, slideIndex])

  const resolvedWallpaperUrl = useMemo(() => {
    if (settings.backgroundMode === "upload" && settings.backgroundImage) return settings.backgroundImage
    if (settings.backgroundMode !== "unsplash") return FALLBACK_BG
    if (hasUnsplashApi) return unsplashBg?.imageUrl ?? FALLBACK_BG
    return curatedWallpaperUrl
  }, [settings.backgroundMode, settings.backgroundImage, unsplashBg, curatedWallpaperUrl])

  const slideshowIntervalMs = useMemo(
    () => Math.max(SLIDESHOW_MIN_INTERVAL_SEC, settings.wallpaperSlideIntervalSec) * 1000,
    [settings.wallpaperSlideIntervalSec],
  )

  useEffect(() => {
    if (!hasUnsplashApi || settings.backgroundMode !== "unsplash") return
    let cancelled = false
    void (async () => {
      const result = await fetchTablissStyleBackground()
      if (!cancelled) setUnsplashBg(result)
    })()
    return () => {
      cancelled = true
    }
  }, [settings.backgroundMode])

  useEffect(() => {
    if (!hasUnsplashApi || settings.backgroundMode !== "unsplash") return
    if (settings.wallpaperPlayback !== "slideshow") return
    const id = window.setInterval(() => {
      void fetchTablissStyleBackground().then(setUnsplashBg)
    }, slideshowIntervalMs)
    return () => window.clearInterval(id)
  }, [settings.backgroundMode, settings.wallpaperPlayback, slideshowIntervalMs])

  useEffect(() => {
    if (hasUnsplashApi || settings.backgroundMode !== "unsplash") return
    if (settings.wallpaperPlayback !== "slideshow") return
    const len = Math.max(1, effectiveCuratedUrls.length)
    const id = window.setInterval(() => {
      setSlideIndex((i) => (i + 1) % len)
    }, slideshowIntervalMs)
    return () => window.clearInterval(id)
  }, [settings.backgroundMode, settings.wallpaperPlayback, slideshowIntervalMs, effectiveCuratedUrls.length])

  useEffect(() => {
    if (hasUnsplashApi || settings.backgroundMode !== "unsplash") return
    if (settings.wallpaperPlayback !== "slideshow") return
    setSlideIndex(0)
  }, [settings.wallpaperFavoriteUrls.join("|"), settings.wallpaperPlayback, settings.backgroundMode])

  function revokeWallpaperBlobUrl() {
    const u = wallpaperObjectUrlRef.current
    if (u?.startsWith("blob:")) URL.revokeObjectURL(u)
    wallpaperObjectUrlRef.current = null
  }

  useEffect(() => {
    return () => revokeWallpaperBlobUrl()
  }, [])

  useEffect(() => {
    const sourceUrl = resolvedWallpaperUrl
    if (!sourceUrl) return

    if (sourceUrl.startsWith("data:")) {
      revokeWallpaperBlobUrl()
      setDisplayBgUrl(sourceUrl)
      return
    }

    const loadId = ++wallpaperLoadGenRef.current
    let cancelled = false
    const isStale = () => cancelled || loadId !== wallpaperLoadGenRef.current

    function commitDisplay(url: string, trackBlob: boolean) {
      if (isStale()) return
      if (trackBlob && url.startsWith("blob:")) {
        revokeWallpaperBlobUrl()
        wallpaperObjectUrlRef.current = url
      }
      setDisplayBgUrl(url)
    }

    void (async () => {
      const cached = await getCachedWallpaperObjectUrl(sourceUrl)
      if (isStale()) {
        if (cached) URL.revokeObjectURL(cached)
        return
      }
      if (cached) commitDisplay(cached, true)

      try {
        const blob = await fetchAndCacheWallpaper(sourceUrl)
        if (isStale()) return
        void putWallpaperBlob(sourceUrl, blob)
        const freshUrl = URL.createObjectURL(blob)
        if (isStale()) {
          URL.revokeObjectURL(freshUrl)
          return
        }
        revokeWallpaperBlobUrl()
        wallpaperObjectUrlRef.current = freshUrl
        setDisplayBgUrl(freshUrl)
      } catch {
        if (isStale() || wallpaperObjectUrlRef.current) return
        const img = new Image()
        img.onload = () => commitDisplay(sourceUrl, false)
        img.onerror = () => commitDisplay(FALLBACK_BG, false)
        img.src = sourceUrl
      }
    })()

    return () => {
      cancelled = true
    }
  }, [resolvedWallpaperUrl])

  return displayBgUrl
}
