<template>
  <a class="skip-link" href="#main">Saltar al contenido</a>

  <!-- Sidebar para Desktop / Web -->
  <aside class="sidebar neu" aria-label="Navegación principal">
    <div class="sidebar-brand">
      <div class="mark">
        <svg class="needle" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 3 L15 13 H9 Z" fill="currentColor"/>
          <path d="M12 21 L9 11 H15 Z" fill="currentColor" opacity=".28"/>
        </svg>
        <h1>Norte</h1>
      </div>
      <p class="sub">bitácora personal</p>
    </div>

    <nav class="sidebar-nav" aria-label="Secciones">
      <RouterLink to="/comprar" class="sidebar-item">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
        <span>Para comprar</span>
      </RouterLink>
      <RouterLink to="/bandeja" class="sidebar-item">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>
        <span>Bandeja</span>
        <span v-if="inboxCount" class="count-pill">{{ inboxCount }}</span>
      </RouterLink>

      <span class="section-title">Listas</span>
      <RouterLink v-for="l in lists" :key="l.id" :to="`/l/${l.id}`" class="sidebar-item list-link">
        <span class="emoji" aria-hidden="true">{{ l.emoji || '•' }}</span>
        <span>{{ l.name }}</span>
      </RouterLink>
      <button class="sidebar-item new-list-btn" type="button" @click="pickerOpen = true">+ Nueva lista</button>

      <span class="section-title">Más</span>
      <RouterLink to="/presupuesto" class="sidebar-item">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="8"/><path d="M12 8v8M9.5 10.5c.6-1 4.4-1 5 1s-1.6 2-2.5 2.2"/></svg>
        <span>Presupuesto</span>
      </RouterLink>
      <RouterLink to="/mas" class="sidebar-item" :class="{ 'has-badge': sync.conflicts > 0 }">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="6" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="18" cy="12" r="1.3"/></svg>
        <span>Más opciones</span>
        <span v-if="sync.conflicts > 0" class="badge-dot"></span>
      </RouterLink>
    </nav>

    <div class="sidebar-footer">
      <SyncButton variant="row" />
      <button class="theme-btn" type="button" @click="ui.toggleTheme()" :aria-label="ui.theme === 'light' ? 'Modo oscuro' : 'Modo claro'">
        <svg v-if="ui.theme === 'dark'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
          <circle cx="12" cy="12" r="4"/>
          <path d="M12 3v2M12 19v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M3 12h2M19 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>
        </svg>
        <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
        </svg>
        <span>{{ ui.theme === 'light' ? 'Modo oscuro' : 'Modo claro' }}</span>
      </button>
    </div>
  </aside>

  <!-- Header para Mobile -->
  <header class="top neu">
    <button class="list-switch" type="button" aria-label="Cambiar de lista" @click="pickerOpen = true">
      <svg class="needle" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3 L15 13 H9 Z" fill="currentColor"/>
        <path d="M12 21 L9 11 H15 Z" fill="currentColor" opacity=".28"/>
      </svg>
      <span class="list-name">{{ currentLabel }}</span>
      <svg class="caret" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
    </button>

    <div class="actions">
      <SyncButton />
      <button class="theme-btn" type="button" @click="ui.toggleTheme()" :aria-label="ui.theme === 'light' ? 'Modo oscuro' : 'Modo claro'">
        <svg v-if="ui.theme === 'dark'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
          <circle cx="12" cy="12" r="4"/>
          <path d="M12 3v2M12 19v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M3 12h2M19 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>
        </svg>
        <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
        </svg>
      </button>
    </div>
  </header>

  <main id="main">
    <RouterView />
  </main>

  <!-- Navigation Bar para Mobile -->
  <nav class="bottom neu" aria-label="Secciones">
    <RouterLink :to="`/l/${ui.currentListId}`" class="nav-item" :class="{ 'router-link-active': route.path.startsWith('/l/') }">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 8h16M4 12h16M4 16h10"/></svg>
      <span>Lista</span>
    </RouterLink>
    <RouterLink to="/comprar" class="nav-item">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
      <span>Comprar</span>
    </RouterLink>
    <RouterLink to="/bandeja" class="nav-item">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>
      <span>Bandeja</span>
      <span v-if="inboxCount" class="badge-num">{{ inboxCount }}</span>
    </RouterLink>
    <RouterLink to="/presupuesto" class="nav-item">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="8"/><path d="M12 8v8M9.5 10.5c.6-1 4.4-1 5 1s-1.6 2-2.5 2.2"/></svg>
      <span>$</span>
    </RouterLink>
    <RouterLink to="/mas" class="nav-item" :class="{ 'has-badge': sync.conflicts > 0 }">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="6" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="18" cy="12" r="1.3"/></svg>
      <span>Más</span>
      <span v-if="sync.conflicts > 0" class="badge-dot"></span>
    </RouterLink>
  </nav>

  <ListPicker :open="pickerOpen" :current="route.path.startsWith('/l/') ? ui.currentListId : undefined" @close="pickerOpen = false" @pick="goToList" />
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import SyncButton from './SyncButton.vue'
import ListPicker from '../ListPicker.vue'
import { useSyncStore } from '../../stores/sync'
import { useUiStore } from '../../stores/ui'
import { listLabel } from '../../features/lists/actions'
import { useNorteData } from '../../features/lists/useData'

const sync = useSyncStore()
const ui = useUiStore()
const route = useRoute()
const router = useRouter()
const { lists, items } = useNorteData()
const pickerOpen = ref(false)

const inboxCount = computed(() => items.value.filter((i) => i.listId === null && i.status !== 'comprado').length)

const titles: Record<string, string> = {
  '/comprar': 'Para comprar',
  '/bandeja': 'Bandeja',
  '/presupuesto': 'Presupuesto',
  '/nuevo': 'Guardar link',
}

const currentLabel = computed(() => {
  if (titles[route.path]) return titles[route.path]
  const current = lists.value.find((l) => l.id === ui.currentListId)
  if (route.path.startsWith('/l/') && current) return listLabel(current)
  return 'Norte'
})

function goToList(id: string | null) {
  pickerOpen.value = false
  router.push(id ? `/l/${id}` : '/bandeja')
}
</script>

<style scoped>
.sidebar {
  display: none;
}

.top, .bottom {
  --shell-gap: 12px;
  --shell-bar: 64px;
  --safe-top: env(safe-area-inset-top, 0px);
  --safe-bottom: env(safe-area-inset-bottom, 0px);
  --safe-left: env(safe-area-inset-left, 0px);
  --safe-right: env(safe-area-inset-right, 0px);
  position: fixed;
  z-index: 100;
  left: calc(var(--shell-gap) + var(--safe-left));
  right: calc(var(--shell-gap) + var(--safe-right));
}
.top {
  top: calc(var(--shell-gap) + var(--safe-top));
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  min-height: var(--shell-bar);
  height: auto;
  box-sizing: border-box;
}
.bottom {
  bottom: calc(var(--shell-gap) + var(--safe-bottom));
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 4px;
  padding: 6px;
  border-radius: 22px;
  min-height: var(--shell-bar);
  height: auto;
  box-sizing: border-box;
}
.brand {
  display: grid;
  gap: 2px;
}
.mark {
  display: flex;
  align-items: center;
  gap: 8px;
}
.needle {
  width: 18px;
  height: 18px;
  color: var(--accent);
}
h1 {
  margin: 0;
  font-family: var(--display);
  font-size: 1.6rem;
  font-weight: 600;
  font-style: italic;
  line-height: 1;
  letter-spacing: -0.02em;
}
.sub {
  margin: 0;
  color: var(--muted);
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.02em;
}
.actions {
  display: flex;
  gap: 10px;
  align-items: center;
}
.theme-btn {
  width: 40px;
  height: 40px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--surface);
  color: var(--text);
  display: grid;
  place-items: center;
  box-shadow: var(--shadow);
  transition: background 0.15s ease;
}
.theme-btn:active {
  background: var(--inset);
}
.seg {
  display: flex;
  padding: 3px;
  border-radius: 999px;
  background: var(--inset);
  border: 1px solid var(--border);
}
.seg button {
  border: 0;
  background: transparent;
  min-height: 32px;
  padding: 0 12px;
  border-radius: 999px;
  color: var(--muted);
  font-weight: 700;
  font-size: 0.85rem;
  transition: background 0.15s ease, color 0.15s ease;
}
.seg button.is-on {
  background: var(--text);
  color: var(--surface);
}

main {
  /* Reserva espacio para barras fijas + safe areas (notch / home indicator) */
  --shell-gap: 12px;
  --shell-bar: 64px;
  --safe-top: env(safe-area-inset-top, 0px);
  --safe-bottom: env(safe-area-inset-bottom, 0px);
  --safe-left: env(safe-area-inset-left, 0px);
  --safe-right: env(safe-area-inset-right, 0px);
  --main-pad-top: calc(var(--shell-gap) + var(--safe-top) + var(--shell-bar) + var(--shell-gap));
  --main-pad-bottom: calc(var(--shell-gap) + var(--safe-bottom) + var(--shell-bar) + 20px);
  padding: var(--main-pad-top) calc(12px + var(--safe-right)) var(--main-pad-bottom) calc(12px + var(--safe-left));
  max-width: 800px;
  margin: 0 auto;
  width: 100%;
  min-height: 100dvh;
  box-sizing: border-box;
}

.nav-item {
  color: var(--muted);
  text-decoration: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  border-radius: 14px;
  transition: color 0.15s ease, background 0.15s ease;
  position: relative;
}
.nav-item svg {
  width: 22px;
  height: 22px;
}
.nav-item.router-link-active {
  color: var(--accent);
  background: var(--inset);
}
.has-badge {
  position: relative;
}
.badge-dot {
  position: absolute;
  top: 8px;
  right: 24%;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--danger);
}

/* Responsive para Desktop / Web */
@media (min-width: 900px) {
  .top, .bottom {
    display: none !important;
  }
  
  .sidebar {
    display: flex;
    flex-direction: column;
    position: fixed;
    left: 16px;
    top: 16px;
    bottom: 16px;
    width: 260px;
    padding: 24px;
    z-index: 100;
    gap: 24px;
  }
  
  .sidebar-brand {
    display: grid;
    gap: 4px;
  }
  
  .sidebar-section {
    display: grid;
    gap: 8px;
  }
  
  .section-title {
    font-size: 0.75rem;
    font-weight: 700;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  
  .sidebar .seg {
    width: 100%;
  }
  
  .sidebar .seg button {
    flex: 1;
    text-align: center;
    min-height: 36px;
  }
  
  .sidebar-nav {
    display: flex;
    flex-direction: column;
    gap: 6px;
    flex: 1;
  }
  
  .sidebar-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    color: var(--muted);
    text-decoration: none;
    font-weight: 700;
    font-size: 0.95rem;
    border-radius: 12px;
    transition: color 0.15s ease, background 0.15s ease;
    position: relative;
  }
  
  .sidebar-item svg {
    width: 20px;
    height: 20px;
  }
  
  .sidebar-item.router-link-active {
    color: var(--accent);
    background: var(--inset);
  }
  
  .sidebar-item:active {
    background: var(--inset);
  }
  
  .sidebar-footer {
    display: flex;
    flex-direction: column;
    gap: 12px;
    border-top: 1px solid var(--border);
    padding-top: 16px;
  }
  
  .sidebar .theme-btn {
    width: 100%;
    height: 44px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: flex-start;
    padding: 0 16px;
    gap: 12px;
    font-weight: 700;
    font-size: 0.9rem;
  }
  
  .sidebar-item.has-badge .badge-dot {
    top: 18px;
    right: 16px;
  }
  
  main {
    padding: 40px 40px 40px 300px; /* Desplazamos el contenido para dar espacio a la sidebar */
    max-width: 1300px; /* Más espacio en pantallas grandes */
    margin: 0;
  }
}
.list-switch {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  min-height: 44px;
  border: 0;
  background: transparent;
  color: var(--text);
  padding: 0;
  font: inherit;
}
.list-name {
  font-family: var(--display);
  font-size: 1.35rem;
  font-weight: 600;
  font-style: italic;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.caret { flex: none; color: var(--muted); }
.needle { flex: none; }
.badge-num {
  position: absolute;
  top: 4px;
  right: 18%;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 999px;
  background: var(--accent);
  color: var(--accent-on);
  font-size: 0.68rem;
  display: grid;
  place-items: center;
}
.count-pill {
  margin-left: auto;
  min-width: 22px;
  height: 22px;
  padding: 0 6px;
  border-radius: 999px;
  background: var(--accent);
  color: var(--accent-on);
  font-size: 0.75rem;
  display: grid;
  place-items: center;
}
.emoji { width: 20px; text-align: center; }
.new-list-btn {
  border: 1px dashed var(--border);
  background: transparent;
  font: inherit;
  cursor: pointer;
}

@media (min-width: 900px) {
  .sidebar-nav { overflow-y: auto; }
  .sidebar-nav .section-title { margin-top: 12px; padding-left: 16px; }
  .sidebar-item.list-link, .new-list-btn { padding-top: 9px; padding-bottom: 9px; }
}
</style>
