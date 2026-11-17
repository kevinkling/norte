import { listIdForArea } from './seed'
import { inspirationScope, itemScope, taskScope } from './ids'

type Row = Record<string, unknown>

/**
 * Misma transformación que supabase/migrations/20261117000000_lists.sql,
 * aplicada a la copia local. Es determinística: local y servidor quedan iguales.
 */
export function migrateItemV3(row: Row): void {
  const listId = (row.listId as string | null | undefined) ?? listIdForArea(row.area as string)
  row.listId = listId
  if (row.status === 'idea' || row.status === 'planificado') row.status = 'deseado'
  row.orderScope = itemScope(listId, row.status as string)
}

export function migrateTaskV3(row: Row): void {
  const listId = (row.listId as string | null | undefined) ?? listIdForArea(row.area as string)
  row.listId = listId
  row.orderScope = taskScope(listId, row.status as string)
}

export function migrateInspirationV3(row: Row): void {
  const listId = (row.listId as string | null | undefined) ?? listIdForArea(row.area as string)
  row.listId = listId
  row.orderScope = row.itemId ? itemScope(listId, 'links') : inspirationScope(listId)
}

export function migrateCategoryOrTagV3(row: Row): void {
  row.area = 'both'
}
