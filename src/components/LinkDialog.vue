<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import type { NavLink } from '../types'
import { domainOf, normalizeUrl } from '../utils/url'
import { fetchPageTitle } from '../utils/title'

const props = defineProps<{ open: boolean; link: NavLink | null }>()
const emit = defineEmits<{ save: [{ title: string; url: string; icon?: string }]; close: [] }>()

const url = ref('')
const title = ref('')
const icon = ref('')
const fetching = ref(false)
const titleTouched = ref(false)
const error = ref('')
const urlRef = ref<HTMLInputElement | null>(null)

watch(
  () => props.open,
  async (open) => {
    if (!open) return
    url.value = props.link?.url ?? ''
    title.value = props.link?.title ?? ''
    icon.value = props.link?.icon ?? ''
    titleTouched.value = Boolean(props.link)
    error.value = ''
    fetching.value = false
    await nextTick()
    urlRef.value?.focus()
  },
)

async function autoTitle(): Promise<void> {
  if (titleTouched.value || title.value.trim()) return
  const target = normalizeUrl(url.value)
  if (!target) return
  fetching.value = true
  try {
    const fetched = await fetchPageTitle(target)
    if (fetched && !titleTouched.value && !title.value.trim()) title.value = fetched
  } finally {
    fetching.value = false
  }
}

async function onEnterUrl(): Promise<void> {
  await autoTitle()
  save()
}

function save(): void {
  const target = normalizeUrl(url.value)
  if (!target) {
    error.value = '请先填写网址'
    return
  }
  emit('save', {
    title: title.value.trim() || domainOf(target),
    url: target,
    icon: icon.value.trim() || undefined,
  })
}
</script>

<template>
  <div
    v-if="open"
    class="fixed inset-0 z-50 grid place-items-center bg-black/32 backdrop-blur-[2px]"
    @mousedown.self="emit('close')"
  >
    <div class="w-[380px] rounded-2xl border border-line bg-surface p-5 shadow-[0_24px_60px_rgba(0,0,0,0.28)]">
      <div class="mb-[18px] text-[14px] font-medium">
        {{ link ? '编辑链接' : '添加链接' }}
      </div>

      <label class="mb-3.5 block">
        <span class="mb-1.5 block text-[11.5px] tracking-[0.06em] text-dim">网址</span>
        <input
          ref="urlRef"
          v-model="url"
          class="h-9 w-full rounded-[9px] border border-line bg-transparent px-2.5 text-[13.5px] outline-none focus:border-accent/55 focus:ring-[3px] focus:ring-accent/12"
          placeholder="example.com"
          autocomplete="off"
          spellcheck="false"
          @blur="autoTitle"
          @keydown.enter.prevent="onEnterUrl"
          @keydown.esc="emit('close')"
        />
      </label>

      <label class="mb-3.5 block">
        <span class="mb-1.5 block text-[11.5px] tracking-[0.06em] text-dim">名称</span>
        <input
          v-model="title"
          class="h-9 w-full rounded-[9px] border border-line bg-transparent px-2.5 text-[13.5px] outline-none focus:border-accent/55 focus:ring-[3px] focus:ring-accent/12"
          :placeholder="fetching ? '正在获取网页标题…' : '留空则用域名'"
          autocomplete="off"
          @input="titleTouched = true"
          @keydown.enter.prevent="save"
          @keydown.esc="emit('close')"
        />
      </label>

      <label class="mb-3.5 block">
        <span class="mb-1.5 block text-[11.5px] tracking-[0.06em] text-dim">
          图标<em class="ml-[5px] not-italic text-faint">可选</em>
        </span>
        <input
          v-model="icon"
          class="h-9 w-full rounded-[9px] border border-line bg-transparent px-2.5 text-[13.5px] outline-none focus:border-accent/55 focus:ring-[3px] focus:ring-accent/12"
          placeholder="留空则自动获取站点图标"
          autocomplete="off"
          spellcheck="false"
          @keydown.enter.prevent="save"
          @keydown.esc="emit('close')"
        />
      </label>

      <div v-if="error" class="mb-3 text-[12.5px] text-[#e5484d]">{{ error }}</div>

      <div class="mt-5 flex justify-end gap-2">
        <button
          class="h-[34px] cursor-pointer rounded-[9px] px-4 text-[13px] text-dim hover:bg-hover hover:text-ink"
          @click="emit('close')"
        >
          取消
        </button>
        <button
          class="h-[34px] cursor-pointer rounded-[9px] bg-accent px-4 text-[13px] text-white hover:opacity-90"
          @click="save"
        >
          保存
        </button>
      </div>
    </div>
  </div>
</template>
