import { onMounted, onUnmounted, ref } from 'vue'

const timeFormat = new Intl.DateTimeFormat('zh-CN', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

const dateFormat = new Intl.DateTimeFormat('zh-CN', {
  month: 'long',
  day: 'numeric',
  weekday: 'short',
})

export function useClock() {
  const time = ref('')
  const date = ref('')
  let timer: number | undefined

  function tick(): void {
    const now = new Date()
    time.value = timeFormat.format(now)
    date.value = dateFormat.format(now)
  }

  onMounted(() => {
    tick()
    timer = window.setInterval(tick, 1000)
  })

  onUnmounted(() => {
    if (timer) window.clearInterval(timer)
  })

  return { time, date }
}
