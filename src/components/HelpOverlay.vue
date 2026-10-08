<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { helpOpen } from '../composables/useUiState'

interface ShortcutGroup {
  title: string
  items: { keys: string; desc: string }[]
}

const GROUPS: ShortcutGroup[] = [
  {
    title: '通用',
    items: [
      { keys: '/ 或 ⌘/Ctrl+K', desc: '聚焦搜索框' },
      { keys: '?', desc: '打开 / 关闭本帮助' },
      { keys: 'M', desc: '记一条念念不忘（备忘灵感）' },
      { keys: 'Esc', desc: '逐层退回：帮助 → 面板 → 编辑 → 搜索框 → 链接' },
    ],
  },
  {
    title: '链接区',
    items: [
      { keys: '← → ↑ ↓', desc: '按视觉位置在链接间移动' },
      { keys: 'Enter', desc: '打开当前链接（⌘/Ctrl+Enter 新标签页）' },
      { keys: '⌘/Ctrl+↑ ↓', desc: '跳到第一 / 最后一个链接' },
      { keys: '1~9', desc: '跳到第 N 个分组的第一条（Alt+1~9 全局可用）' },
      { keys: 'E', desc: '进入 / 退出编辑模式' },
    ],
  },
  {
    title: '编辑模式',
    items: [
      { keys: 'Enter', desc: '编辑当前链接' },
      { keys: 'Delete / Backspace', desc: '删除当前链接（底部可撤销）' },
      { keys: 'N', desc: '在当前分组末尾新建链接' },
      { keys: '⌘/Ctrl+← →', desc: '在当前分组内移动排序' },
      { keys: 'Esc', desc: '退出编辑模式' },
    ],
  },
  {
    title: '命令面板',
    items: [
      { keys: '↑ ↓', desc: '在结果之间移动' },
      { keys: 'Enter', desc: '执行选中的结果' },
      { keys: '⌘/Ctrl+Enter', desc: '新标签页打开选中链接' },
      { keys: 'Esc', desc: '收起面板' },
    ],
  },
]

const panelRef = ref<HTMLElement | null>(null)
let previousFocus: HTMLElement | null = null

watch(helpOpen, (open) => {
  if (open) {
    previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    void nextTick(() => panelRef.value?.focus())
  } else {
    void nextTick(() => previousFocus?.focus())
  }
})
</script>

<template>
  <div
    v-if="helpOpen"
    class="fixed inset-0 z-50 grid place-items-center bg-black/35 p-4"
    role="dialog"
    aria-modal="true"
    aria-label="快捷键帮助"
    @mousedown.self="helpOpen = false"
  >
    <div
      ref="panelRef"
      tabindex="-1"
      class="max-h-[min(80vh,640px)] w-full max-w-[520px] overflow-y-auto rounded-2xl border border-line bg-surface p-5 shadow-[0_24px_60px_rgba(0,0,0,0.3)] outline-none"
    >
      <div class="mb-3 flex items-center justify-between">
        <h2 class="m-0 text-[16px] font-semibold text-ink">快捷键</h2>
        <button
          class="grid h-[26px] w-[26px] cursor-pointer place-items-center rounded-md text-faint hover:bg-hover hover:text-ink"
          aria-label="关闭帮助"
          @click="helpOpen = false"
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>
      </div>

      <div v-for="group in GROUPS" :key="group.title" class="mb-4 last:mb-0">
        <div class="mb-1.5 px-1 text-[11px] tracking-[0.08em] text-faint">{{ group.title }}</div>
        <dl class="m-0">
          <div
            v-for="item in group.items"
            :key="item.keys"
            class="flex items-baseline justify-between gap-4 rounded-lg px-2 py-1.5 text-[13px]"
          >
            <dt class="m-0 flex-none">
              <code
                class="rounded-[6px] border border-line bg-hover px-1.5 py-0.5 text-[11.5px] whitespace-nowrap text-dim"
              >
                {{ item.keys }}
              </code>
            </dt>
            <dd class="m-0 min-w-0 flex-1 text-right text-dim">{{ item.desc }}</dd>
          </div>
        </dl>
      </div>

      <p class="m-0 mt-4 border-t border-line pt-3 text-center text-[11.5px] text-faint">
        低频操作（主题、引擎、导入导出…）都收在命令面板里，随时按
        <code class="rounded-[5px] bg-hover px-1 py-px text-[11px] text-dim">/</code> 调出
      </p>
    </div>
  </div>
</template>
