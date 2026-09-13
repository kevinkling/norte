import { describe, expect, it } from 'vitest'
import { needsRebalance, positionBetween, positionForMove, rebalancePositions } from './position'

describe('position', () => {
  it('inserts between neighbors without touching the rest', () => {
    const pos = positionBetween(1024, 2048)
    expect(pos).toBe(1536)
  })

  it('computes drop position from list', () => {
    const items = [{ position: 1024 }, { position: 2048 }, { position: 3072 }]
    expect(positionForMove(items, 1)).toBe(2048)
  })

  it('rebalances when the gap collapses', () => {
    expect(needsRebalance([1, 1 + 1e-12])).toBe(true)
    const next = rebalancePositions([{ id: 'a' }, { id: 'b' }])
    expect(next[0].position).toBe(1024)
    expect(next[1].position).toBe(2048)
  })
})
