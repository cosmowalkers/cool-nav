export interface WallpaperImage {
  url: string
  title: string
}

/** 轮换节奏：业界通用四档（Chrome 内置、Dream Afar、Infinity 都是这套） */
export const ROTATE_OPTIONS = [
  { id: 'newtab', name: '每次新开', ms: 0 },
  { id: 'hour', name: '每小时', ms: 3_600_000 },
  { id: 'day', name: '每天', ms: 86_400_000 },
  { id: 'never', name: '不切换', ms: -1 },
]

function screenWidth(): number {
  return Math.round(window.innerWidth * (window.devicePixelRatio || 1))
}

function bingSizeSuffix(): string {
  const physical = screenWidth()
  if (physical >= 3000) return '_UHD.jpg'
  if (physical >= 1900) return '_1920x1080.jpg'
  return '_1366x768.jpg'
}

/** 一次拿最近 8 天，够轮换一个多星期，且每天只在首次打开时请求一次 */
export async function fetchBingImages(): Promise<WallpaperImage[]> {
  const response = await fetch(
    'https://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=8&mkt=zh-CN',
  )
  if (!response.ok) throw new Error('每日一图接口没响应')
  const data = (await response.json()) as { images?: { urlbase?: string; title?: string }[] }
  const suffix = bingSizeSuffix()
  return (data.images ?? [])
    .filter((item) => item.urlbase)
    .map((item) => ({
      url: `https://www.bing.com${item.urlbase}${suffix}`,
      title: item.title ?? '',
    }))
}

/** 预取：图没就位就切会看到闪白，等 onload 再淡入；返回是否拿到 */
export function preload(url: string): Promise<boolean> {
  if (!url || url.startsWith('data:')) return Promise.resolve(true)
  return new Promise((resolve) => {
    const image = new Image()
    image.onload = () => resolve(true)
    image.onerror = () => resolve(false)
    image.src = url
  })
}
