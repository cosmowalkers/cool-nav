export type WeatherIcon =
  | 'sun'
  | 'cloud-sun'
  | 'cloud'
  | 'fog'
  | 'drizzle'
  | 'rain'
  | 'snow'
  | 'thunder'

export interface Weather {
  city: string
  district?: string
  temp: number
  min: number
  max: number
  code: number
  text: string
  icon: WeatherIcon
}

/** WMO 天气代码 → 中文 + 图标，代码表见 open-meteo 文档 */
const CODES: Record<number, [string, WeatherIcon]> = {
  0: ['晴', 'sun'],
  1: ['晴间多云', 'cloud-sun'],
  2: ['多云', 'cloud-sun'],
  3: ['阴', 'cloud'],
  45: ['有雾', 'fog'],
  48: ['雾凇', 'fog'],
  51: ['毛毛雨', 'drizzle'],
  53: ['毛毛雨', 'drizzle'],
  55: ['毛毛雨', 'drizzle'],
  56: ['冻毛毛雨', 'drizzle'],
  57: ['冻毛毛雨', 'drizzle'],
  61: ['小雨', 'rain'],
  63: ['中雨', 'rain'],
  65: ['大雨', 'rain'],
  66: ['冻雨', 'rain'],
  67: ['冻雨', 'rain'],
  71: ['小雪', 'snow'],
  73: ['中雪', 'snow'],
  75: ['大雪', 'snow'],
  77: ['米雪', 'snow'],
  80: ['阵雨', 'rain'],
  81: ['阵雨', 'rain'],
  82: ['强阵雨', 'rain'],
  85: ['阵雪', 'snow'],
  86: ['阵雪', 'snow'],
  95: ['雷阵雨', 'thunder'],
  96: ['雷阵雨伴冰雹', 'thunder'],
  99: ['雷阵雨伴冰雹', 'thunder'],
}

export function describeWeather(code: number): [string, WeatherIcon] {
  return CODES[code] ?? ['—', 'cloud']
}

export interface Place {
  name: string
  lat: number
  lon: number
  /** 区县，IP 反查和地理编码都可能有、也可能没有 */
  district?: string
}

interface ReverseResponse {
  city?: string
  locality?: string
  principalSubdivision?: string
  latitude?: number
  longitude?: number
}

/**
 * 位置解析：**只用出口 IP**，不碰浏览器定位。
 *
 * 为什么砍掉系统定位：Chromium 在系统定位不可用时（macOS 没给权限、或者给了也拿不到坐标）
 * 会退回 Google 的定位服务，而这个服务在国内不可达，于是报 POSITION_UNAVAILABLE（错误码 2）。
 * 也就是说这套 API 在国内本来就时好时坏，还要用户去系统设置里放权、还多一个权限项。
 * BigDataCloud 不带坐标时按调用方 IP 反查：同一个域名、免 key、国内可达，
 * 城市级精度对天气足够。想要更准就手填城市，那条路一直留着。
 */
export async function ipPlace(timeoutMs = 8000): Promise<Place> {
  const url = new URL('https://api.bigdatacloud.net/data/reverse-geocode-client')
  url.searchParams.set('localityLanguage', 'zh')

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, { credentials: 'omit', signal: controller.signal })
    if (!response.ok) throw new Error(`按 IP 查位置失败（HTTP ${response.status}）`)
    const data = (await response.json()) as ReverseResponse
    const name = data.city || data.principalSubdivision
    if (!name || typeof data.latitude !== 'number' || typeof data.longitude !== 'number') {
      throw new Error('按 IP 也拿不到城市，手动填一个吧')
    }
    return {
      name,
      lat: data.latitude,
      lon: data.longitude,
      ...(data.locality && data.locality !== name ? { district: data.locality } : {}),
    }
  } finally {
    clearTimeout(timer)
  }
}

interface GeoHit {
  name?: string
  latitude?: number
  longitude?: number
  admin1?: string
  country_code?: string
}

async function geocodeOnce(name: string, timeoutMs: number): Promise<GeoHit[]> {
  const url = new URL('https://geocoding-api.open-meteo.com/v1/search')
  url.searchParams.set('name', name)
  url.searchParams.set('count', '5')
  url.searchParams.set('language', 'zh')
  url.searchParams.set('format', 'json')
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  const response = await fetch(url, { credentials: 'omit', signal: controller.signal }).finally(() =>
    clearTimeout(timer),
  )
  if (!response.ok) throw new Error(`地理编码 HTTP ${response.status}`)
  const data = (await response.json()) as { results?: GeoHit[] }
  return data.results ?? []
}

/**
 * 城市名 → 经纬度。
 * 两个坑：Open-Meteo 只认「天津」不认「天津市」（区县名干脆没有），而「上海市」还会匹配到
 * 美国伊利诺伊州那个同名小城。所以先原样查、查不到再去掉行政区后缀重查，
 * 中文输入时优先中国的结果。
 */
export async function geocode(city: string, timeoutMs = 8000): Promise<Place | null> {
  const raw = city.trim()
  let hits = await geocodeOnce(raw, timeoutMs)
  if (!hits.length) {
    const stripped = raw.replace(/(特别行政区|自治区|自治州|地区|市|省|区|县|镇)$/u, '')
    if (stripped && stripped !== raw) hits = await geocodeOnce(stripped, timeoutMs)
  }
  const cjk = /[\u4e00-\u9fa5]/.test(raw)
  const hit = (cjk ? hits.find((item) => item.country_code === 'CN') : undefined) ?? hits[0]
  if (hit?.latitude === undefined || hit.longitude === undefined) return null
  return {
    name: hit.admin1 && hit.admin1 !== hit.name ? `${hit.name}·${hit.admin1}` : (hit.name ?? raw),
    lat: hit.latitude,
    lon: hit.longitude,
  }
}

interface ForecastResponse {
  current?: { temperature_2m?: number; weather_code?: number }
  daily?: { temperature_2m_max?: number[]; temperature_2m_min?: number[]; weather_code?: number[] }
}

/** 当前天气 + 今日高低温，免 key，超时 8s */
export async function fetchWeather(place: Place, timeoutMs = 8000): Promise<Weather> {
  const url = new URL('https://api.open-meteo.com/v1/forecast')
  url.searchParams.set('latitude', String(place.lat))
  url.searchParams.set('longitude', String(place.lon))
  url.searchParams.set('current', 'temperature_2m,weather_code')
  url.searchParams.set('daily', 'temperature_2m_max,temperature_2m_min,weather_code')
  url.searchParams.set('timezone', 'auto')
  url.searchParams.set('forecast_days', '1')

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, { credentials: 'omit', signal: controller.signal })
    if (!response.ok) throw new Error(`天气 HTTP ${response.status}`)
    const data = (await response.json()) as ForecastResponse
    const code = data.current?.weather_code ?? data.daily?.weather_code?.[0] ?? 3
    const [text, icon] = describeWeather(code)
    return {
      city: place.name,
      ...(place.district ? { district: place.district } : {}),
      temp: Math.round(data.current?.temperature_2m ?? 0),
      min: Math.round(data.daily?.temperature_2m_min?.[0] ?? 0),
      max: Math.round(data.daily?.temperature_2m_max?.[0] ?? 0),
      code,
      text,
      icon,
    }
  } finally {
    clearTimeout(timer)
  }
}
