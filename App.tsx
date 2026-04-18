import { useState, useEffect, useMemo, useRef } from "react";
import { Settings as SettingsIcon } from "lucide-react";
import ShortcutGrid from "./components/ShortcutGrid";
import { AppSettings, Shortcut, DEFAULT_SHORTCUTS } from "./types";
import { ToolsPanel } from "./tools";
import SettingsModal from "./components/SettingsModal";
import { fetchTablissStyleBackground, CURATED_WALLPAPER_URLS, filterToCuratedFavorites } from "./services/background";
import { getCachedWallpaperObjectUrl, putWallpaperBlob, fetchAndCacheWallpaper } from "./services/wallpaper-cache";

const STORAGE_KEY = "aerotab_settings";
const SHORTCUTS_KEY = "aerotab_shortcuts";
const NOTES_KEY = "CoeurVers_notes";

const FALLBACK_BG = "/bg.jpg";

const HAS_UNSPLASH_API = Boolean(String(import.meta.env.VITE_UNSPLASH_ACCESS_KEY ?? "").trim());

interface Note {
  id: string;
  title: string;
  content: string;
  updatedAt: number;
}

const DEFAULT_SETTINGS: AppSettings = {
  backgroundMode: "unsplash",
  backgroundImage: null,
  wallpaperPlayback: "fixed",
  wallpaperSlideIntervalSec: 60,
  wallpaperFavoriteUrls: [],
  wallpaperFixedIndex: 0,
  blurLevel: 1,
  gridConfig: { rows: 4, cols: 8, iconSize: 84, gapX: 0, gapY: 0 },
  openInNewTab: true,
};

function normalizeSettings(raw: unknown): AppSettings {
  const r = raw as Partial<AppSettings> | null;
  if (!r || typeof r !== "object") return { ...DEFAULT_SETTINGS };

  const grid = r.gridConfig && typeof r.gridConfig === "object" ? r.gridConfig : {};
  const g = grid as AppSettings["gridConfig"];

  const rawFav = Array.isArray(r.wallpaperFavoriteUrls) ? r.wallpaperFavoriteUrls : [];
  const slideSec =
    typeof r.wallpaperSlideIntervalSec === "number" && Number.isFinite(r.wallpaperSlideIntervalSec)
      ? Math.min(600, Math.max(15, Math.round(r.wallpaperSlideIntervalSec)))
      : DEFAULT_SETTINGS.wallpaperSlideIntervalSec;

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
  };
}

function App() {
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return DEFAULT_SETTINGS;
    try {
      return normalizeSettings(JSON.parse(saved));
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  const [shortcuts, setShortcuts] = useState<Shortcut[]>(() => {
    const saved = localStorage.getItem(SHORTCUTS_KEY);
    return saved ? JSON.parse(saved) : DEFAULT_SHORTCUTS;
  });

  const [notes, setNotes] = useState<Note[]>(() => {
    const saved = localStorage.getItem(NOTES_KEY);
    return saved ? JSON.parse(saved) : [];
  });

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [time, setTime] = useState(() => new Date());
  const [isZenFocus, setIsZenFocus] = useState(true);

  const [unsplashBg, setUnsplashBg] = useState<{ imageUrl: string; creditLabel: string | null; creditLink: string | null } | null>(null);
  const [slideIndex, setSlideIndex] = useState(0);
  const [displayBgUrl, setDisplayBgUrl] = useState(FALLBACK_BG);
  const wallpaperLoadGenRef = useRef(0);
  const wallpaperObjectUrlRef = useRef<string | null>(null);

  const effectiveCuratedUrls = useMemo(() => {
    const fav = settings.wallpaperFavoriteUrls;
    const ordered = CURATED_WALLPAPER_URLS.filter((u) => fav.includes(u));
    if (ordered.length > 0) return ordered;
    return [...CURATED_WALLPAPER_URLS];
  }, [settings.wallpaperFavoriteUrls]);

  const curatedWallpaperUrl = useMemo(() => {
    const list = effectiveCuratedUrls;
    if (list.length === 0) return FALLBACK_BG;
    if (settings.wallpaperPlayback === "fixed") return list[settings.wallpaperFixedIndex % list.length];
    return list[slideIndex % list.length];
  }, [effectiveCuratedUrls, settings.wallpaperPlayback, settings.wallpaperFixedIndex, slideIndex]);

  const resolvedWallpaperUrl = useMemo(() => {
    if (settings.backgroundMode === "upload" && settings.backgroundImage) return settings.backgroundImage;
    if (settings.backgroundMode !== "unsplash") return FALLBACK_BG;
    if (HAS_UNSPLASH_API) return unsplashBg?.imageUrl ?? FALLBACK_BG;
    return curatedWallpaperUrl;
  }, [settings.backgroundMode, settings.backgroundImage, unsplashBg, curatedWallpaperUrl]);

  /* 壁纸署名（已注释）
  const photoCredit = useMemo(() => {
    if (settings.backgroundMode === "upload") return null
    if (HAS_UNSPLASH_API) return unsplashBg
    return CURATED_ATTRIBUTION
  }, [settings.backgroundMode, unsplashBg])
  */

  useEffect(() => {
    if (!HAS_UNSPLASH_API || settings.backgroundMode !== "unsplash") return;
    let cancelled = false;
    void (async () => {
      const result = await fetchTablissStyleBackground();
      if (!cancelled) setUnsplashBg(result);
    })();
    return () => {
      cancelled = true;
    };
  }, [settings.backgroundMode]);

  useEffect(() => {
    if (!HAS_UNSPLASH_API || settings.backgroundMode !== "unsplash") return;
    if (settings.wallpaperPlayback !== "slideshow") return;
    const sec = Math.max(15, settings.wallpaperSlideIntervalSec);
    const id = window.setInterval(() => {
      void fetchTablissStyleBackground().then(setUnsplashBg);
    }, sec * 1000);
    return () => window.clearInterval(id);
  }, [HAS_UNSPLASH_API, settings.backgroundMode, settings.wallpaperPlayback, settings.wallpaperSlideIntervalSec]);

  useEffect(() => {
    if (HAS_UNSPLASH_API || settings.backgroundMode !== "unsplash") return;
    if (settings.wallpaperPlayback !== "slideshow") return;
    const sec = Math.max(15, settings.wallpaperSlideIntervalSec);
    const len = Math.max(1, effectiveCuratedUrls.length);
    const id = window.setInterval(() => {
      setSlideIndex((i) => (i + 1) % len);
    }, sec * 1000);
    return () => window.clearInterval(id);
  }, [HAS_UNSPLASH_API, settings.backgroundMode, settings.wallpaperPlayback, settings.wallpaperSlideIntervalSec, effectiveCuratedUrls.length]);

  useEffect(() => {
    if (HAS_UNSPLASH_API || settings.backgroundMode !== "unsplash") return;
    if (settings.wallpaperPlayback !== "slideshow") return;
    setSlideIndex(0);
  }, [HAS_UNSPLASH_API, settings.wallpaperFavoriteUrls.join("|"), settings.wallpaperPlayback, settings.backgroundMode]);

  function revokeWallpaperBlobUrl() {
    const u = wallpaperObjectUrlRef.current;
    if (u?.startsWith("blob:")) URL.revokeObjectURL(u);
    wallpaperObjectUrlRef.current = null;
  }

  useEffect(() => {
    return () => revokeWallpaperBlobUrl();
  }, []);

  useEffect(() => {
    const sourceUrl = resolvedWallpaperUrl;
    if (!sourceUrl) return;

    if (sourceUrl.startsWith("data:")) {
      revokeWallpaperBlobUrl();
      setDisplayBgUrl(sourceUrl);
      return;
    }

    const loadId = ++wallpaperLoadGenRef.current;
    let cancelled = false;

    function applyDisplay(url: string, trackAsBlob: boolean) {
      if (cancelled || loadId !== wallpaperLoadGenRef.current) return;
      if (trackAsBlob && url.startsWith("blob:")) {
        revokeWallpaperBlobUrl();
        wallpaperObjectUrlRef.current = url;
      }
      setDisplayBgUrl(url);
    }

    void (async () => {
      const cachedObjUrl = await getCachedWallpaperObjectUrl(sourceUrl);
      if (cancelled || loadId !== wallpaperLoadGenRef.current) {
        if (cachedObjUrl) URL.revokeObjectURL(cachedObjUrl);
        return;
      }

      if (cachedObjUrl) applyDisplay(cachedObjUrl, true);

      try {
        const blob = await fetchAndCacheWallpaper(sourceUrl);
        if (cancelled || loadId !== wallpaperLoadGenRef.current) return;
        void putWallpaperBlob(sourceUrl, blob);
        const freshUrl = URL.createObjectURL(blob);
        if (cancelled || loadId !== wallpaperLoadGenRef.current) {
          URL.revokeObjectURL(freshUrl);
          return;
        }
        revokeWallpaperBlobUrl();
        wallpaperObjectUrlRef.current = freshUrl;
        setDisplayBgUrl(freshUrl);
      } catch {
        if (cancelled || loadId !== wallpaperLoadGenRef.current) return;
        if (!wallpaperObjectUrlRef.current) {
          const img = new Image();
          img.onload = () => applyDisplay(sourceUrl, false);
          img.onerror = () => applyDisplay(FALLBACK_BG, false);
          img.src = sourceUrl;
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [resolvedWallpaperUrl]);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const isProduction = !window.location.href.includes("localhost") && !window.location.href.includes("127.0.0.1");
    if (!isProduction) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F12") {
        e.preventDefault();
        return;
      }
      if (e.ctrlKey && e.shiftKey && (e.key === "I" || e.keyCode === 73)) {
        e.preventDefault();
        return;
      }
      if (e.ctrlKey && e.shiftKey && (e.key === "J" || e.keyCode === 74)) {
        e.preventDefault();
        return;
      }
      if (e.ctrlKey && (e.key === "U" || e.keyCode === 85)) {
        e.preventDefault();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem(SHORTCUTS_KEY, JSON.stringify(shortcuts));
  }, [shortcuts]);

  useEffect(() => {
    localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
  }, [notes]);

  const updateSettings = (newPartial: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...newPartial }));
  };

  const addShortcut = (shortcut: Shortcut) => {
    setShortcuts((prev) => [...prev, shortcut]);
  };

  const removeShortcut = (id: string) => {
    setShortcuts((prev) => prev.filter((s) => s.id !== id));
  };

  const editShortcut = (id: string, title: string, url: string) => {
    function mapDeep(items: Shortcut[]): Shortcut[] {
      return items.map((s) => {
        if (s.id === id) return { ...s, title, url };
        if (s.children?.length) return { ...s, children: mapDeep(s.children) };
        return s;
      });
    }
    setShortcuts((prev) => mapDeep(prev));
  };

  const handleReorder = (dragId: string, targetId: string) => {
    setShortcuts((prev) => {
      const dragIndex = prev.findIndex((s) => s.id === dragId);
      const targetIndex = prev.findIndex((s) => s.id === targetId);
      if (dragIndex === -1 || targetIndex === -1 || dragIndex === targetIndex) return prev;
      const newShortcuts = [...prev];
      const [removed] = newShortcuts.splice(dragIndex, 1);
      newShortcuts.splice(targetIndex, 0, removed);
      return newShortcuts;
    });
  };

  const handleMerge = (dragId: string, dropId: string) => {
    setShortcuts((prev) => {
      const draggedItem = prev.find((s) => s.id === dragId);
      const dropTarget = prev.find((s) => s.id === dropId);
      if (!draggedItem || !dropTarget || draggedItem.id === dropTarget.id) return prev;
      if (draggedItem.type === "folder" && dropTarget.type === "folder") return prev;

      const newShortcuts = prev.filter((s) => s.id !== dragId);
      const targetIndex = newShortcuts.findIndex((s) => s.id === dropId);
      if (targetIndex === -1) return prev;

      if (dropTarget.type === "folder") {
        const updatedFolder = {
          ...dropTarget,
          children: [...(dropTarget.children || []), draggedItem],
        };
        newShortcuts[targetIndex] = updatedFolder;
      } else {
        const newFolder: Shortcut = {
          id: `folder-${Date.now()}`,
          title: "Folder",
          url: "",
          type: "folder",
          children: [dropTarget, draggedItem],
        };
        newShortcuts[targetIndex] = newFolder;
      }
      return newShortcuts;
    });
  };

  const handleRemoveFromFolder = (folderId: string, itemId: string) => {
    setShortcuts((prev) =>
      prev
        .map((s) => {
          if (s.id === folderId && s.children) {
            const newChildren = s.children.filter((c) => c.id !== itemId);
            return { ...s, children: newChildren };
          }
          return s;
        })
        .filter((s) => s.type !== "folder" || (s.children && s.children.length > 0)),
    );
  };

  const handleMoveToRoot = (folderId: string, itemId: string) => {
    setShortcuts((prev) => {
      const folderIndex = prev.findIndex((s) => s.id === folderId);
      const folder = prev.find((s) => s.id === folderId);
      if (!folder || !folder.children || folderIndex === -1) return prev;

      const itemToMove = folder.children.find((c) => c.id === itemId);
      if (!itemToMove) return prev;

      let updatedShortcuts = prev.map((s) => {
        if (s.id === folderId && s.children) return { ...s, children: s.children.filter((c) => c.id !== itemId) };
        return s;
      });

      const updatedFolder = updatedShortcuts.find((s) => s.id === folderId);
      if (updatedFolder && updatedFolder.children && updatedFolder.children.length === 1) {
        const lastItem = updatedFolder.children[0];
        updatedShortcuts = updatedShortcuts.filter((s) => s.id !== folderId);
        updatedShortcuts.splice(folderIndex, 0, lastItem);
        updatedShortcuts.push(itemToMove);
      } else if (updatedFolder && updatedFolder.children && updatedFolder.children.length === 0) {
        updatedShortcuts = updatedShortcuts.filter((s) => s.id !== folderId);
        updatedShortcuts.push(itemToMove);
      } else updatedShortcuts.push(itemToMove);

      return updatedShortcuts;
    });
  };

  const handleImport = (data: { settings: AppSettings; shortcuts: Shortcut[]; notes?: Note[] }) => {
    if (data.settings) setSettings(normalizeSettings(data.settings));
    if (data.shortcuts) setShortcuts(data.shortcuts);
    if (data.notes) setNotes(data.notes);
  };

  const greeting = 'Think Different' 
  const timeLine = time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });

  const blurPx = settings.blurLevel;
  const bgFilter = `blur(${blurPx}px) brightness(0.85)`;

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
        <div
          className={`flex w-full max-w-5xl flex-col items-center tabliss-zen-ease transition-[padding,flex-grow] duration-500 ${
            isZenFocus ? "flex-1 justify-center py-8" : "shrink-0 pt-[10vh] pb-2"
          }`}
        >
          <button
            type="button"
            onClick={() => setIsZenFocus((v) => !v)}
            className="tabliss-time-stack text-center select-none px-6 sm:px-12 py-6 tabliss-zen-ease duration-500 outline-none focus-visible:ring-2 focus-visible:ring-white/35 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent cursor-pointer"
            aria-pressed={isZenFocus}
            aria-label={isZenFocus ? "显示快捷方式" : "隐藏快捷方式并放大时钟"}
          >
            <h1
              className={`tabliss-time-digital text-white drop-shadow-[0_2px_28px_rgba(0,0,0,0.5)] tabliss-zen-ease transition-[font-size,margin,line-height] duration-500 ${
                isZenFocus ? "text-[clamp(3.5rem,15vw,10.5rem)] leading-[0.92] mt-0" : "text-6xl sm:text-7xl md:text-8xl leading-none mt-0"
              }`}
            >
              {timeLine}
            </h1>
            <h2
              className={`tabliss-time-greeting text-white/90 tabliss-zen-ease transition-[font-size,margin,opacity] duration-500 ${
                isZenFocus ? "text-[clamp(1.2rem,4vw,5rem)] mt-6 sm:mt-12 opacity-95" : "text-xl sm:text-2xl md:text-3xl mt-4 opacity-92"
              }`}
            >
              {greeting}
            </h2>
            {!isZenFocus && (
              <p className="text-[11px] sm:text-xs text-white/50 font-medium tracking-[0.2em] uppercase mt-5 tabliss-zen-ease transition-opacity duration-500">
                {time.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}
              </p>
            )}
          </button>
        </div>

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
        <ToolsPanel />
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
        notes={notes}
        onUpdateSettings={updateSettings}
        onImport={handleImport}
      />
    </div>
  );
}

export default App;
