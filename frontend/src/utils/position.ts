export const POSITION_GAP = 1024
export const MIN_GAP = 1e-9

export function positionBefore(first?: number): number {
  return (first ?? 0) - POSITION_GAP
}

export function positionAfter(last?: number): number {
  return (last ?? 0) + POSITION_GAP
}

export function positionBetween(prev?: number, next?: number): number {
  if (prev == null && next == null) return POSITION_GAP
  if (prev == null) return positionBefore(next)
  if (next == null) return positionAfter(prev)
  return (prev + next) / 2
}

export function positionForMove(items: { position: number }[], newIndex: number): number {
  const prev = items[newIndex - 1]?.position
  const next = items[newIndex + 1]?.position
  return positionBetween(prev, next)
}

export function needsRebalance(positions: number[]): boolean {
  if (positions.length < 2) return false
  for (let i = 1; i < positions.length; i++) {
    const gap = positions[i] - positions[i - 1]
    if (!(gap > MIN_GAP) || !Number.isFinite(gap)) return true
  }
  return false
}

export function rebalancePositions<T extends { id: string }>(rows: T[]): { id: string; position: number }[] {
  return rows.map((row, i) => ({ id: row.id, position: (i + 1) * POSITION_GAP }))
}
