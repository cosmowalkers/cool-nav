<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watchEffect } from 'vue'
import ClockDisplay from './components/ClockDisplay.vue'
import SearchBar from './components/SearchBar.vue'
import LinkGrid from './components/LinkGrid.vue'
import LinkDialog from './components/LinkDialog.vue'
import EditBar from './components/EditBar.vue'
import type { NavLink } from './types'
import { gradient, hasBackground, imageCredit, photoUrl, wallpaperError } from './composables/useWallpaper'
import { scrimCss } from './utils/wallpaper'
import { focusSearchBox, moveTileFocus, type Direction } from './utils/focus'
import {
  addLink,
  editing,
  exportJson,
  nav,
  parseImport,
  removeLink,
  replaceAll,
  showToast,
  storageError,
  toast,
  updateLink,
} from './composables/useNavData'

const dialogOpen = ref(false)
const dialogLink = ref<NavLink | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)

const TILE_KEYS: Record<string, Direction> = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowUp: 'up',
  ArrowDown: 'down',
}

const photoStyle = computed(() =>
  photoUrl.value ? { backgroundImage: `url("${photoUrl.value}")` } : {},
)

/* 有背景就锁深色文字体系：文字压在图上，浅底黑字基本没法看 */
watchEffect(() => {
  document.documentElement.dataset.bg = hasBackground.value ? 'dark' : ''
})

function openAddLink(): void {
  dialogLink.value = null
  dialogOpen.value = true
}

function openEditLink(link: NavLink): void {
  dialogLink.value = link
  dialogOpen.value = true
}

function onDialogSave(payload: { title: string; url: string; icon?: string }): void {
  if (dialogLink.value) {
    updateLink(dialogLink.value.id, payload)
  } else {
    addLink(payload)
  }
  dialogOpen.value = false
}

function onImportClick(): void {
  fileInput.value?.click()
}

async function onFileChange(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  try {
    const next = parseImport(await file.text())
    const ok = window.confirm(`导入会覆盖当前数据（${next.links.length} 条链接），继续？`)
    if (ok) {
      replaceAll(next)
      showToast('导入成功')
    }
  } catch (error) {
    showToast(`导入失败：${(error as Error).message}`)
  } finally {
    input.value = ''
  }
}

function onKeydown(event: KeyboardEvent): void {
  const element = event.target instanceof Element ? event.target : null
  const tile = element?.closest<HTMLElement>('[data-tile]') ?? null

  /* 焦点在瓦片上时，方向键按视觉位置走，Enter 交给 <a> 自己打开 */
  if (tile && !event.metaKey && !event.ctrlKey && !event.altKey) {
    const direction = TILE_KEYS[event.key]
    if (direction && moveTileFocus(tile, direction)) {
      event.preventDefault()
      return
    }
  }

  if (event.key === 'Escape') {
    if (dialogOpen.value) {
      dialogOpen.value = false
      return
    }
    if (editing.value) {
      editing.value = false
      return
    }
    /* 从瓦片一路按 Esc 就回到搜索框，和「新标签页就是为输入而生」对齐 */
    if (tile) focusSearchBox()
    return
  }
  if (event.key.toLowerCase() !== 'e') return
  if (event.metaKey || event.ctrlKey || event.altKey) return
  if (dialogOpen.value) return
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) return
  event.preventDefault()
  editing.value = !editing.value
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <div class="page min-h-full px-8 pt-[clamp(64px,13vh,140px)] pb-[72px]">
    <div class="wall -z-10" :style="gradient ? { backgroundImage: gradient } : null"></div>
    <Transition name="wall">
      <div
        v-if="photoUrl"
        :key="photoUrl"
        class="wall wall-photo -z-10"
        :style="photoStyle"
      ></div>
    </Transition>
    <div
      v-if="photoUrl"
      class="wall -z-10"
      :style="{ backgroundImage: scrimCss(nav.settings.background.scrim) }"
    ></div>
    <div v-if="hasBackground" class="grain pointer-events-none fixed inset-0 -z-10"></div>
    <p
      v-if="imageCredit"
      class="pointer-events-none fixed right-5 bottom-3 m-0 max-w-[52ch] truncate text-[10.5px] text-faint"
    >
      {{ imageCredit }}
    </p>

    <div class="mx-auto w-full max-w-[960px]">
      <header class="mb-[42px]">
        <ClockDisplay v-if="nav.settings.showClock" />
        <SearchBar />
      </header>

      <main class="flex flex-wrap items-center justify-center">
        <LinkGrid
          :editing="editing"
          @add="openAddLink()"
          @edit-link="openEditLink"
          @remove-link="(link: NavLink) => removeLink(link.id)"
        />
      </main>
    </div>

    <EditBar v-if="editing" @export-data="exportJson()" @import-data="onImportClick" />

    <button
      class="edit-toggle fixed top-4 right-5 z-40 grid h-[30px] w-[30px] cursor-pointer place-items-center rounded-[9px] text-dim opacity-0 transition-opacity duration-200 hover:bg-hover hover:text-ink"
      :class="editing && 'bg-hover text-ink'"
      :data-active="editing"
      :title="editing ? '完成编辑 (Esc)' : '编辑 (E)'"
      :aria-label="editing ? '完成编辑' : '进入编辑模式'"
      :aria-pressed="editing"
      @click="editing = !editing"
    >
      <svg v-if="editing" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <path d="m20 6-11 11-5-5" />
      </svg>
      <svg v-else viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
      </svg>
    </button>

    <LinkDialog
      :open="dialogOpen"
      :link="dialogLink"
      @save="onDialogSave"
      @close="dialogOpen = false"
    />

    <input ref="fileInput" type="file" accept="application/json,.json" hidden @change="onFileChange" />

    <div
      v-if="storageError || toast || wallpaperError"
      class="fixed bottom-7 left-1/2 z-[60] max-w-[520px] -translate-x-1/2 rounded-[10px] border bg-surface px-4 py-2.5 text-[12.5px] text-ink shadow-[0_12px_30px_rgba(0,0,0,0.18)]"
      :class="storageError || wallpaperError ? 'border-[#f79009]/40 text-[#b54708]' : 'border-line'"
    >
      {{ storageError || toast || wallpaperError }}
    </div>
  </div>
</template>
