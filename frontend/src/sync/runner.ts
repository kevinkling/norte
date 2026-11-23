import { db } from '../db/norte.db'
import { newId } from '../db/ids'
import { applyRemoteChanges, storeConflicts } from './apply'
import { flushBlobs } from './blobs'
import { postSync, supabaseConfigured } from './client'
import { persistPaused, useSyncStore } from '../stores/sync'
import { notifyDataChanged } from '../app/bus'
import { entityTable } from './map'
import type { EntityType } from '../db/types'

let timer: number | null = null
let running = false

export function scheduleSync(delay = 400): void {
  if (timer) window.clearTimeout(timer)
  timer = window.setTimeout(() => {
    void runSync()
  }, delay)
}

export async function ensureDeviceId(): Promise<string> {
  const row = await db.syncState.get('deviceId')
  if (row && typeof row.value === 'string') return row.value
  const id = newId()
  await db.syncState.put({ key: 'deviceId', value: id })
  return id
}

function apiConfigured(): boolean {
  return supabaseConfigured()
}

export function setSyncPaused(paused: boolean): void {
  const store = useSyncStore()
  store.paused = paused
  persistPaused(paused)
  if (!paused) scheduleSync(0)
}

/**
 * Tira los cambios locales que todavía no se subieron (y los conflictos abiertos)
 * y vuelve a bajar el estado del servidor. Necesita conexión: si falla a mitad
 * de camino, el próximo sync completa la bajada.
 */
export async function discardLocalChanges(): Promise<{ discarded: number }> {
  const store = useSyncStore()
  if (running || store.status === 'syncing') throw new Error('Hay una sincronización en curso. Probá de nuevo en unos segundos.')
  if (!apiConfigured()) throw new Error('Supabase no configurado: no hay de dónde recuperar la versión del servidor.')
  if (!navigator.onLine) throw new Error('Sin conexión: hace falta internet para volver a la versión del servidor.')

  const outbox = await db.outbox.toArray()
  const conflicts = await db.conflicts.filter((c) => !c.resolution).toArray()
  const affected = new Map<string, { type: EntityType; id: string }>()
  for (const o of outbox) affected.set(`${o.entityType}:${o.entityId}`, { type: o.entityType, id: o.entityId })
  for (const c of conflicts) affected.set(`${c.entityType}:${c.entityId}`, { type: c.entityType, id: c.entityId })

  await db.transaction(
    'rw',
    [db.lists, db.categories, db.tags, db.itemTags, db.items, db.purchases, db.tasks, db.inspirations, db.monthlyBudgets, db.attachments, db.outbox, db.conflicts, db.syncState],
    async () => {
      for (const { type, id } of affected.values()) await db[entityTable[type]].delete(id)
      await db.outbox.clear()
      await db.conflicts.clear()
      await db.syncState.put({ key: 'cursor', value: 0 })
    },
  )
  notifyDataChanged()
  await runSync(true)
  notifyDataChanged()
  return { discarded: affected.size }
}

export async function runSync(force = false): Promise<void> {
  if (running) return
  const store = useSyncStore()
  if (store.paused && !force) {
    store.pending = await db.outbox.count()
    store.conflicts = await db.conflicts.filter((c) => !c.resolution).count()
    return
  }
  if (!apiConfigured()) {
    store.status = 'offline'
    store.lastError = 'Supabase no configurado'
    store.pending = await db.outbox.count()
    store.conflicts = await db.conflicts.filter((c) => !c.resolution).count()
    return
  }
  if (!navigator.onLine) {
    store.status = 'offline'
    store.pending = await db.outbox.count()
    store.conflicts = await db.conflicts.filter((c) => !c.resolution).count()
    return
  }
  running = true
  store.status = 'syncing'
  try {
    const deviceId = await ensureDeviceId()
    let hasMore = true
    while (hasMore) {
      const outbox = await db.outbox.orderBy('clientSeq').toArray()
      const cursorRow = await db.syncState.get('cursor')
      const cursor = typeof cursorRow?.value === 'number' ? cursorRow.value : 0
      const locals = new Map(outbox.map((o) => [o.entityId, o.record ?? {}]))
      const resp = await postSync(
        deviceId,
        cursor,
        outbox.map((o) => ({
          mutation_id: o.mutationId,
          entity_type: o.entityType,
          entity_id: o.entityId,
          operation: o.operation,
          base_revision: o.baseRevision,
          record: o.record,
        })),
      )
      const applied = new Set(resp.applied ?? [])
      // Una mutación en conflicto queda guardada en `conflicts` (con la versión local);
      // si siguiera en el outbox se reenviaría en cada sync y volvería a chocar.
      const conflicted = new Set((resp.conflicts ?? []).map((c) => c.mutation_id))
      await db.transaction('rw', db.outbox, db.syncState, db.conflicts, async () => {
        for (const row of outbox) {
          if ((applied.has(row.mutationId) || conflicted.has(row.mutationId)) && row.localId != null) {
            await db.outbox.delete(row.localId)
          }
        }
        await db.syncState.put({ key: 'cursor', value: resp.next_cursor ?? cursor })
      })
      if (resp.conflicts?.length) await storeConflicts(resp.conflicts, locals)
      if (resp.changes?.length) await applyRemoteChanges(resp.changes)
      await flushBlobs(deviceId)
      hasMore = Boolean(resp.has_more)
    }
    store.status = 'online'
    store.lastError = ''
    store.lastSyncAt = new Date().toISOString()
  } catch (err) {
    store.status = navigator.onLine ? 'error' : 'offline'
    store.lastError = err instanceof Error ? err.message : 'Error de sincronización'
  } finally {
    store.pending = await db.outbox.count()
    store.conflicts = await db.conflicts.filter((c) => !c.resolution).count()
    running = false
  }
}

export function listenConnectivity(): void {
  window.addEventListener('online', () => scheduleSync(0))
  window.addEventListener('offline', () => {
    useSyncStore().status = 'offline'
  })
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') scheduleSync(0)
  })
}
