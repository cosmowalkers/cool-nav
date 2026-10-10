<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import {
  addGroup,
  clearHistory,
  editing,
  exportJson,
  nav,
  parseImport,
  pushHistory,
  replaceAll,
  searchHistory,
  showToast,
} from '../composables/useNavData'
import { setTheme, theme } from '../composables/useTheme'
import { fillMissingIcons, fillingIcons } from '../composables/useLinkIcons'
import { frecencyOf, recentOpens, recordOpen } from '../composables/useLinkStats'
import { helpOpen, notesOpen } from '../composables/useUiState'
import { ENGINES, PREFIX_HINT, resolveQuery, type Engine } from '../utils/search'
import { colorOf, faviconUrl, initialOf } from '../utils/icon'
import { focusTile } from '../utils/focus'
import type { ThemeMode } from '../types'

const THEMES: { id: ThemeMode; name: string }[] = [
  { id: 'system', name: '跟随系统' },
  { id: 'light', name: '浅色' },
  { id: 'dark', name: '深色' },
]

const TABS = [
  { id: 'search', name: '搜索' },
  { id: 'look', name: '外观' },
]

const query = ref('')
const inputRef = ref<HTMLInputElement | null>(null)
const panelRef = ref<HTMLElement | null>(null)
const commandOpen = ref(false)
const settingsOpen = ref(false)
const activeKey = ref<string | null>(null)
const tab = ref('search')
const fileInput = ref<HTMLInputElement | null>(null)

const emit = defineEmits<{ newLink: [] }>()

const engine = computed<Engine>(
  () => ENGINES.find((item) => item.id === nav.settings.engineId) ?? ENGINES[0],
)

/* ---------- 命令面板 ---------- */

interface CommandItem {
  key: string
  kind: 'command'
  title: string
  keywords: string
  disabled?: boolean
  run: () => void
}

interface LinkItem {
  key: string
  kind: 'link'
  id: string
  title: string
  url: string
  groupName: string
}

interface HistoryItem {
  key: string
  kind: 'history'
  text: string
}

interface SearchItem {
  key: string
  kind: 'search'
  title: string
  url: string
}

type PanelItem = CommandItem | LinkItem | HistoryItem | SearchItem

interface Section {
  title: string
  items: PanelItem[]
}

const allCommands = computed<CommandItem[]>(() => [
  {
    key: 'cmd-edit',
    kind: 'command',
    title: '进入编辑模式',
    keywords: '编辑 edit 修改 manage',
    run: () => {
      editing.value = true
    },
  },
  {
    key: 'cmd-new-link',
    kind: 'command',
    title: '新建链接',
    keywords: '链接 新建 添加 link 常用',
    run: () => emit('newLink'),
  },
  {
    key: 'cmd-new-group',
    kind: 'command',
    title: '新建分组',
    keywords: '分组 新建 添加 group',
    run: () => {
      addGroup()
      showToast('已新建分组')
    },
  },
  {
    key: 'cmd-note',
    kind: 'command',
    title: '记一条念念不忘',
    keywords: '闪念 笔记 备忘录 便签 note memo',
    run: () => {
      notesOpen.value = true
    },
  },
  {
    key: 'cmd-sidepanel',
    kind: 'command',
    title: nav.settings.showSidePanel ? '隐藏右侧信息栏' : '显示右侧信息栏',
    keywords: '信息栏 时间 天气 农历 侧栏 显示 隐藏 sidepanel',
    run: () => {
      nav.settings.showSidePanel = !nav.settings.showSidePanel
    },
  },
  {
    key: 'cmd-help',
    kind: 'command',
    title: '快捷键帮助',
    keywords: '帮助 快捷键 键盘 help 快捷',
    run: () => {
      helpOpen.value = true
    },
  },
  ...THEMES.map(
    (item): CommandItem => ({
      key: `cmd-theme-${item.id}`,
      kind: 'command',
      title: `切换主题：${item.name}`,
      keywords: `主题 theme ${item.name}`,
      run: () => setTheme(item.id),
    }),
  ),
  ...ENGINES.map(
    (item): CommandItem => ({
      key: `cmd-engine-${item.id}`,
      kind: 'command',
      title: `切换搜索引擎：${item.name}`,
      keywords: `引擎 搜索 ${item.name.toLowerCase()}`,
      run: () => {
        nav.settings.engineId = item.id
      },
    }),
  ),
  {
    key: 'cmd-import',
    kind: 'command',
    title: '导入数据',
    keywords: '导入 import 还原 restore',
    run: () => fileInput.value?.click(),
  },
  {
    key: 'cmd-export',
    kind: 'command',
    title: '导出数据',
    keywords: '导出 export 备份 backup',
    run: () => exportJson(),
  },
  {
    key: 'cmd-icons',
    kind: 'command',
    title: fillingIcons.value ? '正在补全图标…' : '补全图标',
    keywords: '图标 icon 补全 fill',
    disabled: fillingIcons.value,
    run: () => void fillMissingIcons(),
  },
])

const allLinks = computed(() => {
  const out: { id: string; title: string; url: string; groupName: string }[] = []
  for (const group of nav.groups) {
    for (const link of group.links) {
      out.push({ id: link.id, title: link.title, url: link.url, groupName: group.name })
    }
  }
  return out
})

const linkHits = computed<LinkItem[]>(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return []
  return allLinks.value
    .filter((item) => item.title.toLowerCase().includes(q) || item.url.toLowerCase().includes(q))
    /* 命中条数一样时，常打开、最近打开的那条排前面——与声明顺序无关，sort 是稳定的 */
    .sort((a, b) => frecencyOf(b.id) - frecencyOf(a.id))
    .slice(0, 8)
    .map((item, index) => ({ key: `link-${index}-${item.url}`, kind: 'link', ...item }))
})

/** 空面板里的「最近打开」：Arc 的空命令栏给的就是这个，不是一屏命令 */
const recentItems = computed<LinkItem[]>(() => {
  const byId = new Map(allLinks.value.map((item) => [item.id, item]))
  const out: LinkItem[] = []
  for (const id of recentOpens(5)) {
    const item = byId.get(id)
    if (item) out.push({ key: `recent-${id}`, kind: 'link', ...item })
  }
  return out
})

const commandHits = computed<CommandItem[]>(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return allCommands.value
  return allCommands.value.filter(
    (item) => item.title.toLowerCase().includes(q) || item.keywords.toLowerCase().includes(q),
  )
})

const historyHits = computed<HistoryItem[]>(() => {
  if (!nav.settings.historyEnabled) return []
  const q = query.value.trim().toLowerCase()
  const pool = q
    ? searchHistory.value.filter((item) => item.toLowerCase().includes(q))
    : searchHistory.value
  return pool.slice(0, 6).map((item, index) => ({ key: `hist-${index}`, kind: 'history', text: item }))
})

const searchItem = computed<SearchItem | null>(() => {
  const q = query.value.trim()
  if (!q) return null
  const resolved = resolveQuery(q, engine.value.id)
  if (!resolved) return null
  const title = resolved.kind === 'url' ? `打开 ${resolved.url}` : `用 ${resolved.engine.name} 搜索「${q}」`
  return { key: 'search-default', kind: 'search', title, url: resolved.url }
})

const sections = computed<Section[]>(() => {
  const out: Section[] = []
  if (query.value.trim()) {
    if (linkHits.value.length) out.push({ title: '链接', items: linkHits.value })
    if (commandHits.value.length) out.push({ title: '命令', items: commandHits.value })
    if (historyHits.value.length) out.push({ title: '历史', items: historyHits.value })
    if (searchItem.value) out.push({ title: '搜索', items: [searchItem.value] })
  } else {
    if (recentItems.value.length) out.push({ title: '最近打开', items: recentItems.value })
    if (historyHits.value.length) out.push({ title: '最近搜索', items: historyHits.value })
    if (commandHits.value.length) out.push({ title: '命令', items: commandHits.value })
  }
  return out
})

const flatItems = computed(() => sections.value.flatMap((section) => section.items))
const panelVisible = computed(() => commandOpen.value && flatItems.value.length > 0)

/**
 * 输入之后默认选中第一项，Enter 就是「执行高亮项」——Arc 的命令栏一直有一项高亮，
 * 不然每次都得先按一次 `↓`，省下来的那点时间又还回去了。
 * 空输入时故意不选：新标签页是自动聚焦的，默认选中「进入编辑模式」等于回车就误入编辑态。
 */
watch([panelVisible, query], () => {
  if (!panelVisible.value) return
  if (!query.value.trim()) {
    activeKey.value = null
    return
  }
  if (flatItems.value.some((item) => item.key === activeKey.value)) return
  activeKey.value = flatItems.value[0]?.key ?? null
})

function closeCommand(): void {
  query.value = ''
  activeKey.value = null
  commandOpen.value = false
}

function activate(item: PanelItem, newTab = false): void {
  if (item.kind === 'link' || item.kind === 'search') {
    if (item.kind === 'link') recordOpen(item.id)
    if (newTab) window.open(item.url, '_blank')
    else window.location.href = item.url
    return
  }
  if (item.kind === 'history') {
    submit(item.text)
    return
  }
  if (item.disabled) return
  item.run()
  closeCommand()
}

function moveActive(delta: number): void {
  const items = flatItems.value
  if (!items.length) {
    activeKey.value = null
    return
  }
  const index = items.findIndex((item) => item.key === activeKey.value)
  const next =
    index < 0
      ? delta > 0
        ? 0
        : items.length - 1
      : (index + delta + items.length) % items.length
  activeKey.value = items[next].key
  /* 面板最高 520px，选中项可以走到看不见的地方，跟着滚一下 */
  void nextTick(() => {
    panelRef.value?.querySelector<HTMLElement>('[data-active]')?.scrollIntoView({ block: 'nearest' })
  })
}

function submit(value?: string, newTab = false): void {
  const raw = value ?? query.value
  const resolved = resolveQuery(raw, engine.value.id)
  if (!resolved) return
  if (resolved.kind === 'search') pushHistory(raw.trim())
  if (newTab) window.open(resolved.url, '_blank')
  else window.location.href = resolved.url
}

async function onImportFile(event: Event): Promise<void> {
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
    closeCommand()
    input.value = ''
  }
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Enter') {
    event.preventDefault()
    const current = flatItems.value.find((item) => item.key === activeKey.value)
    /* Cmd/Ctrl+Enter 在新标签页打开：浏览态里 Cmd+点击链接就是这个语义，面板里不该缺 */
    const newTab = event.metaKey || event.ctrlKey
    if (commandOpen.value && current) activate(current, newTab)
    else submit(undefined, newTab)
    return
  }
  if (event.key === 'Escape') {
    if (commandOpen.value || query.value) {
      closeCommand()
    } else {
      inputRef.value?.blur()
    }
    return
  }
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    /* 空输入时面板里只有「最近/命令」这类提示，↓ 应该直接进链接区；
       真正输入了内容才在搜索结果里移动 */
    if (query.value.trim() && flatItems.value.length) moveActive(1)
    else focusTile()
    return
  }
  if (event.key === 'ArrowUp') {
    if (!flatItems.value.length) return
    event.preventDefault()
    moveActive(-1)
  }
}

function onGlobalKeydown(event: KeyboardEvent): void {
  const target = event.target as HTMLElement | null
  const typing = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement
  if (typing) return
  const isSlash = event.key === '/'
  const isCommandK = event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey)
  if (isSlash || isCommandK) {
    event.preventDefault()
    inputRef.value?.focus()
  }
}

function faviconSrc(url: string): string {
  return faviconUrl(url, 32)
}

onMounted(() => {
  inputRef.value?.focus()
  window.addEventListener('keydown', onGlobalKeydown)
})

onUnmounted(() => window.removeEventListener('keydown', onGlobalKeydown))
</script>

<template>
  <div class="relative mx-auto w-full max-w-[760px]">
    <div
      class="search-surface flex h-[58px] items-center gap-3 rounded-[14px] border border-line pr-3 pl-4"
    >
      <svg class="flex-none text-faint" viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <input
        ref="inputRef"
        v-model="query"
        data-search-input
        class="min-w-0 flex-1 border-0 bg-transparent text-[16px] outline-none placeholder:text-faint"
        type="text"
        placeholder="搜索、直达链接或输入命令"
        autocomplete="off"
        spellcheck="false"
        @keydown="onKeydown"
        @focus="commandOpen = true"
        @input="commandOpen = true"
        @blur="commandOpen = false"
      />
      <button
        class="flex flex-none cursor-pointer items-center gap-[3px] rounded-lg px-2 py-1.5 text-[12.5px] text-dim hover:bg-hover hover:text-ink"
        :title="`默认引擎：${engine.name}`"
        aria-haspopup="true"
        :aria-expanded="settingsOpen"
        @click="settingsOpen = !settingsOpen"
      >
        {{ engine.name }}
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
    </div>

    <div
      v-if="panelVisible"
      ref="panelRef"
      class="absolute inset-x-0 top-[calc(100%+8px)] z-20 max-h-[min(60vh,520px)] overflow-y-auto rounded-xl border border-line bg-surface p-1.5 shadow-[0_18px_42px_rgba(0,0,0,0.16)]"
    >
      <section v-for="section in sections" :key="section.title" class="mb-1 last:mb-0">
        <div class="px-2.5 pt-1 pb-1 text-[11px] tracking-[0.08em] text-faint">
          {{ section.title }}
        </div>
        <button
          v-for="item in section.items"
          :key="item.key"
          class="flex w-full cursor-pointer items-center gap-[9px] rounded-lg px-2.5 py-2 text-left disabled:cursor-default"
          :class="item.key === activeKey ? 'bg-hover text-ink' : 'text-dim'"
          :data-active="item.key === activeKey ? '' : undefined"
          :disabled="'disabled' in item && item.disabled"
          @mousedown.prevent="activate(item, $event.metaKey || $event.ctrlKey)"
          @mouseenter="activeKey = item.key"
        >
          <span
            v-if="item.kind === 'link'"
            class="grid h-[18px] w-[18px] flex-none place-items-center overflow-hidden rounded-[4px] text-[10px] leading-none font-semibold text-white"
            :style="!faviconSrc(item.url) ? { background: colorOf(item.url) } : null"
          >
            <img v-if="faviconSrc(item.url)" class="h-full w-full object-contain" :src="faviconSrc(item.url)" alt="" />
            <template v-else>{{ initialOf(item) }}</template>
          </span>
          <svg v-else-if="item.kind === 'command'" class="flex-none text-faint" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M5 6h14M5 12h14M5 18h10" />
          </svg>
          <svg v-else-if="item.kind === 'history'" class="flex-none text-faint" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
          </svg>
          <svg v-else class="flex-none text-faint" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>

          <span class="min-w-0 flex-1 truncate">{{ item.kind === 'command' ? item.title : item.kind === 'link' ? item.title : item.kind === 'history' ? item.text : item.title }}</span>
          <span v-if="item.kind === 'link'" class="flex-none text-[11px] text-faint">{{ item.groupName }}</span>
          <span
            v-if="item.key === activeKey && (item.kind === 'link' || item.kind === 'search')"
            class="flex-none text-[11px] text-faint"
          >
            ⌘⏎ 新标签
          </span>
        </button>
      </section>
    </div>

    <div v-if="settingsOpen" class="fixed inset-0 z-30" @mousedown="settingsOpen = false"></div>
    <div
      v-if="settingsOpen"
      class="absolute top-[calc(100%+8px)] right-0 z-[31] w-[288px] rounded-[14px] border border-line bg-surface p-3.5 shadow-[0_18px_42px_rgba(0,0,0,0.18)]"
    >
      <div class="seg mb-3 flex gap-0.5 rounded-[10px] p-[3px]">
        <button
          v-for="item in TABS"
          :key="item.id"
          class="flex-1 cursor-pointer rounded-[7px] py-[5px] text-[12px] transition-colors"
          :class="tab === item.id ? 'seg-active text-ink' : 'text-faint hover:text-dim'"
          @click="tab = item.id"
        >
          {{ item.name }}
        </button>
      </div>

      <template v-if="tab === 'search'">
        <div class="mb-[9px] text-[11px] tracking-[0.08em] text-faint">默认搜索引擎</div>
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="item in ENGINES"
            :key="item.id"
            class="cursor-pointer rounded-lg border border-line px-2.5 py-[5px] text-[12px] text-dim hover:text-ink"
            :class="item.id === engine.id && 'border-accent/48 bg-accent/10 text-accent'"
            @click="nav.settings.engineId = item.id"
          >
            {{ item.name }}
          </button>
        </div>
        <div class="mt-[11px] text-[11.5px] leading-[1.6] text-faint">
          前缀直达：{{ PREFIX_HINT }}，例如
          <code class="rounded-[4px] bg-hover px-1 py-px text-[11px] text-dim">gh vue3</code>
        </div>

        <div class="my-[13px] h-px bg-line"></div>

        <label class="flex cursor-pointer items-center justify-between py-1.5 text-[13px]">
          <span>记录搜索历史</span>
          <input v-model="nav.settings.historyEnabled" class="h-3.5 w-3.5 cursor-pointer accent-accent" type="checkbox" />
        </label>
        <button
          v-if="searchHistory.length"
          class="mt-2 cursor-pointer text-[12.5px] text-dim hover:text-accent"
          @click="clearHistory()"
        >
          清除搜索历史
        </button>
      </template>

      <template v-else-if="tab === 'look'">
        <div class="mb-[9px] text-[11px] tracking-[0.08em] text-faint">主题</div>
        <div class="flex gap-1">
          <button
            v-for="item in THEMES"
            :key="item.id"
            class="flex-1 cursor-pointer rounded-lg border py-[5px] text-[11.5px]"
            :class="
              theme === item.id
                ? 'border-accent/48 bg-accent/10 text-accent'
                : 'border-line text-dim hover:text-ink'
            "
            @click="setTheme(item.id)"
          >
            {{ item.name }}
          </button>
        </div>

        <div class="my-[13px] h-px bg-line"></div>

        <label class="flex cursor-pointer items-center justify-between py-1.5 text-[13px]">
          <span>显示右侧信息栏</span>
          <input v-model="nav.settings.showSidePanel" class="h-3.5 w-3.5 cursor-pointer accent-accent" type="checkbox" />
        </label>
      </template>
    </div>

    <input ref="fileInput" type="file" accept="application/json,.json" hidden @change="onImportFile" />
  </div>
</template>
