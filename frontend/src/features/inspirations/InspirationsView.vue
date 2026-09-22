<template>
  <section class="inspirations-view">
    <header class="head">
      <h2>Ideas e inspiración</h2>
    </header>

    <div class="grid-2">
      <div v-for="(element, i) in visible" :key="element.id" class="pin" @click="openActions(element)">
        <div class="pin-visual">
          <img v-if="cover(element.id)" :src="cover(element.id)" :alt="element.title || 'Captura de inspiración'" class="shot" />
          <div v-else class="shot-placeholder" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
          </div>
        </div>
        <div class="pin-caption">
          <strong>{{ element.title || element.externalUrl }}</strong>
          <span class="muted">{{ getDomain(element.externalUrl) }}</span>
        </div>
        <button class="icon-btn action-trigger no-drag" type="button" aria-label="Acciones" @click.stop="openActions(element)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
        </button>
      </div>
    </div>

    <p v-if="!visible.length" class="empty-state muted">
      No hay enlaces guardados.
    </p>

    <!-- FAB Nuevo enlace -->
    <button class="fab" type="button" aria-label="Nuevo enlace" @click="openNew">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
    </button>

    <!-- Hoja de acciones para Inspiración -->
    <AppModal :open="actionsOpen" :title="activeInspiration?.title || 'Acciones'" @close="actionsOpen = false">
      <div class="actions-sheet">
        <p class="sheet-meta muted">
          {{ activeInspiration?.externalUrl }}
        </p>
        <div class="sheet-buttons">
          <a :href="activeInspiration?.externalUrl" target="_blank" rel="noopener noreferrer" class="btn btn-primary sheet-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            Abrir enlace
          </a>
          <button class="btn sheet-btn" type="button" @click="handleEdit">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            Editar enlace
          </button>
          <button class="btn btn-danger sheet-btn" type="button" @click="handleRemove">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
            Archivar enlace
          </button>
        </div>
      </div>
    </AppModal>

    <!-- Modal de Formulario (Alta/Edición) -->
    <AppModal :open="open" :title="editing ? 'Editar enlace' : 'Nuevo enlace'" @close="open = false">
      <form class="form" @submit.prevent="save">
        <label class="field"><span>Título (opcional)</span><input v-model="form.title" placeholder="Ej. Alzada de cocina" /></label>
        <label class="field"><span>Área</span>
          <select v-model="form.area">
            <option value="casa">Casa</option>
            <option value="auto">Auto</option>
          </select>
        </label>
        <label class="field"><span>URL</span><input v-model="form.externalUrl" type="url" required placeholder="https://…" /></label>
        <label class="field file-field">
          <span>Captura (opcional)</span>
          <input type="file" accept="image/*" @change="onFile" />
        </label>
        <p class="muted form-tip">Podés guardar solo el link. La captura queda a mano si querés una foto.</p>
        <button class="btn btn-primary submit-btn" type="submit">Guardar</button>
      </form>
    </AppModal>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import AppCard from '../../components/ui/AppCard.vue'
import AppModal from '../../components/ui/AppModal.vue'
import SortableList from '../../components/SortableList.vue'
import { dataTick } from '../../app/bus'
import { db } from '../../db/norte.db'
import { inspirationScope, newId, nowIso } from '../../db/ids'
import { mutateDomain } from '../../db/mutate'
import { objectUrl, savePhoto } from '../../db/photos'
import { useUiStore } from '../../stores/ui'
import type { Attachment, Inspiration } from '../../db/types'
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
const form = reactive({ title: '', area: ui.area, externalUrl: '' })

const visible = computed(() =>
  rows.value
    .filter((r) => !r.deletedAt && r.area === ui.area && !r.itemId)
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
  if (confirm(`¿Seguro que querés archivar este enlace?`)) {
    actionsOpen.value = false
    await remove(activeInspiration.value.id)
  }
}

function openNew() {
  editing.value = null
  file.value = null
  Object.assign(form, { title: '', area: ui.area, externalUrl: '' })
  open.value = true
}

function edit(row: Inspiration) {
  editing.value = row
  file.value = null
  Object.assign(form, { title: row.title, area: row.area, externalUrl: row.externalUrl })
  open.value = true
}

function onFile(e: Event) { file.value = (e.target as HTMLInputElement).files?.[0] ?? null }

async function save() {
  const id = editing.value?.id ?? newId()
  const rec: Inspiration = {
    id,
    area: form.area,
    itemId: null,
    categoryId: editing.value?.categoryId ?? null,
    title: form.title,
    notes: editing.value?.notes ?? '',
    externalUrl: form.externalUrl,
    orderScope: inspirationScope(form.area),
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
.inspirations-view {
  display: grid;
  gap: 16px;
}
.head h2 {
  font-family: var(--display);
  font-size: 1.8rem;
  font-weight: 600;
  margin: 0;
}

.grid-2 {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}
@media (min-width: 768px) {
  .grid-2 {
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
  }
}
@media (min-width: 1100px) {
  .grid-2 {
    grid-template-columns: repeat(4, 1fr);
  }
}
.pin {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
  box-shadow: var(--shadow);
  display: flex;
  flex-direction: column;
  position: relative;
  cursor: pointer;
  transition: transform 0.15s ease;
}
.pin:active {
  transform: scale(0.98);
}
.pin-visual {
  width: 100%;
  aspect-ratio: 4 / 3;
  background: var(--inset);
  border-bottom: 1px solid var(--border);
  overflow: hidden;
}
.shot {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.shot-placeholder {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  color: var(--muted);
}
.shot-placeholder svg {
  width: 24px;
  height: 24px;
}
.pin-caption {
  padding: 10px 12px 12px;
  display: grid;
  gap: 2px;
}
.pin-caption strong {
  font-size: 0.9rem;
  font-weight: 650;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.pin-caption span {
  font-size: 0.75rem;
  color: var(--muted);
}
.action-trigger {
  position: absolute;
  top: 4px;
  right: 4px;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(4px);
  border-radius: 50%;
  width: 32px;
  height: 32px;
}
:root[data-theme='dark'] .action-trigger {
  background: rgba(0, 0, 0, 0.4);
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  font-size: 0.95rem;
}

/* Hoja de acciones */
.actions-sheet {
  display: grid;
  gap: 16px;
  padding: 8px 0;
}
.sheet-meta {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 600;
  word-break: break-all;
}
.sheet-buttons {
  display: grid;
  gap: 10px;
}
.sheet-btn {
  width: 100%;
  justify-content: center;
  font-size: 1rem;
}

/* Formulario */
.form {
  display: grid;
  gap: 12px;
  margin-top: 12px;
}
.form-tip {
  font-size: 0.85rem;
  margin: 0;
}
.submit-btn {
  margin-top: 8px;
  min-height: 48px;
  font-size: 1.05rem;
}
</style>
