import { defineStore } from 'pinia'

export type SyncStatus = 'offline' | 'online' | 'syncing' | 'error'

const PAUSE_KEY = 'norte.syncPaused'

function readPaused(): boolean {
  try {
    return localStorage.getItem(PAUSE_KEY) === '1'
  } catch {
    return false
  }
}

export function persistPaused(paused: boolean): void {
  try {
    if (paused) localStorage.setItem(PAUSE_KEY, '1')
    else localStorage.removeItem(PAUSE_KEY)
  } catch {
    /* sin storage: la pausa vale solo hasta recargar */
  }
}

export const useSyncStore = defineStore('sync', {
  state: () => ({
    status: (navigator.onLine ? 'online' : 'offline') as SyncStatus,
    /** Pausa manual: frena el sync automático para trabajar solo en local. */
    paused: readPaused(),
    lastError: '',
    lastSyncAt: null as string | null,
    pending: 0,
    conflicts: 0,
  }),
})
