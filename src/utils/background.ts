export interface BackgroundPreset {
  id: string
  name: string
  css: string
}

/** 内置背景用程序化渐变，不带图片资源：零体积、秒出、不依赖网络 */
export const BACKGROUND_PRESETS: BackgroundPreset[] = [
  { id: 'none', name: '无', css: '' },
  {
    id: 'aurora',
    name: '极光',
    css: 'radial-gradient(130% 100% at 8% 0%, rgba(99,102,241,0.42), transparent 58%), radial-gradient(110% 85% at 92% 12%, rgba(168,85,247,0.3), transparent 58%), radial-gradient(130% 110% at 60% 108%, rgba(6,182,212,0.3), transparent 62%), linear-gradient(155deg, #131a2e 0%, #0d1019 55%, #0a0b12 100%)',
  },
  {
    id: 'dawn',
    name: '晨曦',
    css: 'radial-gradient(110% 80% at 15% 10%, rgba(251,146,60,0.45), transparent 55%), radial-gradient(100% 90% at 85% 20%, rgba(244,114,182,0.4), transparent 55%), linear-gradient(160deg, #1b1220 0%, #150f1a 60%, #0e0b12 100%)',
  },
  {
    id: 'ink',
    name: '墨蓝',
    css: 'radial-gradient(120% 90% at 50% 0%, rgba(56,189,248,0.35), transparent 60%), radial-gradient(90% 70% at 85% 90%, rgba(59,130,246,0.22), transparent 60%), linear-gradient(180deg, #0b1220 0%, #080a10 100%)',
  },
]

/** 只有渐变类来源会走到这里，图片类来源由 useWallpaper 接管 */
export function presetCss(id: string): string {
  return BACKGROUND_PRESETS.find((item) => item.id === id)?.css ?? ''
}

export function isPhotoPreset(preset: string): boolean {
  return preset === 'scene' || preset === 'image' || preset === 'local' || preset === 'bing'
}
