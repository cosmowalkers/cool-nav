import { Solar } from 'lunar-javascript'

/**
 * 黄历宜忌走本地计算（lunar-javascript，MIT，内置通胜的建除十二神与宜忌表）。
 * 免费黄历接口实测都连不通，而且这类接口随时会挂——离线算反而更省心。
 */
export interface Almanac {
  /** 宜做的事，最多 7 条 */
  yi: string[]
  /** 忌做的事，最多 7 条 */
  ji: string[]
  /** 建除十二神之一：建/除/满/平/定/执/破/危/成/收/开/闭 */
  zhiXing: string
  /** 二十八宿，如「室」 */
  xiu: string
  /** 冲煞，如「(庚子)鼠」 */
  chong: string
}

const MAX_ITEMS = 7

export function almanacOf(date: Date): Almanac {
  const lunar = Solar.fromYmd(date.getFullYear(), date.getMonth() + 1, date.getDate()).getLunar()
  return {
    yi: lunar.getDayYi().slice(0, MAX_ITEMS),
    ji: lunar.getDayJi().slice(0, MAX_ITEMS),
    zhiXing: lunar.getZhiXing(),
    xiu: lunar.getXiu(),
    chong: lunar.getDayChongDesc(),
  }
}
