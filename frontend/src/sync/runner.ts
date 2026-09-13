import { db } from '../db/norte.db'
import { newId } from '../db/ids'
import { applyRemoteChanges, storeConflicts } from './apply'
import { flushBlobs } from './blobs'
import { postSync } from './client'
import { useSyncStore } from '../stores/sync'

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

export async function runSync(): Promise<void> {
  if (running) return
  const store = useSyncStore()
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
      await db.transaction('rw', db.outbox, db.syncState, db.conflicts, async () => {
        for (const row of outbox) {
          if (applied.has(row.mutationId) && row.localId != null) await db.outbox.delete(row.localId)
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
