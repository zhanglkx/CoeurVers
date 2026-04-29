import React, { useState, useRef, useEffect, useLayoutEffect } from "react"
import { createPortal } from "react-dom"
import { Pencil, Trash2 } from "lucide-react"
import type { Shortcut } from "../types"
import { ICON_LABEL_SPACE_PX } from "../lib/app-constants"
import { ShortcutIcon } from "./ShortcutIcon"

interface FolderPreviewProps {
  items: Shortcut[]
}

const FolderPreview: React.FC<FolderPreviewProps> = ({ items }) => {
  const previewItems = items.slice(0, 4)
  return (
    <div className="grid h-[60%] w-[60%] grid-cols-2 grid-rows-2 gap-1 rounded-3xl bg-transparent p-2">
      {previewItems.map((item) => (
        <div key={item.id} className="relative w-full h-full rounded-full overflow-hidden">
          <ShortcutIcon url={item.url} title={item.title} icon={item.icon} size="small" />
        </div>
      ))}
    </div>
  )
}

interface ContextMenuProps {
  anchorRect: DOMRect
  onEdit: () => void
  onRemove: () => void
  onClose: () => void
}

const CONTEXT_MENU_WIDTH = 140
const CONTEXT_MENU_GAP = 6

/**
 * 右键菜单（portal + 视口翻转）
 * 默认尝试：锚点右侧 → 右越界改左侧 → 下越界上移
 */
const ContextMenu: React.FC<ContextMenuProps> = ({ anchorRect, onEdit, onRemove, onClose }) => {
  const menuRef = useRef<HTMLDivElement>(null)
  const [coords, setCoords] = useState<{ left: number; top: number } | null>(null)

  useLayoutEffect(() => {
    const vw = window.innerWidth
    const vh = window.innerHeight
    const el = menuRef.current
    const height = el?.offsetHeight ?? 96
    const width = el?.offsetWidth ?? CONTEXT_MENU_WIDTH

    let left = anchorRect.right + CONTEXT_MENU_GAP
    if (left + width > vw - 8) {
      left = Math.max(8, anchorRect.left - width - CONTEXT_MENU_GAP)
    }

    let top = anchorRect.top
    if (top + height > vh - 8) {
      top = Math.max(8, vh - height - 8)
    }

    setCoords({ left, top })
  }, [anchorRect])

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose()
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("mousedown", handleOutside)
    document.addEventListener("keydown", handleEscape)
    return () => {
      document.removeEventListener("mousedown", handleOutside)
      document.removeEventListener("keydown", handleEscape)
    }
  }, [onClose])

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      aria-orientation="vertical"
      className="pointer-events-auto fixed z-[101] min-w-[140px] overflow-hidden rounded-2xl bg-neutral-900/85 p-1.5 shadow-2xl ring-1 ring-white/10 backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-150"
      style={{
        left: coords?.left ?? -9999,
        top: coords?.top ?? -9999,
        visibility: coords ? "visible" : "hidden",
      }}
    >
      <button
        type="button"
        role="menuitem"
        draggable={false}
        onClick={(e) => {
          e.stopPropagation()
          onClose()
          onEdit()
        }}
        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/90 transition-colors hover:bg-white/10 focus:outline-none focus-visible:bg-white/10 active:bg-white/15"
      >
        <Pencil size={15} className="shrink-0 opacity-75" />
        <span>编辑</span>
      </button>
      <div className="mx-3 my-1 h-px bg-white/10" />
      <button
        type="button"
        role="menuitem"
        draggable={false}
        onClick={(e) => {
          e.stopPropagation()
          onClose()
          onRemove()
        }}
        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-red-400 transition-colors hover:bg-red-500/15 focus:outline-none focus-visible:bg-red-500/15 active:bg-red-500/25"
      >
        <Trash2 size={15} className="shrink-0 opacity-75" />
        <span>删除</span>
      </button>
    </div>,
    document.body,
  )
}

ContextMenu.displayName = "ContextMenu"

interface ShortcutItemProps {
  shortcut: Shortcut
  size: number
  isMergeTarget: boolean
  isReorderTarget: boolean
  onRemove: (id: string) => void
  onEdit: (id: string) => void
  onClickFolder: (s: Shortcut) => void
  onItemDragStart: (e: React.DragEvent, id: string) => void
  onItemDragOver: (e: React.DragEvent, id: string) => void
  onItemDrop: (e: React.DragEvent, id: string) => void
  onItemDragEnd: () => void
}

export const ShortcutItem = React.memo<ShortcutItemProps>(
  ({
    shortcut,
    size,
    isMergeTarget,
    isReorderTarget,
    onRemove,
    onEdit,
    onClickFolder,
    onItemDragStart,
    onItemDragOver,
    onItemDrop,
    onItemDragEnd,
  }) => {
    const isFolder = shortcut.type === "folder"
    const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null)

    const handleClick = () => {
      if (isFolder) {
        onClickFolder(shortcut)
        return
      }
      if (!shortcut.url) return
      if (/^(javascript|data|vbscript):/i.test(shortcut.url)) return
      window.location.href = shortcut.url
    }

    const ariaLabel = isFolder
      ? `打开文件夹 ${shortcut.title}`
      : `打开 ${shortcut.title}${shortcut.url ? `（${shortcut.url}）` : ""}`

    return (
      <div
        className={`relative group flex shrink-0 flex-col items-center transition-all duration-200 ${
          isReorderTarget ? "translate-x-2 opacity-80" : ""
        }`}
        style={{ width: `${size + ICON_LABEL_SPACE_PX}px` }}
        onContextMenu={(e) => {
          e.preventDefault()
          e.stopPropagation()
          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
          setAnchorRect(rect)
        }}
        onDragOver={(e) => onItemDragOver(e, shortcut.id)}
        onDrop={(e) => onItemDrop(e, shortcut.id)}
      >
        {isReorderTarget && !isMergeTarget && (
          <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-1 h-12 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)] z-0 animate-pulse" />
        )}

        {anchorRect && (
          <ContextMenu
            anchorRect={anchorRect}
            onEdit={() => onEdit(shortcut.id)}
            onRemove={() => onRemove(shortcut.id)}
            onClose={() => setAnchorRect(null)}
          />
        )}

        <button
          type="button"
          draggable={true}
          aria-label={ariaLabel}
          onDragStart={(e) => onItemDragStart(e, shortcut.id)}
          onDragEnd={onItemDragEnd}
          onClick={handleClick}
          className={`flex flex-col items-center rounded-xl p-0 transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)] hover:scale-110 active:scale-95 group-hover:z-10 ${
            isMergeTarget ? "z-20 scale-125 bg-white/10 ring-4 ring-blue-500/30" : ""
          }`}
        >
          <div
            className="relative mb-2 flex items-center justify-center overflow-hidden rounded-xl ring-1 ring-white/10 transition-all duration-300 hover:ring-white/20"
            style={{
              width: `${size}px`,
              height: `${size}px`,
              background: shortcut.iconBgColor ?? "transparent",
            }}
          >
            {isFolder && shortcut.children ? (
              <FolderPreview items={shortcut.children} />
            ) : (
              <ShortcutIcon url={shortcut.url} title={shortcut.title} icon={shortcut.icon} />
            )}
          </div>
          <span
            className="truncate px-1 text-center text-sm font-medium text-white/90 drop-shadow-md select-none"
            style={{ maxWidth: `${size + ICON_LABEL_SPACE_PX}px` }}
          >
            {shortcut.title}
          </span>
        </button>
      </div>
    )
  },
  (prev, next) =>
    prev.shortcut.id === next.shortcut.id &&
    prev.shortcut.title === next.shortcut.title &&
    prev.shortcut.url === next.shortcut.url &&
    prev.shortcut.icon === next.shortcut.icon &&
    prev.shortcut.iconBgColor === next.shortcut.iconBgColor &&
    prev.shortcut.children === next.shortcut.children &&
    prev.isMergeTarget === next.isMergeTarget &&
    prev.isReorderTarget === next.isReorderTarget &&
    prev.size === next.size,
)

ShortcutItem.displayName = "ShortcutItem"
