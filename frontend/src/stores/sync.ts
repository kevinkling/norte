import { defineStore } from 'pinia'

export type SyncStatus = 'offline' | 'online' | 'syncing' | 'error'

export const useSyncStore = defineStore('sync', {
  state: () => ({
    status: (navigator.onLine ? 'online' : 'offline') as SyncStatus,
    lastError: '',
    lastSyncAt: null as string | null,
    pending: 0,
    conflicts: 0,
  }),
})
