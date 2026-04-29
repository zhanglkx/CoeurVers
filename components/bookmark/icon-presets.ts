/**
 * 图标容器背景色预设。null = 透明（默认）
 */
export interface IconBgPreset {
  label: string
  value: string | null
}

export const ICON_BG_PRESETS: IconBgPreset[] = [
  { label: '透明', value: null },
  { label: '白色', value: '#ffffff' },
  { label: '深色', value: '#1c1c1e' },
  { label: '红色', value: '#dc2626' },
  { label: '橙色', value: '#ea580c' },
  { label: '黄色', value: '#ca8a04' },
  { label: '绿色', value: '#16a34a' },
  { label: '青色', value: '#0891b2' },
  { label: '蓝色', value: '#2563eb' },
  { label: '紫色', value: '#7c3aed' },
  { label: '粉色', value: '#db2777' },
  { label: '渐变橙', value: 'linear-gradient(135deg,#f97316,#eab308)' },
  { label: '渐变绿', value: 'linear-gradient(135deg,#22c55e,#14b8a6)' },
  { label: '渐变蓝', value: 'linear-gradient(135deg,#3b82f6,#8b5cf6)' },
  { label: '渐变粉', value: 'linear-gradient(135deg,#a855f7,#ec4899)' },
]
