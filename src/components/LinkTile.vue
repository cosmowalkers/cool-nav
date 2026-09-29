<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { NavLink } from '../types'
import { colorOf, faviconUrl, initialOf } from '../utils/icon'
import { isDragging } from '../composables/useDragState'

const props = defineProps<{ link: NavLink; editing: boolean }>()
const emit = defineEmits<{ edit: []; remove: [] }>()

const iconFailed = ref(false)

const iconSrc = computed(() => {
  if (props.link.icon) return props.link.icon
  if (iconFailed.value) return ''
  return faviconUrl(props.link.url)
})

/* 换了网址或图标就重新给一次机会：上一张取不到不该一直挂着色块 */
watch(
  () => [props.link.url, props.link.icon],
  () => {
    iconFailed.value = false
  },
)

const fallbackStyle = computed(() => ({ background: colorOf(props.link.url) }))
const fallbackText = computed(() => initialOf(props.link))

function onClick(event: MouseEvent): void {
  if (!props.editing) return
  if (event.metaKey || event.ctrlKey || event.shiftKey) return
  event.preventDefault()
  if (isDragging.value) return
  emit('edit')
}
</script>

<template>
  <div
    class="group/tile relative w-[96px] flex-none rounded-tile"
    :class="editing && 'outline-1 outline-dashed outline-offset-[-1px] outline-line'"
  >
    <a
      class="tile-link group/main flex flex-col items-center gap-2 rounded-tile px-1.5 pt-2.5 pb-2"
      :class="editing && 'cursor-grab'"
      :href="link.url"
      data-tile
      @click="onClick"
    >
      <span
        class="plate grid h-11 w-11 flex-none place-items-center overflow-hidden"
        :class="!iconSrc && 'text-[16px] font-medium text-white text-shadow-none'"
        :style="!iconSrc ? fallbackStyle : null"
      >
        <img
          v-if="iconSrc"
          class="h-[26px] w-[26px] object-contain"
          :src="iconSrc"
          alt=""
          @error="iconFailed = true"
        />
        <template v-else>{{ fallbackText }}</template>
      </span>
      <span class="max-w-full truncate text-center text-[12.5px] leading-[1.3]">{{ link.title }}</span>
    </a>

    <template v-if="editing">
      <button
        class="absolute top-0.5 left-0.5 grid h-5 w-5 cursor-pointer place-items-center rounded-md bg-surface text-dim opacity-0 shadow-[0_1px_3px_rgba(0,0,0,0.18)] transition-opacity duration-150 group-hover/tile:opacity-100 focus-visible:opacity-100 hover:text-ink"
        title="编辑"
        :aria-label="`编辑 ${link.title}`"
        @click="emit('edit')"
      >
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
      </button>
      <button
        class="absolute top-0.5 right-0.5 grid h-5 w-5 cursor-pointer place-items-center rounded-md bg-surface text-dim opacity-0 shadow-[0_1px_3px_rgba(0,0,0,0.18)] transition-opacity duration-150 group-hover/tile:opacity-100 focus-visible:opacity-100 hover:text-ink"
        title="删除"
        :aria-label="`删除 ${link.title}`"
        @click="emit('remove')"
      >
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        </svg>
      </button>
    </template>
  </div>
</template>
