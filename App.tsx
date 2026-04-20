import { useState } from "react"
import { Settings as SettingsIcon } from "lucide-react"
import ShortcutGrid from "./components/ShortcutGrid"
import { ZenClockPanel } from "./components/ZenClockPanel"
import type { AppSettings, Shortcut } from "./types"
import { DEFAULT_SHORTCUTS } from "./types"
import { DEFAULT_SETTINGS, normalizeSettings } from "./lib/settings"
import { STORAGE_KEY_SETTINGS, STORAGE_KEY_SHORTCUTS } from "./lib/storage-keys"
import { settingsStorageCodec, shortcutsStorageCodec } from "./lib/storage-codecs"
import { useLocalStorageState } from "./hooks/useLocalStorageState"
import { useWallpaperDisplay } from "./hooks/useWallpaperDisplay"
import { useClock } from "./hooks/useClock"
import SettingsModal from "./components/SettingsModal"
import {
  editShortcutInTree,
  reorderRootShortcuts,
  mergeShortcutsAtRoot,
  removeShortcutFromFolder,
  moveShortcutFromFolderToRoot,
} from "./lib/shortcuts-tree"

const ZEN_GREETING = "Think Different"

function App() {
  const [settings, setSettings] = useLocalStorageState(STORAGE_KEY_SETTINGS, () => DEFAULT_SETTINGS, settingsStorageCodec)
  const [shortcuts, setShortcuts] = useLocalStorageState(STORAGE_KEY_SHORTCUTS, () => DEFAULT_SHORTCUTS, shortcutsStorageCodec)

  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isZenFocus, setIsZenFocus] = useState(true)
  const time = useClock()
  const displayBgUrl = useWallpaperDisplay(settings)

  const updateSettings = (newPartial: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...newPartial }))
  }

  const addShortcut = (shortcut: Shortcut) => {
    setShortcuts((prev) => [...prev, shortcut])
  }

  const removeShortcut = (id: string) => {
    setShortcuts((prev) => prev.filter((s) => s.id !== id))
  }

  const editShortcut = (id: string, title: string, url: string, iconPatch?: string | null) => {
    setShortcuts((prev) => editShortcutInTree(prev, id, title, url, iconPatch))
  }

  const handleReorder = (dragId: string, targetId: string) => {
    setShortcuts((prev) => reorderRootShortcuts(prev, dragId, targetId))
  }

  const handleMerge = (dragId: string, dropId: string) => {
    setShortcuts((prev) => mergeShortcutsAtRoot(prev, dragId, dropId))
  }

  const handleRemoveFromFolder = (folderId: string, itemId: string) => {
    setShortcuts((prev) => removeShortcutFromFolder(prev, folderId, itemId))
  }

  const handleMoveToRoot = (folderId: string, itemId: string) => {
    setShortcuts((prev) => moveShortcutFromFolderToRoot(prev, folderId, itemId))
  }

  const handleImport = (data: { settings: AppSettings; shortcuts: Shortcut[] }) => {
    if (data.settings) setSettings(normalizeSettings(data.settings))
    if (data.shortcuts) setShortcuts(data.shortcuts)
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

      <div className="relative z-10 flex min-h-dvh w-full flex-col items-center px-4">
        <ZenClockPanel
          time={time}
          isZenFocus={isZenFocus}
          greeting={ZEN_GREETING}
          onToggleZen={() => setIsZenFocus((v) => !v)}
        />

        <div
          className={`w-full max-w-5xl flex justify-center tabliss-zen-ease will-change-[opacity,transform] transition-[opacity,transform] duration-500 ${
            isZenFocus
              ? "pointer-events-none absolute inset-x-4 bottom-10 opacity-0 scale-[0.985] translate-y-3"
              : "relative mt-8 mb-10 opacity-100 scale-100 translate-y-0"
          }`}
          aria-hidden={isZenFocus}
        >
          <ShortcutGrid
            shortcuts={shortcuts}
            gridConfig={settings.gridConfig}
            openInNewTab={settings.openInNewTab}
            onAddShortcut={addShortcut}
            onRemoveShortcut={removeShortcut}
            onEditShortcut={editShortcut}
            onReorderShortcuts={handleReorder}
            onMergeShortcuts={handleMerge}
            onRemoveFromFolder={handleRemoveFromFolder}
            onMoveToRoot={handleMoveToRoot}
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
