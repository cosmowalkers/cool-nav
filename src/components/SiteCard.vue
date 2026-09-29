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
  return faviconUrl(props.link.url, 64)
})

const fallbackStyle = computed(() => ({ background: colorOf(props.link.url) }))
const fallbackText = computed(() => initialOf(props.link))

/* 换了网址或图标就重新给一次机会：上一张取不到不该一直挂着色块 */
watch(
  () => [props.link.url, props.link.icon],
  () => {
    iconFailed.value = false
  },
)

function onClick(event: MouseEvent): void {
  if (!props.editing) return
  if (event.metaKey || event.ctrlKey || event.shiftKey) return
  event.preventDefault()
  if (isDragging.value) return
  emit('edit')
}
</script>

<template>
  <div class="group/card relative">
    <a
      class="card flex items-center rounded-md border border-hair px-[15px] py-[14px] text-ink"
      :class="editing && 'cursor-grab'"
      :href="link.url"
      data-link
      @click="onClick"
    >
      <span
        class="mr-2.5 grid h-[26px] w-[26px] flex-none place-items-center overflow-hidden rounded-[4px] text-[12px] leading-none font-semibold text-white"
        :style="!iconSrc ? fallbackStyle : null"
      >
        <img
          v-if="iconSrc"
          class="h-full w-full object-contain"
          :src="iconSrc"
          alt=""
          @error="iconFailed = true"
        />
        <template v-else>{{ fallbackText }}</template>
      </span>
      <span class="min-w-0 flex-1 truncate text-[14px] font-semibold">{{ link.title }}</span>
    </a>

    <button
      v-if="editing"
      class="absolute top-1 right-1 grid h-[18px] w-[18px] cursor-pointer place-items-center rounded-[5px] bg-surface/70 text-faint opacity-0 transition-opacity duration-150 group-hover/card:opacity-100 focus-visible:opacity-100 hover:text-ink"
      title="删除"
      :aria-label="`删除 ${link.title}`"
      @click="emit('remove')"
    >
      <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <path d="M18 6 6 18" />
        <path d="m6 6 12 12" />
      </svg>
    </button>
  </div>
</template>
