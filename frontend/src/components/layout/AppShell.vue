<template>
  <a class="skip-link" href="#main">Saltar al contenido</a>
  <header class="neu top">
    <div>
      <p class="eyebrow">Organizador personal</p>
      <h1>Norte</h1>
    </div>
    <div class="actions">
      <RouterLink v-if="sync.conflicts" to="/conflictos" class="btn">Conflictos ({{ sync.conflicts }})</RouterLink>
      <span class="status" :title="statusLabel">
        <span class="dot" :data-status="sync.status" aria-hidden="true"></span>
        <span class="sr-only">{{ statusLabel }}</span>
      </span>
      <button class="btn" type="button" @click="ui.toggleTheme()">
        {{ ui.theme === 'light' ? 'Modo oscuro' : 'Modo claro' }}
      </button>
    </div>
  </header>
  <main id="main">
    <RouterView />
  </main>
  <nav class="neu bottom" aria-label="Secciones">
    <RouterLink to="/casa">Casa</RouterLink>
    <RouterLink to="/auto">Auto</RouterLink>
    <RouterLink to="/tareas">Tareas</RouterLink>
    <RouterLink to="/inspiracion">Inspiración</RouterLink>
    <RouterLink to="/presupuesto">Presupuesto</RouterLink>
    <RouterLink to="/compras">Compras</RouterLink>
  </nav>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import { useSyncStore } from '../../stores/sync'
import { useUiStore } from '../../stores/ui'

const sync = useSyncStore()
const ui = useUiStore()
const statusLabel = computed(() => {
  if (sync.conflicts) return `${sync.conflicts} conflictos de sync`
  if (sync.status === 'syncing') return 'Sincronizando'
  if (sync.status === 'offline') return 'Sin conexión, trabajando en local'
  if (sync.status === 'error') return `Error de sync: ${sync.lastError}`
  return sync.pending ? `${sync.pending} cambios pendientes` : 'Sincronizado'
})
</script>
<style scoped>
.top, .bottom {
  position: sticky; z-index: 5;
  margin: 12px;
  padding: 12px 16px;
}
.top { top: 8px; display: flex; justify-content: space-between; gap: 12px; align-items: center; }
.bottom {
  bottom: 8px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
h1 { margin: 0; font-size: 1.6rem; }
.eyebrow { margin: 0; color: var(--muted); font-size: 0.8rem; letter-spacing: 0.04em; text-transform: uppercase; }
.actions { display: flex; gap: 8px; align-items: center; }
main { padding: 8px 12px 110px; }
a { color: var(--text); text-decoration: none; min-height: 44px; display: grid; place-items: center; border-radius: 12px; border: 1px solid transparent; }
a.router-link-active { border-color: var(--accent); font-weight: 700; }
.dot { width: 12px; height: 12px; border-radius: 50%; display: inline-block; background: var(--ok); }
.dot[data-status='offline'] { background: var(--muted); }
.dot[data-status='syncing'] { background: var(--accent); }
.dot[data-status='error'] { background: var(--danger); }
@media (min-width: 800px) {
  .bottom { grid-template-columns: repeat(6, 1fr); }
}
</style>
