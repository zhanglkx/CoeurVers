import type { Shortcut } from "../types"

/** 虚拟「未分组」页与树操作中的根级链接父键 */
export const ITAB_LOOSE_PARENT_KEY = "__loose__"

/**
 * 工具：将数组按条件分割为两部分
 */
function partition<T>(arr: T[], predicate: (item: T) => boolean): [T[], T[]] {
  const pass: T[] = []
  const fail: T[] = []
  for (const item of arr) {
    if (predicate(item)) pass.push(item)
    else fail.push(item)
  }
  return [pass, fail]
}

/**
 * 标准化根级顺序：链接在前，文件夹在后
 */
export function normalizeItabBookmarksRoot(items: Shortcut[]): Shortcut[] {
  const [loose, folders] = partition(items, (s) => s.type !== "folder")
  return [...loose, ...folders]
}

/**
 * 高阶函数：对 loose links 应用变换，保持 folders 不变
 */
function transformLooseLinks(
  items: Shortcut[],
  transform: (loose: Shortcut[]) => Shortcut[],
): Shortcut[] {
  const norm = normalizeItabBookmarksRoot(items)
  const [loose, folders] = partition(norm, (s) => s.type !== "folder")
  return [...transform(loose), ...folders]
}

/**
 * 在数组中重排序
 */
function reorderInArray(arr: Shortcut[], dragId: string, targetId: string): Shortcut[] {
  const dragIndex = arr.findIndex((s) => s.id === dragId)
  const targetIndex = arr.findIndex((s) => s.id === targetId)
  if (dragIndex === -1 || targetIndex === -1 || dragIndex === targetIndex) return arr
  const next = [...arr]
  const [removed] = next.splice(dragIndex, 1)
  next.splice(targetIndex, 0, removed)
  return next
}

/**
 * 在同一数组内合并：与旧版根级合并规则一致
 */
export function mergeInShortcutArray(arr: Shortcut[], dragId: string, dropId: string): Shortcut[] {
  const draggedItem = arr.find((s) => s.id === dragId)
  const dropTarget = arr.find((s) => s.id === dropId)
  if (!draggedItem || !dropTarget || draggedItem.id === dropTarget.id) return arr
  if (draggedItem.type === "folder" && dropTarget.type === "folder") return arr

  const newArr = arr.filter((s) => s.id !== dragId)
  const targetIndex = newArr.findIndex((s) => s.id === dropId)
  if (targetIndex === -1) return arr

  if (dropTarget.type === "folder") {
    const updatedFolder = {
      ...dropTarget,
      children: [...(dropTarget.children || []), draggedItem],
    }
    newArr[targetIndex] = updatedFolder
  } else {
    const newFolder: Shortcut = {
      id: `folder-${Date.now()}`,
      title: "Folder",
      url: "",
      type: "folder",
      children: [dropTarget, draggedItem],
    }
    newArr[targetIndex] = newFolder
  }
  return newArr
}

/**
 * 对文件夹的子项应用变换
 */
function mapFolderChildren(
  items: Shortcut[],
  folderId: string,
  mapChildren: (children: Shortcut[]) => Shortcut[],
): Shortcut[] {
  return items.map((s) => {
    if (s.id === folderId && s.type === "folder") {
      return { ...s, children: mapChildren(s.children || []) }
    }
    if (s.children?.length) {
      return { ...s, children: mapFolderChildren(s.children, folderId, mapChildren) }
    }
    return s
  })
}

/**
 * 深度添加到文件夹
 */
function addToFolderChildrenDeep(items: Shortcut[], folderId: string, shortcut: Shortcut): Shortcut[] {
  return items.map((s) => {
    if (s.id === folderId && s.type === "folder") {
      return { ...s, children: [...(s.children || []), shortcut] }
    }
    if (s.children?.length) {
      return { ...s, children: addToFolderChildrenDeep(s.children, folderId, shortcut) }
    }
    return s
  })
}

/**
 * 在指定父级下添加 shortcut
 */
export function addShortcutUnderParent(
  items: Shortcut[],
  parentKey: string,
  shortcut: Shortcut,
): Shortcut[] {
  if (parentKey === ITAB_LOOSE_PARENT_KEY) {
    return transformLooseLinks(items, (loose) => [...loose, shortcut])
  }
  return addToFolderChildrenDeep(items, parentKey, shortcut)
}

/**
 * 在同一父级下重排兄弟节点
 */
export function reorderSiblingsUnderParent(
  items: Shortcut[],
  parentKey: string,
  dragId: string,
  targetId: string,
): Shortcut[] {
  if (parentKey === ITAB_LOOSE_PARENT_KEY) {
    return transformLooseLinks(items, (loose) => reorderInArray(loose, dragId, targetId))
  }
  return mapFolderChildren(items, parentKey, (children) => reorderInArray(children, dragId, targetId))
}

/**
 * 在同一父级下合并兄弟节点
 */
export function mergeSiblingsUnderParent(
  items: Shortcut[],
  parentKey: string,
  dragId: string,
  dropId: string,
): Shortcut[] {
  if (parentKey === ITAB_LOOSE_PARENT_KEY) {
    return transformLooseLinks(items, (loose) => mergeInShortcutArray(loose, dragId, dropId))
  }
  return mapFolderChildren(items, parentKey, (children) => mergeInShortcutArray(children, dragId, dropId))
}

/**
 * 重排根级文件夹顺序
 */
export function reorderRootFolders(items: Shortcut[], dragId: string, targetId: string): Shortcut[] {
  const norm = normalizeItabBookmarksRoot(items)
  const [loose, folders] = partition(norm, (s) => s.type !== "folder")
  const dragIndex = folders.findIndex((s) => s.id === dragId)
  const targetIndex = folders.findIndex((s) => s.id === targetId)
  if (dragIndex === -1 || targetIndex === -1 || dragIndex === targetIndex) return norm
  const nextFolders = [...folders]
  const [removed] = nextFolders.splice(dragIndex, 1)
  nextFolders.splice(targetIndex, 0, removed)
  return [...loose, ...nextFolders]
}

/**
 * Patch 类型：清晰表达属性的修改意图
 */
type Patch<T> = { action: "keep" } | { action: "remove" } | { action: "set"; value: T }

/**
 * 应用单个属性的 patch
 */
function applyPatch<T extends object, K extends keyof T>(obj: T, key: K, patch: Patch<T[K]> | undefined): T {
  if (!patch || patch.action === "keep") return obj
  if (patch.action === "remove") {
    const { [key]: _, ...rest } = obj
    return rest as T
  }
  return { ...obj, [key]: patch.value }
}

/**
 * Shortcut 编辑的 patch 结构
 */
export interface ShortcutEditPatch {
  title?: string
  url?: string
  icon?: Patch<string>
  iconBgColor?: Patch<string>
}

/**
 * 编辑 shortcut（支持优雅的 patch 语法）
 */
export function editShortcutInTree(items: Shortcut[], id: string, patch: ShortcutEditPatch): Shortcut[] {
  return items.map((s) => {
    if (s.id === id) {
      let result = s
      if (patch.title !== undefined) result = { ...result, title: patch.title }
      if (patch.url !== undefined) result = { ...result, url: patch.url }
      if (patch.icon) result = applyPatch(result, "icon", patch.icon)
      if (patch.iconBgColor) result = applyPatch(result, "iconBgColor", patch.iconBgColor)
      return result
    }
    if (s.children?.length) {
      return { ...s, children: editShortcutInTree(s.children, id, patch) }
    }
    return s
  })
}

/**
 * 兼容旧 API：将旧的可选参数转换为 patch
 */
export function editShortcutInTreeLegacy(
  items: Shortcut[],
  id: string,
  title: string,
  url: string,
  iconPatch?: string | null,
  iconBgColorPatch?: string | null,
): Shortcut[] {
  const patch: ShortcutEditPatch = { title, url }

  if (iconPatch !== undefined) {
    patch.icon = iconPatch === null ? { action: "remove" } : { action: "set", value: iconPatch }
  }

  if (iconBgColorPatch !== undefined) {
    patch.iconBgColor =
      iconBgColorPatch === null ? { action: "remove" } : { action: "set", value: iconBgColorPatch }
  }

  return editShortcutInTree(items, id, patch)
}

/**
 * 以下保持向后兼容的旧 API
 */
export function reorderRootShortcuts(items: Shortcut[], dragId: string, targetId: string): Shortcut[] {
  return reorderInArray(items, dragId, targetId)
}

export function mergeShortcutsAtRoot(items: Shortcut[], dragId: string, dropId: string): Shortcut[] {
  return mergeInShortcutArray(items, dragId, dropId)
}

/**
 * 从文件夹中移除 shortcut
 */
export function removeShortcutFromFolder(items: Shortcut[], folderId: string, itemId: string): Shortcut[] {
  return items
    .map((s) => {
      if (s.id === folderId && s.children) {
        const newChildren = s.children.filter((c) => c.id !== itemId)
        return { ...s, children: newChildren }
      }
      if (s.children?.length) {
        return { ...s, children: removeShortcutFromFolder(s.children, folderId, itemId) }
      }
      return s
    })
    .filter((s) => s.type !== "folder" || (s.children && s.children.length > 0))
}

/**
 * 在文件夹中查找子项
 */
function findChildInFolder(items: Shortcut[], folderId: string, itemId: string): Shortcut | null {
  for (const s of items) {
    if (s.id === folderId && s.children) {
      return s.children.find((c) => c.id === itemId) ?? null
    }
    if (s.children?.length) {
      const nested = findChildInFolder(s.children, folderId, itemId)
      if (nested) return nested
    }
  }
  return null
}

/**
 * 单子文件夹自动展开
 */
function unwrapRootFolderIfSingleton(items: Shortcut[], folderId: string): Shortcut[] {
  const idx = items.findIndex((s) => s.id === folderId)
  if (idx === -1) return items
  const f = items[idx]
  if (f.type !== "folder" || !f.children?.length) return items
  if (f.children.length === 1) {
    return [...items.slice(0, idx), f.children[0], ...items.slice(idx + 1)]
  }
  return items
}

/**
 * 从任意深度的文件夹中取出条目并挂到根级「未分组」（松散链接区）
 */
export function moveShortcutFromFolderToRoot(items: Shortcut[], folderId: string, itemId: string): Shortcut[] {
  const itemToMove = findChildInFolder(items, folderId, itemId)
  if (!itemToMove) return items

  let updated = removeShortcutFromFolder(items, folderId, itemId)
  const folderWasAtRoot = items.some((s) => s.id === folderId)
  if (folderWasAtRoot) updated = unwrapRootFolderIfSingleton(updated, folderId)

  return transformLooseLinks(updated, (loose) => [...loose, itemToMove])
}

/**
 * 深度删除 shortcut
 */
export function removeShortcutDeep(items: Shortcut[], id: string): Shortcut[] {
  return items
    .map((s) => {
      if (s.id === id) return null
      if (s.children?.length) {
        return { ...s, children: removeShortcutDeep(s.children, id) }
      }
      return s
    })
    .filter((s): s is Shortcut => s !== null)
    .filter((s) => s.type !== "folder" || (s.children && s.children.length > 0))
}
