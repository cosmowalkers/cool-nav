import { computed, ref, watch } from 'vue'
import type { ThemeMode } from '../types'
import { nav } from './useNavData'

/**
 * 色板只在 styles.css 里写一份（用 light-dark()），所以切换主题实际就两件事：
 * 把 theme 写到 <html data-theme> 上，以及让 color-scheme 跟着变。
 * 不写属性时 CSS 里的 color-scheme: light dark 会自然跟随系统。
 */
const query = window.matchMedia('(prefers-color-scheme: dark)')
const systemDark = ref(query.matches)

export const theme = computed<ThemeMode>(() => nav.settings.theme)

/** 当前实际渲染出来的是不是深色——「跟随系统」时要问系统 */
export const isDark = computed(() => {
  if (theme.value === 'light') return false
  if (theme.value === 'dark') return true
  return systemDark.value
})

export function setTheme(next: ThemeMode): void {
  nav.settings.theme = next
}

export function toggleTheme(): void {
  setTheme(isDark.value ? 'light' : 'dark')
}

function paint(): void {
  const root = document.documentElement
  if (theme.value === 'system') delete root.dataset.theme
  else root.dataset.theme = theme.value
}

export function initTheme(): void {
  query.addEventListener('change', (event) => {
    systemDark.value = event.matches
  })
  watch(theme, paint, { immediate: true })
}
