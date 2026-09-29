import { createApp } from 'vue'
import './styles.css'
import App from './App.vue'
import { initNav } from './composables/useNavData'
import { initWallpaper } from './composables/useWallpaper'
import { initDayInfo } from './composables/useDayInfo'
import { initTheme } from './composables/useTheme'
import { initIconMiss } from './composables/useIconMiss'

/**
 * 数据先到位再挂载（不然会闪一下预置链接）；
 * 壁纸等挂载之后异步跑——它要等图片下载完，串在首帧上就是拿白屏换壁纸。
 * 图片没到位时页面本来就是深色底 + 深色文字体系，不需要额外的占位。
 */
async function boot(): Promise<void> {
  /* 主题不依赖网络也不依赖存储，先挂上，免得等数据时先闪一下默认配色 */
  initTheme()
  await initNav().catch((error) => console.error('[cool-nav] 数据初始化失败', error))
  /* 图标失败记录要在挂载前备好，免得首帧先按「没失败过」多试一次 */
  await initIconMiss().catch(() => {})
  createApp(App).mount('#app')
  void initWallpaper().catch((error) => console.error('[cool-nav] 壁纸初始化失败', error))
  void initDayInfo().catch((error) => console.error('[cool-nav] 日期信息初始化失败', error))
}

void boot()
