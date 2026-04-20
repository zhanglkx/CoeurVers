import type { AppSettings, Shortcut } from "../types"
import { ITAB_LOOSE_PARENT_KEY } from "./shortcuts-tree"
import { normalizeSettings } from "./settings"

export interface BookmarkNavState {
  activePageId: string
  drillFolderIds: string[]
}

export const settingsStorageCodec = {
  parse: (raw: string): AppSettings => normalizeSettings(JSON.parse(raw)),
  serialize: (v: AppSettings) => JSON.stringify(v),
}

export const shortcutsStorageCodec = {
  parse: (raw: string): Shortcut[] => JSON.parse(raw) as Shortcut[],
  serialize: (v: Shortcut[]) => JSON.stringify(v),
}

function defaultBookmarkNav(): BookmarkNavState {
  return { activePageId: ITAB_LOOSE_PARENT_KEY, drillFolderIds: [] }
}

export const bookmarkNavStorageCodec = {
  parse: (raw: string): BookmarkNavState => {
    try {
      const o = JSON.parse(raw) as Partial<BookmarkNavState>
      return {
        activePageId: typeof o.activePageId === "string" ? o.activePageId : ITAB_LOOSE_PARENT_KEY,
        drillFolderIds: Array.isArray(o.drillFolderIds)
          ? o.drillFolderIds.filter((x): x is string => typeof x === "string")
          : [],
      }
    } catch {
      return defaultBookmarkNav()
    }
  },
  serialize: (v: BookmarkNavState) => JSON.stringify(v),
}
