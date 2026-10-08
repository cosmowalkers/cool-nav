import { computed, ref } from 'vue'
import { storage } from '../storage'
import { festivalOf } from '../utils/festival'
import { fetchHolidayYear, nextHoliday, statusOf, type HolidayTable } from '../utils/holiday'
import { dateKey, lunarOf, shiftDays } from '../utils/lunar'
import { fetchWeather, ipPlace, type Place, type Weather } from '../utils/weather'

const WEATHER_KEY = 'weather'
const HOLIDAY_TTL = 7 * 86_400_000
const WEATHER_TTL = 30 * 60 * 1000
const TICK = 60_000

const holidayKey = (year: number): string => `holiday:${year}`

export const weather = ref<Weather | null>(null)
/** 正在取数，界面用它禁用按钮 */
export const geoBusy = ref(false)
/** 取不到天气的原因，直接在右栏显示出来 */
export const geoNote = ref('')

/** 位置只有一条路：按出口 IP 反查，不申请定位权限 */
async function resolvePlace(): Promise<Place> {
  return ipPlace()
}
export const holidayReady = ref(false)

const years = ref<HolidayTable[]>([])
const now = ref(new Date())
let weatherAt = 0
let timer: number | undefined

const mergedTable = computed<HolidayTable>(() => ({
  year: now.value.getFullYear(),
  days: Object.assign({}, ...years.value.map((table) => table.days)),
}))

export const today = computed(() => {
  const date = now.value
  const lunar = lunarOf(date)
  const table = holidayReady.value ? mergedTable.value : null
  return {
    key: dateKey(date),
    lunar,
    status: statusOf(date, table),
    next: nextHoliday(date, table),
    festival: festivalOf(date, lunar, lunarOf(shiftDays(date, 1))),
  }
})

function remember(table: HolidayTable): void {
  const index = years.value.findIndex((item) => item.year === table.year)
  if (index >= 0) years.value[index] = table
  else years.value.push(table)
}

async function loadHoliday(): Promise<void> {
  const year = now.value.getFullYear()
  /* 明年的通知一般 11 月才出，所以那之前的次年数据只在已有缓存时才刷新 */
  for (const item of [year, year + 1]) {
    const cached = await storage.readLocal<{ at: number; table: HolidayTable }>(holidayKey(item))
    if (cached?.table) {
      remember(cached.table)
      holidayReady.value = true
    }
    if (cached && Date.now() - cached.at < HOLIDAY_TTL) continue
    if (item !== year && !cached && now.value.getMonth() < 10) continue
    try {
      const table = await fetchHolidayYear(item)
      remember(table)
      holidayReady.value = true
      await storage.writeLocal(holidayKey(item), { at: Date.now(), table })
    } catch (error) {
      // 拿不到就用缓存；连缓存都没有时 statusOf 会退回「周末 = 休」
      console.warn('[cool-nav] 假期数据取不到', error)
    }
  }
}

async function loadWeather(force = false): Promise<void> {
  const cached = await storage.readLocal<{ at: number; weather: Weather; place: Place }>(WEATHER_KEY)
  if (cached) {
    weather.value = cached.weather
    weatherAt = cached.at
  }
  if (!force && cached && Date.now() - cached.at < WEATHER_TTL) return

  geoBusy.value = true
  geoNote.value = ''
  try {
  /* 到点自动刷新时沿用上次解析出来的地方，省一次请求；
     手动刷新时（force）重新按 IP 解析 */
    const place = !force && cached?.place ? cached.place : await resolvePlace()
    const data = await fetchWeather(place)
    weather.value = data
    weatherAt = Date.now()
    await storage.writeLocal(WEATHER_KEY, { at: weatherAt, weather: data, place })
  } catch (error) {
    console.warn('[cool-nav] 天气取不到', error)
    weather.value = null
    geoNote.value = (error as Error)?.message || '天气暂时取不到'
  } finally {
    geoBusy.value = false
  }
}

/** 手动刷新天气：绕过缓存、重新按当前规则解析位置再拉数据 */
export async function refreshWeather(): Promise<void> {
  await loadWeather(true)
}

export async function initDayInfo(): Promise<void> {
  await loadHoliday()
  await loadWeather()

  if (timer) return
  timer = window.setInterval(() => {
    now.value = new Date()
    if (weatherAt && Date.now() - weatherAt > WEATHER_TTL) void loadWeather(true)
  }, TICK)
}
