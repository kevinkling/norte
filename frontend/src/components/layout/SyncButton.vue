<template>
  <button
    class="sync-btn"
    :class="[variant, tone]"
    type="button"
    :disabled="sync.status === 'syncing'"
    :aria-busy="sync.status === 'syncing'"
    :aria-label="ariaLabel"
    :title="ariaLabel"
    @click="onClick"
  >
    <span class="icon-wrap" aria-hidden="true">
      <svg v-if="sync.status === 'syncing'" class="spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
        <path d="M21 12a9 9 0 1 1-2.6-6.3"/>
        <path d="M21 4v6h-6"/>
      </svg>
      <svg v-else-if="sync.status === 'error'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
        <path d="M12 9v4M12 17h.01"/>
        <circle cx="12" cy="12" r="9"/>
      </svg>
      <svg v-else-if="sync.status === 'offline'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
        <path d="M6.5 16.5A5 5 0 0 1 8 7a6 6 0 0 1 11.3 2.1A4.5 4.5 0 0 1 19 18"/>
        <path d="M4 4l16 16"/>
      </svg>
      <svg v-else-if="sync.pending > 0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
        <path d="M6.5 16.5A5 5 0 0 1 8 7a6 6 0 0 1 11.3 2.1A4.5 4.5 0 0 1 19 18H7"/>
        <path d="M12 12v6M9.5 14.5 12 12l2.5 2.5"/>
      </svg>
      <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
        <path d="M6.5 16.5A5 5 0 0 1 8 7a6 6 0 0 1 11.3 2.1A4.5 4.5 0 0 1 19 18H7"/>
        <path d="M9 13.5 11 15.5 15 11.5"/>
      </svg>
      <span v-if="sync.conflicts > 0 || (sync.pending > 0 && sync.status !== 'syncing')" class="dot"></span>
    </span>
    <span v-if="variant === 'row'" class="label">{{ label }}</span>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useSyncStore } from '../../stores/sync'
import { runSync } from '../../sync/runner'

withDefaults(defineProps<{ variant?: 'icon' | 'row' }>(), { variant: 'icon' })

const sync = useSyncStore()

const tone = computed(() => {
  if (sync.status === 'syncing') return 'is-syncing'
  if (sync.status === 'error') return 'is-error'
  if (sync.status === 'offline') return 'is-offline'
  if (sync.pending > 0) return 'is-pending'
  return 'is-ok'
})

const label = computed(() => {
  if (sync.status === 'syncing') return 'Sincronizando…'
  if (sync.status === 'error') return 'Error de sync'
  if (sync.status === 'offline') return 'Sin conexión'
  if (sync.pending > 0) return `${sync.pending} pendientes`
  return 'Sincronizado'
})

const ariaLabel = computed(() => {
  const action = sync.status === 'syncing' ? 'Sincronizando' : 'Sincronizar ahora'
  return `${action}. ${label.value}`
})

function onClick() {
  void runSync()
}
</script>

<style scoped>
.sync-btn {
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text);
  box-shadow: var(--shadow);
  cursor: pointer;
  font: inherit;
}
.sync-btn:disabled {
  cursor: progress;
}
.sync-btn.icon {
  width: 40px;
  height: 40px;
  border-radius: 999px;
  display: grid;
  place-items: center;
}
.sync-btn.row {
  width: 100%;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  padding: 0 16px;
  gap: 12px;
  font-weight: 700;
  font-size: 0.9rem;
  color: var(--text);
}
.icon-wrap {
  position: relative;
  width: 20px;
  height: 20px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}
.icon-wrap svg {
  width: 20px;
  height: 20px;
}
.is-ok {
  color: var(--ok);
}
.is-pending {
  color: var(--accent);
}
.is-syncing {
  color: var(--accent);
}
.is-error {
  color: var(--danger);
}
.is-offline {
  color: var(--muted);
}
.dot {
  position: absolute;
  top: -2px;
  right: -2px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--danger);
  box-shadow: 0 0 0 2px var(--surface);
}
.is-pending .dot {
  background: var(--accent);
}
.spin {
  animation: spin 0.9s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
