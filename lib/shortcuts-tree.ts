import type { Shortcut } from "../types"

export function editShortcutInTree(
  items: Shortcut[],
  id: string,
  title: string,
  url: string,
  iconPatch?: string | null,
): Shortcut[] {
  return items.map((s) => {
    if (s.id === id) {
      if (s.type === "folder") return { ...s, title, url }
      if (iconPatch === undefined) return { ...s, title, url }
      if (iconPatch === null) {
        const { icon: _removed, ...rest } = s
        return { ...rest, title, url }
      }
      return { ...s, title, url, icon: iconPatch }
    }
    if (s.children?.length) return { ...s, children: editShortcutInTree(s.children, id, title, url, iconPatch) }
    return s
  })
}

export function reorderRootShortcuts(items: Shortcut[], dragId: string, targetId: string): Shortcut[] {
  const dragIndex = items.findIndex((s) => s.id === dragId)
  const targetIndex = items.findIndex((s) => s.id === targetId)
  if (dragIndex === -1 || targetIndex === -1 || dragIndex === targetIndex) return items
  const next = [...items]
  const [removed] = next.splice(dragIndex, 1)
  next.splice(targetIndex, 0, removed)
  return next
}

export function mergeShortcutsAtRoot(items: Shortcut[], dragId: string, dropId: string): Shortcut[] {
  const draggedItem = items.find((s) => s.id === dragId)
  const dropTarget = items.find((s) => s.id === dropId)
  if (!draggedItem || !dropTarget || draggedItem.id === dropTarget.id) return items
  if (draggedItem.type === "folder" && dropTarget.type === "folder") return items

  const newShortcuts = items.filter((s) => s.id !== dragId)
  const targetIndex = newShortcuts.findIndex((s) => s.id === dropId)
  if (targetIndex === -1) return items

  if (dropTarget.type === "folder") {
    const updatedFolder = {
      ...dropTarget,
      children: [...(dropTarget.children || []), draggedItem],
    }
    newShortcuts[targetIndex] = updatedFolder
  } else {
    const newFolder: Shortcut = {
      id: `folder-${Date.now()}`,
      title: "Folder",
      url: "",
      type: "folder",
      children: [dropTarget, draggedItem],
    }
    newShortcuts[targetIndex] = newFolder
  }
  return newShortcuts
}

export function removeShortcutFromFolder(items: Shortcut[], folderId: string, itemId: string): Shortcut[] {
  return items
    .map((s) => {
      if (s.id === folderId && s.children) {
        const newChildren = s.children.filter((c) => c.id !== itemId)
        return { ...s, children: newChildren }
      }
      return s
    })
    .filter((s) => s.type !== "folder" || (s.children && s.children.length > 0))
}

export function moveShortcutFromFolderToRoot(items: Shortcut[], folderId: string, itemId: string): Shortcut[] {
  const folderIndex = items.findIndex((s) => s.id === folderId)
  const folder = items.find((s) => s.id === folderId)
  if (!folder || !folder.children || folderIndex === -1) return items

  const itemToMove = folder.children.find((c) => c.id === itemId)
  if (!itemToMove) return items

  let updatedShortcuts = items.map((s) => {
    if (s.id === folderId && s.children) return { ...s, children: s.children.filter((c) => c.id !== itemId) }
    return s
  })

  const updatedFolder = updatedShortcuts.find((s) => s.id === folderId)
  if (updatedFolder && updatedFolder.children && updatedFolder.children.length === 1) {
    const lastItem = updatedFolder.children[0]
    updatedShortcuts = updatedShortcuts.filter((s) => s.id !== folderId)
    updatedShortcuts.splice(folderIndex, 0, lastItem)
    updatedShortcuts.push(itemToMove)
  } else if (updatedFolder && updatedFolder.children && updatedFolder.children.length === 0) {
    updatedShortcuts = updatedShortcuts.filter((s) => s.id !== folderId)
    updatedShortcuts.push(itemToMove)
  } else updatedShortcuts.push(itemToMove)

  return updatedShortcuts
}
