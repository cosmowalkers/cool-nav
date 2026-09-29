export function normalizeUrl(input: string): string {
  const value = input.trim()
  if (!value) return ''
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(value)) return value
  return `https://${value}`
}

export function domainOf(url: string): string {
  try {
    return new URL(normalizeUrl(url)).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

/** 输入内容看起来像网址（而不是搜索词） */
export function looksLikeUrl(input: string): boolean {
  const value = input.trim()
  if (!value || /\s/.test(value)) return false
  if (/^https?:\/\//i.test(value)) return true
  if (/^localhost(:\d+)?(\/|$)/i.test(value)) return true
  if (/^\d{1,3}(\.\d{1,3}){3}(:\d+)?(\/|$)/.test(value)) return true
  return /^[a-z0-9-]+(\.[a-z0-9-]+)+(:\d+)?(\/|$|\?|#)/i.test(value)
}
