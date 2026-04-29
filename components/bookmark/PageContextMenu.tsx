import React from 'react'
import { createPortal } from 'react-dom'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { ITAB_LOOSE_PARENT_KEY } from '../../lib/shortcuts-tree'

interface PageContextMenuProps {
  x: number
  y: number
  pageId: string
  onAddPage: () => void
  onRename: () => void
  onDelete: () => void
  onClose: () => void
}

/**
 * 侧边栏页签右键菜单。仅在非松散分页上提供"重命名 / 删除"。
 */
export const PageContextMenu: React.FC<PageContextMenuProps> = ({
  x,
  y,
  pageId,
  onAddPage,
  onRename,
  onDelete,
  onClose,
}) => {
  const showPageOps = pageId && pageId !== ITAB_LOOSE_PARENT_KEY

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-[200]"
        onClick={onClose}
        onContextMenu={(e) => {
          e.preventDefault()
          onClose()
        }}
      />
      <div
        role="menu"
        aria-orientation="vertical"
        className="fixed z-[201] min-w-[140px] overflow-hidden rounded-xl border border-white/10 bg-black/80 py-1 shadow-2xl backdrop-blur-xl"
        style={{ left: x, top: y }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          role="menuitem"
          onClick={onAddPage}
          className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] text-white/90 transition-colors hover:bg-white/10"
        >
          <Plus size={14} className="shrink-0 text-white/60" />
          新建页面
        </button>
        {showPageOps && (
          <>
            <button
              type="button"
              role="menuitem"
              onClick={onRename}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] text-white/90 transition-colors hover:bg-white/10"
            >
              <Pencil size={14} className="shrink-0 text-white/60" />
              重命名
            </button>
            <div className="my-1 border-t border-white/10" />
            <button
              type="button"
              role="menuitem"
              onClick={onDelete}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] text-red-400 transition-colors hover:bg-red-500/15"
            >
              <Trash2 size={14} className="shrink-0" />
              删除页面
            </button>
          </>
        )}
      </div>
    </>,
    document.body,
  )
}
