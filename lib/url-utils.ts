import { getFaviconUrl } from "../constants"

/**
 * 判断字符串是否看起来像网址
 */
export function looksLikeWebUrl(raw: string): boolean {
  const s = raw.trim()
  if (!s) return false
  if (/^https?:\/\//i.test(s)) return true
  return /^([a-z0-9-]+\.)+[a-z]{2,}(\/.*)?$/i.test(s)
}

/**
 * 名称栏误填成链接时，合并到 URL；返回 null 表示尚无可提交的地址
 */
export function resolveAddFormFields(
  newUrl: string,
  newName: string,
): { rawUrl: string; nameOverride: string } | null {
  let urlRaw = newUrl.trim()
  let nameRaw = newName.trim()
  if (!urlRaw && nameRaw && looksLikeWebUrl(nameRaw)) {
    urlRaw = nameRaw
    nameRaw = ""
  }
  if (!urlRaw) return null
  return { rawUrl: urlRaw, nameOverride: nameRaw }
}

/**
 * 从 URL 推导标题（提取域名首字母大写）
 */
export function deriveTitleFromUrl(rawUrl: string, nameOverride: string): string {
  const n = nameOverride.trim()
  if (n) return n
  try {
    let u = rawUrl.trim()
    if (!/^https?:\/\//i.test(u)) u = `https://${u}`
    const part = new URL(u).hostname.replace(/^www\./i, "").split(".")[0]
    return part ? part.charAt(0).toUpperCase() + part.slice(1) : "Site"
  } catch {
    return "Site"
  }
}

/**
 * 标准化 URL 输入（自动添加 https://）
 */
export function normalizeUrlInput(raw: string): string {
  let u = raw.trim()
  if (!u) return ""
  if (!/^https?:\/\//i.test(u)) u = `https://${u}`
  return u
}

/**
 * 从 URL 字段生成 favicon 预览地址
 */
export function previewFaviconFromField(urlField: string): string {
  try {
    return getFaviconUrl(normalizeUrlInput(urlField))
  } catch {
    return ""
  }
}

/**
 * 验证 URL 是否合法（仅允许 http/https 协议）
 */
export function isValidHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return ["http:", "https:"].includes(parsed.protocol)
  } catch {
    return false
  }
}

/**
 * 格式化用户输入的 URL 用于保存
 */
export function formatUrlForSave(raw: string): string | null {
  let formatted = raw.trim()
  if (!/^https?:\/\//i.test(formatted)) {
    formatted = `https://${formatted}`
  }

  if (!isValidHttpUrl(formatted)) {
    return null
  }

  return formatted
}
