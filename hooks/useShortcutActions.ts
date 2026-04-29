import { useCallback } from "react"
import type { Dispatch, SetStateAction } from "react"
import type { Shortcut } from "../types"
import {
  addShortcutUnderParent as addShortcutUnderParentInTree,
  editShortcutInTreeLegacy,
  removeShortcutDeep,
  reorderSiblingsUnderParent,
  mergeSiblingsUnderParent,
  reorderRootFolders,
} from "../lib/shortcuts-tree"

/**
 * 高阶函数：将树操作绑定到 setState
 */
function bindTreeOp<Args extends any[]>(
  setShortcuts: Dispatch<SetStateAction<Shortcut[]>>,
  op: (items: Shortcut[], ...args: Args) => Shortcut[],
) {
  return (...args: Args) => setShortcuts((prev) => op(prev, ...args))
}

/**
 * Shortcut 操作的 Hook
 * 消除 App.tsx 中的 8 个包装函数
 */
export function useShortcutActions(setShortcuts: Dispatch<SetStateAction<Shortcut[]>>) {
  const add = useCallback(
    bindTreeOp(setShortcuts, addShortcutUnderParentInTree),
    [setShortcuts],
  )

  const remove = useCallback(
    bindTreeOp(setShortcuts, removeShortcutDeep),
    [setShortcuts],
  )

  const edit = useCallback(
    bindTreeOp(setShortcuts, editShortcutInTreeLegacy),
    [setShortcuts],
  )

  const reorderSiblings = useCallback(
    bindTreeOp(setShortcuts, reorderSiblingsUnderParent),
    [setShortcuts],
  )

  const mergeSiblings = useCallback(
    bindTreeOp(setShortcuts, mergeSiblingsUnderParent),
    [setShortcuts],
  )

  const reorderFolders = useCallback(
    bindTreeOp(setShortcuts, reorderRootFolders),
    [setShortcuts],
  )

  const addRootFolder = useCallback(
    (folder: Shortcut) => {
      setShortcuts((prev) => [...prev, folder])
    },
    [setShortcuts],
  )

  return {
    add,
    remove,
    edit,
    reorderSiblings,
    mergeSiblings,
    reorderFolders,
    addRootFolder,
  }
}
