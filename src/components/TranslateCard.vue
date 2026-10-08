<script setup lang="ts">
import { computed, ref } from 'vue'

/** 中英互译，走 MyMemory 的免费接口（免 key、双向实测可用）。文本会发给它。 */
type Pair = 'zh2en' | 'en2zh'

const source = ref('')
const target = ref('')
const busy = ref(false)
const note = ref('')
const direction = ref<Pair>('zh2en')

const pairLabel = computed(() => (direction.value === 'zh2en' ? '中 → 英' : '英 → 中'))

async function translate(): Promise<void> {
  const text = source.value.trim()
  if (!text || busy.value) return
  busy.value = true
  note.value = ''
  target.value = ''

  const langpair = direction.value === 'zh2en' ? 'zh-CN|en' : 'en|zh-CN'
  const url = new URL('https://api.mymemory.translated.net/get')
  url.searchParams.set('q', text)
  url.searchParams.set('langpair', langpair)

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 8000)
  try {
    const response = await fetch(url, { credentials: 'omit', signal: controller.signal })
    if (!response.ok) throw new Error(`翻译 HTTP ${response.status}`)
    const data = (await response.json()) as { responseData?: { translatedText?: string } }
    const translated = data.responseData?.translatedText?.trim()
    if (!translated) throw new Error('没翻出来，换个写法试试')
    target.value = translated
  } catch (error) {
    note.value = (error as Error)?.message || '翻译暂时不可用'
  } finally {
    clearTimeout(timer)
    busy.value = false
  }
}
</script>

<template>
  <section class="rise rounded-lg bg-surface px-4 py-3.5">
    <div class="flex items-center justify-between gap-2">
      <span class="text-[13px] text-dim">翻译</span>
      <button
        class="cursor-pointer rounded-md border border-line px-2 py-[3px] text-[11px] text-dim hover:text-ink"
        :title="direction === 'zh2en' ? '切到英译中' : '切到中译英'"
        @click="direction = direction === 'zh2en' ? 'en2zh' : 'zh2en'"
      >
        {{ pairLabel }}
      </button>
    </div>

    <div class="mt-2 flex gap-1.5">
      <input
        v-model="source"
        class="min-w-0 flex-1 rounded-md border border-line bg-transparent px-2 py-[5px] text-[12px] outline-none placeholder:text-faint focus:border-accent/55"
        placeholder="输入要翻译的词或句子"
        spellcheck="false"
        @keydown.enter.prevent="translate()"
      />
      <button
        class="flex-none cursor-pointer rounded-md border border-line px-2.5 py-[5px] text-[12px] text-dim hover:text-ink"
        :disabled="busy"
        @click="translate()"
      >
        {{ busy ? '…' : '翻译' }}
      </button>
    </div>

    <p v-if="target" class="mt-2 text-[12.5px] leading-[1.6] text-ink">{{ target }}</p>
    <p v-else-if="note" class="mt-2 text-[12px] text-faint">{{ note }}</p>
    <p class="mt-2 text-[11px] text-faint">文本会发送给 MyMemory（免费在线翻译），其余数据留在本地</p>
  </section>
</template>
