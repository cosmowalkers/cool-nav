<script setup lang="ts">
import { fillingIcons, fillMissingIcons } from '../composables/useLinkIcons'

const emit = defineEmits<{
  addGroup: []
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
      class="cursor-pointer rounded-lg px-2 py-1 text-[12.5px] text-dim hover:bg-hover hover:text-ink disabled:cursor-default disabled:text-faint"
      :disabled="fillingIcons"
      title="逐个访问还没有图标的站点，读它页面里声明的图标（需要一次访问权限）"
      @click="fillMissingIcons()"
    >
      {{ fillingIcons ? '补图标中…' : '补全图标' }}
    </button>
    <button
      class="cursor-pointer rounded-lg px-2 py-1 text-[12.5px] text-dim hover:bg-hover hover:text-ink"
      @click="emit('addGroup')"
    >
      新建分组
    </button>
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
