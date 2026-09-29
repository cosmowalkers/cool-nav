<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import {
  clearHistory,
  nav,
  pushHistory,
  searchHistory,
  showToast,
} from '../composables/useNavData'
import { allowBing, poolSize } from '../composables/useWallpaper'
import { ENGINES, PREFIX_HINT, resolveQuery, type Engine } from '../utils/search'
import { ROTATE_OPTIONS } from '../utils/wallpaper'
import { focusTile } from '../utils/focus'
import { setTheme, theme } from '../composables/useTheme'
import type { ThemeMode } from '../types'

const THEMES: { id: ThemeMode; name: string }[] = [
  { id: 'system', name: '跟随系统' },
  { id: 'light', name: '浅色' },
  { id: 'dark', name: '深色' },
]

/** 只有三种背景：每日一图（默认）、自己填的图片链接、纯色兜底 —— 没有第二种「内置图」 */
const BACKGROUNDS = [
  { id: 'bing', name: '每日一图', hint: 'Bing 每日一图，每天自动换一张' },
  { id: 'image', name: '自定义图片', hint: '填一个图片地址，只存地址不存图' },
  { id: 'none', name: '纯色', hint: '不铺图，直接用页面底色' },
]

const TABS = [
  { id: 'search', name: '搜索' },
  { id: 'look', name: '外观' },
]

const query = ref('')
const inputRef = ref<HTMLInputElement | null>(null)
const panelOpen = ref(false)
const historyOpen = ref(false)
const activeIndex = ref(-1)
const tab = ref('search')

const background = computed(() => nav.settings.background)
const imageUrl = ref(background.value.preset === 'image' ? background.value.url : '')
const imageInput = ref<HTMLInputElement | null>(null)

const engine = computed<Engine>(
  () => ENGINES.find((item) => item.id === nav.settings.engineId) ?? ENGINES[0],
)

const showRotate = computed(() => poolSize.value > 1)

const suggestions = computed(() =>
  historyOpen.value && nav.settings.historyEnabled ? searchHistory.value.slice(0, 8) : [],
)

function submit(value?: string): void {
  const raw = value ?? query.value
  const resolved = resolveQuery(raw, engine.value.id)
  if (!resolved) return
  if (resolved.kind === 'search') pushHistory(raw.trim())
  window.location.href = resolved.url
}

async function pickPreset(id: string): Promise<void> {
  /* 每日一图要 bing.com 的权限，这里也是用户手势，顺便就把权限问了 */
  if (id === 'bing' && !(await allowBing())) return
  background.value.preset = id
  /* 选了自定义图片就该马上能粘链接，不用再点一次输入框 */
  if (id === 'image') {
    await nextTick()
    imageInput.value?.focus()
  }
}

function applyImageUrl(): void {
  const url = imageUrl.value.trim()
  if (!url) {
    showToast('先粘贴一个图片链接')
    return
  }
  background.value.url = url
  background.value.preset = 'image'
  showToast('背景已更新')
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Enter') {
    event.preventDefault()
    const picked = suggestions.value[activeIndex.value]
    submit(picked)
    return
  }
  if (event.key === 'Escape') {
    if (query.value) {
      query.value = ''
      activeIndex.value = -1
    } else {
      inputRef.value?.blur()
    }
    return
  }
  /* 没有历史联想时，↓ 直接进下面的链接区：键盘可以从搜索一路走到链接 */
  if (event.key === 'ArrowDown' && !suggestions.value.length) {
    event.preventDefault()
    focusTile()
    return
  }
  if (!suggestions.value.length) return
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    activeIndex.value = (activeIndex.value + 1) % suggestions.value.length
  }
  if (event.key === 'ArrowUp') {
    event.preventDefault()
    activeIndex.value =
      activeIndex.value <= 0 ? suggestions.value.length - 1 : activeIndex.value - 1
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

onMounted(() => {
  inputRef.value?.focus()
  window.addEventListener('keydown', onGlobalKeydown)
})

onUnmounted(() => window.removeEventListener('keydown', onGlobalKeydown))
</script>

<template>
  <!-- 外层只负责定位：不能带动画，否则它会成为层叠上下文，把下拉面板困在里面 -->
  <div class="relative mx-auto w-full max-w-[850px]">
    <div
      class="rise"
      style="--d: 90ms"
    >
    <div
      data-glass
      class="flex h-[55px] items-center gap-3 rounded-lg pr-3 pl-4 shadow-[0_8px_28px_rgba(16,20,30,0.16)] transition duration-150 focus-within:ring-[3px] focus-within:ring-white/45"
    >
      <svg class="flex-none text-faint" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <input
        ref="inputRef"
        v-model="query"
        data-search-input
        class="min-w-0 flex-1 border-0 bg-transparent text-[15px] outline-none placeholder:text-faint"
        type="text"
        placeholder="搜索或输入网址"
        autocomplete="off"
        spellcheck="false"
        @keydown="onKeydown"
        @focus="historyOpen = true"
        @blur="historyOpen = false"
      />
      <button
        class="flex flex-none cursor-pointer items-center gap-[3px] rounded-lg px-2 py-1.5 text-[12px] text-dim hover:bg-hover hover:text-ink"
        :title="`默认引擎：${engine.name}`"
        aria-haspopup="true"
        :aria-expanded="panelOpen"
        @click="panelOpen = !panelOpen"
      >
        {{ engine.name }}
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
    </div>
    </div>

    <div
      v-if="suggestions.length"
      data-glass="panel"
      class="absolute inset-x-0 top-[calc(100%+8px)] z-20 rounded-xl border border-line bg-surface p-1.5 shadow-[0_12px_32px_rgba(0,0,0,0.14)]"
    >
      <button
        v-for="(item, index) in suggestions"
        :key="item"
        class="flex w-full cursor-pointer items-center gap-[9px] rounded-lg px-2.5 py-2 text-left text-dim hover:bg-hover hover:text-ink"
        :class="index === activeIndex && 'bg-hover text-ink'"
        @mousedown.prevent="submit(item)"
        @mouseenter="activeIndex = index"
      >
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
        <span class="truncate">{{ item }}</span>
      </button>
    </div>

    <div v-if="panelOpen" class="fixed inset-0 z-30" @mousedown="panelOpen = false"></div>
    <div
      v-if="panelOpen"
      data-glass="panel"
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

        <div class="mb-[9px] text-[11px] tracking-[0.08em] text-faint">背景</div>
        <div class="grid grid-cols-3 gap-1.5">
          <button
            v-for="item in BACKGROUNDS"
            :key="item.id"
            class="cursor-pointer rounded-[9px] border px-1 py-[7px] text-[11.5px]"
            :class="
              background.preset === item.id
                ? 'border-accent/48 bg-accent/10 text-accent'
                : 'border-line text-dim hover:text-ink'
            "
            :title="item.hint"
            @click="pickPreset(item.id)"
          >
            {{ item.name }}
          </button>
        </div>

        <div v-if="background.preset === 'image'" class="mt-1.5 flex items-center gap-1.5">
          <input
            ref="imageInput"
            v-model="imageUrl"
            class="min-w-0 flex-1 rounded-lg border border-line bg-transparent px-2 py-[5px] text-[12px] outline-none placeholder:text-faint focus:border-accent/55"
            type="text"
            placeholder="粘贴图片链接"
            spellcheck="false"
            @keydown.enter="applyImageUrl"
          />
          <button
            class="flex-none cursor-pointer rounded-lg border border-line px-2 py-[5px] text-[12px] text-dim hover:text-ink"
            @click="applyImageUrl"
          >
            使用
          </button>
        </div>

        <div v-if="showRotate" class="mt-3">
          <div class="mb-[7px] text-[11px] tracking-[0.08em] text-faint">轮换</div>
          <div class="flex gap-1">
            <button
              v-for="item in ROTATE_OPTIONS"
              :key="item.id"
              class="flex-1 cursor-pointer rounded-lg border py-[5px] text-[11.5px]"
              :class="
                background.rotate === item.id
                  ? 'border-accent/48 bg-accent/10 text-accent'
                  : 'border-line text-dim hover:text-ink'
              "
              @click="background.rotate = item.id"
            >
              {{ item.name }}
            </button>
          </div>
        </div>

        <p class="mt-2.5 m-0 text-[11px] leading-[1.6] text-faint">
          <template v-if="showRotate">共 {{ poolSize }} 张，到点才换图。</template>
          <template v-if="background.preset === 'bing'">取不到图就用纯色底，页面其余部分不受影响。</template>
          <template v-else-if="background.preset === 'image'">只记这串地址，图片本身不存。</template>
          <template v-else>不铺图，底色跟着搜索引擎换。</template>
        </p>

        <label class="flex cursor-pointer items-center justify-between py-1.5 text-[13px]">
          <span>显示右侧信息栏</span>
          <input v-model="nav.settings.showSidePanel" class="h-3.5 w-3.5 cursor-pointer accent-accent" type="checkbox" />
        </label>
      </template>
    </div>
  </div>
</template>
