import React, { useCallback, useEffect, useMemo, useState } from 'react'
import type { Shortcut, GridConfig } from '../types'
import type { BookmarkNavState } from '../lib/storage-codecs'
import { ITAB_LOOSE_PARENT_KEY } from '../lib/shortcuts-tree'
import { DEFAULT_ICON_SIZE } from '../lib/app-constants'
import { useModalState } from '../hooks/useModalState'
import { useDragDrop } from '../hooks/useDragDrop'
import {
  findShortcutById,
  getLooseShortcuts,
  getBaseItemsForPage,
  resolveVisibleItems,
  trimInvalidDrill,
  getCurrentParentKey,
} from '../lib/bookmark-navigation'

import { BookmarkSidebar, type SidebarPage } from './bookmark/BookmarkSidebar'
import { BookmarkPanel } from './bookmark/BookmarkPanel'
import { AddShortcutModal } from './bookmark/AddShortcutModal'
import { EditShortcutModal } from './bookmark/EditShortcutModal'
import { PageContextMenu } from './bookmark/PageContextMenu'
import { DeleteZone } from './bookmark/DeleteZone'

interface ShortcutGridProps {
  shortcuts: Shortcut[]
  gridConfig: GridConfig
  bookmarkNav: BookmarkNavState
  onBookmarkNavChange: (next: BookmarkNavState) => void
  onAddShortcutUnderParent: (parentKey: string, shortcut: Shortcut) => void
  onAddRootFolder: (folder: Shortcut) => void
  onRemoveShortcut: (id: string) => void
  onEditShortcut: (
    id: string,
    title: string,
    url: string,
    iconPatch?: string | null,
    iconBgColorPatch?: string | null,
  ) => void
  onReorderSiblings: (parentKey: string, dragId: string, targetId: string) => void
  onMergeSiblings: (parentKey: string, dragId: string, dropId: string) => void
  onReorderRootFolders: (dragId: string, targetId: string) => void
}

const ShortcutGrid: React.FC<ShortcutGridProps> = ({
  shortcuts,
  gridConfig,
  bookmarkNav,
  onBookmarkNavChange,
  onAddShortcutUnderParent,
  onAddRootFolder,
  onRemoveShortcut,
  onEditShortcut,
  onReorderSiblings,
  onMergeSiblings,
  onReorderRootFolders,
}) => {
  const { addModal, editModal } = useModalState()
  const drag = useDragDrop()

  const [pageContextMenu, setPageContextMenu] = useState<{
    x: number
    y: number
    pageId: string
  } | null>(null)
  const [renamingPageId, setRenamingPageId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')

  const sidebarPages = useMemo<SidebarPage[]>(() => {
    const loose = getLooseShortcuts(shortcuts)
    const folders = shortcuts.filter((s) => s.type === 'folder')
    const pages: SidebarPage[] = []
    if (loose.length) pages.push({ id: ITAB_LOOSE_PARENT_KEY, title: '未分组' })
    folders.forEach((f) => pages.push({ id: f.id, title: f.title }))
    return pages
  }, [shortcuts])

  const currentParentKey = useMemo(
    () => getCurrentParentKey(bookmarkNav.activePageId, bookmarkNav.drillFolderIds),
    [bookmarkNav.activePageId, bookmarkNav.drillFolderIds],
  )

  const visibleItems = useMemo(
    () => resolveVisibleItems(shortcuts, bookmarkNav.activePageId, bookmarkNav.drillFolderIds),
    [shortcuts, bookmarkNav.activePageId, bookmarkNav.drillFolderIds],
  )

  const breadcrumbSegments = useMemo(() => {
    const segs: { id: string; label: string }[] = []
    const pageMeta = sidebarPages.find((p) => p.id === bookmarkNav.activePageId)
    segs.push({
      id: `page-${bookmarkNav.activePageId}`,
      label: pageMeta?.title ?? '页面',
    })
    let list = getBaseItemsForPage(shortcuts, bookmarkNav.activePageId)
    for (const drillId of bookmarkNav.drillFolderIds) {
      const node = list.find((x) => x.id === drillId)
      if (!node) break
      segs.push({ id: node.id, label: node.title })
      list = node.type === 'folder' ? node.children ?? [] : []
    }
    return segs
  }, [shortcuts, bookmarkNav.activePageId, bookmarkNav.drillFolderIds, sidebarPages])

  // 分页数据漂移时自动修正 activePageId / drillFolderIds
  useEffect(() => {
    if (!sidebarPages.length) {
      if (
        bookmarkNav.activePageId !== ITAB_LOOSE_PARENT_KEY ||
        bookmarkNav.drillFolderIds.length > 0
      ) {
        onBookmarkNavChange({ activePageId: ITAB_LOOSE_PARENT_KEY, drillFolderIds: [] })
      }
      return
    }
    if (!sidebarPages.some((p) => p.id === bookmarkNav.activePageId)) {
      onBookmarkNavChange({ activePageId: sidebarPages[0].id, drillFolderIds: [] })
      return
    }
    const trimmed = trimInvalidDrill(
      shortcuts,
      bookmarkNav.activePageId,
      bookmarkNav.drillFolderIds,
    )
    if (trimmed.length !== bookmarkNav.drillFolderIds.length) {
      onBookmarkNavChange({ ...bookmarkNav, drillFolderIds: trimmed })
    }
  }, [shortcuts, sidebarPages, bookmarkNav, onBookmarkNavChange])

  // 编辑 modal：url 改动时清空官方图标缓存，并把 source 从 official 切回 current
  useEffect(() => {
    if (!editModal.isOpen || !editModal.shortcut || editModal.shortcut.type === 'folder') return
    editModal.setOfficialUrl(null)
    editModal.setFetchError(null)
    editModal.setIconSource((prev) => (prev === 'official' ? 'current' : prev))
  }, [editModal.url, editModal.isOpen, editModal.shortcut?.id, editModal.shortcut?.type, editModal.setOfficialUrl, editModal.setFetchError, editModal.setIconSource])

  // 添加 modal：url/name 改动时清空官方图标缓存，并把 source 从 official 切回 default
  useEffect(() => {
    if (!addModal.isOpen) return
    addModal.setOfficialUrl(null)
    addModal.setFetchError(null)
    addModal.setIconSource((prev) => (prev === 'official' ? 'default' : prev))
  }, [addModal.url, addModal.name, addModal.isOpen, addModal.setOfficialUrl, addModal.setFetchError, addModal.setIconSource])

  // ESC: 按优先级关闭 Add Modal → Edit Modal → 页面右键菜单 → 重命名
  useEffect(() => {
    if (!addModal.isOpen && !editModal.isOpen && !pageContextMenu && !renamingPageId) return
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Escape') return
      if (addModal.isOpen) addModal.close()
      else if (editModal.isOpen) editModal.close()
      else if (pageContextMenu) setPageContextMenu(null)
      else if (renamingPageId) setRenamingPageId(null)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [
    addModal.isOpen,
    editModal.isOpen,
    pageContextMenu,
    renamingPageId,
    addModal.close,
    editModal.close,
  ])

  const iconSize = gridConfig.iconSize ?? DEFAULT_ICON_SIZE

  // --- 下钻 / 上返 ---
  const drillIntoFolder = useCallback(
    (s: Shortcut) => {
      if (s.type !== 'folder') return
      onBookmarkNavChange({
        ...bookmarkNav,
        drillFolderIds: [...bookmarkNav.drillFolderIds, s.id],
      })
    },
    [bookmarkNav, onBookmarkNavChange],
  )

  const drillBack = useCallback(() => {
    onBookmarkNavChange({
      ...bookmarkNav,
      drillFolderIds: bookmarkNav.drillFolderIds.slice(0, -1),
    })
  }, [bookmarkNav, onBookmarkNavChange])

  // --- Modal 提交 ---
  const handleAddSubmit = useCallback(
    (shortcut: Shortcut) => onAddShortcutUnderParent(currentParentKey, shortcut),
    [currentParentKey, onAddShortcutUnderParent],
  )

  const handleEditByIdOpen = useCallback(
    (id: string) => {
      const shortcut = findShortcutById(shortcuts, id)
      if (shortcut) editModal.open(shortcut)
    },
    [shortcuts, editModal],
  )

  // --- Drag handlers（桥接到 useDragDrop） ---
  const handleDragStart = useCallback(
    (e: React.DragEvent, id: string) => {
      drag.itemDragHandlers.onDragStart(e, id, currentParentKey)
    },
    [drag.itemDragHandlers, currentParentKey],
  )
  const handleDragOver = useCallback(
    (e: React.DragEvent, id: string) => drag.itemDragHandlers.onDragOver(e, id),
    [drag.itemDragHandlers],
  )
  const handleDrop = useCallback(
    (e: React.DragEvent, targetId: string) => {
      drag.itemDragHandlers.onDrop(
        e,
        targetId,
        currentParentKey,
        onReorderSiblings,
        onMergeSiblings,
      )
    },
    [drag.itemDragHandlers, currentParentKey, onReorderSiblings, onMergeSiblings],
  )
  const handleDragEnd = useCallback(
    () => drag.itemDragHandlers.onDragEnd(),
    [drag.itemDragHandlers],
  )

  const handleAddButtonDragOver = useCallback(
    (e: React.DragEvent) => drag.addButtonDragHandlers.onDragOver(e),
    [drag.addButtonDragHandlers],
  )
  const handleAddButtonDragLeave = useCallback(
    (e: React.DragEvent) => drag.addButtonDragHandlers.onDragLeave(e),
    [drag.addButtonDragHandlers],
  )
  const handleAddButtonDrop = useCallback(
    (e: React.DragEvent) => {
      drag.addButtonDragHandlers.onDrop(e, currentParentKey, visibleItems, onReorderSiblings)
    },
    [drag.addButtonDragHandlers, currentParentKey, visibleItems, onReorderSiblings],
  )

  const handleBackdropDrop = useCallback(
    (e: React.DragEvent) => drag.backdropDragHandlers.onDrop(e),
    [drag.backdropDragHandlers],
  )
  const handleBackdropDragLeave = useCallback(
    () => drag.backdropDragHandlers.onDragLeave(),
    [drag.backdropDragHandlers],
  )
  const handleOutsideDrop = useCallback(
    (e: React.DragEvent) => drag.outsideDragHandlers.onDrop(e, onRemoveShortcut),
    [drag.outsideDragHandlers, onRemoveShortcut],
  )
  const handleOutsideDragOver = useCallback(
    (e: React.DragEvent) => drag.outsideDragHandlers.onDragOver(e),
    [drag.outsideDragHandlers],
  )

  // --- Sidebar 页签拖拽 ---
  const handlePageTabDragStart = useCallback(
    (e: React.DragEvent, folderId: string) =>
      drag.pageTabDragHandlers.onDragStart(e, folderId, ITAB_LOOSE_PARENT_KEY),
    [drag.pageTabDragHandlers],
  )
  const handlePageTabDragEnd = useCallback(
    () => drag.pageTabDragHandlers.onDragEnd(),
    [drag.pageTabDragHandlers],
  )
  const handlePageTabDragOver = useCallback(
    (e: React.DragEvent, folderId: string) => drag.pageTabDragHandlers.onDragOver(e, folderId),
    [drag.pageTabDragHandlers],
  )
  const handlePageTabDrop = useCallback(
    (e: React.DragEvent, targetFolderId: string) => {
      drag.pageTabDragHandlers.onDrop(
        e,
        targetFolderId,
        ITAB_LOOSE_PARENT_KEY,
        onReorderRootFolders,
      )
    },
    [drag.pageTabDragHandlers, onReorderRootFolders],
  )

  // --- Sidebar 上下文菜单 ---
  const handlePageTabContextMenu = useCallback((e: React.MouseEvent, pageId: string) => {
    e.preventDefault()
    setPageContextMenu({ x: e.clientX, y: e.clientY, pageId })
  }, [])

  const handleAsideContextMenu = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button[role="tab"]')) return
    e.preventDefault()
    setPageContextMenu({ x: e.clientX, y: e.clientY, pageId: '' })
  }, [])

  const handleContextAddPage = useCallback(() => {
    const newFolder: Shortcut = {
      id: `folder-${Date.now()}`,
      title: '新页面',
      url: '',
      type: 'folder',
      children: [],
    }
    onAddRootFolder(newFolder)
    setPageContextMenu(null)
  }, [onAddRootFolder])

  const handleContextRename = useCallback(() => {
    if (!pageContextMenu) return
    const page = sidebarPages.find((p) => p.id === pageContextMenu.pageId)
    if (!page || page.id === ITAB_LOOSE_PARENT_KEY) return
    setRenamingPageId(pageContextMenu.pageId)
    setRenameValue(page.title)
    setPageContextMenu(null)
  }, [pageContextMenu, sidebarPages])

  const handleContextDelete = useCallback(() => {
    if (!pageContextMenu) return
    const { pageId } = pageContextMenu
    setPageContextMenu(null)
    if (pageId === ITAB_LOOSE_PARENT_KEY) return
    onRemoveShortcut(pageId)
  }, [pageContextMenu, onRemoveShortcut])

  const handleRenameSubmit = useCallback(() => {
    if (!renamingPageId) {
      setRenamingPageId(null)
      return
    }
    const trimmed = renameValue.trim()
    if (trimmed) {
      const folder = shortcuts.find((s) => s.id === renamingPageId)
      onEditShortcut(renamingPageId, trimmed, folder?.url ?? '')
    }
    setRenamingPageId(null)
  }, [renamingPageId, renameValue, shortcuts, onEditShortcut])

  const handleChangeActivePage = useCallback(
    (pageId: string) => onBookmarkNavChange({ activePageId: pageId, drillFolderIds: [] }),
    [onBookmarkNavChange],
  )

  return (
    <>
      <DeleteZone
        visible={drag.isDraggingItem}
        isDragOutside={drag.isDragOutside}
        onDragOver={handleOutsideDragOver}
        onDrop={handleOutsideDrop}
      />

      <div
        className="z-10 mx-auto flex h-full min-h-0 max-h-full w-full min-w-0 max-w-[90vw] gap-4 px-0"
        onDragEnter={drag.containerDragHandlers.onDragEnter}
      >
        <BookmarkSidebar
          pages={sidebarPages}
          activePageId={bookmarkNav.activePageId}
          pageDragOverId={drag.pageDragOverId}
          renamingPageId={renamingPageId}
          renameValue={renameValue}
          onRenameChange={setRenameValue}
          onRenameSubmit={handleRenameSubmit}
          onRenameCancel={() => setRenamingPageId(null)}
          onChangeActivePage={handleChangeActivePage}
          onPageTabDragStart={handlePageTabDragStart}
          onPageTabDragEnd={handlePageTabDragEnd}
          onPageTabDragOver={handlePageTabDragOver}
          onPageTabDrop={handlePageTabDrop}
          onPageTabContextMenu={handlePageTabContextMenu}
          onAsideContextMenu={handleAsideContextMenu}
          onAddPage={handleContextAddPage}
          onNavChange={onBookmarkNavChange}
        />

        <BookmarkPanel
          activePageId={bookmarkNav.activePageId}
          visibleItems={visibleItems}
          breadcrumbSegments={breadcrumbSegments}
          hasDrill={bookmarkNav.drillFolderIds.length > 0}
          onDrillBack={drillBack}
          iconSize={iconSize}
          dragOverId={drag.dragOverId}
          mergeTargetId={drag.mergeTargetId}
          isDragOverAddButton={drag.isDragOverAddButton}
          onOpenAddModal={addModal.open}
          onRemoveShortcut={onRemoveShortcut}
          onEditShortcutById={handleEditByIdOpen}
          onDrillIntoFolder={drillIntoFolder}
          onItemDragStart={handleDragStart}
          onItemDragOver={handleDragOver}
          onItemDrop={handleDrop}
          onItemDragEnd={handleDragEnd}
          onContainerDragEnter={drag.containerDragHandlers.onDragEnter}
          onBackdropDragLeave={handleBackdropDragLeave}
          onBackdropDrop={handleBackdropDrop}
          onAddButtonDragOver={handleAddButtonDragOver}
          onAddButtonDragLeave={handleAddButtonDragLeave}
          onAddButtonDrop={handleAddButtonDrop}
        />
      </div>

      <AddShortcutModal state={addModal} onSubmit={handleAddSubmit} />
      <EditShortcutModal state={editModal} onSubmit={onEditShortcut} />

      {pageContextMenu && (
        <PageContextMenu
          x={pageContextMenu.x}
          y={pageContextMenu.y}
          pageId={pageContextMenu.pageId}
          onAddPage={handleContextAddPage}
          onRename={handleContextRename}
          onDelete={handleContextDelete}
          onClose={() => setPageContextMenu(null)}
        />
      )}
    </>
  )
}

export default ShortcutGrid
