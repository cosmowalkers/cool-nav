<script setup lang="ts">
import { computed } from 'vue'
import { Calendar } from 'v-calendar'
import { holidayReady, mergedTable } from '../composables/useDayInfo'
import { dateKey, lunarOf, shiftDays, isWeekend } from '../utils/lunar'
import { statusOf } from '../utils/holiday'
import { festivalOf } from '../utils/festival'
import { isDark } from '../composables/useTheme'

const WEEKDAY_HEADERS = ['一', '二', '三', '四', '五', '六', '日']

/** v-calendar slot 给的最小字段，够我们用了 */
interface CalDay {
  date: Date
  day: number
  isToday: boolean
}

interface CellInfo {
  lunarDay: string
  festival: string
  isOff: boolean
  isMakeup: boolean
  isWeekend: boolean
}

const EMPTY_CELL: CellInfo = {
  lunarDay: '',
  festival: '',
  isOff: false,
  isMakeup: false,
  isWeekend: false,
}

const monthLabel = computed(() => {
  const d = new Date()
  return `${d.getFullYear()} 年 ${d.getMonth() + 1} 月`
})

/** 当前月每一天的标记信息，key 是 YYYY-MM-DD */
const cellMap = computed<Record<string, CellInfo>>(() => {
  const d = new Date()
  const year = d.getFullYear()
  const month = d.getMonth()
  const totalDays = new Date(year, month + 1, 0).getDate()
  const table = holidayReady.value ? mergedTable.value : null

  const map: Record<string, CellInfo> = {}
  for (let day = 1; day <= totalDays; day++) {
    const date = new Date(year, month, day)
    const key = dateKey(date)
    const lunar = lunarOf(date)
    const status = statusOf(date, table)
    const tomorrowLunar = lunarOf(shiftDays(date, 1))
    map[key] = {
      lunarDay: lunar.day,
      festival: festivalOf(date, lunar, tomorrowLunar),
      isOff: status.off,
      isMakeup: status.makeup,
      isWeekend: isWeekend(date),
    }
  }
  return map
})

function infoOf(day: CalDay): CellInfo {
  return cellMap.value[dateKey(day.date)] ?? EMPTY_CELL
}

/** 格子配色：今天优先，然后是补班/休息，最后才是普通周末的淡化 */
function cellClass(info: CellInfo, day: CalDay): string {
  if (day.isToday) return 'day-today'
  if (info.isMakeup) return 'day-makeup'
  if (info.isOff) return 'day-off'
  if (info.isWeekend) return 'day-weekend'
  return 'day-workday'
}
</script>

<template>
  <section class="rise rounded-lg bg-surface px-3 py-3.5">
    <div class="mb-1.5 text-center text-[13px] font-medium">{{ monthLabel }}</div>

    <!-- 星期头（不依赖 v-calendar 的本地化标题，自己控制样式） -->
    <div class="grid grid-cols-7 text-center text-[10.5px] text-faint">
      <span v-for="w in WEEKDAY_HEADERS" :key="w">{{ w }}</span>
    </div>

    <Calendar
      class="mt-1"
      :first-day-of-week="2"
      locale="zh-CN"
      :is-dark="isDark"
      :transparent="true"
      :trim-weeks="true"
    >
      <template #day-content="{ day }">
        <div class="day-cell" :class="cellClass(infoOf(day), day)" :title="infoOf(day).festival || ''">
          <div class="day-num">{{ day.day }}</div>
          <div class="day-lunar">{{ infoOf(day).lunarDay }}</div>
          <div v-if="infoOf(day).festival" class="day-fest">{{ infoOf(day).festival }}</div>
        </div>
      </template>
    </Calendar>
  </section>
</template>

<style scoped>
/* v-calendar 自带的标题栏（箭头 + 月份名）隐藏掉，我们自己画了标题和星期头 */
:deep(.vc-header) {
  display: none;
}

/* v-calendar 自带的星期标题也隐藏掉，否则会出现两行星期头 */
:deep(.vc-weekdays) {
  display: none;
}

/* 格子拉高一点，放下公历 + 农历 + 节日三行 */
:deep(.vc-day) {
  min-height: 44px;
}

.day-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1px;
  border-radius: 8px;
  padding: 2px 0;
  cursor: default;
}

.day-num {
  font-size: 12px;
  line-height: 1.15;
  font-weight: 500;
}

.day-lunar {
  font-size: 9px;
  line-height: 1.1;
  opacity: 0.5;
}

.day-fest {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding: 0 2px;
  font-size: 9px;
  line-height: 1.1;
  color: var(--color-accent);
}

/* 今天：accent 底 + accent 文字 */
.day-today {
  background: color-mix(in srgb, var(--color-accent) 18%, transparent);
  color: var(--color-accent);
  font-weight: 600;
}

.day-today .day-lunar,
.day-today .day-fest {
  opacity: 0.75;
}

/* 放假（含节假日）：绿色 */
.day-off {
  color: var(--color-success);
}

/* 调休补班：橙色 */
.day-makeup {
  color: var(--color-warn);
}

/* 普通周末：淡化 */
.day-weekend {
  color: var(--color-faint);
}

.day-workday .day-num {
  color: var(--color-ink);
}
</style>
