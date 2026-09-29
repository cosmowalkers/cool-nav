import type { NavData, NavSettings } from './types'

export const DEFAULT_SETTINGS: NavSettings = {
  engineId: 'bing',
  theme: 'system',
  /** 手动指定的天气城市；留空则用定位 */
  city: '',
  showSidePanel: true,
  historyEnabled: true,
  background: { preset: 'bing', url: '', rotate: 'newtab' },
}

/**
 * 预置链接：只放公开站点，方便第一次装上就能看到一页有内容的导航。
 * 排序按「一天里打开的频次」而不是按字母——常用放最前，越往下越冷门。
 */
export function seedData(): NavData {
  return {
    version: 3,
    settings: { ...DEFAULT_SETTINGS },
    groups: [
      {
        id: 'g-common',
        name: '常用',
        links: [
          { id: 'l-github', title: 'GitHub', url: 'https://github.com/' },
          { id: 'l-zhihu', title: '知乎', url: 'https://www.zhihu.com/' },
          { id: 'l-juejin', title: '掘金', url: 'https://juejin.cn/' },
          { id: 'l-bilibili', title: '哔哩哔哩', url: 'https://www.bilibili.com/' },
          { id: 'l-weibo', title: '微博', url: 'https://weibo.com/' },
          { id: 'l-douban', title: '豆瓣', url: 'https://www.douban.com/' },
        ],
      },
      {
        id: 'g-dev',
        name: '开发',
        links: [
          { id: 'l-so', title: 'Stack Overflow', url: 'https://stackoverflow.com/' },
          { id: 'l-mdn', title: 'MDN', url: 'https://developer.mozilla.org/zh-CN/' },
          { id: 'l-npm', title: 'npm', url: 'https://www.npmjs.com/' },
          { id: 'l-vue', title: 'Vue 3 文档', url: 'https://cn.vuejs.org/' },
          { id: 'l-caniuse', title: 'Can I use', url: 'https://caniuse.com/' },
          { id: 'l-trending', title: 'GitHub Trending', url: 'https://github.com/trending' },
        ],
      },
      {
        id: 'g-ai',
        name: 'AI',
        links: [
          { id: 'l-deepseek', title: 'DeepSeek', url: 'https://chat.deepseek.com/' },
          { id: 'l-doubao', title: '豆包', url: 'https://www.doubao.com/' },
          { id: 'l-kimi', title: 'Kimi', url: 'https://www.kimi.com/' },
          { id: 'l-qwen', title: '通义千问', url: 'https://tongyi.aliyun.com/' },
          { id: 'l-chatgpt', title: 'ChatGPT', url: 'https://chatgpt.com/' },
          { id: 'l-claude', title: 'Claude', url: 'https://claude.ai/' },
        ],
      },
      {
        id: 'g-news',
        name: '资讯',
        links: [
          { id: 'l-36kr', title: '36氪', url: 'https://36kr.com/' },
          { id: 'l-sspai', title: '少数派', url: 'https://sspai.com/' },
          { id: 'l-huxiu', title: '虎嗅', url: 'https://www.huxiu.com/' },
          { id: 'l-infoq', title: 'InfoQ', url: 'https://www.infoq.cn/' },
          { id: 'l-thepaper', title: '澎湃新闻', url: 'https://www.thepaper.cn/' },
        ],
      },
      {
        id: 'g-tools',
        name: '工具',
        links: [
          { id: 'l-tool', title: 'Tool.lu', url: 'https://tool.lu/' },
          { id: 'l-fanyi', title: '百度翻译', url: 'https://fanyi.baidu.com/' },
          { id: 'l-cliim', title: '草料二维码', url: 'https://cli.im/' },
          { id: 'l-tinypng', title: 'TinyPNG', url: 'https://tinypng.com/' },
          { id: 'l-json', title: 'JSON 中文网', url: 'https://www.json.cn/' },
          { id: 'l-regex101', title: 'Regex101', url: 'https://regex101.com/' },
        ],
      },
      {
        id: 'g-life',
        name: '生活',
        links: [
          { id: 'l-taobao', title: '淘宝', url: 'https://www.taobao.com/' },
          { id: 'l-jd', title: '京东', url: 'https://www.jd.com/' },
          { id: 'l-12306', title: '铁路 12306', url: 'https://www.12306.cn/' },
          { id: 'l-amap', title: '高德地图', url: 'https://www.amap.com/' },
          { id: 'l-meituan', title: '美团', url: 'https://www.meituan.com/' },
        ],
      },
    ],
  }
}
