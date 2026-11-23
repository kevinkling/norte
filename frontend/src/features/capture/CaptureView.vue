<template>
  <section class="capture-view">
    <div class="card neu">
      <p v-if="state === 'saving'" class="status">Guardando…</p>

      <template v-else-if="state === 'nourl'">
        <h2>No llegó ningún link</h2>
        <p class="muted">Abrí esta pantalla desde el Atajo “Guardar en Norte” o pegá el link en la Bandeja.</p>
        <RouterLink class="btn btn-primary wide" to="/bandeja">Ir a la Bandeja</RouterLink>
      </template>

      <template v-else-if="item">
        <h2>{{ duplicate ? 'Ya lo tenías guardado' : 'Guardado ✓' }}</h2>
        <p class="muted where">En {{ listName(item.listId) }}</p>
        <ItemCard :item="item" :photo="photos[item.id]" @open="editOpen = true" @toggle="() => {}" />
        <p class="sync-note" :data-ok="synced">
          {{ synced ? 'Sincronizado: ya lo ves en todos tus dispositivos.' : syncHint }}
        </p>
        <div class="actions">
          <button class="btn btn-primary wide" type="button" @click="pickerOpen = true">Mover a una lista</button>
          <button class="btn wide" type="button" @click="editOpen = true">Agregar precio o nombre</button>
          <RouterLink class="btn wide" to="/bandeja">Ir a la Bandeja</RouterLink>
        </div>
      </template>
    </div>

    <ListPicker :open="pickerOpen" title="Mover a…" :current="item?.listId ?? null" include-inbox @close="pickerOpen = false" @pick="moveTo" />
    <ItemForm :open="editOpen" :item="item" :list-id="item?.listId ?? null" @close="editOpen = false" />
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ItemCard from '../../components/items/ItemCard.vue'
import ListPicker from '../../components/ListPicker.vue'
import ItemForm from '../items/ItemForm.vue'
import { db } from '../../db/norte.db'
import { useSyncStore } from '../../stores/sync'
import { runSync } from '../../sync/runner'
import { extractUrl } from '../../utils/links'
import { createItem, findItemByUrl, moveItemToList } from '../lists/actions'
import { useNorteData } from '../lists/useData'

const route = useRoute()
const router = useRouter()
const sync = useSyncStore()
const { items, photos, listName } = useNorteData()

const state = ref<'saving' | 'nourl' | 'done'>('saving')
const itemId = ref<string | null>(null)
const duplicate = ref(false)
const synced = ref(false)
const pickerOpen = ref(false)
const editOpen = ref(false)

const item = computed(() => items.value.find((i) => i.id === itemId.value) ?? null)
const syncHint = computed(() =>
  sync.status === 'offline'
    ? 'Quedó guardado en este navegador. Se sincroniza solo cuando vuelva la conexión (abrí Norte en Safari otra vez si no aparece en la app).'
    : 'Quedó guardado en este navegador; todavía no se pudo sincronizar.',
)

function param(name: string): string {
  const v = route.query[name]
  return typeof v === 'string' ? v : Array.isArray(v) ? (v[0] ?? '') : ''
}

/** Sube el ítem ya mismo: el Atajo abre Safari, que no comparte datos locales con la PWA instalada. */
async function flush() {
  for (let i = 0; i < 3; i++) {
    await runSync(true)
    if ((await db.outbox.count()) === 0 && sync.status === 'online') return true
    if (sync.status === 'offline') return false
    await new Promise((r) => setTimeout(r, 600))
  }
  return false
}

onMounted(async () => {
  const savedId = param('saved')
  if (savedId) {
    itemId.value = savedId
    state.value = 'done'
    synced.value = await flush()
    return
  }
  const url = extractUrl(param('url')) ?? extractUrl(param('text'))
  if (!url) {
    state.value = 'nourl'
    return
  }
  const existing = await findItemByUrl(url)
  if (existing) {
    duplicate.value = true
    itemId.value = existing.id
  } else {
    const created = await createItem({ name: param('title') || undefined, listId: null, url })
    itemId.value = created.id
  }
  // Si se recarga la página, no vuelve a crear el ítem.
  await router.replace({ path: '/nuevo', query: { saved: itemId.value } })
  state.value = 'done'
  synced.value = await flush()
})

async function moveTo(listId: string | null) {
  pickerOpen.value = false
  if (!item.value) return
  await moveItemToList(item.value, listId)
  synced.value = await flush()
}
</script>

<style scoped>
.capture-view {
  display: grid;
  gap: 16px;
}
.card {
  display: grid;
  gap: 12px;
  padding: 18px;
}
h2 {
  font-family: var(--display);
  font-size: 1.6rem;
  font-weight: 600;
  margin: 0;
}
.where { margin: -6px 0 0; }
.status { margin: 0; font-weight: 700; }
.sync-note {
  margin: 0;
  font-size: 0.88rem;
  color: var(--muted);
}
.sync-note[data-ok='true'] { color: var(--ok); font-weight: 600; }
.actions {
  display: grid;
  gap: 8px;
}
.wide {
  width: 100%;
  min-height: 48px;
  justify-content: center;
  text-decoration: none;
}
</style>
