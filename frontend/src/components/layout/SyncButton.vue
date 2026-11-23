<template>
  <!-- En pausa (barra lateral): dos acciones en lugar del botón único. -->
  <div v-if="variant === 'row' && sync.paused" class="paused-actions">
    <button
      class="sync-btn row"
      type="button"
      :disabled="sync.status === 'syncing' || discarding"
      title="Reanuda la sincronización y sube los cambios pendientes"
      @click="resume"
    >
      <span class="icon-wrap" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
          <circle cx="12" cy="12" r="9"/>
          <path d="M10 8.5v7l6-3.5z"/>
        </svg>
      </span>
      <span class="label">{{ sync.status === 'syncing' ? 'Sincronizando…' : 'Reanudar y sincronizar' }}</span>
    </button>
    <button
      class="sync-btn row discard"
      type="button"
      :disabled="sync.status === 'syncing' || discarding || sync.pending + sync.conflicts === 0"
      title="Tira los cambios locales sin subir. La sincronización sigue en pausa."
      @click="discard"
    >
      <span class="icon-wrap" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
          <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>
        </svg>
      </span>
      <span class="label">{{ discarding ? 'Descartando…' : sync.pending + sync.conflicts > 0 ? `Descartar cambios (${sync.pending + sync.conflicts})` : 'Descartar cambios' }}</span>
    </button>
    <p v-if="discardError" class="discard-error" role="alert">{{ discardError }}</p>
  </div>
  <button
    v-else
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
      <svg v-else-if="sync.paused" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
        <circle cx="12" cy="12" r="9"/>
        <path d="M10 9v6M14 9v6"/>
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
import { askConfirm } from '../../app/confirm'
import { computed, ref } from 'vue'
import { useSyncStore } from '../../stores/sync'
import { discardLocalChanges, runSync, setSyncPaused } from '../../sync/runner'

withDefaults(defineProps<{ variant?: 'icon' | 'row' }>(), { variant: 'icon' })

const sync = useSyncStore()

const tone = computed(() => {
  if (sync.status === 'syncing') return 'is-syncing'
  if (sync.paused) return 'is-offline'
  if (sync.status === 'error') return 'is-error'
  if (sync.status === 'offline') return 'is-offline'
  if (sync.pending > 0) return 'is-pending'
  return 'is-ok'
})

const label = computed(() => {
  if (sync.status === 'syncing') return 'Sincronizando…'
  if (sync.paused) return sync.pending > 0 ? `En pausa · ${sync.pending} sin subir` : 'En pausa'
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
  void runSync(true)
}

const discarding = ref(false)
const discardError = ref('')

function resume() {
  setSyncPaused(false) // quita la pausa y sincroniza enseguida
}

async function discard() {
  const n = sync.pending + sync.conflicts
  if (!await askConfirm(`¿Descartar ${n} cambio(s) local(es) sin subir? Se vuelve a la versión del servidor y esto no se puede deshacer. La sincronización sigue en pausa.`, { confirmLabel: 'Descartar' })) return
  discarding.value = true
  discardError.value = ''
  try {
    await discardLocalChanges() // no toca la pausa
  } catch (err) {
    discardError.value = err instanceof Error ? err.message : 'No se pudieron descartar los cambios.'
  } finally {
    discarding.value = false
  }
}
</script>

<style scoped>
/* Variante ícono (barra superior): usa .icon-btn; acá solo el color por estado. */
.sync-btn {
  border: 0;
  background: transparent;
  color: var(--text);
  font: inherit;
  cursor: pointer;
  transition: background var(--ease);
}
.sync-btn:disabled { cursor: progress; opacity: 1; }
.sync-btn.icon {
  width: var(--h-icon);
  height: var(--h-icon);
  border-radius: var(--r-pill);
  display: grid;
  place-items: center;
}
@media (hover: hover) { .sync-btn:hover { background: var(--inset); } }
/* Variante fila (barra lateral) */
.sync-btn.row {
  width: 100%;
  height: var(--h-icon);
  border-radius: var(--r-sm);
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  padding: 0 var(--sp-2);
  font-size: var(--fs-sm);
  font-weight: 500;
  text-align: left;
}
.sync-btn.row .label { color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.paused-actions { display: grid; gap: 2px; }
.sync-btn.discard { color: var(--danger); }
.sync-btn.discard .label { color: var(--danger); }
.sync-btn.discard:disabled { color: var(--muted); cursor: not-allowed; opacity: 0.6; }
.sync-btn.discard:disabled .label { color: var(--muted); }
.discard-error { margin: 0; padding: 0 var(--sp-2); font-size: var(--fs-xs); color: var(--danger); }
.icon-wrap {
  position: relative;
  width: 20px;
  height: 20px;
  display: grid;
  place-items: center;
  flex: none;
}
.icon-wrap svg { width: 20px; height: 20px; }
.row .icon-wrap, .row .icon-wrap svg { width: 18px; height: 18px; }
.is-ok { color: var(--ok); }
.is-pending, .is-syncing { color: var(--accent); }
.is-error { color: var(--danger); }
.is-offline { color: var(--muted); }
.dot {
  position: absolute;
  top: -2px;
  right: -3px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--danger);
  box-shadow: 0 0 0 2px var(--bg);
}
.is-pending .dot { background: var(--accent); }
.row .dot { box-shadow: 0 0 0 2px var(--surface); }
.spin { animation: spin 0.9s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
