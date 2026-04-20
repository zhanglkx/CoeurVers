import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { X, Image as ImageIcon, Layout, Upload, Download, Save, Settings, ExternalLink, Heart, ImageOff } from "lucide-react";
import { AppSettings, Shortcut } from "../types";
import { hasUnsplashApi } from "../constants";
import { CURATED_WALLPAPER_ITEMS, CURATED_WALLPAPER_URLS, getEffectiveCuratedWallpaperUrls } from "../services/background";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  shortcuts: Shortcut[];
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  onImport: (data: { settings: AppSettings; shortcuts: Shortcut[] }) => void;
}

type TabType = "general" | "background" | "layout" | "backup";

/** 精选图库首次渲染数量；滚到底部再追加一批 */
const WALLPAPER_GALLERY_PAGE = 15;

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, settings, shortcuts, onUpdateSettings, onImport }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const curatedGalleryRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<TabType>("general");
  const [wallpaperGalleryCount, setWallpaperGalleryCount] = useState(WALLPAPER_GALLERY_PAGE);

  const effectiveGalleryList = useMemo(
    () => getEffectiveCuratedWallpaperUrls(settings.wallpaperFavoriteUrls),
    [settings.wallpaperFavoriteUrls],
  );

  useEffect(() => {
    if (!isOpen) return;
    setWallpaperGalleryCount(WALLPAPER_GALLERY_PAGE);
  }, [isOpen, activeTab]);

  /** 可视区域过高、滚不动时自动多加载几批，直到可滚动或已全部加载 */
  useLayoutEffect(() => {
    if (!isOpen || activeTab !== "background" || hasUnsplashApi) return;
    if (settings.backgroundMode !== "unsplash") return;
    const el = curatedGalleryRef.current;
    if (!el) return;
    if (wallpaperGalleryCount >= CURATED_WALLPAPER_ITEMS.length) return;
    if (el.scrollHeight > el.clientHeight + 4) return;
    setWallpaperGalleryCount((c) => Math.min(c + WALLPAPER_GALLERY_PAGE, CURATED_WALLPAPER_ITEMS.length));
  }, [isOpen, activeTab, wallpaperGalleryCount, settings.backgroundMode]);

  if (!isOpen) return null;

  function handleCuratedWallpaperScroll(e: React.UIEvent<HTMLDivElement>) {
    const el = e.currentTarget;
    const thresholdPx = 100;
    if (el.scrollHeight - el.scrollTop - el.clientHeight > thresholdPx) return;
    setWallpaperGalleryCount((c) => {
      const max = CURATED_WALLPAPER_ITEMS.length;
      if (c >= max) return c;
      return Math.min(c + WALLPAPER_GALLERY_PAGE, max);
    });
  }

  const toggleWallpaperFavorite = (url: string) => {
    const next = new Set(settings.wallpaperFavoriteUrls);
    if (next.has(url)) next.delete(url);
    else next.add(url);
    const ordered = CURATED_WALLPAPER_URLS.filter((u) => next.has(u));
    onUpdateSettings({ wallpaperFavoriteUrls: ordered });
  };

  const setFixedWallpaperFromUrl = (url: string) => {
    const idx = effectiveGalleryList.indexOf(url);
    if (idx < 0) return;
    onUpdateSettings({ wallpaperFixedIndex: idx, wallpaperPlayback: "fixed" });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      alert("Image is too large. Please select an image under 3MB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      onUpdateSettings({ backgroundImage: reader.result as string });
    };
    reader.readAsDataURL(file);
  };

  const handleExport = () => {
    const data = {
      settings,
      shortcuts,
      exportedAt: new Date().toISOString(),
      version: 2,
      appInfo: {
        name: "CoeurVers",
        exportVersion: "2.0",
        totalShortcuts: shortcuts.length,
      },
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `CoeurVers-config-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const validateSettings = (settings: any): settings is AppSettings => {
    if (!settings || typeof settings !== "object") return false;

    const legacyV1 =
      "defaultEngine" in settings &&
      "suggestServer" in settings &&
      settings.backgroundImage !== undefined &&
      settings.blurLevel !== undefined &&
      settings.gridConfig &&
      settings.openInNewTab !== undefined;

    const v2 =
      settings.blurLevel !== undefined &&
      settings.gridConfig &&
      settings.openInNewTab !== undefined &&
      (settings.backgroundMode === "unsplash" || settings.backgroundMode === "upload" || settings.backgroundMode === undefined);

    if (!legacyV1 && !v2) return false;

    if (!settings.gridConfig || typeof settings.gridConfig !== "object") return false;
    const gridKeys = ["rows", "cols", "iconSize", "gapX", "gapY"];
    if (!gridKeys.every((key) => key in settings.gridConfig)) return false;

    return (
      (settings.backgroundImage === null || typeof settings.backgroundImage === "string") &&
      typeof settings.blurLevel === "number" &&
      typeof settings.gridConfig.rows === "number" &&
      typeof settings.gridConfig.cols === "number" &&
      typeof settings.gridConfig.iconSize === "number" &&
      typeof settings.gridConfig.gapX === "number" &&
      typeof settings.gridConfig.gapY === "number" &&
      typeof settings.openInNewTab === "boolean"
    );
  };

  const validateShortcuts = (shortcuts: any): shortcuts is Shortcut[] => {
    if (!Array.isArray(shortcuts)) return false;

    return shortcuts.every((shortcut) => {
      if (!shortcut || typeof shortcut !== "object") return false;

      const requiredKeys = ["id", "title", "url"];
      const hasRequiredKeys = requiredKeys.every((key) => key in shortcut);
      if (!hasRequiredKeys) return false;

      // 验证数据类型
      return (
        typeof shortcut.id === "string" &&
        typeof shortcut.title === "string" &&
        typeof shortcut.url === "string" &&
        (shortcut.icon === undefined || typeof shortcut.icon === "string") &&
        (shortcut.type === undefined || shortcut.type === "link" || shortcut.type === "folder") &&
        (shortcut.children === undefined || Array.isArray(shortcut.children))
      );
    });
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);

        // 验证文件格式
        if (!json || typeof json !== "object") {
          alert("无效的配置文件格式");
          return;
        }

        // 验证应用信息（如果有）
        if (json.appInfo && json.appInfo.name !== "CoeurVers") {
          if (!confirm("此配置文件可能来自其他应用，是否继续导入？")) {
            return;
          }
        }

        if (json.version && json.version > 2) {
          alert("配置文件版本过高，请更新应用后再尝试导入");
          return;
        }

        // 验证配置数据
        if (!validateSettings(json.settings)) {
          alert("配置文件中的设置数据无效或缺失");
          return;
        }

        if (!validateShortcuts(json.shortcuts)) {
          alert("配置文件中的快捷方式数据无效");
          return;
        }

        const shortcutCount = json.shortcuts?.length || 0;
        const confirmMessage = `确定要导入配置文件吗？\n\n这将覆盖您当前的设置和 ${shortcutCount} 个快捷方式。`;

        if (confirm(confirmMessage)) {
          onImport({ settings: json.settings, shortcuts: json.shortcuts });
          alert("配置导入成功！");
          onClose();
        }
      } catch (err) {
        console.error("导入配置失败:", err);
        alert("解析配置文件失败，请检查文件格式是否正确");
      }
      // Reset input
      if (importInputRef.current) importInputRef.current.value = "";
    };
    reader.onerror = () => {
      alert("读取文件失败");
      if (importInputRef.current) importInputRef.current.value = "";
    };
    reader.readAsText(file);
  };

  return (
    <div
      className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-[#1e1e1e]/90 backdrop-blur-2xl border border-white/10 w-[min(96vw,56rem)] max-w-5xl h-[min(88vh,840px)] max-h-[92vh] min-h-[520px] rounded-3xl shadow-2xl flex overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sidebar */}
        <div className="w-[min(13rem,32%)] shrink-0 bg-white/5 border-r border-white/5 p-6 flex flex-col">
          <h2 className="text-2xl font-bold text-white mb-8">Settings</h2>
          <div className="space-y-2">
            <button
              onClick={() => setActiveTab("general")}
              className={`w-full flex items-center p-3 rounded-xl font-medium transition-colors ${
                activeTab === "general" ? "bg-blue-600/20 text-blue-400" : "text-gray-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Settings size={18} className="mr-3" /> General
            </button>
            <button
              onClick={() => setActiveTab("background")}
              className={`w-full flex items-center p-3 rounded-xl font-medium transition-colors ${
                activeTab === "background" ? "bg-blue-600/20 text-blue-400" : "text-gray-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <ImageIcon size={18} className="mr-3" /> Background
            </button>
            <button
              onClick={() => setActiveTab("layout")}
              className={`w-full flex items-center p-3 rounded-xl font-medium transition-colors ${
                activeTab === "layout" ? "bg-blue-600/20 text-blue-400" : "text-gray-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Layout size={18} className="mr-3" /> Layout
            </button>
            <button
              onClick={() => setActiveTab("backup")}
              className={`w-full flex items-center p-3 rounded-xl font-medium transition-colors ${
                activeTab === "backup" ? "bg-blue-600/20 text-blue-400" : "text-gray-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Save size={18} className="mr-3" /> Data & Backup
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 p-8 sm:p-10 overflow-y-auto relative">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-white">
              {activeTab === "general" && "General Settings"}
              {activeTab === "background" && "Background & Appearance"}
              {activeTab === "layout" && "Grid Layout"}
              {activeTab === "backup" && "Import & Export"}
            </h3>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white">
              <X size={20} />
            </button>
          </div>

          <div className="space-y-8">
            {activeTab === "general" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="space-y-3">
                  <label className="text-sm font-medium text-gray-400 uppercase tracking-wider">Link Behavior</label>
                  <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                    <div className="flex items-center">
                      <ExternalLink size={18} className="text-blue-400 mr-3" />
                      <div>
                        <span className="text-white font-medium block">Open links in new tab</span>
                        <span className="text-xs text-gray-400">When enabled, bookmark links will open in a new browser tab</span>
                      </div>
                    </div>
                    <button
                      onClick={() => onUpdateSettings({ openInNewTab: !settings.openInNewTab })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                        settings.openInNewTab ? "bg-blue-600" : "bg-gray-600"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          settings.openInNewTab ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            )}
            {activeTab === "background" && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="space-y-3">
                  <label className="text-sm font-medium text-gray-400 uppercase tracking-wider">Source</label>
                  <p className="text-xs text-gray-500">Tabliss-style: Unsplash landscape photos (optional API key in <code className="text-gray-400">.env</code> as VITE_UNSPLASH_ACCESS_KEY).</p>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => onUpdateSettings({ backgroundMode: "unsplash" })}
                      className={`flex-1 py-3 rounded-xl text-sm font-medium transition-colors ${
                        settings.backgroundMode === "unsplash" ? "bg-blue-600 text-white" : "bg-white/5 text-gray-300 hover:bg-white/10"
                      }`}
                    >
                      Unsplash
                    </button>
                    <button
                      type="button"
                      onClick={() => onUpdateSettings({ backgroundMode: "upload" })}
                      className={`flex-1 py-3 rounded-xl text-sm font-medium transition-colors ${
                        settings.backgroundMode === "upload" ? "bg-blue-600 text-white" : "bg-white/5 text-gray-300 hover:bg-white/10"
                      }`}
                    >
                      Custom upload
                    </button>
                  </div>
                </div>

                {settings.backgroundMode === "upload" && (
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-gray-400 uppercase tracking-wider">Custom Wallpaper</label>
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-white/10 rounded-2xl h-32 flex flex-col items-center justify-center cursor-pointer hover:bg-white/5 hover:border-blue-500/50 transition-all group"
                    >
                      <Upload size={32} className="text-gray-500 group-hover:text-blue-400 mb-2 transition-colors" />
                      <span className="text-sm text-gray-400 group-hover:text-gray-200">Click to upload image</span>
                      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                    </div>
                    {settings.backgroundImage && (
                      <button onClick={() => onUpdateSettings({ backgroundImage: null })} className="text-xs text-red-400 hover:text-red-300">
                        Clear uploaded image
                      </button>
                    )}
                  </div>
                )}

                {settings.backgroundMode === "unsplash" && (
                  <div className="space-y-6 border-t border-white/10 pt-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-400 uppercase tracking-wider">Wallpaper playback</label>
                      {hasUnsplashApi ? (
                        <p className="text-xs text-gray-500 leading-relaxed">
                          已配置 Unsplash API：壁纸由接口随机返回。下方「固定 / 轮播」控制单次加载还是按间隔重新请求新图（与精选图库无关）。
                        </p>
                      ) : (
                        <p className="text-xs text-gray-500 leading-relaxed">
                          未配置 API 时使用内置精选图库。可先点爱心加入收藏；未选任何收藏则使用全部壁纸。固定模式只显示当前一张；轮播按间隔在有效列表中切换。
                        </p>
                      )}
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => onUpdateSettings({ wallpaperPlayback: "fixed" })}
                          className={`flex-1 py-3 rounded-xl text-sm font-medium transition-colors ${
                            settings.wallpaperPlayback === "fixed" ? "bg-blue-600 text-white" : "bg-white/5 text-gray-300 hover:bg-white/10"
                          }`}
                        >
                          固定当前
                        </button>
                        <button
                          type="button"
                          onClick={() => onUpdateSettings({ wallpaperPlayback: "slideshow" })}
                          className={`flex-1 py-3 rounded-xl text-sm font-medium transition-colors ${
                            settings.wallpaperPlayback === "slideshow" ? "bg-blue-600 text-white" : "bg-white/5 text-gray-300 hover:bg-white/10"
                          }`}
                        >
                          轮播
                        </button>
                      </div>
                    </div>

                    {settings.wallpaperPlayback === "slideshow" && (
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <label className="text-sm font-medium text-gray-400 uppercase tracking-wider">切换间隔</label>
                          <span className="text-sm text-blue-400">{settings.wallpaperSlideIntervalSec}s</span>
                        </div>
                        <input
                          type="range"
                          min={15}
                          max={300}
                          step={15}
                          value={settings.wallpaperSlideIntervalSec}
                          onChange={(e) => onUpdateSettings({ wallpaperSlideIntervalSec: parseInt(e.target.value, 10) })}
                          className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500"
                        />
                        <p className="text-[11px] text-gray-500">15–300 秒</p>
                      </div>
                    )}

                    {!hasUnsplashApi && (
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <label className="text-sm font-medium text-gray-400 uppercase tracking-wider">精选图库</label>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => onUpdateSettings({ wallpaperFavoriteUrls: [] })}
                              className="text-xs px-3 py-1.5 rounded-lg bg-white/10 text-gray-300 hover:bg-white/15 transition-colors"
                            >
                              使用全部
                            </button>
                            <button
                              type="button"
                              onClick={() => onUpdateSettings({ wallpaperFavoriteUrls: [...CURATED_WALLPAPER_URLS] })}
                              className="text-xs px-3 py-1.5 rounded-lg bg-white/10 text-gray-300 hover:bg-white/15 transition-colors"
                            >
                              全选收藏
                            </button>
                          </div>
                        </div>
                        <p className="text-[11px] text-gray-500">
                          点击缩略图设为「固定当前」壁纸；点心形切换收藏。当前有效列表共 {effectiveGalleryList.length} 张。
                        </p>
                        <p className="text-[11px] text-gray-500">
                          图库共 {CURATED_WALLPAPER_ITEMS.length} 张，已展示{" "}
                          {Math.min(wallpaperGalleryCount, CURATED_WALLPAPER_ITEMS.length)} 张
                          {wallpaperGalleryCount < CURATED_WALLPAPER_ITEMS.length ? " — 在下方网格中滚到底部可加载更多" : " — 已全部展示"}
                        </p>
                        <div
                          ref={curatedGalleryRef}
                          className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 max-h-[min(52vh,520px)] min-h-[220px] overflow-y-auto pr-1 scroll-smooth overscroll-y-contain"
                          onScroll={handleCuratedWallpaperScroll}
                        >
                          {CURATED_WALLPAPER_ITEMS.slice(0, wallpaperGalleryCount).map((item) => {
                            const isFav = settings.wallpaperFavoriteUrls.includes(item.url);
                            const listIdx = effectiveGalleryList.indexOf(item.url);
                            const isCurrentFixed =
                              settings.wallpaperPlayback === "fixed" &&
                              listIdx === settings.wallpaperFixedIndex % effectiveGalleryList.length;
                            return (
                              <div
                                key={item.id}
                                className={`relative group rounded-lg overflow-hidden border-2 transition-colors ${
                                  isCurrentFixed ? "border-blue-400" : "border-transparent"
                                }`}
                              >
                                <button
                                  type="button"
                                  onClick={() => setFixedWallpaperFromUrl(item.url)}
                                  className="block w-full aspect-video bg-cover bg-center relative"
                                  style={{ backgroundImage: `url(${item.url})` }}
                                  title="设为固定壁纸"
                                />
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleWallpaperFavorite(item.url);
                                  }}
                                  className={`absolute top-1 right-1 p-1.5 rounded-md backdrop-blur-md transition-colors ${
                                    isFav ? "bg-rose-500/90 text-white" : "bg-black/50 text-white/80 hover:bg-black/65"
                                  }`}
                                  title={isFav ? "取消收藏" : "加入收藏"}
                                >
                                  <Heart size={14} className={isFav ? "fill-current" : ""} />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {hasUnsplashApi && settings.wallpaperPlayback === "fixed" && (
                      <p className="text-[11px] text-gray-500 flex items-start gap-2">
                        <ImageOff size={14} className="shrink-0 mt-0.5 opacity-60" />
                        固定模式：打开页面时请求一张随机图并保持；刷新页面可换新图。
                      </p>
                    )}
                  </div>
                )}

                {/* Blur Slider */}
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <label className="text-sm font-medium text-gray-400 uppercase tracking-wider">Background Blur</label>
                    <span className="text-sm text-blue-400">{settings.blurLevel}px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="20"
                    value={settings.blurLevel}
                    onChange={(e) => onUpdateSettings({ blurLevel: parseInt(e.target.value) })}
                    className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                </div>
              </div>
            )}

            {activeTab === "layout" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                {/* Icon Size */}
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <label className="text-sm font-medium text-gray-400 uppercase tracking-wider">Icon Size</label>
                    <span className="text-sm text-blue-400">{settings.gridConfig.iconSize || 84}px</span>
                  </div>
                  <input
                    type="range"
                    min="40"
                    max="120"
                    step="4"
                    value={settings.gridConfig.iconSize || 84}
                    onChange={(e) =>
                      onUpdateSettings({
                        gridConfig: { ...settings.gridConfig, iconSize: parseInt(e.target.value) },
                      })
                    }
                    className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                </div>

                {/* Spacing Controls */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-gray-400 uppercase tracking-wider">Spacing</label>

                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-xs text-gray-500">Horizontal Gap</span>
                        <span className="text-xs text-blue-400">{settings.gridConfig.gapX || 0}px</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="64"
                        step="4"
                        value={settings.gridConfig.gapX !== undefined ? settings.gridConfig.gapX : 0}
                        onChange={(e) =>
                          onUpdateSettings({
                            gridConfig: { ...settings.gridConfig, gapX: parseInt(e.target.value) },
                          })
                        }
                        className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-xs text-gray-500">Vertical Gap</span>
                        <span className="text-xs text-blue-400">{settings.gridConfig.gapY || 0}px</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="64"
                        step="4"
                        value={settings.gridConfig.gapY !== undefined ? settings.gridConfig.gapY : 0}
                        onChange={(e) =>
                          onUpdateSettings({
                            gridConfig: { ...settings.gridConfig, gapY: parseInt(e.target.value) },
                          })
                        }
                        className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Rows (cols reserved for import/export compat) */}
                <div className="pt-4 border-t border-white/10">
                  <label className="text-sm font-medium text-gray-400 uppercase tracking-wider block mb-3">
                    书签网格
                  </label>
                  <p className="text-[11px] text-gray-500 mb-3 leading-relaxed">
                    使用 CSS Grid：根据面板宽度自动计算每行列数，行与行之间为固定纵向间距；图标间距由上方「横向 / 纵向间距」控制；每行从左顶格排列，末行只占用实际格子数（不会出现整行居中留白）。
                  </p>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">行数（预留）</label>
                    <p className="text-[10px] text-gray-600 mb-1.5 leading-snug">当前主界面不按行数截断，仅保留与导出配置兼容。</p>
                    <input
                      type="number"
                      min="2"
                      max="8"
                      value={settings.gridConfig.rows}
                      onChange={(e) =>
                        onUpdateSettings({
                          gridConfig: { ...settings.gridConfig, rows: parseInt(e.target.value) || 4 },
                        })
                      }
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 transition-colors max-w-xs"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === "backup" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                {/* Current Configuration Summary */}
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                  <div className="flex items-center mb-3">
                    <Save className="text-purple-400 mr-3" size={24} />
                    <div>
                      <h4 className="text-white font-medium">Current Configuration</h4>
                      <p className="text-xs text-gray-400">Overview of your current settings</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">Shortcuts:</span>
                      <span className="text-white ml-2">{shortcuts.length}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Background:</span>
                      <span className="text-white ml-2">
                        {settings.backgroundMode === "upload" && settings.backgroundImage ? "Custom upload" : "Unsplash"}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">Wallpaper:</span>
                      <span className="text-white ml-2">
                        {settings.backgroundMode !== "unsplash"
                          ? "—"
                          : settings.wallpaperPlayback === "slideshow"
                            ? `Slideshow ${settings.wallpaperSlideIntervalSec}s`
                            : "Fixed"}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">Blur Level:</span>
                      <span className="text-white ml-2">{settings.blurLevel}px</span>
                    </div>
                    <div>
                      <span className="text-gray-400">书签网格:</span>
                      <span className="text-white ml-2">
                        自适应列数，间距 {settings.gridConfig.gapX}×{settings.gridConfig.gapY}px（行数{" "}
                        {settings.gridConfig.rows} 预留）
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">Icon Size:</span>
                      <span className="text-white ml-2">{settings.gridConfig.iconSize}px</span>
                    </div>
                  </div>
                </div>

                {/* Export */}
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                  <div className="flex items-center mb-3">
                    <Download className="text-blue-400 mr-3" size={24} />
                    <div>
                      <h4 className="text-white font-medium">Export Configuration</h4>
                      <p className="text-xs text-gray-400">Save your layout, background, and shortcuts to a JSON file.</p>
                    </div>
                  </div>
                  <button
                    onClick={handleExport}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-colors text-sm font-medium"
                  >
                    Download Backup
                  </button>
                </div>

                {/* Import */}
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                  <div className="flex items-center mb-3">
                    <Upload className="text-green-400 mr-3" size={24} />
                    <div>
                      <h4 className="text-white font-medium">Import Configuration</h4>
                      <p className="text-xs text-gray-400">Restore settings from a previously saved JSON file.</p>
                    </div>
                  </div>
                  <button
                    onClick={() => importInputRef.current?.click()}
                    className="w-full py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors text-sm font-medium"
                  >
                    Select File...
                  </button>
                  <input type="file" ref={importInputRef} accept=".json" className="hidden" onChange={handleImportFile} />
                </div>

                <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
                  <p className="text-xs text-yellow-200">
                    <strong>⚠️ 注意:</strong> 导入将覆盖您当前的设置和快捷方式。建议在导入前导出当前配置作为备份。
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
