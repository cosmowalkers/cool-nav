/**
 * 背景只有两类：网络图（每日一图 / 自己填的图片链接）和纯色。
 *
 * 纯色不另设一套色值——它就是页面底色（浅色 `#f0f2f5` / 深色 `#16181c`），
 * 所以图片没就位时天然落在纯色上，不需要额外的兜底层。
 */
export function isPhotoPreset(preset: string): boolean {
  return preset === 'bing' || preset === 'image'
}

/**
 * 每个搜索引擎一个固定底色：图片没权限、没取到、或者用户干脆选了纯色时，顶图那一条就是它。
 *
 * 取的是孟菲斯（Memphis）那一套：高饱和、明亮、带点玩具感的粉彩色，而不是灰扑扑的浅灰调。
 * 亮色档走在 84% 上下的高亮度高饱和，深色档不是把它压黑，而是同一个色相往深水色走，
 * 这样深色下那一条仍然是个有颜色的带子。两份值写在同一条 `light-dark()` 里，跟着 `color-scheme` 走。
 */
const ENGINE_TONE: Record<string, string> = {
  bing: 'light-dark(#a9deff, #1d4e6b)', /* 天蓝 */
  google: 'light-dark(#ffe7a0, #4e3e12)', /* 亮黄 */
  github: 'light-dark(#a6f0cd, #1e4a3c)', /* 薄荷 */
}

export function engineTone(engineId: string): string {
  return ENGINE_TONE[engineId] ?? ENGINE_TONE.bing
}
