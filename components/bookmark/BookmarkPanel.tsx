import React, { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Plus, ChevronLeft } from 'lucide-react'
import type { Shortcut } from '../../types'
import { ShortcutItem } from '../ShortcutItem'
import {
  BOOKMARK_GRID_GAP_X,
  BOOKMARK_GRID_GAP_Y,
  ICON_LABEL_SPACE_PX,
} from '../../lib/app-constants'

interface BreadcrumbSegment {
  id: string
  label: string
}

interface BookmarkPanelProps {
  activePageId: string
  visibleItems: Shortcut[]
  breadcrumbSegments: BreadcrumbSegment[]
  hasDrill: boolean
  onDrillBack: () => void
  iconSize: number
  dragOverId: string | null
  mergeTargetId: string | null
  isDragOverAddButton: boolean
  onOpenAddModal: () => void
  onRemoveShortcut: (id: string) => void
  onEditShortcutById: (id: string) => void
  onDrillIntoFolder: (s: Shortcut) => void
  onItemDragStart: (e: React.DragEvent, id: string) => void
  onItemDragOver: (e: React.DragEvent, id: string) => void
  onItemDrop: (e: React.DragEvent, targetId: string) => void
  onItemDragEnd: () => void
  onContainerDragEnter: (e: React.DragEvent) => void
  onBackdropDragLeave: () => void
  onBackdropDrop: (e: React.DragEvent) => void
  onAddButtonDragOver: (e: React.DragEvent) => void
  onAddButtonDragLeave: (e: React.DragEvent) => void
  onAddButtonDrop: (e: React.DragEvent) => void
}

type BookmarkGridCell =
  | { kind: 'shortcut'; shortcut: Shortcut }
  | { kind: 'add' }

/**
 * 右侧主面板：面包屑 + 自适应网格（含"+"按钮）
 */
export const BookmarkPanel: React.FC<BookmarkPanelProps> = ({
  activePageId,
  visibleItems,
  breadcrumbSegments,
  hasDrill,
  onDrillBack,
  iconSize,
  dragOverId,
  mergeTargetId,
  isDragOverAddButton,
  onOpenAddModal,
  onRemoveShortcut,
  onEditShortcutById,
  onDrillIntoFolder,
  onItemDragStart,
  onItemDragOver,
  onItemDrop,
  onItemDragEnd,
  onContainerDragEnter,
  onBackdropDragLeave,
  onBackdropDrop,
  onAddButtonDragOver,
  onAddButtonDragLeave,
  onAddButtonDrop,
}) => {
  const bookmarkGapY = BOOKMARK_GRID_GAP_Y
  const bookmarkGapX = BOOKMARK_GRID_GAP_X
  const cellWidthPx = iconSize + ICON_LABEL_SPACE_PX

  const gridMeasureRef = useRef<HTMLDivElement>(null)
  const [columnsPerRow, setColumnsPerRow] = useState(() => {
    if (typeof window === 'undefined') return 1
    const guess = Math.max(240, window.innerWidth * 0.62)
    return Math.max(1, Math.floor((guess + bookmarkGapX) / (cellWidthPx + bookmarkGapX)))
  })

  useLayoutEffect(() => {
    const el = gridMeasureRef.current
    if (!el) return
    function columnsForWidth(w: number) {
      if (w <= 0) return
      const n = Math.max(1, Math.floor((w + bookmarkGapX) / (cellWidthPx + bookmarkGapX)))
      setColumnsPerRow((prev) => (prev === n ? prev : n))
    }
    function measureFromObserver(entries: ResizeObserverEntry[]) {
      const entry = entries[0]
      if (!entry) return
      columnsForWidth(entry.contentRect.width)
    }
    {
      const s = getComputedStyle(el)
      const pl = parseFloat(s.paddingLeft) || 0
      const pr = parseFloat(s.paddingRight) || 0
      columnsForWidth(el.clientWidth - pl - pr)
    }
    const ro = new ResizeObserver(measureFromObserver)
    ro.observe(el)
    return () => ro.disconnect()
  }, [bookmarkGapX, cellWidthPx])

  const gridCells = useMemo<BookmarkGridCell[]>(
    () => [
      ...visibleItems.map((shortcut) => ({ kind: 'shortcut' as const, shortcut })),
      { kind: 'add' as const },
    ],
    [visibleItems],
  )

  return (
    <div
      id="bookmark-panel"
      role="tabpanel"
      aria-labelledby={`bookmark-tab-${activePageId}`}
      className="flex h-full max-h-full min-h-0 min-w-0 flex-1 flex-col rounded-2xl border border-white/10 bg-black/20 backdrop-blur-md"
    >
      <div className="flex shrink-0 items-center gap-2 border-b border-white/10 px-3 py-2.5 sm:px-4">
        {hasDrill ? (
          <button
            type="button"
            onClick={onDrillBack}
            className="shrink-0 rounded-lg p-1.5 text-white/80 hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50"
            aria-label="返回上一级"
          >
            <ChevronLeft size={18} />
          </button>
        ) : null}
        <nav
          className="flex min-w-0 flex-1 flex-wrap items-center gap-x-1 gap-y-0.5 text-[11px] text-white/65 sm:text-xs"
          aria-label="当前位置"
        >
          {breadcrumbSegments.map((seg, i) => (
            <span key={seg.id} className="flex items-center gap-1.5">
              {i > 0 ? <span className="text-white/30">/</span> : null}
              <span
                className={
                  i === breadcrumbSegments.length - 1 ? 'font-semibold text-white/95' : ''
                }
              >
                {seg.label}
              </span>
            </span>
          ))}
        </nav>
      </div>

      <div
        ref={gridMeasureRef}
        className="scrollbar-hide grid min-h-0 min-w-0 flex-1 justify-items-stretch overflow-x-hidden overflow-y-auto p-3 transition-all duration-300 sm:p-4 [&::-webkit-scrollbar]:h-0 [&::-webkit-scrollbar]:w-0 [scrollbar-width:none]"
        style={{
          gridTemplateColumns: `repeat(${columnsPerRow}, ${cellWidthPx}px)`,
          columnGap: bookmarkGapX,
          rowGap: bookmarkGapY,
          justifyContent: 'center',
          alignContent: 'flex-start',
        }}
        onDragEnter={onContainerDragEnter}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={onBackdropDragLeave}
        onDrop={onBackdropDrop}
      >
        {gridCells.map((cell) =>
          cell.kind === 'shortcut' ? (
            <ShortcutItem
              key={cell.shortcut.id}
              shortcut={cell.shortcut}
              onRemove={onRemoveShortcut}
              onEdit={onEditShortcutById}
              onClickFolder={onDrillIntoFolder}
              onItemDragStart={onItemDragStart}
              onItemDragOver={onItemDragOver}
              onItemDrop={onItemDrop}
              onItemDragEnd={onItemDragEnd}
              isMergeTarget={mergeTargetId === cell.shortcut.id}
              isReorderTarget={
                dragOverId === cell.shortcut.id && mergeTargetId !== cell.shortcut.id
              }
              size={iconSize}
            />
          ) : (
            <div
              key="__bookmark-add__"
              className={`relative flex min-w-0 shrink-0 flex-col items-center transition-all duration-200 ${
                isDragOverAddButton ? 'translate-x-2 opacity-80' : ''
              }`}
              style={{ width: `${cellWidthPx}px` }}
              onDragOver={onAddButtonDragOver}
              onDragLeave={onAddButtonDragLeave}
              onDrop={onAddButtonDrop}
            >
              {isDragOverAddButton ? (
                <div className="absolute -left-3 top-1/2 z-0 h-12 w-1 -translate-y-1/2 animate-pulse rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
              ) : null}

              <button
                type="button"
                onClick={onOpenAddModal}
                className={`group flex flex-col items-center rounded-xl p-2 transition-all duration-300 hover:scale-110 hover:opacity-100 ${
                  isDragOverAddButton
                    ? 'scale-110 bg-white/10 ring-4 ring-blue-500/30'
                    : 'opacity-50'
                }`}
                draggable={false}
              >
                <div
                  className="flex items-center justify-center rounded-xl bg-transparent ring-1 ring-white/10 transition-colors hover:bg-white/10"
                  style={{ width: `${iconSize}px`, height: `${iconSize}px` }}
                >
                  <Plus size={iconSize * 0.35} className="text-white/60" />
                </div>
              </button>
            </div>
          ),
        )}
      </div>
    </div>
  )
}
