import { db } from './norte.db'
import { newId, nowIso } from './ids'
import { toSnake } from '../sync/map'
import type { DomainTableName, EntityType, OutboxEntry } from './types'
import { notifyDataChanged } from '../app/bus'
import { scheduleSync } from '../sync/runner'

export async function mutateDomain(opts: {
  entityType: EntityType
  entityId: string
  operation: 'upsert' | 'delete'
  table: DomainTableName
  record: Record<string, unknown>
}): Promise<void> {
  const now = nowIso()
  await db.transaction('rw', db[opts.table], db.outbox, async () => {
    const existing = await db[opts.table].get(opts.entityId)
    const localRevision = (existing as { revision?: number } | undefined)?.revision ?? 0
    // Revisión 0 = el servidor nunca confirmó este registro. Eliminarlo es una operación
    // puramente local: se borra la fila y se descartan sus cambios pendientes. Mandar un
    // "delete" de algo que el servidor no tiene hace que intente insertar una fila vacía
    // y falle todo el lote de sincronización.
    if (opts.operation === 'delete' && localRevision === 0) {
      await db[opts.table].delete(opts.entityId)
      await db.outbox.where('entityId').equals(opts.entityId).delete()
      return
    }
    // Cada mutación pendiente de la misma entidad sube la revisión del servidor en 1
    // al aplicarse, así que la siguiente debe partir de esa revisión esperada.
    // Sin esto, dos ediciones seguidas antes de sincronizar dan base_revision_mismatch.
    const pendingSame = await db.outbox.where('entityId').equals(opts.entityId).count()
    const baseRevision = localRevision + pendingSame
    const next = {
      ...existing,
      ...opts.record,
      id: opts.entityId,
      updatedAt: now,
      createdAt: (existing as { createdAt?: string } | undefined)?.createdAt ?? (opts.record.createdAt as string) ?? now,
      revision: localRevision,
      deletedAt: opts.operation === 'delete' ? now : null,
    }
    await db[opts.table].put(next as never)
    const last = await db.outbox.orderBy('clientSeq').last()
    const entry: OutboxEntry = {
      mutationId: newId(),
      entityType: opts.entityType,
      entityId: opts.entityId,
      operation: opts.operation,
      baseRevision,
      record: opts.operation === 'delete' ? null : toSnake(next as Record<string, unknown>),
      clientSeq: (last?.clientSeq ?? 0) + 1,
      status: 'pending',
      createdAt: now,
    }
    await db.outbox.add(entry)
  })
  notifyDataChanged()
  scheduleSync()
}
