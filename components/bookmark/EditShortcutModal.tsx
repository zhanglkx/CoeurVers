import React, { useMemo } from 'react'
import { createPortal } from 'react-dom'
import { X, Loader2 } from 'lucide-react'
import { TEXT_ICON_SWATCHES, generateTextIconDataUrl } from '../../lib/text-icon'
import { fetchBestSiteIconUrl } from '../../lib/site-icon'
import { previewFaviconFromField, formatUrlForSave } from '../../lib/url-utils'
import type { useModalState } from '../../hooks/useModalState'
import {
  IconBgColorPicker,
  IconSourceTile,
  TextIconSwatchPicker,
  UploadTilePlaceholder,
} from './shortcut-form-parts'

type EditModalState = ReturnType<typeof useModalState>['editModal']

interface EditShortcutModalProps {
  state: EditModalState
  onSubmit: (
    id: string,
    title: string,
    url: string,
    iconPatch?: string | null,
    iconBgColorPatch?: string | null,
  ) => void
}

/**
 * 编辑快捷方式弹窗（门户渲染到 body）
 * 文件夹只显示名称字段；链接完整显示所有图标选项
 */
export const EditShortcutModal: React.FC<EditShortcutModalProps> = ({ state, onSubmit }) => {
  const {
    isOpen,
    shortcut: editingShortcut,
    url: editUrl,
    name: editName,
    iconSource,
    officialUrl,
    textSwatchIndex,
    uploadDataUrl,
    iconBgColor,
    fetchError,
    isFetching,
    fileInputRef,
    setUrl: setEditUrl,
    setName: setEditName,
    setIconSource,
    setOfficialUrl,
    setTextSwatchIndex,
    setUploadDataUrl,
    setIconBgColor,
    setFetchError,
    setIsFetching,
    close,
  } = state

  const isFolder = editingShortcut?.type === 'folder'

  const currentPreviewSrc = useMemo(() => {
    if (!isOpen || !editingShortcut || isFolder) return ''
    return editingShortcut.icon || previewFaviconFromField(editUrl) || ''
  }, [isOpen, editingShortcut, isFolder, editUrl])

  const textIconPreview = useMemo(() => {
    const swatch = TEXT_ICON_SWATCHES[textSwatchIndex] ?? TEXT_ICON_SWATCHES[0]
    return generateTextIconDataUrl(editName, swatch)
  }, [editName, textSwatchIndex])

  async function handleFetchSiteIcon() {
    if (!editingShortcut || isFolder) return
    setFetchError(null)
    setIsFetching(true)
    try {
      const resolved = await fetchBestSiteIconUrl(editUrl)
      if (!resolved) {
        setFetchError('无法获取图标，请检查地址')
        return
      }
      setOfficialUrl(resolved)
      setIconSource('official')
    } finally {
      setIsFetching(false)
    }
  }

  function handleIconFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !file.type.startsWith('image/')) return
    if (file.size > 450 * 1024) {
      setFetchError('图片请小于 450KB')
      return
    }
    setFetchError(null)
    const reader = new FileReader()
    reader.onload = () => {
      const r = reader.result
      if (typeof r === 'string') {
        setUploadDataUrl(r)
        setIconSource('upload')
      }
    }
    reader.readAsDataURL(file)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!editingShortcut || !editName) return

    if (isFolder) {
      onSubmit(editingShortcut.id, editName, editingShortcut.url || '')
      close()
      return
    }

    const formattedUrl = formatUrlForSave(editUrl)
    if (!formattedUrl) {
      alert('Invalid URL format')
      return
    }

    let iconPatch: string | null | undefined
    if (iconSource === 'official' && officialUrl) iconPatch = officialUrl
    else if (iconSource === 'text')
      iconPatch = generateTextIconDataUrl(
        editName,
        TEXT_ICON_SWATCHES[textSwatchIndex] ?? TEXT_ICON_SWATCHES[0],
      )
    else if (iconSource === 'upload' && uploadDataUrl) iconPatch = uploadDataUrl

    // null 清除背景；字符串设置新值；undefined 不变（此处总是传）
    const iconBgColorPatch: string | null = iconBgColor ?? null

    onSubmit(editingShortcut.id, editName, formattedUrl, iconPatch, iconBgColorPatch)
    close()
  }

  if (!isOpen || !editingShortcut) return null

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 p-4">
      <div
        className={`bg-[#1A1A1A] border border-white/10 p-6 rounded-3xl w-full shadow-2xl scale-100 animate-in zoom-in-95 duration-200 relative ${
          isFolder ? 'max-w-sm' : 'max-w-md'
        }`}
      >
        <button
          onClick={close}
          className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>
        <h3 className="text-xl font-semibold text-white mb-6">
          {isFolder ? '编辑文件夹' : '编辑快捷方式'}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isFolder && (
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleIconFileChange}
            />
          )}

          {!isFolder && (
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1 uppercase tracking-wider">
                地址
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={editUrl}
                  onChange={(e) => setEditUrl(e.target.value)}
                  className="min-w-0 flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-amber-500/80 transition-colors"
                  placeholder="https://example.com"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleFetchSiteIcon}
                  disabled={isFetching || !editUrl.trim()}
                  className="shrink-0 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-sm font-medium transition-colors disabled:opacity-40 disabled:pointer-events-none"
                >
                  {isFetching ? <Loader2 size={18} className="animate-spin" /> : null}
                  {isFetching ? '获取中' : '获取图标'}
                </button>
              </div>
              {fetchError ? <p className="mt-1.5 text-xs text-red-400">{fetchError}</p> : null}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1 uppercase tracking-wider">
              名称
            </label>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500/80 transition-colors"
              placeholder={isFolder ? '例如 常用工具' : '例如 掘金'}
            />
          </div>

          {!isFolder && (
            <>
              <TextIconSwatchPicker
                selectedIndex={textSwatchIndex}
                isActive={iconSource === 'text'}
                onSelect={(i) => {
                  setTextSwatchIndex(i)
                  setIconSource('text')
                }}
              />

              <IconBgColorPicker value={iconBgColor} onChange={setIconBgColor} />

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">
                  图标
                </label>
                <div className="grid grid-cols-4 gap-3">
                  <IconSourceTile
                    label="当前"
                    active={iconSource === 'current'}
                    onClick={() => setIconSource('current')}
                  >
                    {currentPreviewSrc ? (
                      <img
                        src={currentPreviewSrc}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-white/40">
                        —
                      </div>
                    )}
                  </IconSourceTile>

                  <IconSourceTile
                    label="文字"
                    active={iconSource === 'text'}
                    onClick={() => setIconSource('text')}
                  >
                    {textIconPreview ? (
                      <img src={textIconPreview} alt="" className="h-full w-full object-cover" />
                    ) : null}
                  </IconSourceTile>

                  <IconSourceTile
                    label="官方"
                    active={iconSource === 'official'}
                    disabled={!officialUrl}
                    onClick={() => officialUrl && setIconSource('official')}
                  >
                    {officialUrl ? (
                      <img src={officialUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center gap-0.5 px-1 text-center text-[10px] leading-tight text-white/35">
                        <span>点击</span>
                        <span>获取图标</span>
                      </div>
                    )}
                  </IconSourceTile>

                  <IconSourceTile
                    label="上传"
                    active={iconSource === 'upload'}
                    onClick={() => {
                      if (uploadDataUrl) setIconSource('upload')
                      else fileInputRef.current?.click()
                    }}
                  >
                    {uploadDataUrl ? (
                      <img src={uploadDataUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <UploadTilePlaceholder />
                    )}
                  </IconSourceTile>
                </div>
              </div>
            </>
          )}

          <div className="flex gap-3 mt-8">
            <button
              type="button"
              onClick={close}
              className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-colors font-medium"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={!editName}
              className="flex-1 px-4 py-3 bg-amber-500 hover:bg-amber-400 text-black rounded-xl transition-colors font-medium disabled:opacity-50"
            >
              保存
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  )
}
