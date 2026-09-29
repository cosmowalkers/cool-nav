import { computed, ref, watch } from 'vue'
import { nav } from './useNavData'
import { storage } from '../storage'
import { engineTone, isPhotoPreset } from '../utils/background'
import { hasOrigin, requestOrigin } from '../utils/permissions'
import { ROTATE_OPTIONS, fetchBingImages, preload, type WallpaperImage } from '../utils/wallpaper'

const BING_KEY = 'bing'
const STATE_KEY = 'wallpaper'
/** 每日一图的接口没有 CORS 头，只能靠这一个域名的可选权限，不给就退回纯色 */
const BING_ORIGIN = 'https://www.bing.com/*'

/** 每日一图的图池：只缓存「一批图片地址 + 日期」，图片本身不落库 */
export const bingImages = ref<WallpaperImage[]>([])
/** 当前该显示的图片地址，空串表示退回纯色底 */
export const currentImage = ref('')
export const wallpaperError = ref('')
/** 每日一图缺权限：界面据此显示「允许」入口，不给权限就一直用纯色底 */
export const bingNeedsPermission = ref(false)

let lastUrl = ''
let switchedAt = 0
let timer: number | undefined

const background = computed(() => nav.settings.background)
const isPhoto = computed(() => isPhotoPreset(background.value.preset))

export const photoUrl = computed(() => (isPhoto.value ? currentImage.value : ''))

/** 没图时顶图那条的底色，跟着搜索引擎换 */
export const heroTone = computed(() => engineTone(nav.settings.engineId))

export const imageCredit = computed(() => {
  if (background.value.preset !== 'bing') return ''
  return bingImages.value.find((item) => item.url === currentImage.value)?.title ?? ''
})

function pool(): string[] {
  const preset = background.value.preset
  if (preset === 'bing') return bingImages.value.map((item) => item.url)
  if (preset === 'image') return background.value.url ? [background.value.url] : []
  return []
}

/** 当前来源一共有多少张可选，设置面板用它判断要不要显示「轮换」 */
export const poolSize = computed(() => pool().length)

function rotateMs(): number {
  return ROTATE_OPTIONS.find((item) => item.id === background.value.rotate)?.ms ?? 0
}

/** 到点就往下走一张；池子换了（或首次）就从第一张开始 */
function pickIndex(list: string[], now: number): number {
  const hit = lastUrl ? list.indexOf(lastUrl) : -1
  if (hit < 0) return 0
  const ms = rotateMs()
  if (ms === 0 || (ms > 0 && now - switchedAt >= ms)) return (hit + 1) % list.length
  return hit
}

/** 从 index 起往后找第一张能加载出来的；一张都加载不出来就保持纯色，不留空屏 */
async function show(index: number, list: string[]): Promise<void> {
  for (let step = 0; step < list.length; step += 1) {
    const candidate = list[(index + step) % list.length]
    if (!(await preload(candidate))) continue
    currentImage.value = candidate
    lastUrl = candidate
    switchedAt = Date.now()
    void storage.writeLocal(STATE_KEY, { url: candidate, at: switchedAt })
    // 顺手把下一张也取回来，下次新开标签页就是秒出
    void preload(list[(index + step + 1) % list.length])
    return
  }
}

async function sync(): Promise<void> {
  const list = pool()
  if (!list.length) {
    currentImage.value = ''
    lastUrl = ''
    return
  }
  const index = pickIndex(list, Date.now())
  if (list[index] === currentImage.value) return
  // 首帧先把手上的缓存图画出来，预取完再换，避免白屏
  if (!currentImage.value && lastUrl && list.includes(lastUrl)) currentImage.value = lastUrl
  await show(index, list)
}

/**
 * Bing 每天只请求一次，失败就退回纯色底，不空屏。
 * 权限没给就一次请求都不发——「默认背景」也得先问过用户。
 */
async function ensureBing(): Promise<void> {
  if (!(await hasOrigin(BING_ORIGIN))) {
    bingNeedsPermission.value = true
    return
  }
  bingNeedsPermission.value = false
  const today = new Date().toISOString().slice(0, 10)
  const cached = await storage.readLocal<{ at: string; list: WallpaperImage[] }>(BING_KEY)
  if (cached && Array.isArray(cached.list) && cached.list.length) {
    bingImages.value = cached.list
    if (cached.at === today) return
  }
  try {
    const list = await fetchBingImages()
    bingImages.value = list
    wallpaperError.value = ''
    await storage.writeLocal(BING_KEY, { at: today, list })
  } catch (error) {
    wallpaperError.value = '每日一图暂时取不到，先退回纯色底'
    console.warn('[cool-nav] 每日一图拉取失败', error)
  }
}

/** 用户点「允许」时调用：必须在点击的手势里，拿到权限再拉图 */
export async function allowBing(): Promise<boolean> {
  const ok = await requestOrigin(BING_ORIGIN)
  if (!ok) {
    bingNeedsPermission.value = false
    wallpaperError.value = '没拿到 bing.com 的权限，背景先留在纯色'
    return false
  }
  bingNeedsPermission.value = false
  await ensureBing()
  await sync()
  return true
}

export async function initWallpaper(): Promise<void> {
  const storedState = await storage.readLocal<{ url?: string; at?: number }>(STATE_KEY)
  if (storedState?.url) {
    lastUrl = storedState.url
    switchedAt = storedState.at ?? 0
  }

  if (background.value.preset === 'bing') await ensureBing()
  await sync()

  if (!timer) {
    timer = window.setInterval(() => {
      if (rotateMs() > 0) void sync()
    }, 60_000)
  }
}

watch(
  () => background.value.preset,
  async (preset) => {
    if (preset === 'bing') await ensureBing()
    await sync()
  },
)
