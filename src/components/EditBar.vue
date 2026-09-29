<script setup lang="ts">
const emit = defineEmits<{
  exportData: []
  importData: []
}>()
</script>

<template>
  <div
    class="fixed top-3.5 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2.5 rounded-full border border-line bg-surface px-3 py-1.5 shadow-[0_10px_30px_rgba(0,0,0,0.14)]"
  >
    <span class="text-[12px] whitespace-nowrap text-faint">编辑中 · 拖拽调整顺序 · Esc 退出</span>
    <span class="h-3.5 w-px bg-line"></span>
    <button
      class="cursor-pointer rounded-lg px-2 py-1 text-[12.5px] text-dim hover:bg-hover hover:text-ink"
      @click="emit('exportData')"
    >
      导出
    </button>
    <button
      class="cursor-pointer rounded-lg px-2 py-1 text-[12.5px] text-dim hover:bg-hover hover:text-ink"
      @click="emit('importData')"
    >
      导入
    </button>
  </div>
</template>
