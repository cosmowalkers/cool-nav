<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import type { NavLink } from '../types'
import { domainOf, normalizeUrl } from '../utils/url'
import { fetchPageMeta } from '../utils/title'
import { canRequestOrigin, hasOrigin, originPattern, requestOrigin } from '../utils/permissions'

const props = defineProps<{ open: boolean; link: NavLink | null; groupName: string }>()
const emit = defineEmits<{ save: [{ title: string; url: string; icon?: string }]; close: [] }>()

const url = ref('')
const title = ref('')
const icon = ref('')
const fetching = ref(false)
const titleTouched = ref(false)
const error = ref('')
/** 缺 host 权限时记下要申请的域名，界面据此显示「允许读取标题」 */
const pendingPattern = ref('')
const note = ref('')
/** 页面自己声明的图标：用户没填图标时就用它，省得以后靠浏览器缓存碰运气 */
const fetchedIcon = ref('')
const urlRef = ref<HTMLInputElement | null>(null)

const pendingHost = computed(() => (pendingPattern.value ? new URL(pendingPattern.value).host : ''))

watch(
  () => props.open,
  async (open) => {
    if (!open) return
    url.value = props.link?.url ?? ''
    title.value = props.link?.title ?? ''
    icon.value = props.link?.icon ?? ''
    titleTouched.value = Boolean(props.link)
    error.value = ''
    note.value = ''
    fetchedIcon.value = ''
    fetching.value = false
    pendingPattern.value = ''
    await nextTick()
    urlRef.value?.focus()
  },
)

async function loadTitle(): Promise<void> {
  const target = normalizeUrl(url.value)
  if (!target) return
  fetching.value = true
  try {
    const meta = await fetchPageMeta(target)
    if (meta.icon && !icon.value.trim()) fetchedIcon.value = meta.icon
    if (meta.title && !titleTouched.value && !title.value.trim()) title.value = meta.title
  } finally {
    fetching.value = false
  }
}

async function autoTitle(): Promise<void> {
  if (titleTouched.value || title.value.trim()) return
  const pattern = originPattern(normalizeUrl(url.value))
  /* 没授权的域名不偷偷发请求，改成让用户点一下再申请 */
  if (canRequestOrigin() && !(await hasOrigin(pattern))) {
    pendingPattern.value = pattern
    return
  }
  await loadTitle()
}

async function allowTitle(): Promise<void> {
  const pattern = pendingPattern.value
  if (!pattern) return
  if (!(await requestOrigin(pattern))) {
    pendingPattern.value = ''
    note.value = '没采纳，名称先用域名。想读标题的话再点一次网址输入框也行'
    return
  }
  pendingPattern.value = ''
  await loadTitle()
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
    icon: icon.value.trim() || fetchedIcon.value || undefined,
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
        <span v-if="groupName" class="font-normal text-faint">· {{ groupName }}</span>
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

      <p v-if="pendingPattern" class="-mt-2 mb-3.5 text-[12px] leading-5 text-dim">
        自动填名称要读一次
        <span class="text-ink">{{ pendingHost }}</span>
        的页面标题。
        <button class="cursor-pointer text-accent hover:underline" @click="allowTitle">
          允许读取
        </button>
      </p>
      <p v-else-if="note" class="-mt-2 mb-3.5 text-[12px] leading-5 text-faint">{{ note }}</p>

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
