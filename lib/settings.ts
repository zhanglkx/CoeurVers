import type { AppSettings } from "../types"
import { filterToCuratedFavorites } from "../services/background"

export const DEFAULT_SETTINGS: AppSettings = {
  backgroundMode: "unsplash",
  backgroundImage: null,
  wallpaperPlayback: "fixed",
  wallpaperSlideIntervalSec: 60,
  wallpaperFavoriteUrls: [],
  wallpaperFixedIndex: 0,
  blurLevel: 1,
  gridConfig: { rows: 4, cols: 10, iconSize: 54, gapX: 16, gapY: 16 },
  openInNewTab: true,
}

export function normalizeSettings(raw: unknown): AppSettings {
  const r = raw as Partial<AppSettings> | null
  if (!r || typeof r !== "object") return { ...DEFAULT_SETTINGS }

  const grid = r.gridConfig && typeof r.gridConfig === "object" ? r.gridConfig : {}
  const g = grid as AppSettings["gridConfig"]

  const rawFav = Array.isArray(r.wallpaperFavoriteUrls) ? r.wallpaperFavoriteUrls : []
  const slideSec =
    typeof r.wallpaperSlideIntervalSec === "number" && Number.isFinite(r.wallpaperSlideIntervalSec)
      ? Math.min(600, Math.max(15, Math.round(r.wallpaperSlideIntervalSec)))
      : DEFAULT_SETTINGS.wallpaperSlideIntervalSec

  return {
    backgroundMode: r.backgroundMode === "upload" ? "upload" : "unsplash",
    backgroundImage: typeof r.backgroundImage === "string" ? r.backgroundImage : null,
    wallpaperPlayback: r.wallpaperPlayback === "slideshow" ? "slideshow" : "fixed",
    wallpaperSlideIntervalSec: slideSec,
    wallpaperFavoriteUrls: filterToCuratedFavorites(rawFav.filter((u): u is string => typeof u === "string")),
    wallpaperFixedIndex:
      typeof r.wallpaperFixedIndex === "number" && r.wallpaperFixedIndex >= 0
        ? Math.floor(r.wallpaperFixedIndex)
        : DEFAULT_SETTINGS.wallpaperFixedIndex,
    blurLevel: typeof r.blurLevel === "number" ? r.blurLevel : DEFAULT_SETTINGS.blurLevel,
    gridConfig: {
      rows: typeof g.rows === "number" ? g.rows : DEFAULT_SETTINGS.gridConfig.rows,
      cols: typeof g.cols === "number" ? g.cols : DEFAULT_SETTINGS.gridConfig.cols,
      iconSize: typeof g.iconSize === "number" ? g.iconSize : DEFAULT_SETTINGS.gridConfig.iconSize,
      gapX: typeof g.gapX === "number" ? g.gapX : DEFAULT_SETTINGS.gridConfig.gapX,
      gapY: typeof g.gapY === "number" ? g.gapY : DEFAULT_SETTINGS.gridConfig.gapY,
    },
    openInNewTab: typeof r.openInNewTab === "boolean" ? r.openInNewTab : DEFAULT_SETTINGS.openInNewTab,
  }
}
