<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { addNote, notes, removeNote } from '../composables/useNotes'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()

const draft = ref('')
const inputRef = ref<HTMLTextAreaElement | null>(null)
let previousFocus: HTMLElement | null = null

watch(
  () => props.open,
  (open) => {
    if (open) {
      previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
      void nextTick(() => inputRef.value?.focus())
    } else {
      void nextTick(() => previousFocus?.focus())
    }
  },
)

async function save(): Promise<void> {
  if (!draft.value.trim()) return
  await addNote(draft.value)
  draft.value = ''
  void nextTick(() => inputRef.value?.focus())
}

function timeOf(timestamp: number): string {
  const diff = Date.now() - timestamp
  if (diff < 60_000) return '刚刚'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分钟前`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} 小时前`
  if (diff < 7 * 86_400_000) return `${Math.floor(diff / 86_400_000)} 天前`
  return new Date(timestamp).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })
}
</script>

<template>
  <div
    v-if="open"
    class="fixed inset-0 z-50 grid place-items-center bg-black/32 p-4 backdrop-blur-[2px]"
    role="dialog"
    aria-modal="true"
    aria-label="念念不忘"
    @mousedown.self="emit('close')"
  >
    <div
      class="flex max-h-[min(80vh,560px)] w-full max-w-[420px] flex-col rounded-2xl border border-line bg-surface p-5 shadow-[0_24px_60px_rgba(0,0,0,0.28)]"
    >
      <div class="mb-3 flex items-center justify-between">
        <h2 class="m-0 text-[14px] font-medium">念念不忘，必有回响</h2>
        <button
          class="grid h-[26px] w-[26px] cursor-pointer place-items-center rounded-md text-faint hover:bg-hover hover:text-ink"
          aria-label="关闭"
          @click="emit('close')"
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>
      </div>

      <textarea
        ref="inputRef"
        v-model="draft"
        rows="2"
        class="w-full resize-none rounded-lg border border-line bg-transparent px-2.5 py-2 text-[13.5px] leading-[1.5] outline-none placeholder:text-faint focus:border-accent/55 focus:ring-[3px] focus:ring-accent/12"
        placeholder="记点什么… Enter 保存，Shift+Enter 换行"
        @keydown.enter.exact.prevent="save()"
        @keydown.esc.stop="emit('close')"
      />

      <div v-if="notes.length" class="mt-3 -mr-1 -ml-2 max-h-[260px] overflow-y-auto pr-1 pl-2">
        <div
          v-for="item in notes"
          :key="item.id"
          class="flex items-start gap-2 rounded-lg px-2 py-2 hover:bg-hover"
        >
          <p class="m-0 min-w-0 flex-1 break-words text-[13px] leading-[1.5] text-ink">
            {{ item.text }}
          </p>
          <div class="flex flex-none flex-col items-end gap-1">
            <span class="text-[10.5px] text-faint">{{ timeOf(item.createdAt) }}</span>
            <button
              class="grid h-[18px] w-[18px] cursor-pointer place-items-center rounded-[5px] text-faint hover:text-ink"
              :aria-label="'删除这条记录'"
              :title="'删除'"
              @click="removeNote(item.id)"
            >
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 6h18" />
                <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                <path d="M10 11v6M14 11v6" />
              </svg>
            </button>
          </div>
        </div>
      </div>
      <p v-else class="mt-4 mb-0 text-center text-[12px] text-faint">
        还没有念念不忘，写下第一条吧
      </p>
    </div>
  </div>
</template>
