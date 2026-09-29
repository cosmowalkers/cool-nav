import { computed, ref, watch } from 'vue'
import { nav } from './useNavData'
import { storage } from '../storage'
import { isPhotoPreset, presetCss } from '../utils/background'
import { fileToBackground } from '../utils/image'
import {
  ROTATE_OPTIONS,
  fetchBingImages,
  preload,
  sceneryImages,
  type WallpaperImage,
} from '../utils/wallpaper'

const IMAGES_KEY = 'images'
const BING_KEY = 'bing'
const STATE_KEY = 'wallpaper'

/** 本机图库：dataURL 数组，存 storage.local，不参与同步 */
export const localImages = ref<string[]>([])
export const bingImages = ref<WallpaperImage[]>([])
/** 当前该显示的图片地址，空串表示退回渐变/纯色 */
export const currentImage = ref('')
export const wallpaperError = ref('')

let lastUrl = ''
let switchedAt = 0
let timer: number | undefined

const background = computed(() => nav.settings.background)
const isPhoto = computed(() => isPhotoPreset(background.value.preset))

/** 内置渐变的 css，图片类来源为空 */
export const gradient = computed(() => (isPhoto.value ? '' : presetCss(background.value.preset)))

/** 有背景就锁深色文字体系；按来源判断而不是按图有没有加载出来，避免首帧闪白 */
export const hasBackground = computed(() => isPhoto.value || Boolean(gradient.value))

export const photoUrl = computed(() => (isPhoto.value ? currentImage.value : ''))

export const imageCredit = computed(() => {
  if (background.value.preset !== 'bing') return ''
  return bingImages.value.find((item) => item.url === currentImage.value)?.title ?? ''
})

function pool(): string[] {
  const preset = background.value.preset
  if (preset === 'local') return localImages.value
  if (preset === 'scene') return sceneryImages().map((item) => item.url)
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

/** 从 index 起往后找第一张能加载出来的，全挂了就保持现状，别把页面弄成空屏 */
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

async function showUrl(url: string): Promise<void> {
  const list = pool()
  const index = list.indexOf(url)
  await show(index < 0 ? 0 : index, list)
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

/** Bing 每天只请求一次，失败就继续用缓存的那批 */
async function ensureBing(): Promise<void> {
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
    wallpaperError.value = '每日一图暂时取不到，先用手上的图'
    console.warn('[cool-nav] 每日一图拉取失败', error)
  }
}

export async function initWallpaper(): Promise<void> {
  const storedImages = await storage.readLocal<string[]>(IMAGES_KEY)
  if (Array.isArray(storedImages)) {
    localImages.value = storedImages
  } else {
    // 早期版本只存得下一张，顺手迁移过来
    const legacy = await storage.readLocal<string>('background')
    if (typeof legacy === 'string' && legacy) {
      localImages.value = [legacy]
      await storage.writeLocal(IMAGES_KEY, localImages.value)
    }
  }

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

export async function addLocalImages(files: File[]): Promise<number> {
  const added: string[] = []
  for (const file of files) added.push(await fileToBackground(file))
  const next = [...localImages.value, ...added]
  await storage.writeLocal(IMAGES_KEY, next)
  localImages.value = next
  background.value.preset = 'local'
  await showUrl(added[0])
  return added.length
}

export async function removeLocalImage(index: number): Promise<void> {
  const next = localImages.value.filter((_, i) => i !== index)
  await storage.writeLocal(IMAGES_KEY, next)
  localImages.value = next
  if (background.value.preset !== 'local') return
  const list = pool()
  if (!list.length) await sync()
  else if (!list.includes(currentImage.value)) await showUrl(list[0])
}

watch(
  () => background.value.preset,
  async (preset) => {
    if (preset === 'bing') await ensureBing()
    await sync()
  },
)
