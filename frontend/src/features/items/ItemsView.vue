<template>
  <section>
    <header class="head">
      <h2>{{ area === 'casa' ? 'Casa' : 'Auto' }}</h2>
      <div class="head-actions">
        <RouterLink class="btn" to="/organizar">Categorías</RouterLink>
        <button class="btn btn-primary" type="button" @click="openNew">Nuevo ítem</button>
      </div>
    </header>
    <div class="chip-row" role="tablist" aria-label="Estado">
      <button v-for="s in statuses" :key="s" class="chip" type="button" :aria-pressed="status === s" @click="status = s">{{ s }}</button>
    </div>
    <label class="field">
      <span>Buscar</span>
      <input v-model="q" type="search" />
    </label>
    <SortableList :items="visible" :index="selected" @update:items="reorder" @select="selected = $event" @move="nudge">
      <template #item="{ element }">
        <AppCard>
          <strong>{{ element.name }}</strong>
          <p class="muted">
            {{ pesos(element.estimatedCostMinor, element.currency) }}{{ element.targetMonth ? ` · ${element.targetMonth}` : '' }}
          </p>
          <p v-if="categoryName(element.categoryId) || tagNames(element.id)" class="muted">
            {{ [categoryName(element.categoryId), tagNames(element.id)].filter(Boolean).join(' · ') }}
          </p>
          <ul v-if="linksFor(element).length" class="links">
            <li v-for="link in linksFor(element)" :key="link.id">
              <a class="no-drag" :href="link.externalUrl" target="_blank" rel="noopener noreferrer">{{ link.title || link.externalUrl }}</a>
            </li>
          </ul>
          <div class="chip-row no-drag">
            <button class="btn" type="button" @click="edit(element)">Editar</button>
            <button class="btn" type="button" @click="buy(element)">Registrar compra</button>
            <button class="btn btn-danger" type="button" @click="remove(element.id)">Archivar</button>
          </div>
        </AppCard>
      </template>
    </SortableList>

    <AppModal :open="formOpen" :title="editing ? 'Editar ítem' : 'Nuevo ítem'" @close="formOpen = false">
      <form class="form" @submit.prevent="save">
        <label class="field"><span>Nombre</span><input v-model="form.name" required /></label>
        <label class="field"><span>Categoría</span>
          <select v-model="form.categoryId">
            <option :value="null">Sin categoría</option>
            <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
        </label>
        <fieldset class="field">
          <legend>Etiquetas</legend>
          <label v-for="t in tags" :key="t.id" class="check">
            <input v-model="form.tagIds" type="checkbox" :value="t.id" />
            {{ t.name }}
          </label>
          <p v-if="!tags.length" class="muted">Todavía no hay etiquetas. Crealas en Categorías.</p>
        </fieldset>
        <label class="field"><span>Costo estimado</span><input v-model="form.cost" inputmode="decimal" /></label>
        <label class="field"><span>Mes objetivo</span><input v-model="form.targetMonth" type="month" /></label>
        <label class="field"><span>Estado</span>
          <select v-model="form.status">
            <option v-for="s in statuses" :key="s" :value="s">{{ s }}</option>
          </select>
        </label>
        <fieldset class="field">
          <legend>Enlaces e inspiraciones</legend>
          <div v-for="(link, i) in form.links" :key="i" class="link-row">
            <input v-model="link.title" placeholder="Título (opcional)" />
            <input v-model="link.url" type="url" placeholder="https://…" />
            <button class="btn" type="button" @click="form.links.splice(i, 1)">Quitar</button>
          </div>
          <button class="btn" type="button" @click="form.links.push({ id: '', title: '', url: '' })">Agregar enlace</button>
        </fieldset>
        <label class="field"><span>Notas</span><textarea v-model="form.description"></textarea></label>
        <label class="field"><span>Imagen</span><input type="file" accept="image/*" @change="onFile" /></label>
        <button class="btn btn-primary" type="submit">Guardar</button>
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
import { savePhoto } from '../../db/photos'
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
const selected = ref(-1)
const formOpen = ref(false)
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

function categoryName(id: string | null) {
  if (!id) return ''
  return categories.value.find((c) => c.id === id)?.name ?? ''
}

function tagNames(itemId: string) {
  const ids = itemTags.value.filter((r) => !r.deletedAt && r.itemId === itemId).map((r) => r.tagId)
  return tags.value.filter((t) => ids.includes(t.id)).map((t) => t.name).join(', ')
}

function linksFor(item: Item) {
  const attached = inspirations.value
    .filter((r) => !r.deletedAt && r.itemId === item.id)
    .sort((a, b) => a.position - b.position)
  if (attached.length) return attached
  if (item.referenceUrl) {
    return [{ id: 'legacy', title: '', notes: '', externalUrl: item.referenceUrl } as Inspiration]
  }
  return []
}

async function reload() {
  items.value = await db.items.toArray()
  categories.value = (await db.categories.toArray()).filter((c) => !c.deletedAt && (c.area === props.area || c.area === 'both'))
  tags.value = (await db.tags.toArray()).filter((t) => !t.deletedAt && (t.area === props.area || t.area === 'both'))
  itemTags.value = await db.itemTags.toArray()
  inspirations.value = await db.inspirations.toArray()
}
watch([dataTick, () => props.area], reload, { immediate: true })

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
.head { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
.head-actions { display: flex; gap: 8px; flex-wrap: wrap; }
h2 { text-transform: capitalize; }
.form { margin-top: 8px; }
.links { margin: 6px 0; padding-left: 18px; }
.link-row { display: grid; gap: 8px; margin-bottom: 8px; }
.check { display: flex; gap: 8px; align-items: center; min-height: 44px; }
fieldset.field { border: 1px solid var(--border); border-radius: 12px; padding: 10px; }
legend { font-size: 0.9rem; font-weight: 600; }
</style>
