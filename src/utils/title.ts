const MAX_BYTES = 100_000

async function readCapped(response: Response): Promise<string> {
  if (!response.body) return ''
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let text = ''
  let bytes = 0
  while (bytes < MAX_BYTES) {
    const { done, value } = await reader.read()
    if (done) break
    bytes += value.byteLength
    text += decoder.decode(value, { stream: true })
  }
  void reader.cancel().catch(() => {})
  return text
}

export interface PageMeta {
  title: string
  /** 页面自己声明的图标地址（已转成绝对地址），没声明就是空串 */
  icon: string
}

/** 从 `<link rel="...icon...">` 里挑一个：rel 用 `~=` 匹配，好带上 `shortcut icon` 这种写法 */
function pickIcon(doc: Document, base: string): string {
  const selectors = [
    'link[rel~="icon"]',
    'link[rel~="apple-touch-icon"]',
    'link[rel="mask-icon"]',
  ]
  for (const selector of selectors) {
    const href = doc.querySelector(selector)?.getAttribute('href')?.trim()
    if (!href) continue
    try {
      return new URL(href, base).toString()
    } catch {
      /* 这个 href 不成地址，换下一个 */
    }
  }
  return ''
}

/**
 * 抓网页的标题和它自己声明的图标。
 * 依赖扩展的 host 权限；网页环境下跨域会失败，返回空值由调用方兜底。
 */
export async function fetchPageMeta(url: string, timeoutMs = 5000): Promise<PageMeta> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      credentials: 'omit',
      redirect: 'follow',
    })
    if (!response.ok) return { title: '', icon: '' }
    const html = await readCapped(response)
    const doc = new DOMParser().parseFromString(html, 'text/html')
    return {
      title: doc.title.replace(/\s+/g, ' ').trim().slice(0, 120),
      icon: pickIcon(doc, response.url || url),
    }
  } catch {
    return { title: '', icon: '' }
  } finally {
    clearTimeout(timer)
  }
}
