import { ref } from 'vue'
import { storage } from '../storage'

/**
 * 「打开过几次、最后一次什么时候」的账本，给命令面板排序用。
 *
 * 为什么要有它：Arc 的命令栏之所以越用越准，是因为候选按你**实际打开过什么**排序，
 * 而不是按你当初把链接写进导航的顺序。只记在 `storage.local`——
 * 这是本机的使用痕迹，没有跟着浏览器账号上云的必要，也不进导出的备份。
 */
const STATS_KEY = 'linkStats'
/** 只留最近打开过的这些条，账本不会无限长 */
const KEEP = 200
const WRITE_DELAY = 1500

export interface LinkStat {
  /** 打开次数 */
  n: number
  /** 最后一次打开的时间戳 */
  at: number
}

export const linkStats = ref<Record<string, LinkStat>>({})

let dirty = false
let timer: ReturnType<typeof setTimeout> | undefined

export async function initLinkStats(): Promise<void> {
  const stored = await storage.readLocal<Record<string, LinkStat>>(STATS_KEY)
  if (!stored || typeof stored !== 'object') return
  const clean: Record<string, LinkStat> = {}
  /* 和 nav 一样，读进来的东西不能直接信：坏的条目丢掉，别让一条脏数据毁掉整个排序 */
  for (const [id, value] of Object.entries(stored)) {
    const n = Number(value?.n)
    const at = Number(value?.at)
    if (Number.isFinite(n) && n > 0 && Number.isFinite(at)) clean[id] = { n, at }
  }
  linkStats.value = clean
}

export function recordOpen(linkId: string): void {
  if (!linkId) return
  const previous = linkStats.value[linkId]
  /* 整个对象换掉：命令面板的排序是 computed，得让它看见变化 */
  linkStats.value = {
    ...linkStats.value,
    [linkId]: { n: (previous?.n ?? 0) + 1, at: Date.now() },
  }
  dirty = true
  clearTimeout(timer)
  timer = setTimeout(flush, WRITE_DELAY)
}

function flush(): void {
  if (!dirty) return
  dirty = false
  const entries = Object.entries(linkStats.value)
  if (entries.length > KEEP) {
    entries.sort((a, b) => b[1].at - a[1].at)
    linkStats.value = Object.fromEntries(entries.slice(0, KEEP))
  }
  void storage.writeLocal(STATS_KEY, linkStats.value)
}

/** 最近打开过的链接 id，新的在前 */
export function recentOpens(limit: number): string[] {
  return Object.entries(linkStats.value)
    .sort((a, b) => b[1].at - a[1].at)
    .slice(0, limit)
    .map(([id]) => id)
}

/**
 * 打分：打开得越勤分越高，越久没打开掉得越多（一周减半）。
 * 命中条数一样时，靠它把「你其实天天用的那条」顶上来。
 */
export function frecencyOf(linkId: string): number {
  const stat = linkStats.value[linkId]
  if (!stat) return 0
  const days = (Date.now() - stat.at) / 86_400_000
  return stat.n / (1 + days / 7)
}
