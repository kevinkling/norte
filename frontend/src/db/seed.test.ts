import { describe, expect, it } from 'vitest'
import { SEED_CATEGORIES } from './seed'

describe('SEED_CATEGORIES', () => {
  it('uses the same fixed ids as the SQLite seed', () => {
    expect(SEED_CATEGORIES).toHaveLength(13)
    expect(SEED_CATEGORIES.some((c) => c.id.endsWith('000000000010') && c.name === 'Muebles')).toBe(true)
    expect(SEED_CATEGORIES.some((c) => c.area === 'auto' && c.name === 'Repuestos')).toBe(true)
  })
})
