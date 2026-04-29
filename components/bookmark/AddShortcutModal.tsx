import React, { useMemo } from 'react'
import { createPortal } from 'react-dom'
import { X, Loader2 } from 'lucide-react'
import type { Shortcut } from '../../types'
import { TEXT_ICON_SWATCHES, generateTextIconDataUrl } from '../../lib/text-icon'
import { fetchBestSiteIconUrl } from '../../lib/site-icon'
import {
  looksLikeWebUrl,
  resolveAddFormFields,
  deriveTitleFromUrl,
  previewFaviconFromField,
  formatUrlForSave,
} from '../../lib/url-utils'
import type { useModalState } from '../../hooks/useModalState'
import {
  IconBgColorPicker,
  IconSourceTile,
  TextIconSwatchPicker,
  UploadTilePlaceholder,
} from './shortcut-form-parts'

type AddModalState = ReturnType<typeof useModalState>['addModal']

interface AddShortcutModalProps {
  state: AddModalState
  onSubmit: (shortcut: Shortcut) => void
}

/**
 * 添加快捷方式弹窗（门户渲染到 body）
 */
export const AddShortcutModal: React.FC<AddShortcutModalProps> = ({ state, onSubmit }) => {
  const {
    isOpen,
    url: newUrl,
    name: newName,
    iconSource,
    officialUrl,
    textSwatchIndex,
    uploadDataUrl,
    iconBgColor,
    fetchError,
    isFetching,
    fileInputRef,
    setUrl: setNewUrl,
    setName: setNewName,
    setIconSource,
    setOfficialUrl,
    setTextSwatchIndex,
    setUploadDataUrl,
    setIconBgColor,
    setFetchError,
    setIsFetching,
    close,
  } = state

  const effectiveFields = useMemo(
    () => resolveAddFormFields(newUrl, newName),
    [newUrl, newName],
  )

  const defaultPreviewSrc = useMemo(() => {
    if (!effectiveFields) return ''
    return previewFaviconFromField(effectiveFields.rawUrl)
  }, [effectiveFields])

  const textIconPreview = useMemo(() => {
    const label = effectiveFields
      ? deriveTitleFromUrl(effectiveFields.rawUrl, effectiveFields.nameOverride)
      : newName.trim() || '?'
    const swatch = TEXT_ICON_SWATCHES[textSwatchIndex] ?? TEXT_ICON_SWATCHES[0]
    return generateTextIconDataUrl(label, swatch)
  }, [effectiveFields, newName, textSwatchIndex])

  async function handleFetchSiteIcon() {
    const r = resolveAddFormFields(newUrl, newName)
    if (!r) return
    setFetchError(null)
    setIsFetching(true)
    try {
      const resolved = await fetchBestSiteIconUrl(r.rawUrl)
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
      const result = reader.result
      if (typeof result === 'string') {
        setUploadDataUrl(result)
        setIconSource('upload')
      }
    }
    reader.readAsDataURL(file)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const resolved = resolveAddFormFields(newUrl, newName)
    if (!resolved) return

    const formattedUrl = formatUrlForSave(resolved.rawUrl)
    if (!formattedUrl) {
      alert('Invalid URL format')
      return
    }

    const title = deriveTitleFromUrl(resolved.rawUrl, resolved.nameOverride)

    let icon: string | undefined
    if (iconSource === 'official' && officialUrl) icon = officialUrl
    else if (iconSource === 'text') {
      const swatch = TEXT_ICON_SWATCHES[textSwatchIndex] ?? TEXT_ICON_SWATCHES[0]
      icon = generateTextIconDataUrl(title, swatch)
    } else if (iconSource === 'upload' && uploadDataUrl) icon = uploadDataUrl

    const newShortcut: Shortcut = {
      id: Date.now().toString(),
      title,
      url: formattedUrl,
      type: 'link',
      icon,
      ...(iconBgColor ? { iconBgColor } : {}),
    }

    onSubmit(newShortcut)
    close()
  }

  if (!isOpen) return null

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 p-4">
      <div className="bg-[#1A1A1A] border border-white/10 p-6 rounded-3xl w-full max-w-md shadow-2xl scale-100 animate-in zoom-in-95 duration-200 relative">
        <button
          onClick={close}
          className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>
        <h3 className="text-xl font-semibold text-white mb-2">添加快捷方式</h3>
        <p className="text-xs text-gray-500 mb-5">
          请先填地址；名称可空（将用域名生成）。仅填名称时若粘贴的是网址，也会自动当作地址。
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleIconFileChange}
          />

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1 uppercase tracking-wider">
              地址
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                className="min-w-0 flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-amber-500/80 transition-colors"
                placeholder="https://juejin.cn"
                autoFocus
              />
              <button
                type="button"
                onClick={handleFetchSiteIcon}
                disabled={isFetching || !effectiveFields}
                className="shrink-0 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-sm font-medium transition-colors disabled:opacity-40 disabled:pointer-events-none"
              >
                {isFetching ? <Loader2 size={18} className="animate-spin" /> : null}
                {isFetching ? '获取中' : '获取图标'}
              </button>
            </div>
            {fetchError ? <p className="mt-1.5 text-xs text-red-400">{fetchError}</p> : null}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1 uppercase tracking-wider">
              名称（可选）
            </label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onPaste={(e) => {
                const text = e.clipboardData.getData('text').trim()
                if (!newUrl.trim() && text && looksLikeWebUrl(text)) {
                  e.preventDefault()
                  setNewUrl(text)
                }
              }}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500/80 transition-colors"
              placeholder="例如 掘金（误把链接贴在这里也可，保存时会识别）"
            />
          </div>

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
                label="默认"
                active={iconSource === 'default'}
                onClick={() => setIconSource('default')}
              >
                {defaultPreviewSrc ? (
                  <img
                    src={defaultPreviewSrc}
                    alt=""
                    className="h-full w-full object-cover opacity-90"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[10px] text-white/35 px-1 text-center leading-tight">
                    填地址后显示
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
                    <span>先点</span>
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
              disabled={!effectiveFields}
              className="flex-1 px-4 py-3 bg-amber-500 hover:bg-amber-400 text-black rounded-xl transition-colors font-medium disabled:opacity-50"
            >
              添加
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  )
}
