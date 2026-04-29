import React from 'react'
import { Plus } from 'lucide-react'
import type { BookmarkNavState } from '../../lib/storage-codecs'
import { ITAB_LOOSE_PARENT_KEY } from '../../lib/shortcuts-tree'

// BookmarkNavState 在 onNavChange 回调中使用

export interface SidebarPage {
  id: string
  title: string
}

interface BookmarkSidebarProps {
  pages: SidebarPage[]
  activePageId: string
  pageDragOverId: string | null
  renamingPageId: string | null
  renameValue: string
  onRenameChange: (value: string) => void
  onRenameSubmit: () => void
  onRenameCancel: () => void
  onChangeActivePage: (pageId: string) => void
  onPageTabDragStart: (e: React.DragEvent, folderId: string) => void
  onPageTabDragEnd: () => void
  onPageTabDragOver: (e: React.DragEvent, folderId: string) => void
  onPageTabDrop: (e: React.DragEvent, targetFolderId: string) => void
  onPageTabContextMenu: (e: React.MouseEvent, pageId: string) => void
  onAsideContextMenu: (e: React.MouseEvent) => void
  onAddPage: () => void
  onNavChange: (next: BookmarkNavState) => void
}

/**
 * 左侧书签页签栏（含拖拽排序 / 键盘导航 / 重命名）
 */
export const BookmarkSidebar: React.FC<BookmarkSidebarProps> = ({
  pages,
  activePageId,
  pageDragOverId,
  renamingPageId,
  renameValue,
  onRenameChange,
  onRenameSubmit,
  onRenameCancel,
  onChangeActivePage,
  onPageTabDragStart,
  onPageTabDragEnd,
  onPageTabDragOver,
  onPageTabDrop,
  onPageTabContextMenu,
  onAsideContextMenu,
  onAddPage,
  onNavChange,
}) => {
  function handleTabListKey(e: React.KeyboardEvent) {
    if (pages.length < 2) return
    const idx = pages.findIndex((p) => p.id === activePageId)
    if (idx === -1) return
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      e.preventDefault()
      const next = pages[Math.min(idx + 1, pages.length - 1)]
      onNavChange({ activePageId: next.id, drillFolderIds: [] })
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault()
      const next = pages[Math.max(idx - 1, 0)]
      onNavChange({ activePageId: next.id, drillFolderIds: [] })
    }
  }

  return (
    <aside
      className="scrollbar-hide flex h-full max-h-full min-h-0 w-32 shrink-0 flex-col gap-1 overflow-y-auto overflow-x-hidden rounded-2xl border border-white/10 bg-black/25 py-2 backdrop-blur-md"
      aria-label="书签分页"
      onContextMenu={onAsideContextMenu}
    >
      <div
        role="tablist"
        aria-orientation="vertical"
        tabIndex={0}
        className="flex flex-col gap-0.5 px-1.5 outline-none focus-visible:ring-2 focus-visible:ring-amber-400/40 rounded-lg"
        onKeyDown={handleTabListKey}
      >
        {pages.map((page) => {
          const isActive = activePageId === page.id
          const isDraggable = page.id !== ITAB_LOOSE_PARENT_KEY
          const isRenaming = renamingPageId === page.id
          return (
            <button
              key={page.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              id={`bookmark-tab-${page.id}`}
              aria-controls="bookmark-panel"
              draggable={isDraggable && !isRenaming}
              onDragStart={(e) => onPageTabDragStart(e, page.id)}
              onDragEnd={onPageTabDragEnd}
              onDragOver={(e) => onPageTabDragOver(e, page.id)}
              onDrop={(e) => onPageTabDrop(e, page.id)}
              onContextMenu={(e) => onPageTabContextMenu(e, page.id)}
              onClick={() => {
                if (isRenaming) return
                onChangeActivePage(page.id)
              }}
              className={`w-full rounded-xl px-2.5 py-2 text-left transition-colors ${
                isActive
                  ? 'bg-white/15 text-white shadow-inner ring-1 ring-white/15'
                  : 'text-white/75 hover:bg-white/10 hover:text-white'
              } ${pageDragOverId === page.id ? 'ring-2 ring-amber-400/50' : ''}`}
            >
              {isRenaming ? (
                <input
                  value={renameValue}
                  onChange={(e) => onRenameChange(e.target.value)}
                  onBlur={onRenameSubmit}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      onRenameSubmit()
                    }
                    if (e.key === 'Escape') onRenameCancel()
                    e.stopPropagation()
                  }}
                  onClick={(e) => e.stopPropagation()}
                  autoFocus
                  className="w-full bg-transparent text-[13px] font-medium text-white outline-none caret-white"
                />
              ) : (
                <span className="line-clamp-3 text-[13px] font-medium leading-snug">
                  {page.title}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <div className="mt-auto px-1.5 pb-1 pt-1">
        <button
          type="button"
          title="新建页面"
          onClick={onAddPage}
          className="flex w-full items-center justify-center gap-1 rounded-xl py-1.5 text-white/40 transition-colors hover:bg-white/10 hover:text-white/80"
        >
          <Plus size={14} />
          <span className="text-[11px]">新建页面</span>
        </button>
      </div>
    </aside>
  )
}
