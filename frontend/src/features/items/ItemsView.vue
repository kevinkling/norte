<template>
  <section class="items-view">
    <div class="controls-row">
      <div class="search-bar">
        <label class="field search-field">
          <span class="sr-only">Buscar ítems</span>
          <div class="search-input-wrapper">
            <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M20 20 L16.5 16.5"/></svg>
            <input v-model="q" type="search" placeholder="Buscar ítems..." />
          </div>
        </label>
      </div>

      <div class="chip-row filter-row" role="tablist" aria-label="Estado">
        <button v-for="s in statuses" :key="s" class="chip" type="button" :aria-pressed="status === s" @click="status = s">
          {{ capitalize(s) }}
          <span class="count-badge">{{ countForStatus(s) }}</span>
        </button>
      </div>
    </div>

    <SortableList :items="visible" :index="selected" @update:items="reorder" @select="selected = $event" @move="nudge">
      <template #item="{ element }">
        <AppCard class="item-card" @click="openActions(element)">
          <div class="item-visual">
            <div v-if="itemPhotos[element.id]" class="item-photo-frame">
              <img :src="itemPhotos[element.id]" :alt="element.name" class="item-photo" />
            </div>
            <div v-else class="item-photo-placeholder" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
            </div>
          </div>
          <div class="item-info">
            <h3 class="item-name">{{ element.name }}</h3>
            <p class="item-meta">
              <span class="price">{{ pesos(element.estimatedCostMinor, element.currency) }}</span>
              <span v-if="element.targetMonth" class="bullet">·</span>
              <span v-if="element.targetMonth" class="month">{{ formatMonth(element.targetMonth) }}</span>
            </p>
            <div v-if="categoryName(element.categoryId) || tagNames(element.id)" class="item-tags">
              <span v-if="categoryName(element.categoryId)" class="tag category-tag">{{ categoryName(element.categoryId) }}</span>
              <span v-for="tag in itemTagsList(element.id)" :key="tag.id" class="tag">{{ tag.name }}</span>
            </div>
          </div>
          <button class="icon-btn action-trigger no-drag" type="button" aria-label="Acciones" @click.stop="openActions(element)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
          </button>
        </AppCard>
      </template>
    </SortableList>

    <p v-if="!visible.length" class="empty-state muted">
      No hay ítems en esta sección.
    </p>

    <!-- FAB Nuevo ítem -->
    <button class="fab" type="button" aria-label="Nuevo ítem" @click="openNew">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
    </button>

    <!-- Hoja de acciones (Bottom Sheet / Modal) -->
    <AppModal :open="actionsOpen" :title="activeItem?.name || 'Acciones'" @close="actionsOpen = false">
      <div class="actions-sheet">
        <p class="sheet-meta muted">
          {{ activeItem ? pesos(activeItem.estimatedCostMinor, activeItem.currency) : '' }}
          <span v-if="activeItem?.targetMonth"> · {{ formatMonth(activeItem.targetMonth) }}</span>
        </p>
        <div class="sheet-buttons">
          <button class="btn btn-primary sheet-btn" type="button" @click="handleBuy">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
            Registrar compra
          </button>
          <button class="btn sheet-btn" type="button" @click="handleEdit">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            Editar ítem
          </button>
          <button class="btn btn-danger sheet-btn" type="button" @click="handleRemove">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
            Archivar ítem
          </button>
        </div>
      </div>
    </AppModal>

    <!-- Modal de Formulario (Alta/Edición) -->
    <AppModal :open="formOpen" :title="editing ? 'Editar ítem' : 'Nuevo ítem'" @close="formOpen = false">
      <form class="form" @submit.prevent="save">
        <label class="field"><span>Nombre</span><input v-model="form.name" required placeholder="Ej. Lámpara de pie" /></label>
        <label class="field"><span>Categoría</span>
          <select v-model="form.categoryId">
            <option :value="null">Sin categoría</option>
            <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
        </label>
        <fieldset class="field tags-fieldset">
          <legend>Etiquetas</legend>
          <div class="tags-grid">
            <label v-for="t in tags" :key="t.id" class="check">
              <input v-model="form.tagIds" type="checkbox" :value="t.id" />
              <span>{{ t.name }}</span>
            </label>
          </div>
          <p v-if="!tags.length" class="muted no-tags-msg">Todavía no hay etiquetas. Crealas en Categorías.</p>
        </fieldset>
        <div class="grid-2">
          <label class="field"><span>Costo estimado</span><input v-model="form.cost" inputmode="decimal" placeholder="0" /></label>
          <label class="field"><span>Mes objetivo</span><input v-model="form.targetMonth" type="month" /></label>
        </div>
        <label class="field"><span>Estado</span>
          <select v-model="form.status">
            <option v-for="s in statuses" :key="s" :value="s">{{ capitalize(s) }}</option>
          </select>
        </label>
        <fieldset class="field links-fieldset">
          <legend>Enlaces e inspiraciones</legend>
          <div v-for="(link, i) in form.links" :key="i" class="link-row">
            <input v-model="link.title" placeholder="Título (opcional)" />
            <input v-model="link.url" type="url" placeholder="https://…" />
            <button class="btn btn-danger-icon" type="button" aria-label="Quitar" @click="form.links.splice(i, 1)">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <button class="btn add-link-btn" type="button" @click="form.links.push({ id: '', title: '', url: '' })">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Agregar enlace
          </button>
        </fieldset>
        <label class="field"><span>Notas</span><textarea v-model="form.description" placeholder="Anotaciones o detalles..."></textarea></label>
        <label class="field file-field">
          <span>Imagen</span>
          <input type="file" accept="image/*" @change="onFile" />
        </label>
        <button class="btn btn-primary submit-btn" type="submit">Guardar</button>
      </form>
    </AppModal>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppCard from '../../components/ui/AppCard.vue'
import AppModal from '../../components/ui/AppModal.vue'
import SortableList from '../../components/SortableList.vue'
import { db } from '../../db/norte.db'
import { itemScope, newId, nowIso } from '../../db/ids'
import { mutateDomain } from '../../db/mutate'
import { objectUrl, savePhoto } from '../../db/photos'
import { dataTick } from '../../app/bus'
import type { Area, Category, Inspiration, Item, ItemStatus, ItemTag, Tag } from '../../db/types'
import { pesos, parsePesos } from '../../utils/money'
import { needsRebalance, positionAfter, positionForMove, rebalancePositions } from '../../utils/position'

const props = defineProps<{ area: Area }>()
const statuses: ItemStatus[] = ['idea', 'deseado', 'planificado', 'comprado']
const status = ref<ItemStatus>('deseado')
const q = ref('')
const items = ref<Item[]>([])
const categories = ref<Category[]>([])
const tags = ref<Tag[]>([])
const itemTags = ref<ItemTag[]>([])
const inspirations = ref<Inspiration[]>([])
const itemPhotos = ref<Record<string, string>>({})

const selected = ref(-1)
const formOpen = ref(false)
const actionsOpen = ref(false)
const activeItem = ref<Item | null>(null)
const editing = ref<Item | null>(null)
const photo = ref<File | null>(null)

const form = reactive({
  name: '',
  categoryId: null as string | null,
  cost: '',
  targetMonth: '',
  status: 'deseado' as ItemStatus,
  description: '',
  tagIds: [] as string[],
  links: [] as { id: string; title: string; url: string }[],
})

const router = useRouter()
const route = useRoute()

const visible = computed(() =>
  items.value
    .filter((i) => i.area === props.area && i.status === status.value && !i.deletedAt)
    .filter((i) => !q.value || i.name.toLowerCase().includes(q.value.toLowerCase()))
    .sort((a, b) => a.position - b.position || a.id.localeCompare(b.id)),
)

function countForStatus(st: ItemStatus) {
  return items.value.filter((i) => i.area === props.area && i.status === st && !i.deletedAt).length
}

function capitalize(s: string) {
  if (s === 'idea') return 'Idea'
  if (s === 'deseado') return 'Deseado'
  if (s === 'planificado') return 'Plan'
  if (s === 'comprado') return 'Comprado'
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function formatMonth(ym: string) {
  try {
    const [y, m] = ym.split('-')
    const date = new Date(Number(y), Number(m) - 1, 15)
    return date.toLocaleDateString('es', { month: 'short', year: 'numeric' })
  } catch {
    return ym
  }
}

function categoryName(id: string | null) {
  if (!id) return ''
  return categories.value.find((c) => c.id === id)?.name ?? ''
}

function tagNames(itemId: string) {
  const ids = itemTags.value.filter((r) => !r.deletedAt && r.itemId === itemId).map((r) => r.tagId)
  return tags.value.filter((t) => ids.includes(t.id)).map((t) => t.name).join(', ')
}

function itemTagsList(itemId: string) {
  const ids = itemTags.value.filter((r) => !r.deletedAt && r.itemId === itemId).map((r) => r.tagId)
  return tags.value.filter((t) => ids.includes(t.id))
}

async function reload() {
  items.value = await db.items.toArray()
  categories.value = (await db.categories.toArray()).filter((c) => !c.deletedAt && (c.area === props.area || c.area === 'both'))
  tags.value = (await db.tags.toArray()).filter((t) => !t.deletedAt && (t.area === props.area || t.area === 'both'))
  itemTags.value = await db.itemTags.toArray()
  inspirations.value = await db.inspirations.toArray()

  // Cargar fotos de ítems
  const atts = await db.attachments.toArray()
  const nextPhotos: Record<string, string> = {}
  for (const att of atts.filter((a) => a.itemId && a.data && !a.deletedAt)) {
    nextPhotos[att.itemId!] = objectUrl(att.data)
  }
  itemPhotos.value = nextPhotos
}

watch([dataTick, () => props.area], reload, { immediate: true })

function openActions(item: Item) {
  activeItem.value = item
  actionsOpen.value = true
}

function handleBuy() {
  if (!activeItem.value) return
  actionsOpen.value = false
  buy(activeItem.value)
}

function handleEdit() {
  if (!activeItem.value) return
  actionsOpen.value = false
  edit(activeItem.value)
}

async function handleRemove() {
  if (!activeItem.value) return
  if (confirm(`¿Seguro que querés archivar "${activeItem.value.name}"?`)) {
    actionsOpen.value = false
    await remove(activeItem.value.id)
  }
}

function openNew() {
  editing.value = null
  photo.value = null
  Object.assign(form, {
    name: '', categoryId: null, cost: '', targetMonth: '', status: status.value, description: '',
    tagIds: [], links: [{ id: '', title: '', url: '' }],
  })
  formOpen.value = true
}

function edit(item: Item) {
  editing.value = item
  const attached = inspirations.value
    .filter((r) => !r.deletedAt && r.itemId === item.id)
    .sort((a, b) => a.position - b.position)
    .map((r) => ({ id: r.id, title: r.title, url: r.externalUrl }))
  if (!attached.length && item.referenceUrl) attached.push({ id: '', title: '', url: item.referenceUrl })
  Object.assign(form, {
    name: item.name, categoryId: item.categoryId, cost: item.estimatedCostMinor ? String(item.estimatedCostMinor / 100) : '',
    targetMonth: item.targetMonth ?? '', status: item.status, description: item.description,
    tagIds: itemTags.value.filter((r) => !r.deletedAt && r.itemId === item.id).map((r) => r.tagId),
    links: attached.length ? attached : [{ id: '', title: '', url: '' }],
  })
  formOpen.value = true
}

function onFile(e: Event) {
  photo.value = (e.target as HTMLInputElement).files?.[0] ?? null
}

async function save() {
  const id = editing.value?.id ?? newId()
  const st = form.status
  const scope = itemScope(props.area, st)
  const last = visible.value.at(-1)
  const urls = form.links.map((l) => ({ ...l, url: l.url.trim() })).filter((l) => l.url)
  const rec: Item = {
    id,
    area: props.area,
    name: form.name,
    categoryId: form.categoryId,
    description: form.description,
    estimatedCostMinor: form.cost ? parsePesos(form.cost) : null,
    currency: 'ARS',
    priority: editing.value?.priority ?? 3,
    targetMonth: form.targetMonth || null,
    status: st,
    referenceUrl: urls[0]?.url ?? '',
    orderScope: scope,
    position: editing.value && editing.value.status === st ? editing.value.position : positionAfter(last?.position),
    createdAt: editing.value?.createdAt ?? nowIso(),
    updatedAt: nowIso(),
    deletedAt: null,
    revision: editing.value?.revision ?? 0,
  }
  await mutateDomain({ entityType: 'item', entityId: id, operation: 'upsert', table: 'items', record: rec as unknown as Record<string, unknown> })
  await syncItemLinks(id, urls)
  await syncItemTags(id, form.tagIds)
  if (photo.value) await savePhoto({ file: photo.value, role: 'cover', itemId: id })
  formOpen.value = false
}

async function syncItemLinks(itemId: string, urls: { id: string; title: string; url: string }[]) {
  const existing = inspirations.value.filter((r) => !r.deletedAt && r.itemId === itemId)
  const keep = new Set(urls.map((u) => u.id).filter(Boolean))
  for (const row of existing) {
    if (!keep.has(row.id)) {
      await mutateDomain({ entityType: 'inspiration', entityId: row.id, operation: 'delete', table: 'inspirations', record: { id: row.id } })
    }
  }
  let pos = 1024
  for (const link of urls) {
    const rowId = link.id || newId()
    const prev = existing.find((r) => r.id === rowId)
    const rec: Inspiration = {
      id: rowId,
      area: props.area,
      itemId,
      categoryId: prev?.categoryId ?? null,
      title: link.title,
      notes: prev?.notes ?? '',
      externalUrl: link.url,
      orderScope: itemScope(props.area, 'links'),
      position: pos,
      createdAt: prev?.createdAt ?? nowIso(),
      updatedAt: nowIso(),
      deletedAt: null,
      revision: prev?.revision ?? 0,
    }
    await mutateDomain({ entityType: 'inspiration', entityId: rowId, operation: 'upsert', table: 'inspirations', record: rec as unknown as Record<string, unknown> })
    pos += 1024
  }
}

async function syncItemTags(itemId: string, tagIds: string[]) {
  const existing = itemTags.value.filter((r) => !r.deletedAt && r.itemId === itemId)
  const wanted = new Set(tagIds)
  for (const row of existing) {
    if (!wanted.has(row.tagId)) {
      await mutateDomain({ entityType: 'item_tag', entityId: row.id, operation: 'delete', table: 'itemTags', record: { id: row.id } })
    }
  }
  for (const tagId of tagIds) {
    if (existing.some((r) => r.tagId === tagId)) continue
    const rowId = newId()
    const rec: ItemTag = {
      id: rowId, itemId, tagId,
      createdAt: nowIso(), updatedAt: nowIso(), deletedAt: null, revision: 0,
    }
    await mutateDomain({ entityType: 'item_tag', entityId: rowId, operation: 'upsert', table: 'itemTags', record: rec as unknown as Record<string, unknown> })
  }
}

async function remove(id: string) {
  await mutateDomain({ entityType: 'item', entityId: id, operation: 'delete', table: 'items', record: { id } })
}

async function reorder(next: Item[]) {
  const movedIndex = next.findIndex((row, i) => row.id !== visible.value[i]?.id)
  if (movedIndex < 0) return
  const moved = next[movedIndex]
  let pos = positionForMove(next, movedIndex)
  await mutateDomain({ entityType: 'item', entityId: moved.id, operation: 'upsert', table: 'items', record: { ...moved, position: pos } as unknown as Record<string, unknown> })
  if (needsRebalance(next.map((x, i) => (i === movedIndex ? pos : x.position)))) {
    for (const row of rebalancePositions(next)) {
      const item = next.find((x) => x.id === row.id)
      if (item) await mutateDomain({ entityType: 'item', entityId: item.id, operation: 'upsert', table: 'items', record: { ...item, position: row.position } as unknown as Record<string, unknown> })
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

function buy(item: Item) {
  router.push({ path: '/compras', query: { itemId: item.id, from: String(route.path) } })
}
</script>

<style scoped>
.items-view {
  display: grid;
  gap: 16px;
}
.controls-row {
  display: grid;
  gap: 12px;
  margin-bottom: 4px;
}
@media (min-width: 768px) {
  .controls-row {
    grid-template-columns: 1fr auto;
    align-items: center;
    gap: 20px;
  }
  .search-bar {
    margin-bottom: 0;
  }
  .filter-row {
    padding-bottom: 0;
  }
}
.search-bar {
  margin-bottom: 4px;
}
.search-field {
  margin-bottom: 0;
}
.search-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}
.search-icon {
  position: absolute;
  left: 14px;
  width: 18px;
  height: 18px;
  color: var(--muted);
  pointer-events: none;
}
.search-input-wrapper input {
  width: 100%;
  padding-left: 44px;
}

.filter-row {
  overflow-x: auto;
  padding-bottom: 4px;
  scrollbar-width: none;
  flex-wrap: nowrap;
}
.filter-row::-webkit-scrollbar {
  display: none;
}
.count-badge {
  display: inline-grid;
  place-items: center;
  min-width: 18px;
  height: 18px;
  border-radius: 999px;
  background: var(--inset);
  color: var(--text);
  font-size: 0.7rem;
  font-weight: 700;
  margin-left: 6px;
}
.chip[aria-pressed='true'] .count-badge {
  background: rgba(255, 255, 255, 0.2);
  color: var(--accent-on);
}

.item-card {
  display: grid;
  grid-template-columns: 72px 1fr auto;
  gap: 14px;
  align-items: center;
  padding: 12px;
  margin-bottom: 10px;
  cursor: pointer;
  transition: transform 0.15s ease;
}
.item-card:active {
  transform: scale(0.99);
}
.item-visual {
  width: 72px;
  height: 72px;
  border-radius: 12px;
  overflow: hidden;
  background: var(--inset);
  border: 1px solid var(--border);
}
.item-photo-frame, .item-photo {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.item-photo-placeholder {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  color: var(--muted);
}
.item-photo-placeholder svg {
  width: 28px;
  height: 28px;
}

.item-info {
  display: grid;
  gap: 4px;
}
.item-name {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 650;
  letter-spacing: -0.01em;
}
.item-meta {
  margin: 0;
  font-size: 0.85rem;
  color: var(--muted);
  display: flex;
  align-items: center;
  gap: 6px;
}
.price {
  font-weight: 700;
  color: var(--text);
}
.bullet {
  color: var(--border);
}
.item-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 4px;
}
.tag {
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--muted);
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 2px 8px;
}
.category-tag {
  border-color: var(--accent);
  color: var(--accent);
}

.icon-btn {
  width: 44px;
  height: 44px;
  border: 0;
  background: transparent;
  color: var(--muted);
  border-radius: 12px;
  display: grid;
  place-items: center;
  transition: color 0.15s ease, background 0.15s ease;
}
.icon-btn:active {
  background: var(--inset);
  color: var(--text);
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
.grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.tags-fieldset, .links-fieldset {
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 12px 14px;
}
.tags-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 8px;
  margin-top: 4px;
}
.check {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 36px;
  font-size: 0.95rem;
}
.check input {
  width: 18px;
  height: 18px;
  accent-color: var(--accent);
}
.no-tags-msg, .no-tags-msg + p {
  margin: 4px 0 0;
  font-size: 0.85rem;
}
.link-row {
  display: grid;
  grid-template-columns: 1fr 1.5fr auto;
  gap: 8px;
  margin-bottom: 8px;
  align-items: center;
}
.link-row input {
  min-height: 38px;
}
.btn-danger-icon {
  width: 38px;
  height: 38px;
  border: 1px solid var(--danger);
  color: var(--danger);
  border-radius: 10px;
  background: transparent;
  display: grid;
  place-items: center;
}
.btn-danger-icon:active {
  background: color-mix(in srgb, var(--danger) 10%, transparent);
}
.add-link-btn {
  min-height: 38px;
  font-size: 0.85rem;
  border-style: dashed;
  width: 100%;
}
.submit-btn {
  margin-top: 8px;
  min-height: 48px;
  font-size: 1.05rem;
}
</style>
