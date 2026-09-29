export interface NavLink {
  id: string
  title: string
  url: string
  /** 手动指定的图标地址，留空则用浏览器原生 favicon */
  icon?: string
}

/** system＝跟随系统；light / dark＝用户手动锁定 */
export type ThemeMode = 'system' | 'light' | 'dark'

export interface NavGroup {
  id: string
  name: string
  links: NavLink[]
}

export interface NavSettings {
  engineId: string
  /** 亮暗色 */
  theme: ThemeMode
  /** 手动指定的天气城市；留空则用定位 */
  city: string
  /** 右侧信息栏：时间、农历、天气、假期、黄历 */
  showSidePanel: boolean
  historyEnabled: boolean
  background: NavBackground
}

/**
 * preset 取值：'bing'（每日一图，默认）| 'image'（自己填的图片链接）| 'none'（纯色兜底）
 *            | 'local'（本机图库） | 'bing'（每日一图）
 */
export interface NavBackground {
  preset: string
  url: string
  /** 轮换节奏：newtab | hour | day | never */
  rotate: string
}

export interface NavData {
  version: number
  /** 分组列表：屏幕上就是一列一列的分组，链接在组内按顺序排 */
  groups: NavGroup[]
  settings: NavSettings
}
