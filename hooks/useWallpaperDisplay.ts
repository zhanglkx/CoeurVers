import { useState, useEffect, useMemo, useRef } from "react"
import type { AppSettings } from "../types"
import { hasUnsplashApi } from "../constants"
import {
  fetchTablissStyleBackground,
  getEffectiveCuratedWallpaperUrls,
  type BackgroundFetchResult,
} from "../services/background"
import { getCachedWallpaperObjectUrl, putWallpaperBlob, fetchAndCacheWallpaper } from "../services/wallpaper-cache"

export const FALLBACK_BG = "/bg.jpg"

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
    const sec = Math.max(15, settings.wallpaperSlideIntervalSec)
    const id = window.setInterval(() => {
      void fetchTablissStyleBackground().then(setUnsplashBg)
    }, sec * 1000)
    return () => window.clearInterval(id)
  }, [settings.backgroundMode, settings.wallpaperPlayback, settings.wallpaperSlideIntervalSec])

  useEffect(() => {
    if (hasUnsplashApi || settings.backgroundMode !== "unsplash") return
    if (settings.wallpaperPlayback !== "slideshow") return
    const sec = Math.max(15, settings.wallpaperSlideIntervalSec)
    const len = Math.max(1, effectiveCuratedUrls.length)
    const id = window.setInterval(() => {
      setSlideIndex((i) => (i + 1) % len)
    }, sec * 1000)
    return () => window.clearInterval(id)
  }, [settings.backgroundMode, settings.wallpaperPlayback, settings.wallpaperSlideIntervalSec, effectiveCuratedUrls.length])

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

    function applyDisplay(url: string, trackAsBlob: boolean) {
      if (cancelled || loadId !== wallpaperLoadGenRef.current) return
      if (trackAsBlob && url.startsWith("blob:")) {
        revokeWallpaperBlobUrl()
        wallpaperObjectUrlRef.current = url
      }
      setDisplayBgUrl(url)
    }

    void (async () => {
      const cachedObjUrl = await getCachedWallpaperObjectUrl(sourceUrl)
      if (cancelled || loadId !== wallpaperLoadGenRef.current) {
        if (cachedObjUrl) URL.revokeObjectURL(cachedObjUrl)
        return
      }

      if (cachedObjUrl) applyDisplay(cachedObjUrl, true)

      try {
        const blob = await fetchAndCacheWallpaper(sourceUrl)
        if (cancelled || loadId !== wallpaperLoadGenRef.current) return
        void putWallpaperBlob(sourceUrl, blob)
        const freshUrl = URL.createObjectURL(blob)
        if (cancelled || loadId !== wallpaperLoadGenRef.current) {
          URL.revokeObjectURL(freshUrl)
          return
        }
        revokeWallpaperBlobUrl()
        wallpaperObjectUrlRef.current = freshUrl
        setDisplayBgUrl(freshUrl)
      } catch {
        if (cancelled || loadId !== wallpaperLoadGenRef.current) return
        if (!wallpaperObjectUrlRef.current) {
          const img = new Image()
          img.onload = () => applyDisplay(sourceUrl, false)
          img.onerror = () => applyDisplay(FALLBACK_BG, false)
          img.src = sourceUrl
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [resolvedWallpaperUrl])

  return displayBgUrl
}
