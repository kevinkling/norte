export function addInterval(isoDate: string, rule: string): string | null {
  const freq = /FREQ=([A-Z]+)/.exec(rule)?.[1]
  const interval = Number(/INTERVAL=(\d+)/.exec(rule)?.[1] ?? 1)
  if (!freq || !isoDate) return null
  const d = new Date(`${isoDate}T12:00:00Z`)
  if (Number.isNaN(d.getTime())) return null
  if (freq === 'DAILY') d.setUTCDate(d.getUTCDate() + interval)
  else if (freq === 'WEEKLY') d.setUTCDate(d.getUTCDate() + 7 * interval)
  else if (freq === 'MONTHLY') d.setUTCMonth(d.getUTCMonth() + interval)
  else return null
  return d.toISOString().slice(0, 10)
}

export const RECURRENCE_OPTIONS = [
  { value: '', label: 'Sin repetición' },
  { value: 'FREQ=DAILY;INTERVAL=1', label: 'Todos los días' },
  { value: 'FREQ=WEEKLY;INTERVAL=1', label: 'Todas las semanas' },
  { value: 'FREQ=MONTHLY;INTERVAL=1', label: 'Todos los meses' },
]
