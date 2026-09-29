/**
 * 可选 host 权限的按需申请。
 *
 * manifest 里只声明 `optional_host_permissions`，装的时候不弹「读取所有网站数据」，
 * 真正要抓网页标题 / 拉每日一图的那一刻才就那一个域名问一次。
 * 网页版（npm run dev）没有 chrome.permissions，一律当作「没有」，调用方自己兜底。
 */

const api = typeof chrome !== 'undefined' ? chrome.permissions : undefined

/** 网址 → 权限匹配式：`https://example.com/*`；非 http(s) 返回空串 */
export function originPattern(url: string): string {
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return ''
    return `${parsed.protocol}//${parsed.host}/*`
  } catch {
    return ''
  }
}

/** 有没有可选权限这套 API（扩展里有，网页版没有） */
export function canRequestOrigin(): boolean {
  return Boolean(api?.request)
}

/** 已经授过权的域名就别再弹窗了。查询失败一律当没授权，走申请路径 */
export async function hasOrigin(pattern: string): Promise<boolean> {
  if (!pattern || typeof api?.contains !== 'function') return false
  try {
    return await api.contains({ origins: [pattern] })
  } catch {
    return false
  }
}

/**
 * 申请权限，只能在用户点击（手势）里调用，否则浏览器直接驳回。
 * 已授权时不会弹窗、直接返回 true。
 */
export async function requestOrigin(pattern: string): Promise<boolean> {
  if (!pattern || typeof api?.request !== 'function') return false
  try {
    return await api.request({ origins: [pattern] })
  } catch {
    return false
  }
}

/**
 * 一次申请一组权限（比如「补全图标」要逐站访问一遍，就一次把 http/https 全要了）。
 * 同样只能在用户点击里调用。没有扩展 API 时（网页预览）当作通过：那边本来就没有权限模型，
 * 跨域成不成由 CORS 决定。
 */
export async function requestOrigins(patterns: string[]): Promise<boolean> {
  if (typeof api?.request !== 'function') return true
  try {
    return await api.request({ origins: patterns })
  } catch {
    return false
  }
}
