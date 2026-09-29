<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import SearchBar from './components/SearchBar.vue'
import GroupNav from './components/GroupNav.vue'
import LinkSections from './components/LinkSections.vue'
import SidePanel from './components/SidePanel.vue'
import LinkDialog from './components/LinkDialog.vue'
import EditBar from './components/EditBar.vue'
import type { NavGroup, NavLink } from './types'
import {
  allowBing,
  bingNeedsPermission,
  heroTone,
  imageCredit,
  photoUrl,
  wallpaperError,
} from './composables/useWallpaper'
import { isDark, toggleTheme } from './composables/useTheme'
import { LINK_SELECTOR, focusSearchBox, moveTileFocus, type Direction } from './utils/focus'
import {
  addGroup,
  addLink,
  editing,
  exportJson,
  nav,
  parseImport,
  removeGroup,
  removeLink,
  renameGroup,
  replaceAll,
  showToast,
  storageError,
  toast,
  updateLink,
} from './composables/useNavData'

const dialogOpen = ref(false)
const dialogGroupId = ref('')
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

function openAddLink(groupId: string): void {
  dialogGroupId.value = groupId
  dialogLink.value = null
  dialogOpen.value = true
}

function openEditLink(groupId: string, link: NavLink): void {
  dialogGroupId.value = groupId
  dialogLink.value = link
  dialogOpen.value = true
}

function onDialogSave(payload: { title: string; url: string; icon?: string }): void {
  if (dialogLink.value) {
    updateLink(dialogGroupId.value, dialogLink.value.id, payload)
  } else {
    addLink(dialogGroupId.value, payload)
  }
  dialogOpen.value = false
}

function onRemoveGroup(groupId: string): void {
  const group = nav.groups.find((item) => item.id === groupId)
  if (!group) return
  const extra = group.links.length ? `，同时删除里面 ${group.links.length} 条链接` : ''
  if (window.confirm(`删除分组「${group.name}」${extra}？删除后无法撤销。`)) {
    removeGroup(groupId)
  }
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
    const linkCount = next.groups.reduce((sum, group) => sum + group.links.length, 0)
    const ok = window.confirm(
      `导入会覆盖当前数据（${next.groups.length} 个分组 / ${linkCount} 条链接），继续？`,
    )
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
  const tile = element?.closest<HTMLElement>(LINK_SELECTOR) ?? null

  /* 焦点在链接卡片上时，方向键按视觉位置走，Enter 交给 <a> 自己打开 */
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
    /* 从链接一路按 Esc 就回到搜索框 */
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
  <div class="page min-h-full">
    <!-- 顶图只包住搜索框，下面整片是纯色，所以不需要任何蒙层 -->
    <header
      class="hero relative z-20 h-[clamp(200px,26vh,276px)]"
      :style="{ '--hero-tone': heroTone }"
    >
      <div class="absolute inset-0 overflow-hidden">
        <Transition name="wall">
          <div v-if="photoUrl" :key="photoUrl" class="wall hero-photo" :style="photoStyle"></div>
        </Transition>
      </div>
      <div class="relative mx-auto flex h-full w-full max-w-[1400px] items-center justify-center px-4">
        <SearchBar />
      </div>

      <!-- 每日一图要先问过用户：没给权限就一直是纯色底，这里是唯一的入口 -->
      <div
        v-if="bingNeedsPermission && nav.settings.background.preset === 'bing'"
        class="absolute inset-x-0 bottom-3.5 z-30 flex justify-center"
      >
        <button
          data-glass
          class="cursor-pointer rounded-lg px-3 py-[5px] text-[12px] text-dim transition-colors hover:text-ink"
          title="只申请 bing.com 一个域名的访问权限"
          @click="allowBing()"
        >
          每日一图需要读 bing.com 的权限 · 点这里允许
        </button>
      </div>
    </header>

    <div
      class="relative z-10 mx-auto grid w-full max-w-[1400px] gap-3 px-4 pt-3 pb-20 lg:grid-cols-[160px_minmax(0,1fr)] xl:grid-cols-[160px_minmax(0,1fr)_270px]"
    >
      <GroupNav v-if="nav.groups.length" class="hidden self-start lg:block" />

      <main class="min-w-0">
        <LinkSections
          :editing="editing"
          @add-link="openAddLink"
          @edit-link="openEditLink"
          @remove-link="(groupId: string, link: NavLink) => removeLink(groupId, link.id)"
          @rename-group="(groupId: string, name: string) => renameGroup(groupId, name)"
          @remove-group="onRemoveGroup"
        />
      </main>

      <SidePanel class="hidden self-start xl:block" />
    </div>

    <p
      v-if="imageCredit"
      class="pointer-events-none fixed right-5 bottom-3 z-30 m-0 max-w-[52ch] truncate text-[10.5px] text-faint"
    >
      {{ imageCredit }}
    </p>

    <EditBar
      v-if="editing"
      @add-group="addGroup()"
      @export-data="exportJson()"
      @import-data="onImportClick"
    />

    <div class="fixed top-4 right-5 z-40 flex items-center gap-1.5">
      <button
        data-glass
        class="grid h-[30px] w-[30px] cursor-pointer place-items-center rounded-[9px] text-dim transition-colors hover:text-ink"
        :title="isDark ? '切换到浅色' : '切换到深色'"
        :aria-label="isDark ? '切换到浅色' : '切换到深色'"
        @click="toggleTheme()"
      >
        <svg v-if="isDark" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2" />
          <path d="M12 20v2" />
          <path d="M4.9 4.9l1.4 1.4" />
          <path d="M17.7 17.7l1.4 1.4" />
          <path d="M2 12h2" />
          <path d="M20 12h2" />
          <path d="M4.9 19.1l1.4-1.4" />
          <path d="M17.7 6.3l1.4-1.4" />
        </svg>
        <svg v-else viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
        </svg>
      </button>

      <button
        data-glass
        class="grid h-[30px] w-[30px] cursor-pointer place-items-center rounded-[9px] text-dim transition-colors hover:text-ink"
        :class="editing && 'text-accent'"
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
    </div>

    <LinkDialog
      :open="dialogOpen"
      :link="dialogLink"
      :group-name="nav.groups.find((group: NavGroup) => group.id === dialogGroupId)?.name ?? ''"
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
