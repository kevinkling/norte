<template>
  <section class="page">
    <div class="group">
      <RouterLink v-for="l in links" :key="l.to" :to="l.to" class="list-row">
        <span class="row-icon"><AppIcon :name="l.icon" :size="18" /></span>
        <span class="row-main">
          <span class="row-title">{{ l.title }}</span>
          <span class="row-meta">{{ l.desc }}</span>
        </span>
        <AppIcon class="row-chevron" name="chevron-right" :size="16" />
      </RouterLink>
    </div>

    <div class="section">
      <h2 class="sec-h">Sincronización</h2>
      <div class="group">
        <div class="list-row">
          <span class="row-icon" :data-status="sync.paused ? 'paused' : sync.status"><AppIcon :name="statusIcon" :size="18" /></span>
          <span class="row-main">
            <span class="row-title">{{ statusLabel }}</span>
            <span class="row-meta">
              <span v-if="sync.pending > 0">{{ sync.pending }} {{ sync.pending === 1 ? 'cambio pendiente' : 'cambios pendientes' }} de subir</span>
              <span v-else-if="sync.lastSyncAt">Última: {{ formatTime(sync.lastSyncAt) }}</span>
              <span v-if="sync.paused">Los cambios quedan solo en este dispositivo</span>
            </span>
          </span>
          <button class="btn btn-sm" type="button" :disabled="sync.status === 'syncing'" @click="onSync">
            {{ sync.status === 'syncing' ? 'Sincronizando…' : 'Sincronizar' }}
          </button>
        </div>
        <button class="list-row" type="button" @click="setSyncPaused(!sync.paused)">
          <span class="row-icon"><AppIcon :name="sync.paused ? 'play' : 'pause'" :size="18" /></span>
          <span class="row-main row-title">{{ sync.paused ? 'Reanudar sincronización' : 'Pausar sincronización' }}</span>
        </button>
        <RouterLink to="/conflictos" class="list-row">
          <span class="row-icon"><AppIcon name="alert" :size="18" /></span>
          <span class="row-main">
            <span class="row-title">Conflictos</span>
            <span class="row-meta" :class="{ warn: sync.conflicts > 0 }">{{ sync.conflicts > 0 ? `${sync.conflicts} para resolver` : 'Ninguno' }}</span>
          </span>
          <span v-if="sync.conflicts > 0" class="badge is-danger">{{ sync.conflicts }}</span>
          <AppIcon class="row-chevron" name="chevron-right" :size="16" />
        </RouterLink>
        <button
          v-if="sync.pending > 0 || sync.conflicts > 0"
          class="list-row is-danger"
          type="button"
          :disabled="sync.status === 'syncing' || discarding"
          @click="onDiscard"
        >
          <span class="row-icon"><AppIcon name="trash" :size="18" /></span>
          <span class="row-main row-title">{{ discarding ? 'Descartando…' : 'Descartar cambios locales' }}</span>
        </button>
      </div>
      <p v-if="discardError" class="hint warn">{{ discardError }}</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { askConfirm } from '../../app/confirm'
import { computed, ref } from 'vue'
import AppIcon, { type IconName } from '../../components/ui/AppIcon.vue'
import { useSyncStore } from '../../stores/sync'
import { discardLocalChanges, runSync, setSyncPaused } from '../../sync/runner'

const sync = useSyncStore()
const discarding = ref(false)
const discardError = ref('')

function onSync() {
  void runSync(true)
}

async function onDiscard() {
  const n = sync.pending + sync.conflicts
  if (!await askConfirm(`¿Descartar ${n} cambio(s) local(es) sin subir? Se vuelve a la versión del servidor y esto no se puede deshacer.`, { confirmLabel: 'Descartar' })) return
  discarding.value = true
  discardError.value = ''
  try {
    await discardLocalChanges()
  } catch (err) {
    discardError.value = err instanceof Error ? err.message : 'No se pudieron descartar los cambios.'
  } finally {
    discarding.value = false
  }
}

const links: { to: string; icon: IconName; title: string; desc: string }[] = [
  { to: '/tareas', icon: 'check-square', title: 'Todas las tareas', desc: 'Lo pendiente de todas las listas, por fecha' },
  { to: '/inspiracion', icon: 'bulb', title: 'Ideas e inspiración', desc: 'Links sueltos que no son para comprar' },
  { to: '/compras', icon: 'receipt', title: 'Historial de compras', desc: 'Registro de gastos realizados' },
  { to: '/organizar', icon: 'tag', title: 'Categorías y etiquetas', desc: 'Organizar clasificaciones' },
]

const statusIcon = computed<IconName>(() => {
  if (sync.paused) return 'pause'
  if (sync.status === 'syncing') return 'refresh'
  if (sync.status === 'offline') return 'cloud-off'
  if (sync.status === 'error') return 'alert-circle'
  return sync.pending > 0 ? 'cloud-up' : 'cloud-check'
})

const statusLabel = computed(() => {
  if (sync.paused) return 'Sincronización en pausa'
  if (sync.status === 'syncing') return 'Sincronizando…'
  if (sync.status === 'offline') return 'Sin conexión'
  if (sync.status === 'error') return `Error: ${sync.lastError}`
  return 'Sincronizado'
})

function formatTime(iso: string) {
  try {
    const d = new Date(iso)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch {
    return iso
  }
}
</script>

<style scoped>
.row-icon[data-status='online'] { color: var(--ok); }
.row-icon[data-status='syncing'] { color: var(--accent); }
.row-icon[data-status='error'] { color: var(--danger); }
.row-icon[data-status='offline'], .row-icon[data-status='paused'] { color: var(--muted); }
.warn { color: var(--danger); font-weight: 600; }
</style>
