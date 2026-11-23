/**
 * Achica las fotos antes de guardarlas: menos espacio en IndexedDB y en Storage, y sync más rápido.
 * Si algo falla (formato que el navegador no decodifica, como HEIC en Chrome) se guarda el original.
 */

/** Lado más largo, en píxeles, de una foto guardada. */
export const MAX_SIDE = 1600
/** Por debajo de este peso, y sin pasarse de MAX_SIDE, la foto se guarda tal cual. */
export const KEEP_BELOW_BYTES = 400 * 1024
const WEBP_QUALITY = 0.82
const JPEG_QUALITY = 0.85

/** Tamaño final manteniendo la proporción, sin agrandar nunca. */
export function fitWithin(width: number, height: number, max = MAX_SIDE): { width: number; height: number } {
  const longest = Math.max(width, height)
  if (longest <= max) return { width, height }
  const scale = max / longest
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) }
}

/** Cambia la extensión del nombre según el tipo final. */
export function renameFor(name: string, mime: string): string {
  const ext = mime === 'image/webp' ? 'webp' : 'jpg'
  const base = name.replace(/\.[^./\\]+$/, '') || 'foto'
  return `${base}.${ext}`
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality))
}

export async function compressImage(file: File): Promise<File> {
  // Los GIF pueden ser animados: un canvas se quedaría solo con el primer cuadro.
  if (!file.type.startsWith('image/') || file.type === 'image/gif') return file
  if (typeof createImageBitmap !== 'function' || typeof document === 'undefined') return file

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    return file
  }
  try {
    const target = fitWithin(bitmap.width, bitmap.height)
    const resized = target.width !== bitmap.width || target.height !== bitmap.height
    if (!resized && file.size <= KEEP_BELOW_BYTES) return file

    const canvas = document.createElement('canvas')
    canvas.width = target.width
    canvas.height = target.height
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.imageSmoothingQuality = 'high'

    // WebP conserva transparencia. Si el navegador no lo codifica (Safari viejo), se usa JPEG con fondo blanco.
    ctx.drawImage(bitmap, 0, 0, target.width, target.height)
    let blob = await toBlob(canvas, 'image/webp', WEBP_QUALITY)
    if (!blob || blob.type !== 'image/webp') {
      ctx.globalCompositeOperation = 'destination-over'
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, target.width, target.height)
      blob = await toBlob(canvas, 'image/jpeg', JPEG_QUALITY)
    }
    if (!blob) return file
    // Sin achicar las dimensiones, solo vale la pena si pesa menos que el original.
    if (!resized && blob.size >= file.size) return file
    return new File([blob], renameFor(file.name, blob.type), { type: blob.type, lastModified: file.lastModified })
  } finally {
    bitmap.close()
  }
}
