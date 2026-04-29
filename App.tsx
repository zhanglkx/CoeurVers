import { useCallback, useState } from "react"
import { Settings as SettingsIcon } from "lucide-react"
import ShortcutGrid from "./components/ShortcutGrid"
import { ZenClockPanel } from "./components/ZenClockPanel"
import type { AppSettings, Shortcut } from "./types"
import { DEFAULT_SHORTCUTS } from "./lib/default-shortcuts"
import { DEFAULT_SETTINGS, normalizeSettings } from "./lib/settings"
import {
  STORAGE_KEY_BOOKMARK_NAV,
  STORAGE_KEY_SETTINGS,
  STORAGE_KEY_SHORTCUTS,
} from "./lib/storage-keys"
import {
  bookmarkNavStorageCodec,
  settingsStorageCodec,
  shortcutsStorageCodec,
  type BookmarkNavState,
} from "./lib/storage-codecs"
import { useLocalStorageState } from "./hooks/useLocalStorageState"
import { useWallpaperDisplay } from "./hooks/useWallpaperDisplay"
import { useClock } from "./hooks/useClock"
import { useShortcutActions } from "./hooks/useShortcutActions"
import SettingsModal from "./components/SettingsModal"
import { ITAB_LOOSE_PARENT_KEY } from "./lib/shortcuts-tree"

const ZEN_GREETING = "Think Different"

function defaultBookmarkNav(): BookmarkNavState {
  return { activePageId: ITAB_LOOSE_PARENT_KEY, drillFolderIds: [] }
}

function App() {
  const [settings, setSettings] = useLocalStorageState(STORAGE_KEY_SETTINGS, () => DEFAULT_SETTINGS, settingsStorageCodec)
  const [shortcuts, setShortcuts] = useLocalStorageState(STORAGE_KEY_SHORTCUTS, () => DEFAULT_SHORTCUTS, shortcutsStorageCodec)
  const [bookmarkNav, setBookmarkNav] = useLocalStorageState(
    STORAGE_KEY_BOOKMARK_NAV,
    defaultBookmarkNav,
    bookmarkNavStorageCodec,
  )

  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isZenFocus, setIsZenFocus] = useState(true)
  const time = useClock()
  const displayBgUrl = useWallpaperDisplay(settings)

  // 使用 useShortcutActions hook 消除包装函数
  const actions = useShortcutActions(setShortcuts)

  const updateSettings = (newPartial: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...newPartial }))
  }

  const handleBookmarkNavChange = useCallback((next: BookmarkNavState) => {
    setBookmarkNav(next)
  }, [setBookmarkNav])

  const handleImport = (data: { settings: AppSettings; shortcuts: Shortcut[] }) => {
    if (data.settings) setSettings(normalizeSettings(data.settings))
    if (data.shortcuts) setShortcuts(data.shortcuts)
    setBookmarkNav(defaultBookmarkNav())
  }

  const blurPx = settings.blurLevel
  const bgFilter = `blur(${blurPx}px) brightness(0.85)`

  return (
    <div className="relative min-h-dvh h-screen w-full overflow-hidden">
      <div
        className="fixed inset-0 z-0 bg-cover bg-center transition-[filter] duration-500 ease-out"
        style={{
          backgroundImage: `url(${displayBgUrl})`,
          filter: bgFilter,
          transform: "scale(1.06)",
        }}
      />

      <div className="fixed inset-0 z-0 bg-black/25 pointer-events-none" />

      <div className="relative z-10 flex h-dvh min-h-0 max-h-dvh w-full flex-col items-center overflow-hidden px-4">
        <ZenClockPanel
          time={time}
          isZenFocus={isZenFocus}
          greeting={ZEN_GREETING}
          onToggleZen={() => setIsZenFocus((v) => !v)}
        />

        <div
          className={`w-full min-w-0 max-w-[90vw] mx-auto flex justify-center tabliss-zen-ease will-change-[opacity,transform] transition-[opacity,transform] duration-500 ${
            isZenFocus
              ? "pointer-events-none absolute inset-x-4 bottom-10 opacity-0 scale-[0.985] translate-y-3"
              : "relative mt-[20px] mb-[20px] min-h-0 flex-1 overflow-hidden opacity-100 scale-100 translate-y-0"
          }`}
          aria-hidden={isZenFocus}
        >
          <ShortcutGrid
            shortcuts={shortcuts}
            gridConfig={settings.gridConfig}
            bookmarkNav={bookmarkNav}
            onBookmarkNavChange={handleBookmarkNavChange}
            onAddShortcutUnderParent={actions.add}
            onAddRootFolder={actions.addRootFolder}
            onRemoveShortcut={actions.remove}
            onEditShortcut={actions.edit}
            onReorderSiblings={actions.reorderSiblings}
            onMergeSiblings={actions.mergeSiblings}
            onReorderRootFolders={actions.reorderFolders}
          />
        </div>
      </div>

      <div className="fixed top-6 right-6 z-50 flex gap-3 p-2 -m-2 opacity-0 transition-opacity duration-300 hover:opacity-100 focus-within:opacity-100">
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="p-3 rounded-full bg-white/5 hover:bg-white/10 backdrop-blur-md text-white/60 hover:text-white transition-all duration-300 group shadow-lg border border-white/5"
          title="设置"
        >
          <SettingsIcon size={20} className="group-hover:rotate-45 transition-transform duration-500" />
        </button>
      </div>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        shortcuts={shortcuts}
        onUpdateSettings={updateSettings}
        onImport={handleImport}
      />
    </div>
  )
}

export default App
