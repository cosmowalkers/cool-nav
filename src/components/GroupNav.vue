<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { nav } from '../composables/useNavData'

const active = ref('')
/** 点击触发的平滑滚动：这期间的位置变化不是用户意图，一律不参与高亮判断 */
let lockUntil = 0
let settleTimer: number | undefined

function scrollTo(groupId: string): void {
  /* 点了就亮，并且以这一下为准：内容不够长时页面根本滚不动，位置判断永远追不上点击 */
  active.value = groupId
  lockUntil = Date.now() + 600
  document.getElementById(`group-${groupId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

/** 按当前位置算高亮：最后一个 top 已经滚过 96px 的分组。
    用视口坐标而不是 offsetTop——中栏外面套了相对定位的容器，offsetTop 是相对它的 */
function groupAtPosition(): string {
  const groups = nav.groups
  let current = groups[0]?.id ?? ''
  for (const group of groups) {
    const element = document.getElementById(`group-${group.id}`)
    if (element && element.getBoundingClientRect().top <= 96) current = group.id
  }
  /* 滚到底了就是最后一组：最后几个分组内容少、够不到顶部，只按位置算会一直卡在上一组 */
  const doc = document.documentElement
  const scrollable = doc.scrollHeight - window.innerHeight > 8
  const atBottom = window.scrollY + window.innerHeight >= doc.scrollHeight - 2
  if (scrollable && atBottom && groups.length) return groups[groups.length - 1].id
  return current
}

/**
 * 滚动高亮只在「滚停下来之后」更新一次。
 * 以前是每个 scroll 事件都算一次，于是点最后一组时，平滑滚动经过的每一组都会被依次点亮（1→2→3…），
 * 看起来像高亮在自己跑；现在动画期间的中间位置直接丢掉，用户松手停稳 120ms 后才按落点更新。
 */
function onScroll(): void {
  if (Date.now() < lockUntil) return
  window.clearTimeout(settleTimer)
  settleTimer = window.setTimeout(() => {
    active.value = groupAtPosition()
  }, 120)
}

onMounted(() => {
  window.addEventListener('scroll', onScroll, { passive: true })
  active.value = groupAtPosition()
})

onUnmounted(() => {
  window.removeEventListener('scroll', onScroll)
  window.clearTimeout(settleTimer)
})
</script>

<template>
  <nav class="sticky top-3 flex flex-col gap-px rounded-lg bg-surface px-3 py-2">
    <button
      v-for="group in nav.groups"
      :key="group.id"
      class="side-item flex cursor-pointer items-center rounded-md px-2.5 py-2.5 text-left text-[16px] leading-4 transition-colors"
      :class="active === group.id ? '' : 'text-dim hover:bg-hover hover:text-ink'"
      :data-active="active === group.id"
      @click="scrollTo(group.id)"
    >
      <span class="truncate">{{ group.name }}</span>
    </button>
  </nav>
</template>
