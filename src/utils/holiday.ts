import { dateKey, isWeekend } from './lunar'

/** 一天：是不是休息日；补班那天 off=false 但带假期名 */
export interface HolidayDay {
  name: string
  off: boolean
}

/** 一年：`YYYY-MM-DD` → 那天的安排 */
export interface HolidayTable {
  year: number
  days: Record<string, HolidayDay>
}

/**
 * 数据源是 holiday-cn：它按国务院办公厅通知手工维护，文件里带通知原文链接，
 * 结构就是 `{ days: [{ name, date, isOffDay }] }`，比各种聚合 API 好判读。
 * 国内访问各家 CDN 时好时坏（实测 cdn.jsdelivr.net 会挂着不回），所以：
 * 按实测速度排序 + 每个镜像 5 秒超时，挂住的那个不会把整个功能拖死。
 */
const MIRRORS = [
  (year: number) => `https://fastly.jsdelivr.net/gh/NateScarlet/holiday-cn@master/${year}.json`,
  (year: number) =>
    `https://raw.githubusercontent.com/NateScarlet/holiday-cn/master/${year}.json`,
  (year: number) => `https://cdn.jsdelivr.net/gh/NateScarlet/holiday-cn@master/${year}.json`,
]

const MIRROR_TIMEOUT = 5000

async function fetchJson<T>(url: string): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), MIRROR_TIMEOUT)
  try {
    const response = await fetch(url, { credentials: 'omit', signal: controller.signal })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    return (await response.json()) as T
  } finally {
    clearTimeout(timer)
  }
}

interface RawYear {
  year?: number
  days?: { name?: string; date?: string; isOffDay?: boolean }[]
}

export async function fetchHolidayYear(year: number): Promise<HolidayTable> {
  let lastError: unknown
  for (const mirror of MIRRORS) {
    try {
      const raw = await fetchJson<RawYear>(mirror(year))
      const days: Record<string, HolidayDay> = {}
      for (const day of raw.days ?? []) {
        if (!day.date) continue
        days[day.date] = { name: day.name ?? '', off: Boolean(day.isOffDay) }
      }
      if (!Object.keys(days).length) throw new Error('文件里没有数据')
      return { year: raw.year ?? year, days }
    } catch (error) {
      lastError = error
    }
  }
  throw lastError instanceof Error ? lastError : new Error('假期数据取不到')
}

export interface DayStatus {
  /** 今天休息吗（含周末） */
  off: boolean
  /** 假期的名字，普通周末为空 */
  name: string
  /** 调休补班 */
  makeup: boolean
  /** 没有官方数据、只能按周末规则判断 */
  guessed: boolean
}

export function statusOf(date: Date, table: HolidayTable | null): DayStatus {
  const entry = table?.days[dateKey(date)]
  if (entry) {
    /* 补班那天也要留着假期名：界面要说清「补班（国庆节调休）」 */
    return { off: entry.off, name: entry.name, makeup: !entry.off, guessed: false }
  }
  return { off: isWeekend(date), name: '', makeup: false, guessed: !table }
}

export interface NextHoliday {
  name: string
  /** 今天就在假期里 */
  ongoing: boolean
  /** 假期第几天（1 起） / 距离开始还有几天 */
  days: number
  /** 这次假期一共几天 */
  length: number
}

/** 把同一段连续的休息日收成一条假期 */
function holidayRuns(table: HolidayTable): { name: string; from: string; to: string; days: string[] }[] {
  const dates = Object.keys(table.days)
    .filter((key) => table.days[key].off)
    .sort()
  const runs: { name: string; from: string; to: string; days: string[] }[] = []
  for (const key of dates) {
    const last = runs[runs.length - 1]
    if (last) {
      const expected = new Date(`${last.to}T00:00:00`)
      expected.setDate(expected.getDate() + 1)
      if (dateKey(expected) === key) {
        last.to = key
        last.days.push(key)
        if (!last.name) last.name = table.days[key].name
        continue
      }
    }
    runs.push({ name: table.days[key].name, from: key, to: key, days: [key] })
  }
  return runs
}

/** 下一个假期：正在放就报「第几天」，还没到就报「还有几天」 */
export function nextHoliday(date: Date, table: HolidayTable | null): NextHoliday | null {
  if (!table) return null
  const today = dateKey(date)
  const runs = holidayRuns(table)
  for (const run of runs) {
    if (run.to < today) continue
    if (run.from <= today && today <= run.to) {
      return {
        name: run.name,
        ongoing: true,
        days: run.days.indexOf(today) + 1,
        length: run.days.length,
      }
    }
    const start = new Date(`${run.from}T00:00:00`)
    const from = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    const gap = Math.round((start.getTime() - from.getTime()) / 86_400_000)
    return { name: run.name, ongoing: false, days: gap, length: run.days.length }
  }
  return null
}
