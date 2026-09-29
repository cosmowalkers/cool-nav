import { domainOf } from './url'

/** 浏览器原生 favicon（仅扩展环境下可用），失败时返回空串走色块兜底 */
export function faviconUrl(url: string, size = 64): string {
  if (typeof chrome === 'undefined' || !chrome.runtime?.id) return ''
  try {
    const endpoint = new URL(chrome.runtime.getURL('/_favicon/'))
    endpoint.searchParams.set('pageUrl', url)
    endpoint.searchParams.set('size', String(size))
    return endpoint.toString()
  } catch {
    return ''
  }
}

export function initialOf(link: { title: string; url: string }): string {
  const source = (link.title || domainOf(link.url)).trim()
  const char = Array.from(source)[0] ?? '?'
  return /[a-z]/i.test(char) ? char.toUpperCase() : char
}

/**
 * 兜底色板：只用这 8 个精心挑过的色相，
 * 避免 hash 出橄榄绿、土黄这类脏色，保证一屏里的色块互相不打架。
 */
const PALETTE = [214, 245, 268, 292, 330, 12, 32, 168]

/** 域名决定色块，保证同一站点永远同一个颜色；用斜向渐变比纯色更立体 */
export function colorOf(url: string): string {
  const source = domainOf(url)
  let hash = 0
  for (let i = 0; i < source.length; i += 1) {
    hash = (hash * 31 + source.charCodeAt(i)) % 100000
  }
  const hue = PALETTE[hash % PALETTE.length]
  return `linear-gradient(148deg, hsl(${hue} 54% 57%), hsl(${hue} 47% 40%))`
}
