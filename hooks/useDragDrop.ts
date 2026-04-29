import React, { useState, useRef } from "react"
import { DRAG_MERGE_DELAY_MS } from "../lib/app-constants"
import type { Shortcut } from "../types"

/**
 * 拖放状态和逻辑 Hook
 * 将 ShortcutGrid 中的拖放逻辑提取出来
 */
export function useDragDrop() {
  // Drag state
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const [mergeTargetId, setMergeTargetId] = useState<string | null>(null)
  const [isDragOverAddButton, setIsDragOverAddButton] = useState(false)
  const [isDraggingItem, setIsDraggingItem] = useState(false)
  const [isDragOutside, setIsDragOutside] = useState(false)
  const mergeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Page drag state
  const [pageDragOverId, setPageDragOverId] = useState<string | null>(null)
  const pageDragSourceRef = useRef<string | null>(null)

  /**
   * 清除合并定时器
   */
  const clearMergeTimer = () => {
    if (mergeTimerRef.current) {
      clearTimeout(mergeTimerRef.current)
      mergeTimerRef.current = null
    }
  }

  /**
   * 重置所有拖放状态
   */
  const resetDragState = () => {
    setDragOverId(null)
    setMergeTargetId(null)
    setIsDragOverAddButton(false)
    setIsDraggingItem(false)
    setIsDragOutside(false)
    clearMergeTimer()
  }

  /**
   * Item drag handlers
   */
  const itemDragHandlers = {
    onDragStart: (e: React.DragEvent, id: string, parentKey: string) => {
      e.dataTransfer.setData("shortcut-id", id)
      e.dataTransfer.setData("parent-key", parentKey)
      e.dataTransfer.effectAllowed = "move"
      setIsDraggingItem(true)
      setIsDragOutside(false)
    },

    onDragEnd: () => {
      resetDragState()
    },

    onDragOver: (e: React.DragEvent, id: string) => {
      e.preventDefault()

      if (dragOverId !== id) {
        setDragOverId(id)

        clearMergeTimer()
        setMergeTargetId(null)

        mergeTimerRef.current = setTimeout(() => {
          setMergeTargetId(id)
        }, DRAG_MERGE_DELAY_MS)
      }
    },

    onDragLeave: () => {
      // Logic handled by container
    },

    onDrop: (e: React.DragEvent, targetId: string, currentParentKey: string, onReorder: (parentKey: string, dragId: string, targetId: string) => void, onMerge: (parentKey: string, dragId: string, dropId: string) => void) => {
      e.preventDefault()
      const draggedId = e.dataTransfer.getData("shortcut-id")
      const dragParentKey = e.dataTransfer.getData("parent-key") || currentParentKey

      clearMergeTimer()

      if (draggedId && dragParentKey === currentParentKey && draggedId !== targetId) {
        if (mergeTargetId === targetId) {
          onMerge(currentParentKey, draggedId, targetId)
        } else {
          onReorder(currentParentKey, draggedId, targetId)
        }
      }

      setDragOverId(null)
      setMergeTargetId(null)
      setIsDragOverAddButton(false)
    },
  }

  /**
   * Add button drag handlers
   */
  const addButtonDragHandlers = {
    onDragOver: (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOverAddButton(true)
    },

    onDragLeave: (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOverAddButton(false)
    },

    onDrop: (
      e: React.DragEvent,
      currentParentKey: string,
      visibleItems: Shortcut[],
      onReorder: (parentKey: string, dragId: string, targetId: string) => void,
    ) => {
      e.preventDefault()
      const draggedId = e.dataTransfer.getData("shortcut-id")
      const dragParentKey = e.dataTransfer.getData("parent-key") || currentParentKey

      clearMergeTimer()

      if (draggedId && dragParentKey === currentParentKey && visibleItems.length > 0) {
        const targetId = visibleItems[visibleItems.length - 1].id
        if (draggedId !== targetId) {
          onReorder(currentParentKey, draggedId, targetId)
        }
      }

      setIsDragOverAddButton(false)
      setDragOverId(null)
      setMergeTargetId(null)
    },
  }

  /**
   * Backdrop drag handlers (empty space)
   */
  const backdropDragHandlers = {
    onDragOver: (e: React.DragEvent) => {
      e.preventDefault()
    },

    onDragLeave: () => {
      setDragOverId(null)
      setMergeTargetId(null)
      clearMergeTimer()
    },

    onDrop: (e: React.DragEvent) => {
      e.preventDefault()
      setDragOverId(null)
      setMergeTargetId(null)
      setIsDragOverAddButton(false)
    },
  }

  /**
   * Outside (delete zone) drag handlers
   */
  const outsideDragHandlers = {
    onDragOver: (e: React.DragEvent) => {
      e.preventDefault()
      if (!isDragOutside) setIsDragOutside(true)
    },

    onDrop: (e: React.DragEvent, onRemove: (id: string) => void) => {
      e.preventDefault()
      const draggedId = e.dataTransfer.getData("shortcut-id")
      if (draggedId) onRemove(draggedId)
      resetDragState()
    },
  }

  /**
   * Page tab drag handlers
   */
  const pageTabDragHandlers = {
    onDragStart: (e: React.DragEvent, folderId: string, LOOSE_KEY: string) => {
      if (folderId === LOOSE_KEY) {
        e.preventDefault()
        return
      }
      pageDragSourceRef.current = folderId
      e.dataTransfer.setData("page-folder-id", folderId)
      e.dataTransfer.effectAllowed = "move"
    },

    onDragEnd: () => {
      pageDragSourceRef.current = null
      setPageDragOverId(null)
    },

    onDragOver: (e: React.DragEvent, folderId: string) => {
      e.preventDefault()
      if (pageDragSourceRef.current) setPageDragOverId(folderId)
    },

    onDrop: (
      e: React.DragEvent,
      targetFolderId: string,
      LOOSE_KEY: string,
      onReorderFolders: (dragId: string, targetId: string) => void,
    ) => {
      e.preventDefault()
      const dragId = e.dataTransfer.getData("page-folder-id")
      pageDragSourceRef.current = null
      setPageDragOverId(null)
      if (!dragId || dragId === targetFolderId || targetFolderId === LOOSE_KEY) return
      if (dragId === LOOSE_KEY) return
      onReorderFolders(dragId, targetFolderId)
    },
  }

  /**
   * Container drag handlers (mark not outside)
   */
  const containerDragHandlers = {
    onDragEnter: () => setIsDragOutside(false),
  }

  return {
    // State
    dragOverId,
    mergeTargetId,
    isDragOverAddButton,
    isDraggingItem,
    isDragOutside,
    pageDragOverId,

    // Handlers
    itemDragHandlers,
    addButtonDragHandlers,
    backdropDragHandlers,
    outsideDragHandlers,
    pageTabDragHandlers,
    containerDragHandlers,

    // Utils
    resetDragState,
  }
}
