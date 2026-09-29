<script setup lang="ts">
import { useClock } from '../composables/useClock'

const { time, date } = useClock()
</script>

<template>
  <div class="rise mb-[34px] text-center select-none" style="--d: 0ms">
    <div class="time text-[76px] leading-none font-[200] tabular-nums">{{ time }}</div>
    <div class="mt-[14px] text-[12.5px] tracking-[0.2em] text-dim">{{ date }}</div>
  </div>
</template>
