import type { Shortcut } from "../types"
import { ITAB_LOOSE_PARENT_KEY } from "./shortcuts-tree"

/**
 * 深度查找 shortcut by id
 */
export function findShortcutById(list: Shortcut[], id: string): Shortcut | null {
  for (const s of list) {
    if (s.id === id) return s
    if (s.children?.length) {
      const nested = findShortcutById(s.children, id)
      if (nested) return nested
    }
  }
  return null
}

/**
 * 获取根级未分组的链接（非 folder）
 */
export function getLooseShortcuts(shortcuts: Shortcut[]): Shortcut[] {
  return shortcuts.filter((s) => s.type !== "folder")
}

/**
 * 获取指定页面（loose 或 folder）的基础条目
 */
export function getBaseItemsForPage(shortcuts: Shortcut[], activePageId: string): Shortcut[] {
  if (activePageId === ITAB_LOOSE_PARENT_KEY) return getLooseShortcuts(shortcuts)
  const folder = shortcuts.find((s) => s.id === activePageId && s.type === "folder")
  return folder?.children ?? []
}

/**
 * 根据当前页面 + 钻入路径，解析出最终可见的条目列表
 */
export function resolveVisibleItems(
  shortcuts: Shortcut[],
  activePageId: string,
  drillIds: string[],
): Shortcut[] {
  let list = getBaseItemsForPage(shortcuts, activePageId)
  for (const id of drillIds) {
    const node = list.find((s) => s.id === id)
    if (!node || node.type !== "folder") return []
    list = node.children ?? []
  }
  return list
}

/**
 * 修剪无效的钻入路径（folder 被删除或不存在）
 */
export function trimInvalidDrill(
  shortcuts: Shortcut[],
  activePageId: string,
  drillIds: string[],
): string[] {
  let list = getBaseItemsForPage(shortcuts, activePageId)
  const kept: string[] = []
  for (const id of drillIds) {
    const node = list.find((s) => s.id === id)
    if (!node || node.type !== "folder") break
    kept.push(id)
    list = node.children ?? []
  }
  return kept
}

/**
 * 获取当前操作的父级 key（用于添加/排序/合并操作）
 */
export function getCurrentParentKey(activePageId: string, drillIds: string[]): string {
  if (drillIds.length === 0) {
    return activePageId === ITAB_LOOSE_PARENT_KEY ? ITAB_LOOSE_PARENT_KEY : activePageId
  }
  return drillIds[drillIds.length - 1]
}
