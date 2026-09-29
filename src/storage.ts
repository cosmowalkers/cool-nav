const PREFIX = 'coolnav:'

export const isExtension = typeof chrome !== 'undefined' && Boolean(chrome?.storage?.sync)

async function read<T>(key: string): Promise<T | undefined> {
  if (isExtension) {
    const result = await chrome.storage.sync.get(key)
    return result[key] as T | undefined
  }
  const raw = localStorage.getItem(PREFIX + key)
  return raw ? (JSON.parse(raw) as T) : undefined
}

async function write(key: string, value: unknown): Promise<void> {
  if (isExtension) {
    await chrome.storage.sync.set({ [key]: value })
    return
  }
  localStorage.setItem(PREFIX + key, JSON.stringify(value))
}

/** 本机存储：放不上（也不该上）云的大文件，比如上传的背景图 */
async function readLocal<T>(key: string): Promise<T | undefined> {
  if (isExtension) {
    const result = await chrome.storage.local.get(key)
    return result[key] as T | undefined
  }
  const raw = localStorage.getItem(PREFIX + 'local:' + key)
  return raw ? (JSON.parse(raw) as T) : undefined
}

async function writeLocal(key: string, value: unknown): Promise<void> {
  if (isExtension) {
    await chrome.storage.local.set({ [key]: value })
    return
  }
  localStorage.setItem(PREFIX + 'local:' + key, JSON.stringify(value))
}

/**
 * 别的标签页 / 设备写了同一个键时回调。
 * 扩展的 onChanged 在本页也会回声（网页版的 storage 事件不会），调用方按内容自行忽略。
 */
function onChange(key: string, handler: (value: unknown) => void): void {
  if (isExtension) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'sync' || !changes[key]) return
      handler(changes[key].newValue)
    })
    return
  }
  window.addEventListener('storage', (event) => {
    if (event.key !== PREFIX + key || !event.newValue) return
    try {
      handler(JSON.parse(event.newValue))
    } catch {
      // 内容读不出来就当没发生，读取路径自己有兜底
    }
  })
}

export const storage = { read, write, readLocal, writeLocal, onChange }
