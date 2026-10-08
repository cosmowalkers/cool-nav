<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { NavLink } from '../types'
import { colorOf, faviconUrl, initialOf, siteIconUrl } from '../utils/icon'
import { isDragging } from '../composables/useDragState'
import { iconMissed, rememberIconMiss } from '../composables/useIconMiss'
import { recordOpen } from '../composables/useLinkStats'

const props = defineProps<{ link: NavLink; editing: boolean; groupId: string }>()
const emit = defineEmits<{ edit: []; remove: [] }>()

/** 依次尝试：自定义图标 → 浏览器缓存的 favicon → 站点自己的 /favicon.ico → 色块 */
const candidates = computed(() => {
  const list: string[] = []
  if (props.link.icon) list.push(props.link.icon)
  const cached = faviconUrl(props.link.url, 32)
  if (cached) list.push(cached)
  const site = siteIconUrl(props.link.url)
  if (site && !iconMissed(props.link.url)) list.push(site)
  return list
})

const stage = ref(0)
const iconSrc = computed(() => candidates.value[stage.value] ?? '')

function onIconError(): void {
  /* 站点自己那张也挂了，就记下来，一周内不再为一个补不到的图标打扰它 */
  if (candidates.value[stage.value] === siteIconUrl(props.link.url)) rememberIconMiss(props.link.url)
  stage.value += 1
}

const fallbackStyle = computed(() => ({ background: colorOf(props.link.url) }))
const fallbackText = computed(() => initialOf(props.link))

/* 换了网址或图标就重新给一次机会：上一张取不到不该一直挂着色块 */
watch(
  () => [props.link.url, props.link.icon],
  () => {
    stage.value = 0
  },
)

function onClick(event: MouseEvent): void {
  if (!props.editing) {
    /* 浏览态：交给 <a> 自己跳，顺手记一笔，命令面板的排序要用 */
    recordOpen(props.link.id)
    return
  }
  if (event.metaKey || event.ctrlKey || event.shiftKey) return
  event.preventDefault()
  if (isDragging.value) return
  emit('edit')
}

/* 编辑态里回车应该和鼠标点击一致（进编辑弹窗），而不是把网页打开 */
function onEnter(event: KeyboardEvent): void {
  if (!props.editing) return
  event.preventDefault()
  emit('edit')
}
</script>

<template>
  <div class="group/card relative">
    <a
      class="card flex cursor-pointer items-center rounded-md px-2.5 py-2 text-ink no-underline"
      :class="editing && 'cursor-grab'"
      :href="link.url"
      data-link
      :data-group="groupId"
      :data-id="link.id"
      @click="onClick"
      @keydown.enter="onEnter"
    >
      <span
        class="mr-2.5 grid h-[18px] w-[18px] flex-none place-items-center overflow-hidden rounded-[4px] text-[10px] leading-none font-semibold text-white"
        :style="!iconSrc ? fallbackStyle : null"
      >
        <img
          v-if="iconSrc"
          class="h-full w-full object-contain"
          :src="iconSrc"
          alt=""
          @error="onIconError"
        />
        <template v-else>{{ fallbackText }}</template>
      </span>
      <span class="min-w-0 flex-1 truncate text-[14px] font-medium">{{ link.title }}</span>
    </a>

    <button
      v-if="editing"
      class="absolute top-1/2 right-1 grid h-[18px] w-[18px] -translate-y-1/2 cursor-pointer place-items-center rounded-[5px] text-faint hover:text-ink"
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
