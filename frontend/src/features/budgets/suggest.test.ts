import { describe, expect, it } from 'vitest'
import { suggestCombinations } from './suggest'
import type { Item } from '../../db/types'

function item(partial: Partial<Item> & { id: string; estimatedCostMinor: number }): Item {
  return {
    area: 'casa',
    name: partial.id,
    categoryId: null,
    description: '',
    currency: 'ARS',
    priority: 2,
    targetMonth: '2026-09',
    status: 'deseado',
    referenceUrl: '',
    orderScope: 'items:casa:deseado',
    position: 1024,
    createdAt: '',
    updatedAt: '',
    deletedAt: null,
    revision: 1,
    ...partial,
  }
}

describe('suggestCombinations', () => {
  it('keeps combinations inside the budget', () => {
    const combos = suggestCombinations(
      [
        item({ id: 'a', estimatedCostMinor: 40000, priority: 1 }),
        item({ id: 'b', estimatedCostMinor: 30000, priority: 2 }),
        item({ id: 'c', estimatedCostMinor: 20000, priority: 4 }),
      ],
      50000,
      '2026-09',
    )
    expect(combos.length).toBeGreaterThan(0)
    expect(combos.every((c) => c.totalMinor <= 50000)).toBe(true)
  })
})
