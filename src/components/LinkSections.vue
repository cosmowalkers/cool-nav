<script setup lang="ts">
import { VueDraggable } from 'vue-draggable-plus'
import type { NavLink } from '../types'
import SiteCard from './SiteCard.vue'
import { nav } from '../composables/useNavData'
import { markDragEnd, markDragStart } from '../composables/useDragState'

defineProps<{ editing: boolean }>()

const emit = defineEmits<{
  addLink: [string]
  editLink: [string, NavLink]
  removeLink: [string, NavLink]
  renameGroup: [string, string]
  removeGroup: [string]
  addGroup: []
}>()
</script>

<template>
  <div class="rise min-w-0">
    <section v-for="group in nav.groups" :key="group.id" class="mb-4">
      <div class="mb-2 flex h-[26px] items-center justify-between">
        <div class="flex min-w-0 items-center gap-2">
          <input
            v-if="editing"
            class="w-full max-w-[220px] rounded-md border border-line bg-surface px-2 py-1 text-[18px] font-semibold outline-none focus:border-accent/55"
            :value="group.name"
            maxlength="20"
            placeholder="分组名"
            @input="emit('renameGroup', group.id, ($event.target as HTMLInputElement).value)"
          />
          <h2 v-else class="m-0 truncate text-[18px] leading-[26px] font-semibold text-ink">
            {{ group.name }}
          </h2>

          <button
            v-if="editing"
            class="grid h-[22px] w-[22px] flex-none cursor-pointer place-items-center rounded-md text-faint hover:bg-hover hover:text-ink"
            title="删除分组"
            aria-label="删除分组"
            @click="emit('removeGroup', group.id)"
          >
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 6h18" />
              <path d="M8 6V4h8v2" />
              <path d="M19 6l-1 14H6L5 6" />
            </svg>
          </button>
        </div>

        <span class="flex-none text-[14px] text-faint">{{ group.links.length }} 个</span>
      </div>

      <VueDraggable
        v-model="group.links"
        class="grid gap-1 [grid-template-columns:repeat(auto-fill,minmax(150px,1fr))]"
        group="links"
        :animation="150"
        :disabled="!editing"
        :filter="'.no-drag'"
        @start="markDragStart"
        @end="markDragEnd"
      >
        <SiteCard
          v-for="link in group.links"
          :key="link.id"
          :link="link"
          :editing="editing"
          :group-id="group.id"
          @edit="emit('editLink', group.id, link)"
          @remove="emit('removeLink', group.id, link)"
        />
        <button
          v-if="editing"
          class="no-drag flex cursor-pointer items-center rounded-md px-2.5 py-2 text-[14px] text-faint hover:bg-hover hover:text-dim"
          :aria-label="`在「${group.name}」里添加链接`"
          @click="emit('addLink', group.id)"
        >
          <span
            class="mr-2.5 grid h-[18px] w-[18px] flex-none place-items-center rounded-[4px] border border-dashed border-faint/60"
          >
            <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round">
              <path d="M12 5v14" />
              <path d="M5 12h14" />
            </svg>
          </span>
          添加
        </button>
      </VueDraggable>

      <p v-if="!editing && !group.links.length" class="m-0 py-1 text-[14px] text-faint">空分组</p>
    </section>

    <button
      v-if="editing"
      class="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-faint/50 px-3 py-2 text-[14px] text-faint hover:border-faint hover:text-dim"
      @click="emit('addGroup')"
    >
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
        <path d="M12 5v14" />
        <path d="M5 12h14" />
      </svg>
      新建分组
    </button>

    <p v-if="!nav.groups.length" class="m-0 py-4 text-[14px] text-faint">
      还没有分组，按 E 进入编辑模式新建
    </p>
  </div>
</template>
