import type { Item } from '../../db/types'

export type Combo = {
  items: Item[]
  totalMinor: number
  score: number
  approximate: boolean
}

function scoreItem(item: Item, period: string): number {
  const monthBonus = item.targetMonth === period ? 20 : item.targetMonth && item.targetMonth < period ? 10 : 0
  const order = Number.isFinite(item.position) ? Math.max(0, 100000 - item.position) : 0
  return monthBonus + order / 100
}

export function suggestCombinations(items: Item[], budgetMinor: number, period: string, max = 3): Combo[] {
  const candidates = items
    .filter((i) => !i.deletedAt && (i.status === 'deseado' || i.status === 'planificado') && (i.estimatedCostMinor ?? 0) > 0)
    .filter((i) => !i.targetMonth || i.targetMonth <= period)
    .sort((a, b) => scoreItem(b, period) - scoreItem(a, period))

  if (budgetMinor <= 0 || candidates.length === 0) return []

  if (candidates.length > 18) {
    const greedy: Item[] = []
    let total = 0
    let score = 0
    for (const item of candidates) {
      const cost = item.estimatedCostMinor ?? 0
      if (total + cost <= budgetMinor) {
        greedy.push(item)
        total += cost
        score += scoreItem(item, period)
      }
    }
    return greedy.length ? [{ items: greedy, totalMinor: total, score, approximate: true }] : []
  }

  const best: Combo[] = []
  const n = candidates.length
  const limit = 1 << n
  for (let mask = 1; mask < limit; mask++) {
    const pick: Item[] = []
    let total = 0
    let score = 0
    for (let i = 0; i < n; i++) {
      if (mask & (1 << i)) {
        const item = candidates[i]
        const cost = item.estimatedCostMinor ?? 0
        total += cost
        if (total > budgetMinor) break
        pick.push(item)
        score += scoreItem(item, period)
      }
    }
    if (total > budgetMinor || pick.length === 0) continue
    best.push({ items: pick, totalMinor: total, score, approximate: false })
  }
  best.sort((a, b) => b.score - a.score || a.totalMinor - b.totalMinor)
  const unique: Combo[] = []
  const seen = new Set<string>()
  for (const combo of best) {
    const key = combo.items.map((i) => i.id).sort().join(',')
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(combo)
    if (unique.length >= max) break
  }
  return unique
}
