export function pesos(minor: number | null | undefined, currency = 'ARS'): string {
  if (minor == null) return '—'
  const value = minor / 100
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value)
}

export function parsePesos(input: string): number {
  const n = Number(String(input).replace(/[^\d.,-]/g, '').replace(',', '.'))
  if (!Number.isFinite(n)) return 0
  return Math.round(n * 100)
}
