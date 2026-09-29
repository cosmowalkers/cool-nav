import { createApp } from 'vue'
import './styles.css'
import App from './App.vue'
import { initNav } from './composables/useNavData'
import { initWallpaper } from './composables/useWallpaper'

Promise.all([initNav(), initWallpaper()])
  .catch((error) => console.error('[cool-nav] 初始化失败', error))
  .finally(() => createApp(App).mount('#app'))
