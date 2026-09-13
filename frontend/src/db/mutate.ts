import { db } from './norte.db'
import { newId, nowIso } from './ids'
import { toSnake } from '../sync/map'
import type { EntityType, OutboxEntry } from './types'
import { notifyDataChanged } from '../app/bus'
import { scheduleSync } from '../sync/runner'

export async function mutateDomain(opts: {
  entityType: EntityType
  entityId: string
  operation: 'upsert' | 'delete'
  table: 'categories' | 'items' | 'purchases' | 'tasks' | 'inspirations' | 'monthlyBudgets' | 'attachments'
  record: Record<string, unknown>
}): Promise<void> {
  const now = nowIso()
  await db.transaction('rw', db[opts.table], db.outbox, async () => {
    const existing = await db[opts.table].get(opts.entityId)
    const baseRevision = (existing as { revision?: number } | undefined)?.revision ?? 0
    const next = {
      ...existing,
      ...opts.record,
      id: opts.entityId,
      updatedAt: now,
      createdAt: (existing as { createdAt?: string } | undefined)?.createdAt ?? (opts.record.createdAt as string) ?? now,
      revision: baseRevision,
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
