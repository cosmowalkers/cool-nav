<script setup lang="ts">
import { ref, watch } from 'vue'
import QRCode from 'qrcode'

/** 本地生成二维码：文本 / 网址不离开本机 */
const text = ref('')
const dataUrl = ref('')
const note = ref('')
let timer: number | undefined

watch(text, (value) => {
  window.clearTimeout(timer)
  timer = window.setTimeout(() => void render(value.trim()), 300)
})

async function render(content: string): Promise<void> {
  if (!content) {
    dataUrl.value = ''
    note.value = ''
    return
  }
  try {
    dataUrl.value = await QRCode.toDataURL(content, {
      width: 132,
      margin: 1,
      errorCorrectionLevel: 'M',
    })
    note.value = ''
  } catch {
    dataUrl.value = ''
    note.value = '内容太长，生成不了'
  }
}
</script>

<template>
  <section class="rise rounded-lg bg-surface px-4 py-3.5">
    <div class="text-[13px] text-dim">二维码</div>
    <input
      v-model="text"
      class="mt-2 w-full rounded-md border border-line bg-transparent px-2 py-[5px] text-[12px] outline-none placeholder:text-faint focus:border-accent/55"
      placeholder="文本或网址，如 https://example.com"
      spellcheck="false"
    />
    <div v-if="dataUrl" class="mt-2.5 flex justify-center">
      <img :src="dataUrl" alt="二维码" class="h-[132px] w-[132px] rounded-md" />
    </div>
    <p v-else-if="note" class="mt-2 text-[12px] text-faint">{{ note }}</p>
    <p class="mt-2 text-[11px] text-faint">本地生成，内容不离开本机</p>
  </section>
</template>
