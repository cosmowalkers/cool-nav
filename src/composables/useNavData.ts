import { reactive, ref, watch } from 'vue'
import type { NavData, NavGroup, NavLink, NavSettings, ThemeMode } from '../types'
import { storage } from '../storage'
import { DEFAULT_SETTINGS, seedData } from '../seed'
import { uid } from '../utils/id'
import { ENGINES } from '../utils/search'

const DATA_KEY = 'nav'
const HISTORY_KEY = 'history'
const HISTORY_MAX = 30
const SAVE_DELAY = 400
/** 数据结构版本：1 分组、2 铺平的链接列表、3 又回到分组（列表式导航站的排布） */
const VERSION = 3
/** v2 那份铺平数据没有组名，落到这个组里 */
const FLAT_GROUP_NAME = '常用'
/** sync 每分钟写入次数有上限，撞上了别丢数据，等一会儿再写 */
const RETRY_DELAY = 5000

export const nav = reactive<NavData>(seedData())
export const searchHistory = ref<string[]>([])
export const editing = ref(false)
export const storageError = ref('')
export const toast = ref('')

let saveTimer: ReturnType<typeof setTimeout> | undefined
let retryTimer: ReturnType<typeof setTimeout> | undefined
let toastTimer: ReturnType<typeof setTimeout> | undefined
/** 最近一次落盘的内容：一样就不再写，省 sync 的写入配额 */
let lastSaved = ''
/** 本地有改动还没写成功，这期间不采纳别处的数据，免得两边互相覆盖 */
let dirty = false
let watching = false

export function showToast(message: string): void {
  toast.value = message
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (toast.value = ''), 3200)
}

function snapshot(): NavData {
  return {
    version: nav.version,
    settings: { ...nav.settings },
    groups: nav.groups.map((group) => ({
      id: group.id,
      name: group.name,
      links: group.links.map((link) => ({ ...link })),
    })),
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function text(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback
}

function flag(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

/** 只认这三个值，别的（含老数据里没有这个字段）一律当跟随系统 */
function themeMode(value: unknown): ThemeMode {
  return value === 'light' || value === 'dark' ? value : 'system'
}

function normalizeLink(raw: unknown): NavLink | null {
  if (!isRecord(raw)) return null
  const url = typeof raw.url === 'string' ? raw.url.trim() : ''
  if (!url) return null
  const title = typeof raw.title === 'string' ? raw.title.trim() : ''
  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : uid('l'),
    title: title || url,
    url,
    ...(typeof raw.icon === 'string' && raw.icon ? { icon: raw.icon } : {}),
  }
}

function normalizeSettings(raw: unknown): NavSettings {
  const source = isRecord(raw) ? raw : {}
  const background = isRecord(source.background) ? source.background : {}
  /* 背景收敛成「每日一图 + 自定义图片 + 纯色」之后的老数据映射：
     自己打包的那几种图（随机风景 / 星空 / 按引擎）落回每日一图，渐变色和本机图库落回纯色 */
  const PRESET_MIGRATION: Record<string, string> = {
    scene: 'bing',
    starry: 'bing',
    engine: 'bing',
    aurora: 'none',
    dawn: 'none',
    ink: 'none',
    local: 'none',
  }
  const stored = text(background.preset, DEFAULT_SETTINGS.background.preset)
  const preset = PRESET_MIGRATION[stored] ?? stored
  /* 引擎删掉百度 / 掘金 / npm 之后，老数据里这几个 id 落回默认引擎 */
  const engineId = text(source.engineId, DEFAULT_SETTINGS.engineId)
  return {
    engineId: ENGINES.some((item) => item.id === engineId) ? engineId : DEFAULT_SETTINGS.engineId,
    theme: themeMode(source.theme),
    city: text(source.city, DEFAULT_SETTINGS.city),
    showSidePanel: flag(source.showSidePanel, DEFAULT_SETTINGS.showSidePanel),
    historyEnabled: flag(source.historyEnabled, DEFAULT_SETTINGS.historyEnabled),
    background: {
      preset,
      url: text(background.url, DEFAULT_SETTINGS.background.url),
      rotate: text(background.rotate, DEFAULT_SETTINGS.background.rotate),
    },
  }
}

function linkList(raw: unknown): NavLink[] {
  if (!Array.isArray(raw)) return []
  return raw.map(normalizeLink).filter((link): link is NavLink => link !== null)
}

function normalizeGroup(raw: unknown, index: number): NavGroup | null {
  if (!isRecord(raw)) return null
  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : uid('g'),
    name: typeof raw.name === 'string' && raw.name ? raw.name : `分组 ${index + 1}`,
    links: linkList(raw.links),
  }
}

/**
 * 读进来的东西可能是旧版本、也可能被同步写坏了：一律过一遍这里，别让坏数据把新标签页打白。
 * v2 那份铺平数据会被包成一个分组，并让调用方顺手把新结构落盘。
 */
function normalizeNav(raw: unknown): { data: NavData; migrated: boolean } | null {
  if (!isRecord(raw)) return null

  if (Array.isArray(raw.groups)) {
    const groups = raw.groups
      .map((group, index) => normalizeGroup(group, index))
      .filter((group): group is NavGroup => group !== null)
    return {
      data: { version: VERSION, settings: normalizeSettings(raw.settings), groups },
      /* 老版本的组结构和现在一样，但版本号还停在旧值，顺手补写 */
      migrated: raw.version !== VERSION,
    }
  }

  if (Array.isArray(raw.links)) {
    const links = linkList(raw.links)
    return {
      data: {
        version: VERSION,
        settings: normalizeSettings(raw.settings),
        groups: links.length ? [{ id: uid('g'), name: FLAT_GROUP_NAME, links }] : [],
      },
      migrated: true,
    }
  }

  return null
}

function saveErrorText(message: string): string {
  if (/MAX_WRITE_OPERATIONS|MAX_SUSTAINED_WRITE_OPERATIONS/.test(message)) {
    return '同步写入太频繁，正在自动重试'
  }
  if (/QUOTA/i.test(message)) return '同步空间已满，请先导出备份再精简链接'
  return `保存失败：${message || '未知错误'}`
}

async function persist(): Promise<void> {
  const data = snapshot()
  const json = JSON.stringify(data)
  if (json === lastSaved) {
    dirty = false
    return
  }
  try {
    await storage.write(DATA_KEY, data)
    lastSaved = json
    dirty = false
    storageError.value = ''
    clearTimeout(retryTimer)
    retryTimer = undefined
  } catch (error) {
    const message = String((error as Error)?.message ?? error)
    storageError.value = saveErrorText(message)
    console.error('[cool-nav] 保存失败', error)
    // 限流这类错误等一下就好：自动重试，别把这几分钟的编辑丢掉
    if (!retryTimer && /MAX_(SUSTAINED_)?WRITE_OPERATIONS/.test(message)) {
      retryTimer = setTimeout(() => void persist(), RETRY_DELAY)
    }
  }
}

function scheduleSave(): void {
  dirty = true
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => void persist(), SAVE_DELAY)
}

function applyData(next: NavData): void {
  nav.version = next.version
  nav.settings = next.settings
  nav.groups = next.groups
}

/** 别的标签页 / 设备改了数据：本地没有待落盘的改动、也不在编辑中时才跟着变 */
function adoptRemote(raw: unknown): void {
  if (dirty || editing.value) return
  const next = normalizeNav(raw)
  if (!next || JSON.stringify(next.data) === JSON.stringify(snapshot())) return
  applyData(next.data)
  lastSaved = JSON.stringify(snapshot())
}

export async function initNav(): Promise<void> {
  const raw = await storage.read<unknown>(DATA_KEY)
  const stored = normalizeNav(raw)
  if (stored) {
    applyData(stored.data)
    // 老结构顺手按新结构落盘，下次打开就不用再转一遍
    if (stored.migrated) await persist()
  } else if (raw === undefined) {
    await persist()
  } else {
    // 数据在但读不出来：先用预置跑起来，别把别处写进去的内容覆盖掉
    storageError.value = '同步数据读不出来，已回退预置链接（没有覆盖原数据）'
  }

  const storedHistory = await storage.read<string[]>(HISTORY_KEY)
  if (Array.isArray(storedHistory)) searchHistory.value = storedHistory.slice(0, HISTORY_MAX)

  lastSaved = JSON.stringify(snapshot())

  if (!watching) {
    watch(nav, scheduleSave, { deep: true })
    storage.onChange(DATA_KEY, adoptRemote)
    watching = true
  }
}

function findGroup(groupId: string): NavGroup | undefined {
  return nav.groups.find((group) => group.id === groupId)
}

export function addGroup(name = '新分组'): void {
  nav.groups.push({ id: uid('g'), name, links: [] })
}

export function renameGroup(groupId: string, name: string): void {
  const group = findGroup(groupId)
  if (group) group.name = name
}

export function removeGroup(groupId: string): void {
  const index = nav.groups.findIndex((group) => group.id === groupId)
  if (index >= 0) nav.groups.splice(index, 1)
}

export function addLink(
  groupId: string,
  draft: { title: string; url: string; icon?: string },
): void {
  const group = findGroup(groupId)
  if (!group) return
  group.links.push({
    id: uid('l'),
    title: draft.title,
    url: draft.url,
    ...(draft.icon ? { icon: draft.icon } : {}),
  })
}

export function updateLink(groupId: string, linkId: string, patch: Partial<NavLink>): void {
  const link = findGroup(groupId)?.links.find((item) => item.id === linkId)
  if (!link) return
  if (patch.title !== undefined) link.title = patch.title
  if (patch.url !== undefined) link.url = patch.url
  if (patch.icon !== undefined) {
    if (patch.icon) link.icon = patch.icon
    else delete link.icon
  }
}

export function removeLink(groupId: string, linkId: string): void {
  const group = findGroup(groupId)
  if (!group) return
  const index = group.links.findIndex((link) => link.id === linkId)
  if (index >= 0) group.links.splice(index, 1)
}

export function replaceAll(next: NavData): void {
  applyData(next)
  void persist()
}

export function exportJson(): void {
  const stamp = new Date().toISOString().slice(0, 10)
  const blob = new Blob([JSON.stringify(snapshot(), null, 2)], { type: 'application/json' })
  const anchor = document.createElement('a')
  anchor.href = URL.createObjectURL(blob)
  anchor.download = `cool-nav-${stamp}.json`
  anchor.click()
  URL.revokeObjectURL(anchor.href)
}

export function parseImport(json: string): NavData {
  const parsed = normalizeNav(JSON.parse(json))
  if (!parsed) throw new Error('文件里没有 groups（也没有 v2 的 links）字段')
  return parsed.data
}

export function pushHistory(keyword: string): void {
  if (!nav.settings.historyEnabled) return
  const value = keyword.trim()
  if (!value) return
  searchHistory.value = [value, ...searchHistory.value.filter((item) => item !== value)].slice(
    0,
    HISTORY_MAX,
  )
  void storage.write(HISTORY_KEY, searchHistory.value).catch(() => {})
}

export function clearHistory(): void {
  searchHistory.value = []
  void storage.write(HISTORY_KEY, []).catch(() => {})
}
