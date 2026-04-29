import { useState, useEffect, useMemo, useRef } from "react"
import type { AppSettings } from "../types"
import { hasUnsplashApi } from "../constants"
import { WALLPAPER_MIN_INTERVAL_SEC } from "../lib/app-constants"
import {
  fetchTablissStyleBackground,
  getEffectiveCuratedWallpaperUrls,
  type BackgroundFetchResult,
} from "../services/background"
import { getCachedWallpaperObjectUrl, putWallpaperBlob, fetchAndCacheWallpaper } from "../services/wallpaper-cache"

export const FALLBACK_BG = "/wallpaper-fallback.jpeg"

/**
 * 壁纸状态机
 * 更优雅的方式来管理不同的壁纸模式
 */
type WallpaperState =
  | { mode: "upload"; image: string }
  | { mode: "unsplash-fixed" }
  | { mode: "unsplash-slide"; intervalMs: number }
  | { mode: "curated-fixed"; index: number; urls: string[] }
  | { mode: "curated-slide"; intervalMs: number; urls: string[] }

/**
 * 仅挑选与壁纸相关的 settings 字段，避免无关字段（如 blurLevel）变化触发重算
 */
interface WallpaperDeps {
  backgroundMode: AppSettings["backgroundMode"]
  backgroundImage: AppSettings["backgroundImage"]
  wallpaperPlayback: AppSettings["wallpaperPlayback"]
  wallpaperSlideIntervalSec: AppSettings["wallpaperSlideIntervalSec"]
  wallpaperFixedIndex: AppSettings["wallpaperFixedIndex"]
}

/**
 * 根据设置推导壁纸状态（纯函数，不依赖 slideIndex）
 */
function deriveWallpaperState(
  deps: WallpaperDeps,
  effectiveCuratedUrls: string[],
): WallpaperState {
  if (deps.backgroundMode === "upload" && deps.backgroundImage) {
    return { mode: "upload", image: deps.backgroundImage }
  }

  if (deps.backgroundMode === "unsplash") {
    const intervalMs = Math.max(WALLPAPER_MIN_INTERVAL_SEC, deps.wallpaperSlideIntervalSec) * 1000

    if (hasUnsplashApi) {
      return deps.wallpaperPlayback === "slideshow"
        ? { mode: "unsplash-slide", intervalMs }
        : { mode: "unsplash-fixed" }
    }
    return deps.wallpaperPlayback === "slideshow"
      ? { mode: "curated-slide", intervalMs, urls: effectiveCuratedUrls }
      : { mode: "curated-fixed", index: deps.wallpaperFixedIndex, urls: effectiveCuratedUrls }
  }

  return { mode: "upload", image: FALLBACK_BG }
}

/**
 * 解析当前应该显示的壁纸 URL
 */
function resolveWallpaperUrl(
  state: WallpaperState,
  unsplashBg: BackgroundFetchResult | null,
  slideIndex: number,
): string {
  switch (state.mode) {
    case "upload":
      return state.image

    case "unsplash-fixed":
    case "unsplash-slide":
      return unsplashBg?.imageUrl ?? FALLBACK_BG

    case "curated-fixed":
      if (state.urls.length === 0) return FALLBACK_BG
      return state.urls[state.index % state.urls.length]

    case "curated-slide":
      if (state.urls.length === 0) return FALLBACK_BG
      return state.urls[slideIndex % state.urls.length]
  }
}

/**
 * useWallpaperDisplay Hook
 * 使用状态机模式重构，更清晰易懂
 */
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

  // 精细化依赖：只取壁纸相关的字段，避免无关 settings 变化引起重算
  const wallpaperState = useMemo(
    () =>
      deriveWallpaperState(
        {
          backgroundMode: settings.backgroundMode,
          backgroundImage: settings.backgroundImage,
          wallpaperPlayback: settings.wallpaperPlayback,
          wallpaperSlideIntervalSec: settings.wallpaperSlideIntervalSec,
          wallpaperFixedIndex: settings.wallpaperFixedIndex,
        },
        effectiveCuratedUrls,
      ),
    [
      settings.backgroundMode,
      settings.backgroundImage,
      settings.wallpaperPlayback,
      settings.wallpaperSlideIntervalSec,
      settings.wallpaperFixedIndex,
      effectiveCuratedUrls,
    ],
  )

  const resolvedWallpaperUrl = useMemo(
    () => resolveWallpaperUrl(wallpaperState, unsplashBg, slideIndex),
    [wallpaperState, unsplashBg, slideIndex],
  )

  // Unsplash 首次加载（有 API 时）
  useEffect(() => {
    if (wallpaperState.mode !== "unsplash-fixed" && wallpaperState.mode !== "unsplash-slide") return
    if (unsplashBg) return
    let cancelled = false
    void (async () => {
      const result = await fetchTablissStyleBackground()
      if (!cancelled) setUnsplashBg(result)
    })()
    return () => {
      cancelled = true
    }
  }, [wallpaperState.mode, unsplashBg])

  // Unsplash 轮播：仅依赖 intervalMs，不被 slideIndex 重建
  useEffect(() => {
    if (wallpaperState.mode !== "unsplash-slide") return
    const intervalMs = wallpaperState.intervalMs
    const id = window.setInterval(() => {
      void fetchTablissStyleBackground().then(setUnsplashBg)
    }, intervalMs)
    return () => window.clearInterval(id)
  }, [wallpaperState.mode, wallpaperState.mode === "unsplash-slide" ? wallpaperState.intervalMs : 0])

  // Curated 轮播：仅依赖 intervalMs + urls.length，不被 slideIndex 重建
  const curatedSlideIntervalMs = wallpaperState.mode === "curated-slide" ? wallpaperState.intervalMs : 0
  const curatedSlideLen = wallpaperState.mode === "curated-slide" ? wallpaperState.urls.length : 0
  useEffect(() => {
    if (wallpaperState.mode !== "curated-slide") return
    const len = Math.max(1, curatedSlideLen)
    const id = window.setInterval(() => {
      setSlideIndex((i) => (i + 1) % len)
    }, curatedSlideIntervalMs)
    return () => window.clearInterval(id)
  }, [wallpaperState.mode, curatedSlideIntervalMs, curatedSlideLen])

  // 精选收藏变化时，重置轮播索引；超界时也钳回
  useEffect(() => {
    if (curatedSlideLen === 0) return
    setSlideIndex((i) => (i >= curatedSlideLen ? 0 : i))
  }, [curatedSlideLen])

  // Blob URL 清理
  function revokeWallpaperBlobUrl() {
    const u = wallpaperObjectUrlRef.current
    if (u?.startsWith("blob:")) URL.revokeObjectURL(u)
    wallpaperObjectUrlRef.current = null
  }

  useEffect(() => {
    return () => revokeWallpaperBlobUrl()
  }, [])

  // 壁纸加载和缓存
  useEffect(() => {
    const sourceUrl = resolvedWallpaperUrl
    if (!sourceUrl) return

    // Data URL 直接显示
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
      // 1. 尝试从缓存加载
      const cached = await getCachedWallpaperObjectUrl(sourceUrl)
      if (isStale()) {
        if (cached) URL.revokeObjectURL(cached)
        return
      }
      if (cached) commitDisplay(cached, true)

      // 2. 网络加载
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
        // 3. 降级：直接使用 URL（不缓存）
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
