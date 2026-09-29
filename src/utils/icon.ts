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
 * 站点自己放在根目录的图标（约定俗成的位置）。
 *
 * 为什么需要它：`_favicon` 只认浏览器**已经缓存过**的图标——没在这个浏览器里打开过的站点，
 * 缓存里就是没有，取不到就只剩色块。这跟网速无关，跟「你访问过没有」有关。
 * 所以缓存里没有时，直接跟站点要一次它自己的 `/favicon.ico`：只发往用户自己放进导航的站点，
 * 中途不经过任何第三方图标服务（这也是当初不用 Google s2 的原因）。
 */
export function siteIconUrl(url: string): string {
  try {
    return `${new URL(url).origin}/favicon.ico`
  } catch {
    return ''
  }
}

/**
 * 兜底色板：孟菲斯那一套高饱和色，8 组写死。
 *
 * 早先是按色相现算（S 54% / L 57%→40%），出来是砖红、土黄这类灰扑扑的颜色；
 * 现在色相拉开、明度统一在「白字压得住」的那一档，一屏里的色块互相不打架。
 */
const PALETTE: [string, string][] = [
  ['#e23a82', '#b01e60'], // 洋红
  ['#ee7733', '#c24e14'], // 橘
  ['#d9a520', '#a87c12'], // 芥末黄
  ['#7cc03d', '#4f8a1e'], // 青柠
  ['#22bba8', '#0e8a7b'], // 湖绿
  ['#3d9ce8', '#1f72b4'], // 天蓝
  ['#5a6be0', '#3843b0'], // 靛蓝
  ['#a45ce8', '#7734b8'], // 紫
]

/** 域名决定色块，保证同一站点永远同一个颜色；用斜向渐变比纯色更立体 */
export function colorOf(url: string): string {
  const source = domainOf(url)
  let hash = 0
  for (let i = 0; i < source.length; i += 1) {
    hash = (hash * 31 + source.charCodeAt(i)) % 100000
  }
  const [from, to] = PALETTE[hash % PALETTE.length]
  return `linear-gradient(148deg, ${from}, ${to})`
}
