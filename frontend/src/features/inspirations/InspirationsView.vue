<template>
  <section class="page">
    <div v-if="visible.length" class="pins">
      <button v-for="element in visible" :key="element.id" class="pin" type="button" @click="openActions(element)">
        <span class="pin-visual">
          <img v-if="cover(element.id)" :src="cover(element.id)" :alt="element.title || 'Captura de inspiración'" class="shot" />
          <AppIcon v-else name="image" :size="22" />
        </span>
        <span class="pin-caption">
          <span class="pin-title">{{ element.title || element.externalUrl }}</span>
          <span class="pin-domain">{{ getDomain(element.externalUrl) }}</span>
        </span>
      </button>
    </div>

    <p v-else class="empty-state">No hay enlaces guardados.</p>

    <button class="fab" type="button" aria-label="Nuevo enlace" @click="openNew">
      <AppIcon name="plus" :size="24" :stroke="2.2" />
    </button>

    <AppModal :open="actionsOpen" :title="activeInspiration?.title || 'Enlace'" @close="actionsOpen = false">
      <div class="sheet">
        <p class="sheet-meta">{{ activeInspiration?.externalUrl }}</p>
        <div class="group">
          <a :href="activeInspiration?.externalUrl" target="_blank" rel="noopener noreferrer" class="list-row">
            <span class="row-icon"><AppIcon name="external" :size="18" /></span>
            <span class="row-main row-title">Abrir enlace</span>
          </a>
          <button class="list-row" type="button" @click="handleEdit">
            <span class="row-icon"><AppIcon name="pencil" :size="18" /></span>
            <span class="row-main row-title">Editar</span>
          </button>
          <button class="list-row is-danger" type="button" @click="handleRemove">
            <span class="row-icon"><AppIcon name="archive" :size="18" /></span>
            <span class="row-main row-title">Archivar</span>
          </button>
        </div>
      </div>
    </AppModal>

    <AppModal :open="open" :title="editing ? 'Editar enlace' : 'Nuevo enlace'" @close="open = false">
      <form class="form" @submit.prevent="save">
        <label class="field"><span>URL</span><input v-model="form.externalUrl" type="url" required placeholder="https://…" /></label>
        <label class="field"><span>Título (opcional)</span><input v-model="form.title" placeholder="Ej. Alzada de cocina" /></label>
        <label class="field"><span>Lista</span>
          <select v-model="form.listId">
            <option :value="null">📥 Bandeja</option>
            <option v-for="l in lists" :key="l.id" :value="l.id">{{ listLabel(l) }}</option>
          </select>
        </label>
        <label class="field"><span>Captura (opcional)</span><input type="file" accept="image/*" @change="onFile" /></label>
        <div class="form-actions"><button class="btn btn-primary" type="submit">Guardar</button></div>
      </form>
    </AppModal>
  </section>
</template>

<script setup lang="ts">
import { askConfirm } from '../../app/confirm'
import { computed, reactive, ref, watch } from 'vue'
import AppIcon from '../../components/ui/AppIcon.vue'
import AppModal from '../../components/ui/AppModal.vue'
import { dataTick } from '../../app/bus'
import { db } from '../../db/norte.db'
import { inspirationScope, newId, nowIso } from '../../db/ids'
import { mutateDomain } from '../../db/mutate'
import { objectUrl, savePhoto } from '../../db/photos'
import { useUiStore } from '../../stores/ui'
import type { Attachment, Inspiration, List } from '../../db/types'
import { listLabel, liveLists } from '../lists/actions'
import { needsRebalance, positionAfter, positionForMove, rebalancePositions } from '../../utils/position'

const ui = useUiStore()
const open = ref(false)
const actionsOpen = ref(false)
const selected = ref(-1)
const rows = ref<Inspiration[]>([])
const photos = ref<Attachment[]>([])
const file = ref<File | null>(null)
const urls = ref<Record<string, string>>({})
const activeInspiration = ref<Inspiration | null>(null)
const editing = ref<Inspiration | null>(null)
const lists = ref<List[]>([])
const form = reactive({ title: '', listId: ui.currentListId as string | null, externalUrl: '' })

const visible = computed(() =>
  rows.value
    .filter((r) => !r.deletedAt && !r.itemId)
    .sort((a, b) => a.position - b.position || a.id.localeCompare(b.id)),
)

function cover(id: string) { return urls.value[id] || '' }

function getDomain(url: string) {
  try {
    const u = new URL(url)
    return u.hostname.replace('www.', '')
  } catch {
    return 'enlace'
  }
}

watch(dataTick, async () => {
  lists.value = await liveLists()
  rows.value = await db.inspirations.toArray()
  photos.value = await db.attachments.toArray()
  const next: Record<string, string> = {}
  for (const att of photos.value.filter((a) => a.inspirationId && a.data && !a.deletedAt)) {
    next[att.inspirationId!] = objectUrl(att.data)
  }
  urls.value = next
}, { immediate: true })

function openActions(ins: Inspiration) {
  activeInspiration.value = ins
  actionsOpen.value = true
}

function handleEdit() {
  if (!activeInspiration.value) return
  actionsOpen.value = false
  edit(activeInspiration.value)
}

async function handleRemove() {
  if (!activeInspiration.value) return
  if (await askConfirm(`¿Seguro que querés archivar este enlace?`, { confirmLabel: 'Archivar' })) {
    actionsOpen.value = false
    await remove(activeInspiration.value.id)
  }
}

function openNew() {
  editing.value = null
  file.value = null
  Object.assign(form, { title: '', listId: ui.currentListId, externalUrl: '' })
  open.value = true
}

function edit(row: Inspiration) {
  editing.value = row
  file.value = null
  Object.assign(form, { title: row.title, listId: row.listId, externalUrl: row.externalUrl })
  open.value = true
}

function onFile(e: Event) { file.value = (e.target as HTMLInputElement).files?.[0] ?? null }

async function save() {
  const id = editing.value?.id ?? newId()
  const rec: Inspiration = {
    id,
    area: editing.value?.area ?? null,
    listId: form.listId,
    itemId: null,
    categoryId: editing.value?.categoryId ?? null,
    title: form.title,
    notes: editing.value?.notes ?? '',
    externalUrl: form.externalUrl,
    orderScope: inspirationScope(form.listId),
    position: editing.value?.position ?? positionAfter(visible.value.at(-1)?.position),
    createdAt: editing.value?.createdAt ?? nowIso(),
    updatedAt: nowIso(),
    deletedAt: null,
    revision: editing.value?.revision ?? 0,
  }
  await mutateDomain({ entityType: 'inspiration', entityId: id, operation: 'upsert', table: 'inspirations', record: rec as unknown as Record<string, unknown> })
  if (file.value) await savePhoto({ file: file.value, role: 'cover', inspirationId: id })
  open.value = false
  file.value = null
}

async function remove(id: string) {
  await mutateDomain({ entityType: 'inspiration', entityId: id, operation: 'delete', table: 'inspirations', record: { id } })
}

async function reorder(next: Inspiration[]) {
  const movedIndex = next.findIndex((row, i) => row.id !== visible.value[i]?.id)
  if (movedIndex < 0) return
  const moved = next[movedIndex]
  const pos = positionForMove(next, movedIndex)
  await mutateDomain({ entityType: 'inspiration', entityId: moved.id, operation: 'upsert', table: 'inspirations', record: { ...moved, position: pos } as unknown as Record<string, unknown> })
  if (needsRebalance(next.map((x, i) => (i === movedIndex ? pos : x.position)))) {
    for (const row of rebalancePositions(next)) {
      const it = next.find((x) => x.id === row.id)
      if (it) await mutateDomain({ entityType: 'inspiration', entityId: it.id, operation: 'upsert', table: 'inspirations', record: { ...it, position: row.position } as unknown as Record<string, unknown> })
    }
  }
}

async function nudge(delta: number) {
  const i = selected.value
  if (i < 0) return
  const arr = [...visible.value]
  const j = i + delta
  if (j < 0 || j >= arr.length) return
  const [row] = arr.splice(i, 1)
  arr.splice(j, 0, row)
  selected.value = j
  await reorder(arr)
}
</script>

<style scoped>
.pins {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--sp-3);
}
@media (min-width: 600px) { .pins { grid-template-columns: repeat(3, 1fr); } }
.pin {
  display: flex;
  flex-direction: column;
  padding: 0;
  overflow: hidden;
  text-align: left;
  color: var(--text);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r-md);
  transition: border-color var(--ease);
}
@media (hover: hover) { .pin:hover { border-color: color-mix(in srgb, var(--muted) 50%, var(--border)); } }
.pin-visual {
  aspect-ratio: 4 / 3;
  display: grid;
  place-items: center;
  background: var(--inset);
  color: var(--muted);
  overflow: hidden;
}
.shot { width: 100%; height: 100%; object-fit: cover; }
.pin-caption { display: grid; gap: 2px; padding: var(--sp-2) var(--sp-3) var(--sp-3); min-width: 0; }
.pin-title { font-size: var(--fs-sm); font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pin-domain { font-size: var(--fs-xs); color: var(--muted); }
.sheet { display: grid; gap: var(--sp-3); }
.sheet-meta { margin: calc(-1 * var(--sp-2)) 0 0; font-size: var(--fs-sm); color: var(--muted); word-break: break-all; }
</style>
