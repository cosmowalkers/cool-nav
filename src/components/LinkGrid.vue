<script setup lang="ts">
import { VueDraggable } from 'vue-draggable-plus'
import type { NavLink } from '../types'
import LinkTile from './LinkTile.vue'
import { nav } from '../composables/useNavData'
import { markDragEnd, markDragStart } from '../composables/useDragState'

defineProps<{ editing: boolean }>()

const emit = defineEmits<{ add: []; editLink: [NavLink]; removeLink: [NavLink] }>()
</script>

<template>
  <VueDraggable
    v-model="nav.links"
    class="rise flex max-w-full flex-wrap justify-center gap-x-1 gap-y-2.5"
    style="--d: 180ms"
    :animation="160"
    :disabled="!editing"
    :filter="'.no-drag'"
    @start="markDragStart"
    @end="markDragEnd"
  >
    <LinkTile
      v-for="link in nav.links"
      :key="link.id"
      :link="link"
      :editing="editing"
      @edit="emit('editLink', link)"
      @remove="emit('removeLink', link)"
    />
    <button
      v-if="editing"
      class="no-drag flex w-[96px] flex-none cursor-pointer flex-col items-center gap-2 rounded-tile border border-dashed border-line px-1.5 pt-2.5 pb-2 text-faint hover:border-faint hover:text-dim"
      @click="emit('add')"
    >
      <span class="grid h-11 w-11 place-items-center rounded-[14px]">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <path d="M12 5v14" />
          <path d="M5 12h14" />
        </svg>
      </span>
      <span class="text-[13px]">添加</span>
    </button>
  </VueDraggable>

  <p v-if="!nav.links.length && !editing" class="m-0 text-center text-[13px] text-faint">
    还没有链接，按 E 进入编辑模式添加
  </p>
</template>
