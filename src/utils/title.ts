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

/**
 * 抓取网页标题用于自动命名。
 * 依赖扩展的 host 权限；网页环境下跨域会失败，返回空串由调用方兜底。
 */
export async function fetchPageTitle(url: string, timeoutMs = 5000): Promise<string> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      credentials: 'omit',
      redirect: 'follow',
    })
    if (!response.ok) return ''
    const html = await readCapped(response)
    const title = new DOMParser().parseFromString(html, 'text/html').title
    return title.replace(/\s+/g, ' ').trim().slice(0, 120)
  } catch {
    return ''
  } finally {
    clearTimeout(timer)
  }
}
