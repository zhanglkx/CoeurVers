import React from 'react'
import { Check, Plus } from 'lucide-react'
import { TEXT_ICON_SWATCHES } from '../../lib/text-icon'
import { ICON_BG_PRESETS } from './icon-presets'

/**
 * 文字图标底色一排色圈
 */
interface TextIconSwatchPickerProps {
  selectedIndex: number
  isActive: boolean
  onSelect: (index: number) => void
}

export const TextIconSwatchPicker: React.FC<TextIconSwatchPickerProps> = ({
  selectedIndex,
  isActive,
  onSelect,
}) => (
  <div>
    <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">
      图标颜色
    </label>
    <div className="flex flex-wrap gap-2">
      {TEXT_ICON_SWATCHES.map((swatch, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onSelect(i)}
          className={`h-8 w-8 rounded-full border-2 transition-transform hover:scale-110 ${
            isActive && selectedIndex === i ? 'border-amber-400 scale-110' : 'border-transparent'
          }`}
          style={
            swatch.kind === 'solid'
              ? { background: swatch.color }
              : { background: `linear-gradient(135deg, ${swatch.from}, ${swatch.to})` }
          }
          title="文字图标底色"
        />
      ))}
    </div>
  </div>
)

/**
 * 图标容器背景色一排色圈
 */
interface IconBgColorPickerProps {
  value: string | null
  onChange: (value: string | null) => void
}

export const IconBgColorPicker: React.FC<IconBgColorPickerProps> = ({ value, onChange }) => (
  <div>
    <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">
      图标背景颜色
    </label>
    <div className="flex flex-wrap gap-2">
      {ICON_BG_PRESETS.map((preset, i) => {
        const selected = value === preset.value
        return (
          <button
            key={i}
            type="button"
            onClick={() => onChange(preset.value)}
            title={preset.label}
            className={`h-8 w-8 rounded-full border-2 transition-transform hover:scale-110 ${
              selected ? 'border-amber-400 scale-110' : 'border-white/20'
            }`}
            style={
              preset.value === null
                ? {
                    background:
                      'repeating-conic-gradient(#555 0% 25%, #333 0% 50%) 0 0 / 10px 10px',
                  }
                : { background: preset.value }
            }
          />
        )
      })}
    </div>
  </div>
)

/**
 * 图标来源选择 tile（四宫格其中一个）
 */
interface IconSourceTileProps {
  label: string
  active: boolean
  disabled?: boolean
  onClick: () => void
  children: React.ReactNode
}

export const IconSourceTile: React.FC<IconSourceTileProps> = ({
  label,
  active,
  disabled,
  onClick,
  children,
}) => (
  <button
    type="button"
    disabled={disabled}
    onClick={onClick}
    className={`flex flex-col items-center gap-1.5 rounded-xl p-1 transition ring-offset-2 ring-offset-[#1A1A1A] ${
      active ? 'ring-2 ring-amber-400' : 'ring-0 hover:bg-white/5'
    } ${disabled ? 'cursor-not-allowed opacity-45' : ''}`}
  >
    <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-white/10">
      {children}
      {active ? (
        <span className="absolute bottom-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-black shadow">
          <Check size={12} strokeWidth={3} />
        </span>
      ) : null}
    </div>
    <span className="text-[10px] text-gray-500">{label}</span>
  </button>
)

/**
 * "上传" tile 的占位图（Plus 大号图标）
 */
export const UploadTilePlaceholder: React.FC = () => (
  <div className="flex h-full w-full items-center justify-center text-white/50">
    <Plus size={28} strokeWidth={1.5} />
  </div>
)
