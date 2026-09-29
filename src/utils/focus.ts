/** 键盘导航：链接之间按**视觉位置**找邻居。分组是多列排的，DOM 顺序和视觉位置不一定一致 */
export type Direction = 'left' | 'right' | 'up' | 'down'

/** 一条链接的标记，键盘导航和 App 的事件处理共用这一个选择器 */
export const LINK_SELECTOR = '[data-link]'

const SEARCH = '[data-search-input]'

function tiles(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>(LINK_SELECTOR))
}

export function focusTile(edge: 'first' | 'last' = 'first'): boolean {
  const list = tiles()
  const target = edge === 'last' ? list[list.length - 1] : list[0]
  target?.focus()
  return Boolean(target)
}

export function focusSearchBox(): boolean {
  const input = document.querySelector<HTMLInputElement>(SEARCH)
  input?.focus()
  return Boolean(input)
}

export function moveTileFocus(from: HTMLElement, direction: Direction): boolean {
  const box = from.getBoundingClientRect()
  const cx = box.left + box.width / 2
  const cy = box.top + box.height / 2
  let best: HTMLElement | null = null
  let bestScore = Infinity

  for (const tile of tiles()) {
    if (tile === from) continue
    const other = tile.getBoundingClientRect()
    const dx = other.left + other.width / 2 - cx
    const dy = other.top + other.height / 2 - cy
    const along =
      direction === 'left' ? -dx : direction === 'right' ? dx : direction === 'up' ? -dy : dy
    /* 主轴上得真有位移，不然同一排的邻居会被判成上下邻居 */
    if (along < 1) continue
    const across = direction === 'left' || direction === 'right' ? Math.abs(dy) : Math.abs(dx)
    /* 横向错位重罚：换行之后按 ↓ 才会落到正对着的那一块 */
    const score = along + across * 3
    if (score < bestScore) {
      bestScore = score
      best = tile
    }
  }

  best?.focus()
  return Boolean(best)
}
