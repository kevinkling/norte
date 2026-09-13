import { db } from '../db/norte.db'
import { newId, nowIso } from '../db/ids'
import type { Attachment, EntityType } from '../db/types'
import { entityTable, toCamel } from './map'
import { notifyDataChanged } from '../app/bus'

export async function applyRemoteChanges(
  changes: Array<{
    entity_type: string
    entity_id: string
    operation: string
    record: Record<string, unknown>
  }>,
): Promise<void> {
  await db.transaction(
    'rw',
    [
      db.categories,
      db.items,
      db.purchases,
      db.tasks,
      db.inspirations,
      db.monthlyBudgets,
      db.attachments,
      db.conflicts,
    ],
    async () => {
      for (const ch of changes) {
        const tableName = entityTable[ch.entity_type as EntityType]
        if (!tableName) continue
        const table = db[tableName]
        const incoming = toCamel<Record<string, unknown>>(ch.record || { id: ch.entity_id })
        incoming.id = ch.entity_id
        if (tableName === 'attachments') {
          const prev = await db.attachments.get(ch.entity_id)
          if (prev?.data) incoming.data = prev.data
        }
        await table.put(incoming as never)
      }
    },
  )
  notifyDataChanged()
}

export async function storeConflicts(
  conflicts: Array<{
    mutation_id: string
    entity_type: string
    entity_id: string
    reason: string
    server: Record<string, unknown>
  }>,
  locals: Map<string, Record<string, unknown>>,
): Promise<void> {
  for (const c of conflicts) {
    await db.conflicts.put({
      id: c.mutation_id || newId(),
      entityType: c.entity_type as EntityType,
      entityId: c.entity_id,
      detectedAt: nowIso(),
      local: locals.get(c.entity_id) ?? {},
      remote: c.server ?? {},
      reason: c.reason,
      resolution: null,
    })
  }
  notifyDataChanged()
}

export async function pendingBlobs(): Promise<Attachment[]> {
  return db.attachments.filter((a) => !a.deletedAt).toArray()
}
