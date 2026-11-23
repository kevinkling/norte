<template>
  <a class="skip-link" href="#main">Saltar al contenido</a>

  <!-- Escritorio: barra lateral plana -->
  <aside class="sidebar" aria-label="Navegación principal">
    <div class="brand">
      <svg class="needle" viewBox="6 2 12 20" aria-hidden="true">
        <path d="M12 3 L15 13 H9 Z" fill="currentColor"/>
        <path d="M12 21 L9 11 H15 Z" fill="currentColor" opacity=".28"/>
      </svg>
      <span class="brand-name">Norte</span>
      <button class="icon-btn is-muted" type="button" :aria-label="themeLabel" :title="themeLabel" @click="ui.toggleTheme()">
        <AppIcon :name="ui.theme === 'dark' ? 'sun' : 'moon'" />
      </button>
    </div>

    <nav class="side-nav" aria-label="Secciones">
      <RouterLink to="/comprar" class="side-item">
        <AppIcon name="cart" :size="18" /><span>Para comprar</span>
      </RouterLink>
      <RouterLink to="/bandeja" class="side-item">
        <AppIcon name="inbox" :size="18" /><span>Bandeja</span>
        <span v-if="inboxCount" class="side-count">{{ inboxCount }}</span>
      </RouterLink>

      <span class="side-h">Listas</span>
      <RouterLink v-for="l in lists" :key="l.id" :to="`/l/${l.id}`" class="side-item">
        <span class="emoji" aria-hidden="true">{{ l.emoji || '•' }}</span><span>{{ l.name }}</span>
      </RouterLink>
      <button class="side-item is-muted" type="button" @click="pickerOpen = true">
        <AppIcon name="plus" :size="18" /><span>Nueva lista</span>
      </button>

      <span class="side-h">Más</span>
      <RouterLink to="/presupuesto" class="side-item">
        <AppIcon name="coin" :size="18" /><span>Presupuesto</span>
      </RouterLink>
      <RouterLink to="/mas" class="side-item" :class="{ 'router-link-active': Boolean(route.meta.back) }">
        <AppIcon name="more" :size="18" /><span>Más opciones</span>
        <span v-if="sync.conflicts > 0" class="badge is-danger side-badge">{{ sync.conflicts }}</span>
      </RouterLink>
    </nav>

    <div class="side-foot">
      <SyncButton variant="row" />
    </div>
  </aside>

  <div class="column">
    <!-- Barra superior: título de la pantalla + acciones. Plana, sin caja. -->
    <header class="top">
      <RouterLink v-if="route.meta.back" :to="route.meta.back" class="icon-btn back" aria-label="Volver">
        <AppIcon name="chevron-left" :size="22" />
      </RouterLink>
      <button v-if="isList" class="title title-btn" type="button" aria-label="Cambiar de lista" @click="pickerOpen = true">
        <svg class="needle" viewBox="6 2 12 20" aria-hidden="true">
          <path d="M12 3 L15 13 H9 Z" fill="currentColor"/>
          <path d="M12 21 L9 11 H15 Z" fill="currentColor" opacity=".28"/>
        </svg>
        <span class="title-text">{{ title }}</span>
        <AppIcon class="caret" name="chevron-down" :size="18" />
      </button>
      <h1 v-else class="title"><span class="title-text">{{ title }}</span></h1>

      <!-- Las pantallas ponen sus acciones acá con <Teleport defer to="#page-actions"> -->
      <div id="page-actions" class="page-actions"></div>
      <div class="global-actions">
        <SyncButton />
        <button class="icon-btn" type="button" :aria-label="themeLabel" :title="themeLabel" @click="ui.toggleTheme()">
          <AppIcon :name="ui.theme === 'dark' ? 'sun' : 'moon'" />
        </button>
      </div>
    </header>

    <main id="main">
      <RouterView />
    </main>
  </div>

  <!-- Celular: barra inferior plana -->
  <nav class="bottom" aria-label="Secciones">
    <RouterLink :to="`/l/${ui.currentListId}`" class="tab" :class="{ 'router-link-active': isList }">
      <AppIcon name="list" :size="22" /><span>Lista</span>
    </RouterLink>
    <RouterLink to="/comprar" class="tab">
      <AppIcon name="cart" :size="22" /><span>Comprar</span>
    </RouterLink>
    <RouterLink to="/bandeja" class="tab">
      <AppIcon name="inbox" :size="22" /><span>Bandeja</span>
      <span v-if="inboxCount" class="badge tab-badge">{{ inboxCount }}</span>
    </RouterLink>
    <RouterLink to="/presupuesto" class="tab">
      <AppIcon name="coin" :size="22" /><span>Presupuesto</span>
    </RouterLink>
    <RouterLink to="/mas" class="tab" :class="{ 'router-link-active': Boolean(route.meta.back) }">
      <AppIcon name="more" :size="22" /><span>Más</span>
      <span v-if="sync.conflicts > 0" class="badge-dot tab-dot"></span>
    </RouterLink>
  </nav>

  <ListPicker :open="pickerOpen" :current="isList ? ui.currentListId : undefined" @close="pickerOpen = false" @pick="goToList" />
  <ConfirmDialog />
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import SyncButton from './SyncButton.vue'
import ListPicker from '../ListPicker.vue'
import AppIcon from '../ui/AppIcon.vue'
import ConfirmDialog from '../ui/ConfirmDialog.vue'
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
const isList = computed(() => route.path.startsWith('/l/'))
const themeLabel = computed(() => (ui.theme === 'dark' ? 'Modo claro' : 'Modo oscuro'))

const title = computed(() => {
  if (isList.value) {
    const current = lists.value.find((l) => l.id === route.params.listId)
    return current ? listLabel(current) : 'Lista'
  }
  return route.meta.title ?? 'Norte'
})

function goToList(id: string | null) {
  pickerOpen.value = false
  router.push(id ? `/l/${id}` : '/bandeja')
}
</script>

<style scoped>
.needle { width: 12px; height: 20px; color: var(--accent); flex: none; }

/* ---- Columna principal ---- */
.column {
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
}
.top {
  position: sticky;
  top: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  gap: var(--sp-1);
  padding: calc(var(--sp-2) + env(safe-area-inset-top, 0px)) calc(var(--sp-3) + env(safe-area-inset-right, 0px)) var(--sp-2) calc(var(--sp-4) + env(safe-area-inset-left, 0px));
  min-height: 56px;
  background: var(--bg);
}
.back { margin-left: -10px; }
.title {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  font-family: var(--display);
  font-size: var(--fs-xl);
  font-weight: 600;
  letter-spacing: -0.01em;
  line-height: 1.1;
}
.title-btn {
  border: 0;
  background: none;
  padding: 0;
  color: var(--text);
  text-align: left;
}
.title-text {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.title-btn .caret { color: var(--muted); }
.page-actions, .global-actions { display: flex; align-items: center; gap: 2px; flex: none; }
.page-actions:empty { display: none; }

main {
  flex: 1;
  width: 100%;
  max-width: 720px;
  margin: 0 auto;
  padding: var(--sp-2) calc(var(--sp-4) + env(safe-area-inset-right, 0px)) calc(var(--nav-h) + var(--sp-6) + env(safe-area-inset-bottom, 0px)) calc(var(--sp-4) + env(safe-area-inset-left, 0px));
}

/* ---- Barra inferior (celular) ---- */
.bottom {
  position: fixed;
  z-index: 100;
  left: 0;
  right: 0;
  bottom: 0;
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  height: calc(var(--nav-h) + env(safe-area-inset-bottom, 0px));
  padding: 6px env(safe-area-inset-right, 0px) env(safe-area-inset-bottom, 0px) env(safe-area-inset-left, 0px);
  background: var(--surface);
  border-top: 1px solid var(--border);
}
.tab {
  position: relative;
  display: grid;
  justify-items: center;
  align-content: center;
  gap: 2px;
  color: var(--muted);
  text-decoration: none;
  font-size: 11px;
  font-weight: 600;
  transition: color var(--ease);
}
.tab.router-link-active { color: var(--accent); }
.tab-badge { position: absolute; top: 0; left: calc(50% + 4px); }
.tab-dot { top: 2px; left: calc(50% + 8px); box-shadow: 0 0 0 2px var(--surface); }

/* ---- Barra lateral (escritorio) ---- */
.sidebar { display: none; }

@media (min-width: 900px) {
  .bottom { display: none; }
  .global-actions { display: none; }
  .back { display: none; }
  .title-btn .caret, .title-btn .needle { display: none; }
  .title-btn { pointer-events: none; }

  .sidebar {
    position: fixed;
    inset: 0 auto 0 0;
    z-index: 100;
    width: var(--side-w);
    display: flex;
    flex-direction: column;
    padding: var(--sp-4) var(--sp-3);
    background: var(--surface);
    border-right: 1px solid var(--border);
  }
  .column { margin-left: var(--side-w); }
  .top { padding: var(--sp-6) var(--sp-5) var(--sp-3); max-width: 720px; width: 100%; margin: 0 auto; }
  main { padding: 0 var(--sp-5) var(--sp-6); }

  .brand {
    display: flex;
    align-items: center;
    gap: var(--sp-2);
    padding: 0 0 var(--sp-4) var(--sp-2);
  }
  .brand-name {
    flex: 1;
    font-family: var(--display);
    font-size: var(--fs-lg);
    font-weight: 600;
  }
  .side-nav {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
    overflow-y: auto;
  }
  .side-h {
    padding: var(--sp-4) var(--sp-2) var(--sp-1);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--muted);
  }
  .side-item {
    display: flex;
    align-items: center;
    gap: var(--sp-3);
    height: var(--h-icon);
    padding: 0 var(--sp-2);
    border: 0;
    border-radius: var(--r-sm);
    background: transparent;
    color: var(--text);
    font: inherit;
    font-size: var(--fs-sm);
    font-weight: 500;
    text-decoration: none;
    text-align: left;
    transition: background var(--ease);
  }
  .side-item:hover { background: color-mix(in srgb, var(--inset) 60%, transparent); }
  .side-item.router-link-active { background: var(--inset); font-weight: 600; }
  .side-item.is-muted { color: var(--muted); }
  .side-item .emoji { width: 18px; text-align: center; }
  .side-count { margin-left: auto; font-size: var(--fs-xs); color: var(--muted); font-variant-numeric: tabular-nums; }
  .side-badge { margin-left: auto; }
  .side-foot { padding-top: var(--sp-3); border-top: 1px solid var(--border); }
}
</style>
