<template>
  <section class="more-view">
    <header class="head">
      <h2>Más opciones</h2>
    </header>

    <div class="row-list neu">
      <RouterLink to="/compras" class="row-link">
        <div class="row-content">
          <span class="row-title">Historial de compras</span>
          <span class="row-desc">Registro de gastos realizados</span>
        </div>
        <svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 5l7 7-7 7"/></svg>
      </RouterLink>

      <RouterLink to="/organizar" class="row-link">
        <div class="row-content">
          <span class="row-title">Categorías y etiquetas</span>
          <span class="row-desc">Organizar clasificaciones</span>
        </div>
        <svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 5l7 7-7 7"/></svg>
      </RouterLink>

      <RouterLink to="/conflictos" class="row-link">
        <div class="row-content">
          <span class="row-title">Conflictos de sync</span>
          <span class="row-desc" :class="{ 'warn': sync.conflicts > 0 }">
            {{ sync.conflicts > 0 ? `${sync.conflicts} pendientes` : 'Sin conflictos' }}
          </span>
        </div>
        <span v-if="sync.conflicts > 0" class="badge danger">{{ sync.conflicts }}</span>
        <svg v-else class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 5l7 7-7 7"/></svg>
      </RouterLink>
    </div>

    <div class="sync-card neu">
      <h3>Estado de sincronización</h3>
      <div class="sync-status">
        <span class="dot" :data-status="sync.status" aria-hidden="true"></span>
        <span class="status-text">{{ statusLabel }}</span>
      </div>
      <p v-if="sync.pending > 0" class="pending-text">{{ sync.pending }} cambios pendientes de subir</p>
      <p v-if="sync.lastSyncAt" class="sync-time">Última sincronización: {{ formatTime(sync.lastSyncAt) }}</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useSyncStore } from '../../stores/sync'

const sync = useSyncStore()

const statusLabel = computed(() => {
  if (sync.status === 'syncing') return 'Sincronizando...'
  if (sync.status === 'offline') return 'Sin conexión (trabajando en local)'
  if (sync.status === 'error') return `Error: ${sync.lastError}`
  return 'Sincronizado y al día'
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
.more-view {
  display: grid;
  gap: 20px;
  max-width: 600px;
  margin: 0 auto;
}
@media (min-width: 768px) {
  .more-view {
    grid-template-columns: 1.2fr 1fr;
    max-width: 900px;
    align-items: start;
    gap: 24px;
  }
  .head {
    grid-column: 1 / -1;
  }
}
.head h2 {
  font-family: var(--display);
  font-size: 1.8rem;
  font-weight: 600;
  margin: 0;
}
.row-list {
  display: grid;
  background: var(--surface);
  border-radius: var(--radius);
  overflow: hidden;
}
.row-link {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  text-decoration: none;
  color: var(--text);
  border-bottom: 1px solid var(--border);
  min-height: 64px;
  transition: background 0.15s ease;
}
.row-link:last-child {
  border-bottom: 0;
}
.row-link:active {
  background: var(--inset);
}
.row-content {
  display: grid;
  gap: 4px;
}
.row-title {
  font-weight: 600;
  font-size: 1.05rem;
}
.row-desc {
  font-size: 0.85rem;
  color: var(--muted);
}
.chevron {
  width: 20px;
  height: 20px;
  color: var(--muted);
}
.badge {
  padding: 4px 8px;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 700;
}
.badge.danger {
  background: var(--danger);
  color: var(--accent-on);
}
.warn {
  color: var(--danger) !important;
  font-weight: 600;
}

.sync-card {
  padding: 18px;
  background: var(--surface);
  border-radius: var(--radius);
  display: grid;
  gap: 12px;
}
.sync-card h3 {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 600;
}
.sync-status {
  display: flex;
  align-items: center;
  gap: 10px;
}
.dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--ok);
}
.dot[data-status='offline'] { background: var(--muted); }
.dot[data-status='syncing'] { background: var(--accent); }
.dot[data-status='error'] { background: var(--danger); }

.status-text {
  font-weight: 600;
}
.pending-text, .sync-time {
  margin: 0;
  font-size: 0.9rem;
  color: var(--muted);
}
</style>
