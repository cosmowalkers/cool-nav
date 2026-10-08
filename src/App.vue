<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import SearchBar from './components/SearchBar.vue'
import LinkSections from './components/LinkSections.vue'
import SidePanel from './components/SidePanel.vue'
import LinkDialog from './components/LinkDialog.vue'
import HelpOverlay from './components/HelpOverlay.vue'
import NotesPanel from './components/NotesPanel.vue'
import type { NavGroup, NavLink } from './types'
import { isDark, toggleTheme } from './composables/useTheme'
import { helpOpen, notesOpen } from './composables/useUiState'
import {
  LINK_SELECTOR,
  focusGroup,
  focusLink,
  focusSearchBox,
  focusTile,
  moveTileFocus,
  type Direction,
} from './utils/focus'
import {
  addGroup,
  addLink,
  editing,
  moveLink,
  nav,
  removeGroup,
  removeLink,
  renameGroup,
  runUndo,
  storageError,
  toast,
  undoState,
  updateLink,
} from './composables/useNavData'

const dialogOpen = ref(false)
const dialogGroupId = ref('')
const dialogLink = ref<NavLink | null>(null)
/** 打开弹窗时焦点在哪，关掉后还回哪去（键盘流的闭环） */
let dialogFocusSource: HTMLElement | null = null

watch(dialogOpen, (open) => {
  if (open) {
    dialogFocusSource =
      document.activeElement instanceof HTMLElement ? document.activeElement : null
  } else if (dialogFocusSource) {
    const source = dialogFocusSource
    dialogFocusSource = null
    /* 链接删了之类的情况下元素可能已经不在 DOM 里，不在就不硬来 */
    void nextTick(() => {
      if (source.isConnected) source.focus()
    })
  }
})

/* 进编辑态时保证焦点在链接上：方向键 / N / Delete 才能立刻用，不然箭头会滚页面 */
watch(editing, (on) => {
  if (!on) return
  void nextTick(() => {
    const active = document.activeElement
    const alreadyOnTile = active instanceof HTMLElement && Boolean(active.closest(LINK_SELECTOR))
    if (!alreadyOnTile) focusTile()
  })
})

const TILE_KEYS: Record<string, Direction> = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowUp: 'up',
  ArrowDown: 'down',
}

/** hero 只在「自定义图片」时铺图，其余一律纯色 */
const photoUrl = computed(() =>
  nav.settings.background.preset === 'image' ? nav.settings.background.url : '',
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

/** 命令面板「新建链接」：加到第一个分组，没有分组就先建一个 */
function onCommandNewLink(): void {
  let groupId = nav.groups[0]?.id
  if (!groupId) {
    addGroup('常用')
    groupId = nav.groups[0]?.id ?? ''
  }
  if (groupId) openAddLink(groupId)
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

/** 跳到第 N 个分组的第一条链接（1 开头） */
function jumpToGroup(n: number): boolean {
  const group = nav.groups[n - 1]
  return group ? focusGroup(group.id) : false
}

function onKeydown(event: KeyboardEvent): void {
  const element = event.target instanceof Element ? event.target : null
  const tile = element?.closest<HTMLElement>(LINK_SELECTOR) ?? null
  const typing = element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement

  /* 弹窗开着时，除了 Esc 不响应任何页面级快捷键 */
  if (dialogOpen.value && event.key !== 'Escape') return

  /* 念念不忘开着时，除了 Esc 不响应任何页面级快捷键 */
  if (notesOpen.value) {
    if (event.key === 'Escape') {
      event.preventDefault()
      notesOpen.value = false
    }
    return
  }

  /* 帮助层开着时，只响应 Esc / ?（把它关掉） */
  if (helpOpen.value) {
    if (event.key === 'Escape' || event.key === '?') {
      event.preventDefault()
      helpOpen.value = false
    }
    return
  }

  /* `?` 快捷键帮助：输入框里就是普通字符，不拦 */
  if (!typing && event.key === '?') {
    event.preventDefault()
    helpOpen.value = !helpOpen.value
    return
  }

  /* M：记一条念念不忘（输入框里就是普通字符，不拦） */
  if (!typing && event.key.toLowerCase() === 'm' && !event.metaKey && !event.ctrlKey && !event.altKey) {
    event.preventDefault()
    notesOpen.value = true
    return
  }

  if (tile) {
    const plain = !event.metaKey && !event.ctrlKey && !event.altKey

    if (plain) {
      /* 方向键按视觉位置走，Enter 交给 <a> 自己打开 */
      const direction = TILE_KEYS[event.key]
      if (direction && moveTileFocus(tile, direction)) {
        event.preventDefault()
        return
      }
      /* 焦点已经在链接区时，数字键没有输入语义，直接当跳组用 */
      if (/^[1-9]$/.test(event.key)) {
        event.preventDefault()
        if (jumpToGroup(Number(event.key))) return
      }
      if (editing.value) {
        if (event.key === 'Delete' || event.key === 'Backspace') {
          event.preventDefault()
          const groupId = tile.dataset.group
          const linkId = tile.dataset.id
          if (groupId && linkId) removeLink(groupId, linkId)
          return
        }
      }
    }

    /* ⌘/Ctrl+↑↓ 跳首尾（Mac 没有 Home/End，用这套；Fn+Home/End 也仍兼容） */
    if ((event.metaKey || event.ctrlKey) && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
      event.preventDefault()
      focusTile(event.key === 'ArrowDown' ? 'last' : 'first')
      return
    }

    /* 编辑态：⌘/Ctrl+←→ 在当前分组内移动排序，移动完把焦点跟过去 */
    if (
      editing.value &&
      (event.metaKey || event.ctrlKey) &&
      (event.key === 'ArrowLeft' || event.key === 'ArrowRight')
    ) {
      event.preventDefault()
      const groupId = tile.dataset.group
      const linkId = tile.dataset.id
      if (
        groupId &&
        linkId &&
        moveLink(groupId, linkId, event.key === 'ArrowLeft' ? -1 : 1)
      ) {
        void nextTick(() => focusLink(linkId))
      }
      return
    }
  }

  /* 编辑态 N：新建链接——有焦点链接用它的组，否则用第一个组（没有就先建） */
  if (editing.value && !typing && event.key.toLowerCase() === 'n') {
    event.preventDefault()
    const groupId = tile?.dataset.group
    if (groupId) openAddLink(groupId)
    else onCommandNewLink()
    return
  }

  /* Alt+1~9 全局跳组；浏览器没拦的话，焦点不在链接区也能用 */
  if (event.altKey && !event.metaKey && !event.ctrlKey && /^[1-9]$/.test(event.key)) {
    event.preventDefault()
    if (jumpToGroup(Number(event.key))) return
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
    if (tile) focusSearchBox()
    return
  }
  if (event.key.toLowerCase() !== 'e') return
  if (event.metaKey || event.ctrlKey || event.altKey) return
  if (dialogOpen.value) return
  if (typing) return
  event.preventDefault()
  editing.value = !editing.value
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <div class="page min-h-full">
    <header class="relative z-20 h-[clamp(96px,15vh,128px)]">
      <div v-if="photoUrl" class="hero-photo" :style="{ backgroundImage: `url('${photoUrl}')` }"></div>
      <div class="relative mx-auto flex h-full w-full max-w-[1400px] items-center justify-center px-4">
        <SearchBar @new-link="onCommandNewLink" />
      </div>
    </header>

    <div
      class="relative z-10 mx-auto grid w-full max-w-[1400px] gap-3 px-4 pt-3 pb-20 xl:grid-cols-[minmax(0,1fr)_270px]"
    >
      <main class="min-w-0">
        <LinkSections
          :editing="editing"
          @add-link="openAddLink"
          @edit-link="openEditLink"
          @remove-link="(groupId: string, link: NavLink) => removeLink(groupId, link.id)"
          @rename-group="(groupId: string, name: string) => renameGroup(groupId, name)"
          @remove-group="onRemoveGroup"
          @add-group="addGroup()"
        />
      </main>

      <SidePanel v-if="nav.settings.showSidePanel" class="hidden self-start xl:block" />
    </div>

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

    <HelpOverlay />
    <NotesPanel :open="notesOpen" @close="notesOpen = false" />

    <div class="fixed bottom-7 left-1/2 z-[60] flex w-full max-w-[520px] -translate-x-1/2 flex-col items-center gap-2 px-4">
      <div
        v-if="undoState"
        class="flex items-center gap-3 rounded-[10px] border border-line bg-surface py-2 pr-2 pl-4 text-[12.5px] text-ink shadow-[0_12px_30px_rgba(0,0,0,0.18)]"
      >
        <span>{{ undoState.text }}</span>
        <button
          class="flex-none cursor-pointer rounded-md px-2 py-1 text-[12.5px] font-medium text-accent hover:bg-hover"
          @click="runUndo()"
        >
          撤销
        </button>
      </div>

      <div
        v-if="storageError || toast"
        class="rounded-[10px] border bg-surface px-4 py-2.5 text-[12.5px] text-ink shadow-[0_12px_30px_rgba(0,0,0,0.18)]"
        :class="storageError ? 'border-[#f79009]/40 text-[#b54708]' : 'border-line'"
      >
        {{ storageError || toast }}
      </div>
    </div>
  </div>
</template>
