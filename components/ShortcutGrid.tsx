
import React, { useState, useRef, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { Plus, X, Pencil, Trash2, Check, Loader2 } from 'lucide-react';
import { Shortcut, GridConfig } from '../types';
import { getFaviconUrl, checkFaviconExists } from '../constants';
import { fetchBestSiteIconUrl } from '../lib/site-icon';
import { TEXT_ICON_SWATCHES, generateTextIconDataUrl } from '../lib/text-icon';

// Global cache for failed favicons to prevent flicker/re-fetching
const FAILED_FAVICONS = new Set<string>();

function findShortcutById(list: Shortcut[], id: string): Shortcut | null {
  for (const s of list) {
    if (s.id === id) return s;
    if (s.children?.length) {
      const nested = findShortcutById(s.children, id);
      if (nested) return nested;
    }
  }
  return null;
}

type EditIconSource = 'current' | 'official' | 'text' | 'upload'
type AddIconSource = 'default' | 'official' | 'text' | 'upload'

function looksLikeWebUrl(raw: string): boolean {
  const s = raw.trim()
  if (!s) return false
  if (/^https?:\/\//i.test(s)) return true
  return /^([a-z0-9-]+\.)+[a-z]{2,}(\/.*)?$/i.test(s)
}

/** 名称栏误填成链接时，合并到 URL；返回 null 表示尚无可提交的地址。 */
function resolveAddFormFields(newUrl: string, newName: string): { rawUrl: string; nameOverride: string } | null {
  let urlRaw = newUrl.trim()
  let nameRaw = newName.trim()
  if (!urlRaw && nameRaw && looksLikeWebUrl(nameRaw)) {
    urlRaw = nameRaw
    nameRaw = ''
  }
  if (!urlRaw) return null
  return { rawUrl: urlRaw, nameOverride: nameRaw }
}

function deriveTitleFromAddFields(rawUrl: string, nameOverride: string): string {
  const n = nameOverride.trim()
  if (n) return n
  try {
    let u = rawUrl.trim()
    if (!/^https?:\/\//i.test(u)) u = `https://${u}`
    const part = new URL(u).hostname.replace(/^www\./i, '').split('.')[0]
    return part ? part.charAt(0).toUpperCase() + part.slice(1) : 'Site'
  } catch {
    return 'Site'
  }
}

function normalizeUrlInput(raw: string): string {
  let u = raw.trim()
  if (!u) return ''
  if (!/^https?:\/\//i.test(u)) u = `https://${u}`
  return u
}

function previewFaviconFromField(urlField: string): string {
  try {
    return getFaviconUrl(normalizeUrlInput(urlField))
  } catch {
    return ''
  }
}

interface ShortcutGridProps {
  shortcuts: Shortcut[];
  gridConfig: GridConfig;
  openInNewTab: boolean;
  onAddShortcut: (shortcut: Shortcut) => void;
  onRemoveShortcut: (id: string) => void;
  onEditShortcut: (id: string, title: string, url: string, iconPatch?: string | null) => void;
  onReorderShortcuts: (dragId: string, targetId: string) => void;
  onMergeShortcuts: (dragId: string, dropId: string) => void;
  onRemoveFromFolder: (folderId: string, itemId: string) => void;
  onMoveToRoot: (folderId: string, itemId: string) => void;
}

const ShortcutIcon = ({ url, title, icon, size = 'default' }: { url: string, title: string, icon?: string, size?: 'default' | 'small' }) => {
  // 优先使用定义的本地图标
  const localIcon = icon;
  const [imgError, setImgError] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  // 计算在线favicon URL，用于本地图标失败时的备用方案
  const faviconUrl = React.useMemo(() => {
    return localIcon ? '' : getFaviconUrl(url);
  }, [localIcon, url]);
  
  // 重置错误状态并检查图标
  useEffect(() => {
    // 如果有本地图标，直接设置为无错误状态，不进行任何网络检查
    if (localIcon) {
      setImgError(false);
      setIsChecking(false);
      return;
    }
    
    // 没有本地图标时，检查在线favicon
    if (!faviconUrl) {
      setImgError(true);
      return;
    }
    
    const checkFavicon = async () => {
      if (FAILED_FAVICONS.has(faviconUrl)) {
        setImgError(true);
        return;
      }
      
      setIsChecking(true);
      try {
        const exists = await checkFaviconExists(url);
        if (!exists) {
          FAILED_FAVICONS.add(faviconUrl);
          setImgError(true);
        } else {
          setImgError(false);
        }
      } catch (error) {
        // 如果检查失败，假设favicon不存在
        FAILED_FAVICONS.add(faviconUrl);
        setImgError(true);
      } finally {
        setIsChecking(false);
      }
    };
    
    checkFavicon();
  }, [localIcon, url, faviconUrl]);

  const iconSizeClass = size === 'default' ? 'w-[60%] h-[60%]' : 'w-full h-full'; // Inner icon relative size
  const textSizeClass = size === 'default' ? 'text-2xl' : 'text-[10px] leading-none';

  // 显示加载状态
  if (isChecking) {
    return (
      <div className={`${iconSizeClass} flex items-center justify-center bg-white/10 rounded-full animate-pulse`}>
        <div className="w-4 h-4 bg-white/20 rounded-full"></div>
      </div>
    );
  }

  // img 不接收指针事件，点击由外层处理
  const imgWrapClass = `${iconSizeClass} relative shrink-0 overflow-hidden rounded-full shortcut-icon-hit`;

  // 优先使用本地图标
  if (localIcon && !imgError) {
    return (
      <div className={imgWrapClass}>
        <img
          src={localIcon}
          alt=""
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover pointer-events-none select-none"
          onError={() => {
            setImgError(true);
          }}
          draggable={false}
        />
      </div>
    );
  }

  // 本地图标不可用或加载失败，尝试在线favicon
  if (!imgError && faviconUrl) {
    return (
      <div className={imgWrapClass}>
        <img
          src={faviconUrl}
          alt=""
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover pointer-events-none select-none"
          onError={() => {
            FAILED_FAVICONS.add(faviconUrl);
            setImgError(true);
          }}
          draggable={false}
        />
      </div>
    );
  }

  return (
    <div className={`${iconSizeClass} flex items-center justify-center bg-white/10 rounded-full`}>
      <span className={`${textSizeClass} font-bold text-white/90 uppercase tracking-wider select-none`}>
        {title.slice(0, 2)}
      </span>
    </div>
  );
};

const FolderPreview = ({ children }: { children: Shortcut[] }) => {
    const previewItems = children.slice(0, 4);
    return (
        <div className="w-[60%] h-[60%] grid grid-cols-2 grid-rows-2 gap-1 p-2 bg-white/10 rounded-3xl backdrop-blur-sm">
            {previewItems.map((item) => (
                <div key={item.id} className="relative w-full h-full rounded-full overflow-hidden">
                    <ShortcutIcon url={item.url} title={item.title} icon={item.icon} size="small" />
                </div>
            ))}
        </div>
    )
}

const ShortcutItem: React.FC<{ 
    shortcut: Shortcut, 
    onRemove: (id: string) => void,
    onEdit: (id: string) => void,
    onClickFolder: (s: Shortcut) => void,
    isMergeTarget: boolean,
    isReorderTarget: boolean,
    onItemDragStart: (e: React.DragEvent, id: string) => void,
    onItemDragOver: (e: React.DragEvent, id: string) => void,
    onItemDragLeave: (e: React.DragEvent) => void,
    onItemDrop: (e: React.DragEvent, id: string) => void,
    size: number,
    openInNewTab: boolean
}> = ({ 
    shortcut, 
    onRemove, 
    onEdit,
    onClickFolder,
    isMergeTarget,
    isReorderTarget,
    onItemDragStart,
    onItemDragOver,
    onItemDragLeave,
    onItemDrop,
    size,
    openInNewTab
}) => {
  const isFolder = shortcut.type === 'folder';

  return (
    <div 
        className={`relative group flex flex-col items-center transition-all duration-200 
            ${isReorderTarget ? 'translate-x-2 opacity-80' : ''}
        `}
        style={{ width: `${size + 20}px` }} // slightly larger than icon for label space
        onDragOver={(e) => onItemDragOver(e, shortcut.id)}
        onDragLeave={onItemDragLeave}
        onDrop={(e) => onItemDrop(e, shortcut.id)}
    >
        {/* Reorder Indicator Bar */}
        {isReorderTarget && !isMergeTarget && (
             <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-1 h-12 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)] z-0 animate-pulse" />
        )}

        {/* 角标：编辑 / 删除 */}
        <div
          className="absolute -top-1 right-0 z-30 flex gap-0.5 rounded-lg bg-black/55 p-0.5 ring-1 ring-white/15 opacity-0 shadow-lg backdrop-blur-md transition-opacity duration-200 pointer-events-auto group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100"
        >
          <button
            type="button"
            draggable={false}
            onClick={(e) => {
              e.stopPropagation();
              onEdit(shortcut.id);
            }}
            className="rounded-md p-1.5 text-white/90 hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60"
            aria-label="编辑"
            title="编辑"
          >
            <Pencil size={14} className="opacity-90" />
          </button>
          <button
            type="button"
            draggable={false}
            onClick={(e) => {
              e.stopPropagation();
              onRemove(shortcut.id);
            }}
            className="rounded-md p-1.5 text-red-300 hover:bg-red-500/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400/50"
            aria-label="删除"
            title="删除"
          >
            <Trash2 size={14} className="opacity-90" />
          </button>
        </div>

      <button
        type="button"
        draggable={true}
        onDragStart={(e) => onItemDragStart(e, shortcut.id)}
        onClick={() => {
          if (isFolder) {
            onClickFolder(shortcut);
          } else {
            if (openInNewTab) {
              window.open(shortcut.url, '_blank');
            } else {
              window.location.href = shortcut.url;
            }
          }
        }}
        className={`flex flex-col items-center p-2 rounded-xl transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)] hover:scale-110 active:scale-95 group-hover:z-10
            ${isMergeTarget ? 'scale-125 z-20 ring-4 ring-blue-500/30 bg-white/10' : ''}
        `}
      >
        <div 
            className="rounded-full flex items-center justify-center mb-2 overflow-hidden transition-all duration-300 relative bg-black/5 hover:bg-white/10 ring-1 ring-white/5 hover:ring-white/20"
            style={{ width: `${size}px`, height: `${size}px` }}
        >
          {isFolder && shortcut.children ? (
             <FolderPreview children={shortcut.children} />
          ) : (
             <ShortcutIcon url={shortcut.url} title={shortcut.title} icon={shortcut.icon} />
          )}
        </div>
        <span className="text-sm text-white/90 truncate text-center drop-shadow-md font-medium px-1 select-none" style={{ maxWidth: `${size + 20}px`}}>
          {shortcut.title}
        </span>
      </button>
    </div>
  );
};

const ShortcutGrid: React.FC<ShortcutGridProps> = ({ 
    shortcuts, 
    gridConfig, 
    onAddShortcut, 
    onRemoveShortcut, 
    onEditShortcut,
    onReorderShortcuts,
    onMergeShortcuts,
    onRemoveFromFolder,
    onMoveToRoot,
    openInNewTab
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingShortcut, setEditingShortcut] = useState<Shortcut | null>(null);
  const [newUrl, setNewUrl] = useState('');
  const [newName, setNewName] = useState('');
  const [addIconSource, setAddIconSource] = useState<AddIconSource>('default');
  const [addOfficialUrl, setAddOfficialUrl] = useState<string | null>(null);
  const [addTextSwatchIndex, setAddTextSwatchIndex] = useState(0);
  const [addUploadDataUrl, setAddUploadDataUrl] = useState<string | null>(null);
  const [addIconFetchError, setAddIconFetchError] = useState<string | null>(null);
  const [addIsFetchingIcon, setAddIsFetchingIcon] = useState(false);
  const addIconFileInputRef = useRef<HTMLInputElement>(null);
  const [editUrl, setEditUrl] = useState('');
  const [editName, setEditName] = useState('');
  const [editIconSource, setEditIconSource] = useState<EditIconSource>('current');
  const [editOfficialUrl, setEditOfficialUrl] = useState<string | null>(null);
  const [editTextSwatchIndex, setEditTextSwatchIndex] = useState(0);
  const [editUploadDataUrl, setEditUploadDataUrl] = useState<string | null>(null);
  const [iconFetchError, setIconFetchError] = useState<string | null>(null);
  const [isFetchingIcon, setIsFetchingIcon] = useState(false);
  const iconFileInputRef = useRef<HTMLInputElement>(null);

  // DnD State
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [mergeTargetId, setMergeTargetId] = useState<string | null>(null);
  const [isDragOverAddButton, setIsDragOverAddButton] = useState(false);
  const mergeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Folder Modal State
  const [openFolder, setOpenFolder] = useState<Shortcut | null>(null);

  // Update open folder when shortcuts change
  useEffect(() => {
    if (openFolder) {
      const updatedFolder = shortcuts.find(s => s.id === openFolder.id);
      if (updatedFolder && updatedFolder.type === 'folder') {
        setOpenFolder(updatedFolder);
      } else {
        // Folder was deleted or became empty, close it
        setOpenFolder(null);
      }
    }
  }, [shortcuts, openFolder?.id]); // Only depend on shortcuts and the current folder ID

  useEffect(() => {
    if (!isEditing || !editingShortcut || editingShortcut.type === 'folder') return
    setEditOfficialUrl(null)
    setIconFetchError(null)
    setEditIconSource((prev) => (prev === 'official' ? 'current' : prev))
  }, [editUrl, isEditing, editingShortcut?.id, editingShortcut?.type])

  useEffect(() => {
    if (!isAdding) return
    setAddOfficialUrl(null)
    setAddIconFetchError(null)
    setAddIconSource((prev) => (prev === 'official' ? 'default' : prev))
  }, [newUrl, newName, isAdding])

  const addEffectiveFields = useMemo(() => resolveAddFormFields(newUrl, newName), [newUrl, newName])

  const addModalDefaultPreviewSrc = useMemo(() => {
    if (!addEffectiveFields) return ''
    return previewFaviconFromField(addEffectiveFields.rawUrl)
  }, [addEffectiveFields])

  const addTextIconPreview = useMemo(() => {
    const r = addEffectiveFields
    const label = r ? deriveTitleFromAddFields(r.rawUrl, r.nameOverride) : (newName.trim() || '?')
    const swatch = TEXT_ICON_SWATCHES[addTextSwatchIndex] ?? TEXT_ICON_SWATCHES[0]
    return generateTextIconDataUrl(label, swatch)
  }, [addEffectiveFields, newName, addTextSwatchIndex])

  const textIconPreview = useMemo(() => {
    const swatch = TEXT_ICON_SWATCHES[editTextSwatchIndex] ?? TEXT_ICON_SWATCHES[0]
    return generateTextIconDataUrl(editName, swatch)
  }, [editName, editTextSwatchIndex])

  const editModalCurrentPreviewSrc = useMemo(() => {
    if (!isEditing || !editingShortcut || editingShortcut.type === 'folder') return ''
    return editingShortcut.icon || previewFaviconFromField(editUrl) || ''
  }, [isEditing, editingShortcut, editUrl])

  // Defaults in case they are missing from config
  const iconSize = gridConfig.iconSize || 84;
  const gapX = gridConfig.gapX !== undefined ? gridConfig.gapX : 24;
  const gapY = gridConfig.gapY !== undefined ? gridConfig.gapY : 24;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const resolved = resolveAddFormFields(newUrl, newName)
    if (!resolved) return

    let formattedUrl = resolved.rawUrl.trim();
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = 'https://' + formattedUrl;
    }

    const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:'];
    const lowerUrl = formattedUrl.toLowerCase();
    if (dangerousProtocols.some(protocol => lowerUrl.startsWith(protocol))) {
      alert('Invalid URL protocol');
      return;
    }

    const title = deriveTitleFromAddFields(resolved.rawUrl, resolved.nameOverride)

    let icon: string | undefined = undefined
    if (addIconSource === 'official' && addOfficialUrl) icon = addOfficialUrl
    else if (addIconSource === 'text') {
      const swatch = TEXT_ICON_SWATCHES[addTextSwatchIndex] ?? TEXT_ICON_SWATCHES[0]
      icon = generateTextIconDataUrl(title, swatch)
    } else if (addIconSource === 'upload' && addUploadDataUrl) icon = addUploadDataUrl

    const newShortcut: Shortcut = {
      id: Date.now().toString(),
      title,
      url: formattedUrl,
      type: 'link',
      icon,
    };

    onAddShortcut(newShortcut);
    closeAddModal();
  };

  const closeAddModal = () => {
      setIsAdding(false);
      setNewUrl('');
      setNewName('');
      setAddIconSource('default');
      setAddOfficialUrl(null);
      setAddTextSwatchIndex(0);
      setAddUploadDataUrl(null);
      setAddIconFetchError(null);
      setAddIsFetchingIcon(false);
  }

  const openAddModal = () => {
    setNewUrl('');
    setNewName('');
    setAddIconSource('default');
    setAddOfficialUrl(null);
    setAddTextSwatchIndex(0);
    setAddUploadDataUrl(null);
    setAddIconFetchError(null);
    setAddIsFetchingIcon(false);
    setIsAdding(true);
  }

  const handleFetchAddSiteIcon = async () => {
    const r = resolveAddFormFields(newUrl, newName)
    if (!r) return
    setAddIconFetchError(null)
    setAddIsFetchingIcon(true)
    try {
      const resolved = await fetchBestSiteIconUrl(r.rawUrl)
      if (!resolved) {
        setAddIconFetchError('无法获取图标，请检查地址')
        return
      }
      setAddOfficialUrl(resolved)
      setAddIconSource('official')
    } finally {
      setAddIsFetchingIcon(false)
    }
  }

  const handleAddIconFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !file.type.startsWith('image/')) return
    if (file.size > 450 * 1024) {
      setAddIconFetchError('图片请小于 450KB')
      return
    }
    setAddIconFetchError(null)
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      if (typeof result === 'string') {
        setAddUploadDataUrl(result)
        setAddIconSource('upload')
      }
    }
    reader.readAsDataURL(file)
  }

  const openEditModal = (shortcut: Shortcut) => {
      setEditingShortcut(shortcut);
      setEditName(shortcut.title);
      setEditUrl(shortcut.url || '');
      setEditIconSource('current');
      setEditOfficialUrl(null);
      setEditTextSwatchIndex(0);
      setEditUploadDataUrl(null);
      setIconFetchError(null);
      setIsFetchingIcon(false);
      setIsEditing(true);
  }

  const handleEditShortcutById = (id: string) => {
      const shortcut = findShortcutById(shortcuts, id);
      if (shortcut) openEditModal(shortcut);
  }

  const closeEditModal = () => {
      setIsEditing(false);
      setEditingShortcut(null);
      setEditName('');
      setEditUrl('');
      setEditIconSource('current');
      setEditOfficialUrl(null);
      setEditTextSwatchIndex(0);
      setEditUploadDataUrl(null);
      setIconFetchError(null);
      setIsFetchingIcon(false);
  }

  const handleFetchSiteIcon = async () => {
    if (!editingShortcut || editingShortcut.type === 'folder') return
    setIconFetchError(null)
    setIsFetchingIcon(true)
    try {
      const resolved = await fetchBestSiteIconUrl(editUrl)
      if (!resolved) {
        setIconFetchError('无法获取图标，请检查地址')
        return
      }
      setEditOfficialUrl(resolved)
      setEditIconSource('official')
    } finally {
      setIsFetchingIcon(false)
    }
  }

  const handleIconFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !file.type.startsWith('image/')) return
    if (file.size > 450 * 1024) {
      setIconFetchError('图片请小于 450KB')
      return
    }
    setIconFetchError(null)
    const reader = new FileReader()
    reader.onload = () => {
      const r = reader.result
      if (typeof r === 'string') {
        setEditUploadDataUrl(r)
        setEditIconSource('upload')
      }
    }
    reader.readAsDataURL(file)
  }

  const handleEdit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingShortcut || !editName) return;

      if (editingShortcut.type === 'folder') {
          onEditShortcut(editingShortcut.id, editName, editingShortcut.url || '');
      } else {
          let formattedUrl = editUrl.trim();
          if (!/^https?:\/\//i.test(formattedUrl)) {
              formattedUrl = 'https://' + formattedUrl;
          }
          
          const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:'];
          const lowerUrl = formattedUrl.toLowerCase();
          if (dangerousProtocols.some(protocol => lowerUrl.startsWith(protocol))) {
              alert('Invalid URL protocol');
              return;
          }

          let iconPatch: string | null | undefined = undefined
          if (editIconSource === 'official' && editOfficialUrl)
            iconPatch = editOfficialUrl
          else if (editIconSource === 'text')
            iconPatch = generateTextIconDataUrl(editName, TEXT_ICON_SWATCHES[editTextSwatchIndex] ?? TEXT_ICON_SWATCHES[0])
          else if (editIconSource === 'upload' && editUploadDataUrl)
            iconPatch = editUploadDataUrl
          
          onEditShortcut(editingShortcut.id, editName, formattedUrl, iconPatch);
      }
      closeEditModal();
  }

  // --- Drag and Drop Handlers ---

  const handleDragStart = (e: React.DragEvent, id: string) => {
      e.dataTransfer.setData('shortcut-id', id);
      e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
      e.preventDefault();
      
      if (dragOverId !== id) {
          setDragOverId(id);
          
          if (mergeTimerRef.current) clearTimeout(mergeTimerRef.current);
          setMergeTargetId(null);

          mergeTimerRef.current = setTimeout(() => {
              setMergeTargetId(id);
          }, 600);
      }
  };

  const handleDragLeave = (e: React.DragEvent) => {
      // Logic handled by container
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
      e.preventDefault();
      
      // Handle regular shortcut dragging
      const draggedId = e.dataTransfer.getData('shortcut-id');
      
      // Handle folder item dragging
      const folderData = e.dataTransfer.getData('folder-item');
      
      if (mergeTimerRef.current) clearTimeout(mergeTimerRef.current);
      
      if (folderData) {
          // Handle folder item drop
          const { folderId, itemId } = JSON.parse(folderData);
          if (folderId && itemId) {
              if (targetId === 'add-button') {
                  // If dropped on add button, move to end
                  onMoveToRoot(folderId, itemId);
              } else if (itemId !== targetId) {
                  // If dropped on another item, move to that position
                  onMoveToRoot(folderId, itemId);
              }
          }
      } else if (draggedId && draggedId !== targetId) {
          // Handle regular shortcut drop
          if (mergeTargetId === targetId) {
              onMergeShortcuts(draggedId, targetId);
          } else {
              onReorderShortcuts(draggedId, targetId);
          }
      }

      setDragOverId(null);
      setMergeTargetId(null);
      setIsDragOverAddButton(false);
  };

  // Handle dragging over the add button
  const handleAddButtonDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOverAddButton(true);
  };

  const handleAddButtonDragLeave = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOverAddButton(false);
  };

  const handleAddButtonDrop = (e: React.DragEvent) => {
      e.preventDefault();
      
      // Handle regular shortcut dragging
      const draggedId = e.dataTransfer.getData('shortcut-id');
      
      // Handle folder item dragging
      const folderData = e.dataTransfer.getData('folder-item');
      
      if (mergeTimerRef.current) clearTimeout(mergeTimerRef.current);
      
      if (folderData) {
          // Handle folder item drop on add button
          const { folderId, itemId } = JSON.parse(folderData);
          if (folderId && itemId) {
              onMoveToRoot(folderId, itemId);
          }
      } else if (draggedId && shortcuts.length > 0) {
          // Move the dragged shortcut to the end (before the add button)
          const targetId = shortcuts[shortcuts.length - 1].id;
          if (draggedId !== targetId) {
              onReorderShortcuts(draggedId, targetId);
          }
      }

      setIsDragOverAddButton(false);
      setDragOverId(null);
      setMergeTargetId(null);
  };

  const handleFolderItemDragStart = (e: React.DragEvent, itemId: string) => {
      e.dataTransfer.setData('folder-item', JSON.stringify({ folderId: openFolder?.id, itemId }));
      e.dataTransfer.effectAllowed = 'move';
  };

  const handleBackdropDrop = (e: React.DragEvent) => {
      e.preventDefault();
      const folderData = e.dataTransfer.getData('folder-item');
      if (folderData) {
          const { folderId, itemId } = JSON.parse(folderData);
          if (folderId && itemId) {
              onMoveToRoot(folderId, itemId);
          }
      }
      setDragOverId(null);
      setMergeTargetId(null);
  };

  return (
    <>
    <div className="w-full max-w-[54rem] mx-auto px-0 z-10">
      <div
        className="grid w-full justify-items-center transition-all duration-300"
        style={{
          gridTemplateColumns: `repeat(${gridConfig.cols}, minmax(0, 1fr))`,
          gap: `${gapY}px ${gapX}px`
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const folderData = e.dataTransfer.getData('folder-item');
          if (folderData) {
            const { folderId, itemId } = JSON.parse(folderData);
            if (folderId && itemId) {
              onMoveToRoot(folderId, itemId);
            }
          }
          setDragOverId(null);
          setMergeTargetId(null);
          setIsDragOverAddButton(false);
        }}
        onDragLeave={() => {
            setDragOverId(null);
            setMergeTargetId(null);
            if (mergeTimerRef.current) clearTimeout(mergeTimerRef.current);
        }}
      >
        {shortcuts.map((shortcut) => (
          <ShortcutItem 
            key={shortcut.id}
            shortcut={shortcut} 
            onRemove={onRemoveShortcut}
            onEdit={handleEditShortcutById}
            onClickFolder={setOpenFolder}
            onItemDragStart={handleDragStart}
            onItemDragOver={handleDragOver}
            onItemDragLeave={handleDragLeave}
            onItemDrop={handleDrop}
            isMergeTarget={mergeTargetId === shortcut.id}
            isReorderTarget={dragOverId === shortcut.id && mergeTargetId !== shortcut.id}
            size={iconSize}
            openInNewTab={openInNewTab}
          />
        ))}

        {/* Add Button */}
        <div 
          className={`relative flex flex-col items-center transition-all duration-200 ${
            isDragOverAddButton ? 'translate-x-2 opacity-80' : ''
          }`}
          style={{ width: `${iconSize + 20}px` }}
          onDragOver={handleAddButtonDragOver}
          onDragLeave={handleAddButtonDragLeave}
          onDrop={handleAddButtonDrop}
        >
          {/* Drop Indicator for Add Button */}
          {isDragOverAddButton && (
            <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-1 h-12 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)] z-0 animate-pulse" />
          )}
          
          <button
            onClick={openAddModal}
            className={`flex flex-col items-center p-2 rounded-xl transition-all duration-300 opacity-50 hover:opacity-100 group hover:scale-110 ${
              isDragOverAddButton ? 'ring-4 ring-blue-500/30 bg-white/10 scale-110' : ''
            }`}
            draggable={false}
          >
            <div 
                className="rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 transition-colors"
                style={{ width: `${iconSize}px`, height: `${iconSize}px` }}
            >
              <Plus size={iconSize * 0.35} className="text-white/60" />
            </div>
          </button>
        </div>
      </div>

      {/* Add Modal — portal avoids fixed positioning being clipped by ancestors with will-change/transform */}
      {isAdding && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 p-4">
          <div className="bg-[#1A1A1A] border border-white/10 p-6 rounded-3xl w-full max-w-md shadow-2xl scale-100 animate-in zoom-in-95 duration-200 relative">
            <button 
                onClick={closeAddModal}
                className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
            >
                <X size={20} />
            </button>
            <h3 className="text-xl font-semibold text-white mb-2">添加快捷方式</h3>
            <p className="text-xs text-gray-500 mb-5">请先填地址；名称可空（将用域名生成）。仅填名称时若粘贴的是网址，也会自动当作地址。</p>
            <form onSubmit={handleAdd} className="space-y-4">
              <input ref={addIconFileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAddIconFileChange} />
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1 uppercase tracking-wider">地址</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    className="min-w-0 flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-amber-500/80 transition-colors"
                    placeholder="https://juejin.cn"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleFetchAddSiteIcon}
                    disabled={addIsFetchingIcon || !addEffectiveFields}
                    className="shrink-0 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-sm font-medium transition-colors disabled:opacity-40 disabled:pointer-events-none"
                  >
                    {addIsFetchingIcon ? <Loader2 size={18} className="animate-spin" /> : null}
                    {addIsFetchingIcon ? '获取中' : '获取图标'}
                  </button>
                </div>
                {addIconFetchError ? <p className="mt-1.5 text-xs text-red-400">{addIconFetchError}</p> : null}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1 uppercase tracking-wider">名称（可选）</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onPaste={(e) => {
                    const text = e.clipboardData.getData('text').trim()
                    if (!newUrl.trim() && text && looksLikeWebUrl(text)) {
                      e.preventDefault()
                      setNewUrl(text)
                    }
                  }}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500/80 transition-colors"
                  placeholder="例如 掘金（误把链接贴在这里也可，保存时会识别）"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">图标颜色</label>
                <div className="flex flex-wrap gap-2">
                  {TEXT_ICON_SWATCHES.map((swatch, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setAddTextSwatchIndex(i)
                        setAddIconSource('text')
                      }}
                      className={`h-8 w-8 rounded-full border-2 transition-transform hover:scale-110 ${
                        addIconSource === 'text' && addTextSwatchIndex === i
                          ? 'border-amber-400 scale-110'
                          : 'border-transparent'
                      }`}
                      style={
                        swatch.kind === 'solid'
                          ? { background: swatch.color }
                          : { background: `linear-gradient(135deg, ${swatch.from}, ${swatch.to})` }
                      }
                      title="文字图标底色"
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">图标</label>
                <div className="grid grid-cols-4 gap-3">
                  <button
                    type="button"
                    onClick={() => setAddIconSource('default')}
                    className={`flex flex-col items-center gap-1.5 rounded-xl p-1 transition ring-offset-2 ring-offset-[#1A1A1A] ${
                      addIconSource === 'default' ? 'ring-2 ring-amber-400' : 'ring-0 hover:bg-white/5'
                    }`}
                  >
                    <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-white/10">
                      {addModalDefaultPreviewSrc ? (
                        <img src={addModalDefaultPreviewSrc} alt="" className="h-full w-full object-cover opacity-90" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[10px] text-white/35 px-1 text-center leading-tight">
                          填地址后显示
                        </div>
                      )}
                      {addIconSource === 'default' ? (
                        <span className="absolute bottom-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-black shadow">
                          <Check size={12} strokeWidth={3} />
                        </span>
                      ) : null}
                    </div>
                    <span className="text-[10px] text-gray-500">默认</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAddIconSource('text')}
                    className={`flex flex-col items-center gap-1.5 rounded-xl p-1 transition ring-offset-2 ring-offset-[#1A1A1A] ${
                      addIconSource === 'text' ? 'ring-2 ring-amber-400' : 'ring-0 hover:bg-white/5'
                    }`}
                  >
                    <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-white/10">
                      {addTextIconPreview ? (
                        <img src={addTextIconPreview} alt="" className="h-full w-full object-cover" />
                      ) : null}
                      {addIconSource === 'text' ? (
                        <span className="absolute bottom-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-black shadow">
                          <Check size={12} strokeWidth={3} />
                        </span>
                      ) : null}
                    </div>
                    <span className="text-[10px] text-gray-500">文字</span>
                  </button>

                  <button
                    type="button"
                    disabled={!addOfficialUrl}
                    onClick={() => addOfficialUrl && setAddIconSource('official')}
                    className={`flex flex-col items-center gap-1.5 rounded-xl p-1 transition ring-offset-2 ring-offset-[#1A1A1A] ${
                      addIconSource === 'official' ? 'ring-2 ring-amber-400' : 'ring-0 hover:bg-white/5'
                    } ${!addOfficialUrl ? 'cursor-not-allowed opacity-45' : ''}`}
                  >
                    <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-white/10">
                      {addOfficialUrl ? (
                        <img src={addOfficialUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full flex-col items-center justify-center gap-0.5 px-1 text-center text-[10px] leading-tight text-white/35">
                          <span>先点</span>
                          <span>获取图标</span>
                        </div>
                      )}
                      {addIconSource === 'official' && addOfficialUrl ? (
                        <span className="absolute bottom-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-black shadow">
                          <Check size={12} strokeWidth={3} />
                        </span>
                      ) : null}
                    </div>
                    <span className="text-[10px] text-gray-500">官方</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (addUploadDataUrl) setAddIconSource('upload')
                      else addIconFileInputRef.current?.click()
                    }}
                    className={`flex flex-col items-center gap-1.5 rounded-xl p-1 transition ring-offset-2 ring-offset-[#1A1A1A] ${
                      addIconSource === 'upload' ? 'ring-2 ring-amber-400' : 'ring-0 hover:bg-white/5'
                    }`}
                  >
                    <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-white/10">
                      {addUploadDataUrl ? (
                        <img src={addUploadDataUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-white/50">
                          <Plus size={28} strokeWidth={1.5} />
                        </div>
                      )}
                      {addIconSource === 'upload' ? (
                        <span className="absolute bottom-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-black shadow">
                          <Check size={12} strokeWidth={3} />
                        </span>
                      ) : null}
                    </div>
                    <span className="text-[10px] text-gray-500">上传</span>
                  </button>
                </div>
              </div>

              <div className="flex gap-3 mt-8">
                <button
                  type="button"
                  onClick={closeAddModal}
                  className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-colors font-medium"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={!addEffectiveFields}
                  className="flex-1 px-4 py-3 bg-amber-500 hover:bg-amber-400 text-black rounded-xl transition-colors font-medium disabled:opacity-50"
                >
                  添加
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Edit Modal */}
      {isEditing && editingShortcut && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 p-4">
          <div className={`bg-[#1A1A1A] border border-white/10 p-6 rounded-3xl w-full shadow-2xl scale-100 animate-in zoom-in-95 duration-200 relative ${editingShortcut.type === 'folder' ? 'max-w-sm' : 'max-w-md'}`}>
            <button 
                onClick={closeEditModal}
                className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
            >
                <X size={20} />
            </button>
            <h3 className="text-xl font-semibold text-white mb-6">{editingShortcut.type === 'folder' ? '编辑文件夹' : '编辑快捷方式'}</h3>
            <form onSubmit={handleEdit} className="space-y-4">
              {editingShortcut.type !== 'folder' && (
                <input ref={iconFileInputRef} type="file" accept="image/*" className="hidden" onChange={handleIconFileChange} />
              )}
              {editingShortcut.type !== 'folder' && (
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1 uppercase tracking-wider">地址</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={editUrl}
                      onChange={(e) => setEditUrl(e.target.value)}
                      className="min-w-0 flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-amber-500/80 transition-colors"
                      placeholder="https://example.com"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={handleFetchSiteIcon}
                      disabled={isFetchingIcon || !editUrl.trim()}
                      className="shrink-0 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-sm font-medium transition-colors disabled:opacity-40 disabled:pointer-events-none"
                    >
                      {isFetchingIcon ? <Loader2 size={18} className="animate-spin" /> : null}
                      {isFetchingIcon ? '获取中' : '获取图标'}
                    </button>
                  </div>
                  {iconFetchError ? <p className="mt-1.5 text-xs text-red-400">{iconFetchError}</p> : null}
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1 uppercase tracking-wider">名称</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500/80 transition-colors"
                  placeholder={editingShortcut.type === 'folder' ? '例如 常用工具' : '例如 掘金'}
                />
              </div>

              {editingShortcut.type !== 'folder' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">图标颜色</label>
                    <div className="flex flex-wrap gap-2">
                      {TEXT_ICON_SWATCHES.map((swatch, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => {
                            setEditTextSwatchIndex(i)
                            setEditIconSource('text')
                          }}
                          className={`h-8 w-8 rounded-full border-2 transition-transform hover:scale-110 ${
                            editIconSource === 'text' && editTextSwatchIndex === i
                              ? 'border-amber-400 scale-110'
                              : 'border-transparent'
                          }`}
                          style={
                            swatch.kind === 'solid'
                              ? { background: swatch.color }
                              : { background: `linear-gradient(135deg, ${swatch.from}, ${swatch.to})` }
                          }
                          title="文字图标底色"
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">图标</label>
                    <div className="grid grid-cols-4 gap-3">
                            <button
                              type="button"
                              onClick={() => setEditIconSource('current')}
                              className={`flex flex-col items-center gap-1.5 rounded-xl p-1 transition ring-offset-2 ring-offset-[#1A1A1A] ${
                                editIconSource === 'current' ? 'ring-2 ring-amber-400' : 'ring-0 hover:bg-white/5'
                              }`}
                            >
                              <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-white/10">
                                {editModalCurrentPreviewSrc ? (
                                  <img src={editModalCurrentPreviewSrc} alt="" className="h-full w-full object-cover" />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center text-xs text-white/40">—</div>
                                )}
                                {editIconSource === 'current' ? (
                                  <span className="absolute bottom-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-black shadow">
                                    <Check size={12} strokeWidth={3} />
                                  </span>
                                ) : null}
                              </div>
                              <span className="text-[10px] text-gray-500">当前</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setEditIconSource('text')}
                              className={`flex flex-col items-center gap-1.5 rounded-xl p-1 transition ring-offset-2 ring-offset-[#1A1A1A] ${
                                editIconSource === 'text' ? 'ring-2 ring-amber-400' : 'ring-0 hover:bg-white/5'
                              }`}
                            >
                              <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-white/10">
                                {textIconPreview ? (
                                  <img src={textIconPreview} alt="" className="h-full w-full object-cover" />
                                ) : null}
                                {editIconSource === 'text' ? (
                                  <span className="absolute bottom-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-black shadow">
                                    <Check size={12} strokeWidth={3} />
                                  </span>
                                ) : null}
                              </div>
                              <span className="text-[10px] text-gray-500">文字</span>
                            </button>

                            <button
                              type="button"
                              disabled={!editOfficialUrl}
                              onClick={() => editOfficialUrl && setEditIconSource('official')}
                              className={`flex flex-col items-center gap-1.5 rounded-xl p-1 transition ring-offset-2 ring-offset-[#1A1A1A] ${
                                editIconSource === 'official' ? 'ring-2 ring-amber-400' : 'ring-0 hover:bg-white/5'
                              } ${!editOfficialUrl ? 'cursor-not-allowed opacity-45' : ''}`}
                            >
                              <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-white/10">
                                {editOfficialUrl ? (
                                  <img src={editOfficialUrl} alt="" className="h-full w-full object-cover" />
                                ) : (
                                  <div className="flex h-full w-full flex-col items-center justify-center gap-0.5 px-1 text-center text-[10px] leading-tight text-white/35">
                                    <span>点击</span>
                                    <span>获取图标</span>
                                  </div>
                                )}
                                {editIconSource === 'official' && editOfficialUrl ? (
                                  <span className="absolute bottom-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-black shadow">
                                    <Check size={12} strokeWidth={3} />
                                  </span>
                                ) : null}
                              </div>
                              <span className="text-[10px] text-gray-500">官方</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                if (editUploadDataUrl) setEditIconSource('upload')
                                else iconFileInputRef.current?.click()
                              }}
                              className={`flex flex-col items-center gap-1.5 rounded-xl p-1 transition ring-offset-2 ring-offset-[#1A1A1A] ${
                                editIconSource === 'upload' ? 'ring-2 ring-amber-400' : 'ring-0 hover:bg-white/5'
                              }`}
                            >
                              <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-white/10">
                                {editUploadDataUrl ? (
                                  <img src={editUploadDataUrl} alt="" className="h-full w-full object-cover" />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center text-white/50">
                                    <Plus size={28} strokeWidth={1.5} />
                                  </div>
                                )}
                                {editIconSource === 'upload' ? (
                                  <span className="absolute bottom-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-black shadow">
                                    <Check size={12} strokeWidth={3} />
                                  </span>
                                ) : null}
                              </div>
                              <span className="text-[10px] text-gray-500">上传</span>
                            </button>
                    </div>
                  </div>
                </>
              )}

              <div className="flex gap-3 mt-8">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-colors font-medium"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={!editName}
                  className="flex-1 px-4 py-3 bg-amber-500 hover:bg-amber-400 text-black rounded-xl transition-colors font-medium disabled:opacity-50"
                >
                  保存
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Folder Open Modal */}
      {openFolder && createPortal(
          <div 
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-[10px] animate-in fade-in duration-200 p-4"
            onClick={() => setOpenFolder(null)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleBackdropDrop}
          >
              <div 
                className="relative w-full max-w-[420px] rounded-3xl border border-white/[0.12] bg-zinc-950/75 shadow-[0_24px_80px_rgba(0,0,0,0.55)] backdrop-blur-2xl animate-in zoom-in-95 duration-200 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                 <div className="flex items-start gap-3 px-6 pt-6 pb-4 border-b border-white/[0.08]">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-lg font-semibold text-white tracking-tight">{openFolder.title}</h3>
                      <p className="text-[11px] text-white/45 mt-2 leading-relaxed">
                        拖出到背景可移回主栏；使用角标可编辑、删除链接。
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1 pt-0.5">
                      <button
                        type="button"
                        draggable={false}
                        onClick={() => {
                          const live = shortcuts.find((s) => s.id === openFolder.id);
                          if (live && live.type === 'folder') openEditModal(live);
                        }}
                        className="rounded-xl p-2.5 text-white/85 hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/50"
                        aria-label="重命名文件夹"
                        title="重命名文件夹"
                      >
                        <Pencil size={18} className="opacity-90" />
                      </button>
                      <button
                        type="button"
                        draggable={false}
                        onClick={() => {
                          const id = openFolder.id;
                          setOpenFolder(null);
                          onRemoveShortcut(id);
                        }}
                        className="rounded-xl p-2.5 text-red-300 hover:bg-red-500/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400/45"
                        aria-label="删除文件夹"
                        title="删除文件夹"
                      >
                        <Trash2 size={18} className="opacity-90" />
                      </button>
                    </div>
                 </div>

                 <div className="px-6 py-8">
                   <div className="flex flex-wrap justify-center gap-x-10 gap-y-8">
                    {openFolder.children?.map(item => (
                        <div 
                            key={item.id} 
                            className="group/item relative flex flex-col items-center w-[92px]"
                        >
                             <div
                               className="absolute -top-1 right-0 z-20 flex gap-0.5 rounded-lg bg-black/55 p-0.5 ring-1 ring-white/15 opacity-0 shadow-lg backdrop-blur-md transition-opacity duration-200 pointer-events-auto group-hover/item:opacity-100 group-focus-within/item:opacity-100 [@media(hover:none)]:opacity-100"
                             >
                               <button
                                 type="button"
                                 draggable={false}
                                 onClick={(e) => {
                                   e.stopPropagation();
                                   openEditModal(item);
                                 }}
                                 className="rounded-md p-1.5 text-white/90 hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60"
                                 aria-label={`编辑 ${item.title}`}
                                 title="编辑"
                               >
                                 <Pencil size={14} className="opacity-90" />
                               </button>
                               <button
                                 type="button"
                                 draggable={false}
                                 onClick={(e) => {
                                   e.stopPropagation();
                                   onRemoveFromFolder(openFolder.id, item.id);
                                 }}
                                 className="rounded-md p-1.5 text-red-300 hover:bg-red-500/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400/50"
                                 aria-label={`删除 ${item.title}`}
                                 title="删除"
                               >
                                 <Trash2 size={14} className="opacity-90" />
                               </button>
                             </div>
                             <button
                                type="button"
                                draggable={true}
                                onDragStart={(e) => handleFolderItemDragStart(e, item.id)}
                                onClick={() => {
                                    if (openInNewTab) {
                                        window.open(item.url, '_blank');
                                    } else {
                                        window.location.href = item.url;
                                    }
                                }}
                                className="flex cursor-grab flex-col items-center gap-2.5 rounded-2xl p-2 transition-transform duration-200 hover:scale-[1.06] active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/50 active:cursor-grabbing"
                             >
                                <div className="w-[72px] h-[72px] rounded-full flex items-center justify-center overflow-hidden bg-gradient-to-b from-white/12 to-white/[0.04] ring-1 ring-white/15 shadow-inner">
                                     <ShortcutIcon url={item.url} title={item.title} icon={item.icon} />
                                </div>
                                <span className="text-[13px] text-white/88 font-medium text-center leading-tight line-clamp-2 w-full px-0.5">{item.title}</span>
                             </button>
                        </div>
                    ))}
                   </div>
                 </div>
              </div>
          </div>,
          document.body
      )}
    </div>
    </>
  );
};

export default ShortcutGrid;