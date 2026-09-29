/** lunar-javascript 只发布了 CommonJS 实现，这里只声明用到的那几个方法 */
declare module 'lunar-javascript' {
  export interface LunarDate {
    getDayYi(): string[]
    getDayJi(): string[]
    getZhiXing(): string
    getXiu(): string
    getDayChongDesc(): string
  }

  export interface SolarDate {
    getLunar(): LunarDate
  }

  export const Solar: {
    fromYmd(year: number, month: number, day: number): SolarDate
  }
}
