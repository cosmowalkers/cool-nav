/**
 * 农历：直接交给浏览器内置的中国历法（ICU 数据），比自己维护年份表可靠，
 * 也不用为了几十年的数据多打包几十 KB。闰月 ICU 会带「闰」字，干支在 yearName 里。
 */
const lunarFormat = new Intl.DateTimeFormat('zh-CN-u-ca-chinese', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
})

const DAY_NAMES = [
  '初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
  '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
  '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十',
]

const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']
const ZODIACS = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪']

export interface LunarDate {
  /** 六月 / 闰六月 */
  month: string
  /** 十九 */
  day: string
  /** 丙午 */
  yearName: string
  /** 马 */
  zodiac: string
  /** 用于节日比对的键，如「八月十五」「闰六月十五」 */
  key: string
}

export function lunarOf(date: Date): LunarDate {
  const parts = lunarFormat.formatToParts(date)
  const value = (type: string): string => parts.find((part) => part.type === type)?.value ?? ''
  const yearName = value('yearName')
  const month = value('month')
  const dayNumber = Number(value('day'))
  const day = DAY_NAMES[dayNumber - 1] ?? String(dayNumber)
  return {
    month,
    day,
    yearName,
    zodiac: ZODIACS[BRANCHES.indexOf(yearName.slice(1))] ?? '',
    key: `${month}${day}`,
  }
}

/** 新历的「YYYY-MM-DD」，取值按本地时区算 */
export function dateKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

export function shiftDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

export function isWeekend(date: Date): boolean {
  const day = date.getDay()
  return day === 0 || day === 6
}

export function daysBetween(from: Date, to: Date): number {
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  const end = new Date(to.getFullYear(), to.getMonth(), to.getDate())
  return Math.round((end.getTime() - start.getTime()) / 86_400_000)
}
