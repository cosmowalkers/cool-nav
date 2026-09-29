export interface NavLink {
  id: string
  title: string
  url: string
  /** 手动指定的图标地址，留空则用浏览器原生 favicon */
  icon?: string
}

export interface NavSettings {
  engineId: string
  showClock: boolean
  historyEnabled: boolean
  background: NavBackground
}

/**
 * preset 取值：none | 内置渐变 id | 'scene'（内置风景） | 'image'（用 url）
 *            | 'local'（本机图库） | 'bing'（每日一图）
 */
export interface NavBackground {
  preset: string
  url: string
  /** 轮换节奏：newtab | hour | day | never */
  rotate: string
  /** 蒙版强度：weak | medium | strong */
  scrim: string
}

export interface NavData {
  version: number
  /** 铺平的一整条链接列表，顺序就是屏幕上的顺序 */
  links: NavLink[]
  settings: NavSettings
}
