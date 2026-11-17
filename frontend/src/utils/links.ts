export type LinkSource = 'instagram' | 'pinterest' | 'mercadolibre' | 'web'

export interface LinkInfo {
  source: LinkSource
  /** Nombre corto de la plataforma, para mostrar en la tarjeta. */
  label: string
  /** Título sugerido cuando el usuario no escribió uno. */
  defaultTitle: string
}

const URL_RE = /https?:\/\/[^\s<>"']+/i

/** Saca el primer URL de un texto (Instagram comparte "Mirá esto https://…"). */
export function extractUrl(text: string | null | undefined): string | null {
  if (!text) return null
  const m = URL_RE.exec(text)
  if (!m) return null
  return m[0].replace(/[),.;!?]+$/, '')
}

export function isUrl(text: string): boolean {
  const t = text.trim()
  return /^https?:\/\/\S+$/i.test(t)
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, '')
  } catch {
    return ''
  }
}

export function detectSource(url: string): LinkSource {
  const host = hostOf(url)
  if (!host) return 'web'
  if (host === 'instagram.com' || host.endsWith('.instagram.com') || host === 'instagr.am') return 'instagram'
  if (host === 'pin.it' || /(^|\.)pinterest\.[a-z.]+$/.test(host)) return 'pinterest'
  if (host === 'meli.la' || /(^|\.)mercado(libre|livre)\.[a-z.]+$/.test(host)) return 'mercadolibre'
  return 'web'
}

/** "MLA-123456-teclado-mecanico-xyz-_JM" → "Teclado mecanico xyz". */
export function titleFromMercadoLibre(url: string): string | null {
  let path: string
  try {
    path = new URL(url).pathname
  } catch {
    return null
  }
  const segments = path.split('/').map((s) => decodeURIComponent(s)).filter((s) => s.includes('-'))
  if (!segments.length) return null
  let slug = segments.sort((a, b) => b.length - a.length)[0]
  slug = slug.replace(/^ML[A-Z]-?\d+-?/i, '').replace(/-?_.*$/, '')
  const words = slug.split('-').filter(Boolean)
  if (!words.length) return null
  const text = words.join(' ')
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export function describeLink(url: string): LinkInfo {
  const source = detectSource(url)
  if (source === 'instagram') return { source, label: 'Instagram', defaultTitle: 'Post de Instagram' }
  if (source === 'pinterest') return { source, label: 'Pinterest', defaultTitle: 'Pin de Pinterest' }
  if (source === 'mercadolibre') {
    return { source, label: 'Mercado Libre', defaultTitle: titleFromMercadoLibre(url) ?? 'Producto de Mercado Libre' }
  }
  const host = hostOf(url)
  return { source, label: host || 'Enlace', defaultTitle: host || 'Enlace' }
}

/** Compara URLs ignorando query, hash y barra final (para detectar duplicados). */
export function sameLink(a: string, b: string): boolean {
  const norm = (u: string) => {
    try {
      const x = new URL(u.trim())
      return `${x.hostname.replace(/^www\./, '')}${x.pathname.replace(/\/+$/, '')}`.toLowerCase()
    } catch {
      return u.trim().toLowerCase()
    }
  }
  return Boolean(a && b) && norm(a) === norm(b)
}
