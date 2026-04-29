import { useState, useRef } from "react"
import type { Shortcut } from "../types"
import { TEXT_ICON_SWATCHES } from "../lib/text-icon"

/**
 * 图标源类型
 */
export type AddIconSource = "default" | "official" | "text" | "upload"
export type EditIconSource = "current" | "official" | "text" | "upload"

/**
 * Modal 状态管理 Hook
 * 将 ShortcutGrid 中的 Modal 状态逻辑提取出来
 */
export function useModalState() {
  // Add Modal state
  const [isAdding, setIsAdding] = useState(false)
  const [newUrl, setNewUrl] = useState("")
  const [newName, setNewName] = useState("")
  const [addIconSource, setAddIconSource] = useState<AddIconSource>("default")
  const [addOfficialUrl, setAddOfficialUrl] = useState<string | null>(null)
  const [addTextSwatchIndex, setAddTextSwatchIndex] = useState(0)
  const [addUploadDataUrl, setAddUploadDataUrl] = useState<string | null>(null)
  const [addIconFetchError, setAddIconFetchError] = useState<string | null>(null)
  const [addIsFetchingIcon, setAddIsFetchingIcon] = useState(false)
  const [addIconBgColor, setAddIconBgColor] = useState<string | null>(null)
  const addIconFileInputRef = useRef<HTMLInputElement>(null)

  // Edit Modal state
  const [isEditing, setIsEditing] = useState(false)
  const [editingShortcut, setEditingShortcut] = useState<Shortcut | null>(null)
  const [editUrl, setEditUrl] = useState("")
  const [editName, setEditName] = useState("")
  const [editIconSource, setEditIconSource] = useState<EditIconSource>("current")
  const [editOfficialUrl, setEditOfficialUrl] = useState<string | null>(null)
  const [editTextSwatchIndex, setEditTextSwatchIndex] = useState(0)
  const [editUploadDataUrl, setEditUploadDataUrl] = useState<string | null>(null)
  const [editIconBgColor, setEditIconBgColor] = useState<string | null>(null)
  const [iconFetchError, setIconFetchError] = useState<string | null>(null)
  const [isFetchingIcon, setIsFetchingIcon] = useState(false)
  const iconFileInputRef = useRef<HTMLInputElement>(null)

  /**
   * 打开添加 Modal
   */
  const openAddModal = () => {
    setNewUrl("")
    setNewName("")
    setAddIconSource("default")
    setAddOfficialUrl(null)
    setAddTextSwatchIndex(0)
    setAddUploadDataUrl(null)
    setAddIconFetchError(null)
    setAddIsFetchingIcon(false)
    setAddIconBgColor(null)
    setIsAdding(true)
  }

  /**
   * 关闭添加 Modal
   */
  const closeAddModal = () => {
    setIsAdding(false)
    setNewUrl("")
    setNewName("")
    setAddIconSource("default")
    setAddOfficialUrl(null)
    setAddTextSwatchIndex(0)
    setAddUploadDataUrl(null)
    setAddIconFetchError(null)
    setAddIsFetchingIcon(false)
    setAddIconBgColor(null)
  }

  /**
   * 打开编辑 Modal
   */
  const openEditModal = (shortcut: Shortcut) => {
    setEditingShortcut(shortcut)
    setEditName(shortcut.title)
    setEditUrl(shortcut.url || "")
    setEditIconSource("current")
    setEditOfficialUrl(null)
    setEditTextSwatchIndex(0)
    setEditUploadDataUrl(null)
    setEditIconBgColor(shortcut.iconBgColor ?? null)
    setIconFetchError(null)
    setIsFetchingIcon(false)
    setIsEditing(true)
  }

  /**
   * 关闭编辑 Modal
   */
  const closeEditModal = () => {
    setIsEditing(false)
    setEditingShortcut(null)
    setEditName("")
    setEditUrl("")
    setEditIconSource("current")
    setEditOfficialUrl(null)
    setEditTextSwatchIndex(0)
    setEditUploadDataUrl(null)
    setEditIconBgColor(null)
    setIconFetchError(null)
    setIsFetchingIcon(false)
  }

  /**
   * 获取当前选中的文字图标色卡
   */
  const getAddTextSwatch = () => TEXT_ICON_SWATCHES[addTextSwatchIndex] ?? TEXT_ICON_SWATCHES[0]
  const getEditTextSwatch = () => TEXT_ICON_SWATCHES[editTextSwatchIndex] ?? TEXT_ICON_SWATCHES[0]

  return {
    // Add Modal
    addModal: {
      isOpen: isAdding,
      url: newUrl,
      name: newName,
      iconSource: addIconSource,
      officialUrl: addOfficialUrl,
      textSwatchIndex: addTextSwatchIndex,
      uploadDataUrl: addUploadDataUrl,
      iconBgColor: addIconBgColor,
      fetchError: addIconFetchError,
      isFetching: addIsFetchingIcon,
      fileInputRef: addIconFileInputRef,
      setUrl: setNewUrl,
      setName: setNewName,
      setIconSource: setAddIconSource,
      setOfficialUrl: setAddOfficialUrl,
      setTextSwatchIndex: setAddTextSwatchIndex,
      setUploadDataUrl: setAddUploadDataUrl,
      setIconBgColor: setAddIconBgColor,
      setFetchError: setAddIconFetchError,
      setIsFetching: setAddIsFetchingIcon,
      getTextSwatch: getAddTextSwatch,
      open: openAddModal,
      close: closeAddModal,
    },

    // Edit Modal
    editModal: {
      isOpen: isEditing,
      shortcut: editingShortcut,
      url: editUrl,
      name: editName,
      iconSource: editIconSource,
      officialUrl: editOfficialUrl,
      textSwatchIndex: editTextSwatchIndex,
      uploadDataUrl: editUploadDataUrl,
      iconBgColor: editIconBgColor,
      fetchError: iconFetchError,
      isFetching: isFetchingIcon,
      fileInputRef: iconFileInputRef,
      setUrl: setEditUrl,
      setName: setEditName,
      setIconSource: setEditIconSource,
      setOfficialUrl: setEditOfficialUrl,
      setTextSwatchIndex: setEditTextSwatchIndex,
      setUploadDataUrl: setEditUploadDataUrl,
      setIconBgColor: setEditIconBgColor,
      setFetchError: setIconFetchError,
      setIsFetching: setIsFetchingIcon,
      getTextSwatch: getEditTextSwatch,
      open: openEditModal,
      close: closeEditModal,
    },
  }
}
