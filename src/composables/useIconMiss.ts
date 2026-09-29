import { ref } from 'vue'
import { storage } from '../storage'

/**
 * 「这个域名没有 /favicon.ico」记在这，7 天内不再试。
 *
 * 为什么要有这层记忆：新标签页一天开几十次，如果每次都为一个补不到图标的域名发一次请求，
 * 等于拿用户和站点的带宽去撞一堵墙。失败一次记下来，过一周再给它一次机会
 * （站点可能后来补了图标，也可能用户换了网络环境）。
 */
const MISS_KEY = 'iconMiss'
const RETRY_AFTER = 7 * 86_400_000

const misses = ref<Record<string, number>>({})
let dirty = false
let timer: number | undefined

export async function initIconMiss(): Promise<void> {
  const stored = await storage.readLocal<Record<string, number>>(MISS_KEY)
  if (stored && typeof stored === 'object') misses.value = stored
}

function keyOf(url: string): string {
  try {
    return new URL(url).host
  } catch {
    return ''
  }
}

/** 最近失败过就别再试了 */
export function iconMissed(url: string): boolean {
  const host = keyOf(url)
  if (!host) return false
  const at = misses.value[host]
  return typeof at === 'number' && Date.now() - at < RETRY_AFTER
}

/** 记一次失败；写盘防抖，别为几个图标把 storage 写爆 */
export function rememberIconMiss(url: string): void {
  const host = keyOf(url)
  if (!host) return
  misses.value = { ...misses.value, [host]: Date.now() }
  dirty = true
  window.clearTimeout(timer)
  timer = window.setTimeout(() => {
    if (!dirty) return
    dirty = false
    void storage.writeLocal(MISS_KEY, misses.value)
  }, 1000)
}
