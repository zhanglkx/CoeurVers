export interface TextIconSwatchSolid {
  kind: "solid"
  color: string
}

export interface TextIconSwatchGradient {
  kind: "gradient"
  from: string
  to: string
}

export type TextIconSwatch = TextIconSwatchSolid | TextIconSwatchGradient

/** Preset backgrounds for “文字图标” (similar to common dashboard pickers). */
export const TEXT_ICON_SWATCHES: TextIconSwatch[] = [
  { kind: "solid", color: "#dc2626" },
  { kind: "solid", color: "#ea580c" },
  { kind: "solid", color: "#ca8a04" },
  { kind: "solid", color: "#16a34a" },
  { kind: "solid", color: "#0891b2" },
  { kind: "solid", color: "#2563eb" },
  { kind: "solid", color: "#7c3aed" },
  { kind: "solid", color: "#db2777" },
  { kind: "gradient", from: "#f97316", to: "#eab308" },
  { kind: "gradient", from: "#22c55e", to: "#14b8a6" },
  { kind: "gradient", from: "#3b82f6", to: "#8b5cf6" },
  { kind: "gradient", from: "#a855f7", to: "#ec4899" },
]

export function generateTextIconDataUrl(name: string, swatch: TextIconSwatch, size = 128): string {
  const canvas = document.createElement("canvas")
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext("2d")
  if (!ctx) return ""

  if (swatch.kind === "solid") {
    ctx.fillStyle = swatch.color
    ctx.fillRect(0, 0, size, size)
  } else {
    const g = ctx.createLinearGradient(0, 0, size, size)
    g.addColorStop(0, swatch.from)
    g.addColorStop(1, swatch.to)
    ctx.fillStyle = g
    ctx.fillRect(0, 0, size, size)
  }

  const raw = name.trim()
  const text = raw.length > 0 ? raw.slice(0, 2) : "?"

  ctx.fillStyle = "rgba(255,255,255,0.95)"
  const fontSize = /[\u4e00-\u9fff]/.test(text) ? size * 0.42 : size * 0.4
  ctx.font = `600 ${fontSize}px ui-sans-serif, system-ui, sans-serif`
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.fillText(text, size / 2, size / 2)

  return canvas.toDataURL("image/png")
}
