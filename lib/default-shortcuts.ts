import type { Shortcut } from "../types"
import itabBundle from "./itab-default-nav.json"

interface ItabNavChild {
  id?: string
  name?: string
  type?: string
  url?: string
  src?: string
  component?: string
  children?: ItabNavChild[]
}

interface ItabNavGroup {
  id?: string
  name?: string
  children?: ItabNavChild[]
}

function isHttpUrl(s: string): boolean {
  return /^https?:\/\//i.test(s.trim())
}

function sanitizeIdSegment(s: string): string {
  return s.replace(/[^a-zA-Z0-9_-]/g, "_").replace(/_+/g, "_")
}

function normalizeTitle(raw: string): string {
  return raw.replace(/\s+/g, " ").trim() || "未命名"
}

function itabChildToLink(
  item: ItabNavChild,
  folderId: string,
  index: number,
): Shortcut | null {
  const url = typeof item.url === "string" ? item.url.trim() : ""
  if (!url || !isHttpUrl(url)) return null

  const rawKey = item.id ? String(item.id) : url
  const id = sanitizeIdSegment(`${folderId}__${index}__${rawKey}`).slice(0, 120)
  const title = normalizeTitle(item.name ?? "Link")
  const src = typeof item.src === "string" ? item.src.trim() : ""
  const icon = src.startsWith("http") ? src : undefined

  return { id, title, url, type: "link", icon }
}

function itabGroupToFolder(nav: ItabNavGroup, index: number): Shortcut {
  const folderId = nav.id && String(nav.id).length
    ? String(nav.id)
    : `itab-folder-${index}`
  const title = normalizeTitle(nav.name ?? `分组 ${index + 1}`)

  const children: Shortcut[] = []
  ;(nav.children ?? []).forEach((child, i) => {
    const link = itabChildToLink(child, folderId, i)
    if (link) children.push(link)
  })

  return {
    id: folderId,
    title,
    type: "folder",
    url: "#",
    children,
  }
}

/** 将 iTab `navConfig` 转为 CoeurVers 分组快捷方式；跳过无 URL 的小组件（倒计时等）。 */
export function navConfigToShortcuts(navConfig: ItabNavGroup[]): Shortcut[] {
  return navConfig.map(itabGroupToFolder)
}

const bundle = itabBundle as { navConfig?: ItabNavGroup[] }

export const DEFAULT_SHORTCUTS: Shortcut[] = navConfigToShortcuts(
  Array.isArray(bundle.navConfig) ? bundle.navConfig : [],
)
