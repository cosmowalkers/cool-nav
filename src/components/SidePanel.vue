<script setup lang="ts">
import { computed, ref } from 'vue'
import WeatherGlyph from './WeatherGlyph.vue'
import { useClock } from '../composables/useClock'
import { geoBusy, geoNote, placeSource, setCity, today, weather } from '../composables/useDayInfo'
import { nav } from '../composables/useNavData'

const { time, date } = useClock()

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

/** 冲煞那一串长这样：(庚子)鼠 → 只留「鼠」 */
const chong = computed(() => today.value.almanac?.chong.replace(/^\(.*?\)/, '') ?? '')

/* 城市：默认按出口 IP 猜，猜不准（出差、代理、机房出口）就手填一个定死 */
const cityOpen = ref(false)
const cityDraft = ref('')

function toggleCity(): void {
  cityOpen.value = !cityOpen.value
  if (cityOpen.value) cityDraft.value = nav.settings.city || weather.value?.city || ''
}

async function submitCity(): Promise<void> {
  const value = cityDraft.value.trim()
  if (!value) return
  cityOpen.value = false
  await setCity(value)
}

async function useLocation(): Promise<void> {
  cityOpen.value = false
  cityDraft.value = ''
  await setCity('')
}
</script>

<template>
  <aside class="flex flex-col gap-3">
    <section class="rise rounded-lg bg-surface px-4 py-4 text-center" style="--d: 80ms">
      <div class="time text-[32px] leading-none font-[300] tabular-nums">{{ time }}</div>
      <div class="mt-2 text-[13px] text-dim">{{ date }}</div>
      <div class="mt-1 text-[12px] text-faint">
        农历{{ today.lunar.month }}{{ today.lunar.day }} · {{ today.lunar.yearName }}{{ today.lunar.zodiac }}年
      </div>
      <div v-if="festival" class="mt-1 text-[13px] text-accent">{{ festival }}</div>
    </section>

    <section v-if="weather" class="rise rounded-lg bg-surface px-4 py-3.5" style="--d: 140ms">
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
          class="ml-auto flex-none cursor-pointer hover:text-accent"
          @click="toggleCity()"
        >
          {{ cityOpen ? '取消' : '改' }}
        </button>
      </div>

      <!-- 说清这个城市是哪来的：IP 猜的随时可以换掉 -->
      <div class="mt-1 text-[11px] text-faint">
        {{ placeSource === 'city' ? '手动指定' : '按出口 IP 推测，不准就改' }}
      </div>

      <form v-if="cityOpen" class="mt-2 flex gap-1.5" @submit.prevent="submitCity()">
        <input
          v-model="cityDraft"
          class="min-w-0 flex-1 rounded-md border border-line bg-transparent px-2 py-[5px] text-[12px] outline-none placeholder:text-faint focus:border-accent/55"
          placeholder="城市名，如 天津"
          spellcheck="false"
        />
        <button
          type="submit"
          class="flex-none cursor-pointer rounded-md border border-line px-2 py-[5px] text-[12px] text-dim hover:text-ink"
        >
          确定
        </button>
        <button
          v-if="nav.settings.city"
          type="button"
          class="flex-none cursor-pointer rounded-md px-1.5 py-[5px] text-[12px] text-faint hover:text-ink"
          title="改回按出口 IP 猜"
          @click="useLocation()"
        >
          按 IP
        </button>
      </form>
    </section>

    <section v-else class="rise rounded-lg bg-surface px-4 py-3.5" style="--d: 140ms">
      <div class="flex items-center justify-between gap-2">
        <span class="text-[13px] text-dim">天气</span>
        <span class="flex-none text-[12px] text-faint">
          {{ geoBusy ? '查位置…' : '按出口 IP 定位' }}
        </span>
      </div>

      <form class="mt-2.5 flex gap-1.5" @submit.prevent="submitCity()">
        <input
          v-model="cityDraft"
          class="min-w-0 flex-1 rounded-md border border-line bg-transparent px-2 py-[5px] text-[12px] outline-none placeholder:text-faint focus:border-accent/55"
          placeholder="或直接输入城市"
          spellcheck="false"
        />
        <button
          type="submit"
          class="flex-none cursor-pointer rounded-md border border-line px-2 py-[5px] text-[12px] text-dim hover:text-ink"
        >
          确定
        </button>
      </form>

      <p class="mt-2 mb-0 text-[11.5px] leading-[1.5] text-faint">
        {{ geoNote || '位置只按出口 IP 推断，不申请定位权限、也不上传任何数据；天气走 Open-Meteo' }}
      </p>

    </section>

    <section
      v-if="holidayText"
      class="rise flex items-center gap-2.5 rounded-lg bg-surface px-4 py-3.5 text-[14px]"
      style="--d: 200ms"
    >
      <span
        class="grid h-[20px] w-[20px] flex-none place-items-center rounded-[6px] text-[12px] leading-none font-medium"
        :class="{
          'bg-[#12b76a]/15 text-[#12b76a]': chip.tone === 'off',
          'bg-[#f79009]/15 text-[#f79009]': chip.tone === 'makeup',
          'border border-line text-faint': chip.tone === 'work',
        }"
        :title="status.makeup ? '调休补班' : status.off ? '休息日' : '工作日'"
      >
        {{ chip.text }}
      </span>
      <span class="min-w-0">{{ holidayText }}</span>
    </section>

    <section v-if="today.almanac" class="rise rounded-lg bg-surface px-4 py-3.5" style="--d: 260ms">
      <div class="mb-2.5 flex items-baseline justify-between text-[12px] text-faint">
        <span>黄历</span>
        <span>{{ today.almanac.zhiXing }}日 · {{ today.almanac.xiu }}宿 · 冲{{ chong }}</span>
      </div>

      <div class="flex gap-2 text-[13px]">
        <span class="grid h-[19px] w-[19px] flex-none place-items-center rounded-[6px] bg-[#12b76a]/15 text-[12px] text-[#12b76a]">宜</span>
        <p class="m-0 flex-1 leading-[1.5] text-dim">{{ today.almanac.yi.join(' · ') }}</p>
      </div>
      <div class="mt-2 flex gap-2 text-[13px]">
        <span class="grid h-[19px] w-[19px] flex-none place-items-center rounded-[6px] bg-[#e5484d]/15 text-[12px] text-[#e5484d]">忌</span>
        <p class="m-0 flex-1 leading-[1.5] text-dim">{{ today.almanac.ji.join(' · ') }}</p>
      </div>
    </section>
  </aside>
</template>
