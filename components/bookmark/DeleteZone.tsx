import React from 'react'
import { createPortal } from 'react-dom'
import { Trash2 } from 'lucide-react'

interface DeleteZoneProps {
  visible: boolean
  isDragOutside: boolean
  onDragOver: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent) => void
}

/**
 * 全页拖拽删除区 —— 渲染在 body，z-[5]（低于 ShortcutGrid 的 z-10）。
 * 只有当拖拽指针离开 ShortcutGrid 范围时才会收到事件，松开即删除。
 */
export const DeleteZone: React.FC<DeleteZoneProps> = ({
  visible,
  isDragOutside,
  onDragOver,
  onDrop,
}) => {
  if (!visible) return null

  return createPortal(
    <div
      role="region"
      aria-label="删除区"
      aria-live="polite"
      className={`fixed inset-0 z-[5] flex items-center justify-center transition-all duration-200 ${
        isDragOutside ? 'bg-red-500/20' : 'bg-transparent pointer-events-none'
      }`}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {isDragOutside && (
        <div className="pointer-events-none flex flex-col items-center gap-3 rounded-3xl border border-red-400/40 bg-black/50 px-10 py-6 shadow-2xl backdrop-blur-sm">
          <Trash2 size={36} className="text-red-400 opacity-80" />
          <span className="text-sm font-medium text-red-300/80">松开以删除</span>
        </div>
      )}
    </div>,
    document.body,
  )
}
