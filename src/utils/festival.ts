import type { LunarDate } from './lunar'

/** 只收「大家会想在导航页上看到」的节日，凑数的一律不放 */
const SOLAR_FESTIVALS: Record<string, string> = {
  '01-01': '元旦',
  '02-14': '情人节',
  '03-08': '妇女节',
  '03-12': '植树节',
  '05-01': '劳动节',
  '05-04': '青年节',
  '06-01': '儿童节',
  '07-01': '建党节',
  '08-01': '建军节',
  '09-10': '教师节',
  '10-01': '国庆节',
  '12-25': '圣诞节',
}

const LUNAR_FESTIVALS: Record<string, string> = {
  正月初一: '春节',
  正月十五: '元宵节',
  二月初二: '龙抬头',
  五月初五: '端午节',
  七月初七: '七夕',
  七月十五: '中元节',
  八月十五: '中秋节',
  九月初九: '重阳节',
  十二月初八: '腊八节',
}

/**
 * 今天的节日名，没有就是空串。
 * 农历节日优先于公历节日（八月十五比「某公历小节」更值得看），除夕单独判。
 */
export function festivalOf(date: Date, lunar: LunarDate, tomorrow: LunarDate): string {
  if (tomorrow.month === '正月' && tomorrow.day === '初一') return '除夕'
  const lunarHit = LUNAR_FESTIVALS[lunar.key]
  if (lunarHit) return lunarHit
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return SOLAR_FESTIVALS[`${month}-${day}`] ?? ''
}
