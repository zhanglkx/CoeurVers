export type BackgroundMode = "unsplash" | "upload"

/** Curated gallery: one wallpaper vs rotate through selection */
export type WallpaperPlayback = "fixed" | "slideshow"

export interface Shortcut {
  id: string
  title: string
  url: string
  icon?: string
  iconBgColor?: string
  type?: "link" | "folder"
  children?: Shortcut[]
}

export interface GridConfig {
  rows: number
  cols: number
  iconSize: number
  gapX: number
  gapY: number
}

export interface AppSettings {
  /** Tabliss-style Unsplash rotation vs user upload */
  backgroundMode: BackgroundMode
  /** Custom image (data URL or remote) when backgroundMode === 'upload' */
  backgroundImage: string | null
  /** Unsplash curated gallery: stay on one pick or slideshow */
  wallpaperPlayback: WallpaperPlayback
  /** Slideshow interval (seconds), min 15 in UI */
  wallpaperSlideIntervalSec: number
  /** Subset of curated URLs; empty means “use full gallery” */
  wallpaperFavoriteUrls: string[]
  /** Index into effective gallery list when playback is fixed */
  wallpaperFixedIndex: number
  blurLevel: number
  gridConfig: GridConfig
}
