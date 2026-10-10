<script setup lang="ts">
import { computed } from 'vue'
import WeatherGlyph from './WeatherGlyph.vue'
import TranslateCard from './TranslateCard.vue'
import QrCard from './QrCard.vue'
import MonthCalendar from './MonthCalendar.vue'
import { useClock } from '../composables/useClock'
import {
  geoBusy,
  geoNote,
  refreshWeather,
  today,
  weather,
} from '../composables/useDayInfo'
import { notes } from '../composables/useNotes'
import { notesOpen } from '../composables/useUiState'

const { time } = useClock()

const status = computed(() => today.value.status)

const chip = computed(() => {
  if (status.value.makeup) return { text: '班', tone: 'makeup' as const }
  return status.value.off
    ? { text: '休', tone: 'off' as const }
    : { text: '班', tone: 'work' as const }
})

const holidayText = computed(() => {
  const { status: day, next } = today.value
  if (day.makeup) return day.name ? `补班（${day.name}调休）` : '补班'
  if (day.off && next?.ongoing) {
    return next.length > 1 ? `${next.name} 第 ${next.days} 天` : next.name
  }
  if (next && !next.ongoing) {
    return next.days === 1 ? `明天放假（${next.name}）` : `距${next.name} ${next.days} 天`
  }
  return day.off ? '周末' : ''
})

const festival = computed(() =>
  today.value.festival && today.value.festival !== status.value.name ? today.value.festival : '',
)
</script>

<template>
  <aside class="flex flex-col gap-3">
    <section class="rise rounded-lg bg-surface px-4 py-4 text-center">
      <div class="time text-[32px] leading-none font-[300] tabular-nums">{{ time }}</div>
      <div v-if="festival" class="mt-1 text-[13px] text-accent">{{ festival }}</div>

      <div
        v-if="holidayText"
        class="mt-2 flex items-center justify-center gap-1.5 text-[12px] text-faint"
      >
        <span
          class="grid h-[16px] w-[16px] flex-none place-items-center rounded-[5px] text-[11px] leading-none font-medium"
          :class="{
            'chip-off': chip.tone === 'off',
            'chip-makeup': chip.tone === 'makeup',
            'border border-line text-faint': chip.tone === 'work',
          }"
          :title="status.makeup ? '调休补班' : status.off ? '休息日' : '工作日'"
        >
          {{ chip.text }}
        </span>
        <span>{{ holidayText }}</span>
      </div>
    </section>

    <MonthCalendar />

    <section v-if="weather" class="rise rounded-lg bg-surface px-4 py-3.5">
      <div class="flex items-center gap-2 text-[14px]">
        <WeatherGlyph :name="weather.icon" />
        <span>{{ weather.text }} {{ weather.temp }}°</span>
        <span class="ml-auto text-[12px] text-faint">{{ weather.min }}°/{{ weather.max }}°</span>
      </div>
      <div class="mt-1.5 flex items-center gap-2 text-[12px] text-faint">
        <span class="min-w-0 truncate">
          {{ weather.city }}<template v-if="weather.district"> · {{ weather.district }}</template>
        </span>
        <button
          class="ml-auto grid h-[18px] w-[18px] flex-none cursor-pointer place-items-center rounded-[5px] hover:text-ink disabled:cursor-default disabled:opacity-40"
          title="刷新天气"
          :aria-label="'刷新天气'"
          :disabled="geoBusy"
          @click="refreshWeather()"
        >
          <svg
            viewBox="0 0 24 24"
            width="12"
            height="12"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M21 12a9 9 0 1 1-2.64-6.36" />
            <path d="M21 3v6h-6" />
          </svg>
        </button>
      </div>

      <div class="mt-1 text-[11px] text-faint">
        按出口 IP 定位，位置大概到区/县
      </div>
    </section>

    <section v-else class="rise rounded-lg bg-surface px-4 py-3.5">
      <div class="flex items-center justify-between gap-2">
        <span class="text-[13px] text-dim">天气</span>
        <span class="flex items-center gap-1.5">
          <span class="flex-none text-[12px] text-faint">
            {{ geoBusy ? '查位置…' : '按出口 IP 定位' }}
          </span>
          <button
            class="grid h-[18px] w-[18px] flex-none cursor-pointer place-items-center rounded-[5px] text-faint hover:text-ink disabled:cursor-default disabled:opacity-40"
            title="重试获取天气"
            :aria-label="'重试获取天气'"
            :disabled="geoBusy"
            @click="refreshWeather()"
          >
            <svg
              viewBox="0 0 24 24"
              width="12"
              height="12"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M21 12a9 9 0 1 1-2.64-6.36" />
              <path d="M21 3v6h-6" />
            </svg>
          </button>
        </span>
      </div>

      <p class="mt-2 mb-0 text-[11.5px] leading-[1.5] text-faint">
        {{ geoNote || '位置只按出口 IP 推断，不申请定位权限、也不上传任何数据；天气走 Open-Meteo' }}
      </p>
    </section>

    <TranslateCard />
    <QrCard />
    <section class="rise rounded-lg bg-surface px-4 py-3.5">
      <div class="flex items-center justify-between gap-2">
        <span class="text-[13px] text-dim">念念不忘，必有回响</span>
        <button
          class="cursor-pointer text-[12px] font-medium text-accent hover:opacity-80"
          @click="notesOpen = true"
        >
          记一条
        </button>
      </div>
      <div v-if="notes.length" class="mt-1.5 space-y-1.5">
        <div
          v-for="item in notes.slice(0, 2)"
          :key="item.id"
          class="truncate text-[12px] text-ink"
          :title="item.text"
        >
          {{ item.text }}
        </div>
        <button
          v-if="notes.length > 2"
          class="cursor-pointer text-[11.5px] text-faint hover:text-ink"
          @click="notesOpen = true"
        >
          查看全部 {{ notes.length }} 条
        </button>
      </div>
      <p v-else class="mt-1 mb-0 text-[12px] text-faint">
        随手记的想法都存在这里，按 M 快速记
      </p>
    </section>
  </aside>
</template>
