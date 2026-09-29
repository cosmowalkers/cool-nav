/** 长边上限：4K 图缩到这个尺寸，屏幕上完全看不出差别，体积能小一个数量级 */
const MAX_EDGE = 2400

/**
 * 本地背景图先压再存：一张手机原图直接塞存储会撑爆配额，
 * 这里统一缩到 2400px 内并转 WebP，绝大多数壁纸能落到几百 KB。
 */
export async function fileToBackground(file: File): Promise<string> {
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    throw new Error('图片读不出来，换 JPG / PNG / WebP 试试')
  }

  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) {
    bitmap.close()
    throw new Error('浏览器不支持画布处理，换张图试试')
  }
  context.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  const dataUrl = canvas.toDataURL('image/webp', 0.86)
  if (dataUrl.length > 4_000_000) throw new Error('图片还是太大，换张小一点的')
  return dataUrl
}
