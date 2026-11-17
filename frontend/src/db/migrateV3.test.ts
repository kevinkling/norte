import { describe, expect, it } from 'vitest'
import { migrateCategoryOrTagV3, migrateInspirationV3, migrateItemV3, migrateTaskV3 } from './migrateV3'
import { LIST_AUTO_ID, LIST_CASA_ID } from './seed'

describe('migración local v3 (listas)', () => {
  it('pasa los ítems de área a lista y simplifica estados', () => {
    const a: Record<string, unknown> = { area: 'casa', status: 'idea', orderScope: 'items:casa:idea' }
    migrateItemV3(a)
    expect(a).toMatchObject({ listId: LIST_CASA_ID, status: 'deseado', orderScope: `items:${LIST_CASA_ID}:deseado` })

    const b: Record<string, unknown> = { area: 'auto', status: 'comprado' }
    migrateItemV3(b)
    expect(b).toMatchObject({ listId: LIST_AUTO_ID, status: 'comprado', orderScope: `items:${LIST_AUTO_ID}:comprado` })
  })

  it('respeta un listId ya cargado', () => {
    const a: Record<string, unknown> = { area: 'casa', listId: 'otra', status: 'planificado' }
    migrateItemV3(a)
    expect(a.listId).toBe('otra')
    expect(a.status).toBe('deseado')
  })

  it('migra tareas e inspiraciones', () => {
    const t: Record<string, unknown> = { area: 'auto', status: 'pendiente' }
    migrateTaskV3(t)
    expect(t).toMatchObject({ listId: LIST_AUTO_ID, orderScope: `tasks:${LIST_AUTO_ID}:pendiente` })

    const linked: Record<string, unknown> = { area: 'casa', itemId: 'x' }
    migrateInspirationV3(linked)
    expect(linked.orderScope).toBe(`items:${LIST_CASA_ID}:links`)

    const loose: Record<string, unknown> = { area: 'casa', itemId: null }
    migrateInspirationV3(loose)
    expect(loose.orderScope).toBe(`inspirations:${LIST_CASA_ID}`)
  })

  it('vuelve globales categorías y etiquetas', () => {
    const c: Record<string, unknown> = { area: 'casa' }
    migrateCategoryOrTagV3(c)
    expect(c.area).toBe('both')
  })
})
