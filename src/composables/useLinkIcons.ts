import { ref } from 'vue'
import { nav, showToast, updateLink } from './useNavData'
import { requestOrigins } from '../utils/permissions'
import { fetchPageMeta } from '../utils/title'

/**
 * 「补全图标」：把还没有图标的链接逐个访问一遍，读它页面里声明的那个图标。
 *
 * 为什么需要这么一手：浏览器原生 favicon API 只认缓存过的图标——没在这个浏览器里打开过的站点
 * 取不到；而站点把图标放在 `/logo.svg`、CDN 这种非根目录位置时，靠猜路径也猜不着。
 * 代价是要一次 host 权限（点按钮那一下申请，浏览器只弹一次），换来的是图标落进用户自己的数据里，
 * 以后不再依赖浏览器缓存。
 */
const MAX_LINKS = 40
const CONCURRENCY = 4

export const fillingIcons = ref(false)

interface Task {
  groupId: string
  linkId: string
  url: string
}

function collect(): Task[] {
  const tasks: Task[] = []
  for (const group of nav.groups) {
    for (const link of group.links) {
      if (link.icon) continue
      tasks.push({ groupId: group.id, linkId: link.id, url: link.url })
      if (tasks.length >= MAX_LINKS) return tasks
    }
  }
  return tasks
}

export async function fillMissingIcons(): Promise<void> {
  const tasks = collect()
  if (!tasks.length) {
    showToast('所有链接都已经有图标了')
    return
  }

  /* 这次点击就是授权时机：一次性把 http/https 要下来，省得逐站弹窗 */
  if (!(await requestOrigins(['https://*/*', 'http://*/*']))) {
    showToast('没拿到访问权限，图标只能继续靠浏览器缓存')
    return
  }

  fillingIcons.value = true
  /* 同一个域名只访问一次，省得重复拉同一份 HTML */
  const cache = new Map<string, string>()
  let filled = 0

  const worker = async (): Promise<void> => {
    for (;;) {
      const task = tasks.shift()
      if (!task) return
      let origin = ''
      try {
        origin = new URL(task.url).origin
      } catch {
        continue
      }
      if (!cache.has(origin)) {
        const meta = await fetchPageMeta(task.url).catch(() => null)
        cache.set(origin, meta?.icon ?? '')
      }
      const icon = cache.get(origin)
      if (!icon) continue
      updateLink(task.groupId, task.linkId, { icon })
      filled += 1
    }
  }

  try {
    await Promise.all(Array.from({ length: CONCURRENCY }, worker))
  } finally {
    fillingIcons.value = false
  }

  showToast(
    filled
      ? `补了 ${filled} 个图标，剩下的站点没在页面里声明图标`
      : '这些站点都没在页面里声明图标，保持色块',
  )
}
