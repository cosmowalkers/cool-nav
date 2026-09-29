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
}>()
</script>

<template>
  <div class="rise rounded-lg bg-surface px-4 pt-1 pb-2">
    <section
      v-for="(group, index) in nav.groups"
      :id="`group-${group.id}`"
      :key="group.id"
      class="scroll-mt-3 border-b border-line py-4 last:border-b-0"
      :style="{ '--d': `${120 + index * 50}ms` }"
    >
      <div class="mb-3 flex h-[26px] items-center justify-between">
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

        <span class="flex-none text-[14px] text-dim">{{ group.links.length }} 个</span>
      </div>

      <VueDraggable
        v-model="group.links"
        class="grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(190px,1fr))]"
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
          @edit="emit('editLink', group.id, link)"
          @remove="emit('removeLink', group.id, link)"
        />
        <button
          v-if="editing"
          class="no-drag flex cursor-pointer items-center gap-2.5 rounded-md border border-dashed border-line px-[15px] py-[14px] text-[14px] text-faint hover:border-faint hover:text-dim"
          @click="emit('addLink', group.id)"
        >
          <span class="grid h-[26px] w-[26px] flex-none place-items-center rounded border border-dashed border-line">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
              <path d="M12 5v14" />
              <path d="M5 12h14" />
            </svg>
          </span>
          添加
        </button>
      </VueDraggable>

      <p v-if="!editing && !group.links.length" class="m-0 text-[14px] text-faint">空分组</p>
    </section>

    <p v-if="!nav.groups.length" class="m-0 py-4 text-[14px] text-faint">
      还没有分组，按 E 进入编辑模式新建
    </p>
  </div>
</template>
