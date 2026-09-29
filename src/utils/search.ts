import { looksLikeUrl, normalizeUrl } from './url'

export interface Engine {
  id: string
  name: string
  url: string
}

export const ENGINES: Engine[] = [
  { id: 'bing', name: 'Bing', url: 'https://www.bing.com/search?q=%s' },
  { id: 'google', name: 'Google', url: 'https://www.google.com/search?q=%s' },
  { id: 'baidu', name: '百度', url: 'https://www.baidu.com/s?wd=%s' },
  { id: 'juejin', name: '掘金', url: 'https://juejin.cn/search?query=%s' },
  { id: 'github', name: 'GitHub', url: 'https://github.com/search?q=%s' },
  { id: 'npm', name: 'npm', url: 'https://www.npmjs.com/search?q=%s' },
]

/** 前缀 → 引擎，例如输入 `gh vue3` 直接用 GitHub 搜 */
export const PREFIX_ALIASES: Record<string, string> = {
  gg: 'google',
  bd: 'baidu',
  bz: 'juejin',
  gh: 'github',
  npm: 'npm',
}

export const PREFIX_HINT = 'gg / bd / bz / gh / npm'

export type ResolvedQuery =
  | { kind: 'url'; url: string }
  | { kind: 'search'; url: string; engine: Engine }

function searchWith(engine: Engine, keyword: string): ResolvedQuery {
  return { kind: 'search', url: engine.url.replace('%s', encodeURIComponent(keyword)), engine }
}

export function resolveQuery(raw: string, defaultEngineId: string): ResolvedQuery | null {
  const input = raw.trim()
  if (!input) return null

  const prefixed = input.match(/^([a-zA-Z]{1,5})\s+(\S[\s\S]*)$/)
  if (prefixed) {
    const engineId = PREFIX_ALIASES[prefixed[1].toLowerCase()]
    const engine = engineId ? ENGINES.find((item) => item.id === engineId) : undefined
    if (engine) return searchWith(engine, prefixed[2].trim())
  }

  if (looksLikeUrl(input)) return { kind: 'url', url: normalizeUrl(input) }

  const engine = ENGINES.find((item) => item.id === defaultEngineId) ?? ENGINES[0]
  return searchWith(engine, input)
}
