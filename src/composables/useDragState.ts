import { ref } from 'vue'

export const isDragging = ref(false)

let resetTimer: number | undefined

/** 拖拽刚结束时点击事件会紧随其后触发，用一个短暂的标记挡住它 */
export function markDragStart(): void {
  window.clearTimeout(resetTimer)
  isDragging.value = true
}

export function markDragEnd(): void {
  window.clearTimeout(resetTimer)
  resetTimer = window.setTimeout(() => {
    isDragging.value = false
  }, 80)
}
