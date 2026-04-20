import type { Shortcut } from "../types"

/** 虚拟「未分组」页与树操作中的根级链接父键 */
export const ITAB_LOOSE_PARENT_KEY = "__loose__"

export function normalizeItabBookmarksRoot(items: Shortcut[]): Shortcut[] {
  const loose = items.filter((s) => s.type !== "folder")
  const folders = items.filter((s) => s.type === "folder")
  return [...loose, ...folders]
}

function reorderInArray(arr: Shortcut[], dragId: string, targetId: string): Shortcut[] {
  const dragIndex = arr.findIndex((s) => s.id === dragId)
  const targetIndex = arr.findIndex((s) => s.id === targetId)
  if (dragIndex === -1 || targetIndex === -1 || dragIndex === targetIndex) return arr
  const next = [...arr]
  const [removed] = next.splice(dragIndex, 1)
  next.splice(targetIndex, 0, removed)
  return next
}

/** 在同一数组内合并：与旧版根级合并规则一致 */
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

export function addShortcutUnderParent(
  items: Shortcut[],
  parentKey: string,
  shortcut: Shortcut,
): Shortcut[] {
  if (parentKey === ITAB_LOOSE_PARENT_KEY) {
    const norm = normalizeItabBookmarksRoot(items)
    const loose = norm.filter((s) => s.type !== "folder")
    const folders = norm.filter((s) => s.type === "folder")
    return [...loose, shortcut, ...folders]
  }
  return addToFolderChildrenDeep(items, parentKey, shortcut)
}

export function reorderSiblingsUnderParent(
  items: Shortcut[],
  parentKey: string,
  dragId: string,
  targetId: string,
): Shortcut[] {
  if (parentKey === ITAB_LOOSE_PARENT_KEY) {
    const norm = normalizeItabBookmarksRoot(items)
    const loose = norm.filter((s) => s.type !== "folder")
    const folders = norm.filter((s) => s.type === "folder")
    return [...reorderInArray(loose, dragId, targetId), ...folders]
  }
  return mapFolderChildren(items, parentKey, (children) => reorderInArray(children, dragId, targetId))
}

export function mergeSiblingsUnderParent(
  items: Shortcut[],
  parentKey: string,
  dragId: string,
  dropId: string,
): Shortcut[] {
  if (parentKey === ITAB_LOOSE_PARENT_KEY) {
    const norm = normalizeItabBookmarksRoot(items)
    const loose = norm.filter((s) => s.type !== "folder")
    const folders = norm.filter((s) => s.type === "folder")
    return [...mergeInShortcutArray(loose, dragId, dropId), ...folders]
  }
  return mapFolderChildren(items, parentKey, (children) => mergeInShortcutArray(children, dragId, dropId))
}

export function reorderRootFolders(items: Shortcut[], dragId: string, targetId: string): Shortcut[] {
  const norm = normalizeItabBookmarksRoot(items)
  const loose = norm.filter((s) => s.type !== "folder")
  const folders = norm.filter((s) => s.type === "folder")
  const dragIndex = folders.findIndex((s) => s.id === dragId)
  const targetIndex = folders.findIndex((s) => s.id === targetId)
  if (dragIndex === -1 || targetIndex === -1 || dragIndex === targetIndex) return norm
  const nextFolders = [...folders]
  const [removed] = nextFolders.splice(dragIndex, 1)
  nextFolders.splice(targetIndex, 0, removed)
  return [...loose, ...nextFolders]
}

export function editShortcutInTree(
  items: Shortcut[],
  id: string,
  title: string,
  url: string,
  iconPatch?: string | null,
  iconBgColorPatch?: string | null,
): Shortcut[] {
  return items.map((s) => {
    if (s.id === id) {
      if (s.type === "folder") return { ...s, title, url }

      let updated: Shortcut = { ...s, title, url }

      if (iconPatch !== undefined) {
        if (iconPatch === null) {
          const { icon: _removed, ...rest } = updated
          updated = rest as Shortcut
        } else {
          updated = { ...updated, icon: iconPatch }
        }
      }

      if (iconBgColorPatch !== undefined) {
        if (iconBgColorPatch === null) {
          const { iconBgColor: _removed, ...rest } = updated
          updated = rest as Shortcut
        } else {
          updated = { ...updated, iconBgColor: iconBgColorPatch }
        }
      }

      return updated
    }
    if (s.children?.length) return { ...s, children: editShortcutInTree(s.children, id, title, url, iconPatch, iconBgColorPatch) }
    return s
  })
}

export function reorderRootShortcuts(items: Shortcut[], dragId: string, targetId: string): Shortcut[] {
  return reorderInArray(items, dragId, targetId)
}

export function mergeShortcutsAtRoot(items: Shortcut[], dragId: string, dropId: string): Shortcut[] {
  return mergeInShortcutArray(items, dragId, dropId)
}

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

/** 从任意深度的文件夹中取出条目并挂到根级「未分组」（松散链接区） */
export function moveShortcutFromFolderToRoot(items: Shortcut[], folderId: string, itemId: string): Shortcut[] {
  const itemToMove = findChildInFolder(items, folderId, itemId)
  if (!itemToMove) return items

  let updated = removeShortcutFromFolder(items, folderId, itemId)
  const folderWasAtRoot = items.some((s) => s.id === folderId)
  if (folderWasAtRoot) updated = unwrapRootFolderIfSingleton(updated, folderId)
  const norm = normalizeItabBookmarksRoot(updated)
  const loose = norm.filter((s) => s.type !== "folder")
  const folders = norm.filter((s) => s.type === "folder")
  return [...loose, itemToMove, ...folders]
}

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
