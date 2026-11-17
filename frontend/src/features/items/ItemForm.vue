<template>
  <AppModal :open="open" :title="item ? 'Editar' : 'Nuevo para comprar'" @close="$emit('close')">
    <form class="form" @submit.prevent="save">
      <label class="field"><span>Nombre</span><input v-model="form.name" required placeholder="Ej. Memoria RAM 16 GB" /></label>
      <label class="field"><span>Lista</span>
        <select v-model="form.listId">
          <option :value="null">📥 Bandeja</option>
          <option v-for="l in lists" :key="l.id" :value="l.id">{{ listLabel(l) }}</option>
        </select>
      </label>
      <fieldset class="field links-fieldset">
        <legend>Links</legend>
        <div v-for="(link, i) in form.links" :key="i" class="link-row">
          <input v-model="link.url" type="url" inputmode="url" placeholder="https://… (Instagram, Mercado Libre…)" aria-label="URL" />
          <button class="btn-danger-icon" type="button" aria-label="Quitar link" @click="form.links.splice(i, 1)">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <button class="btn add-link-btn" type="button" @click="form.links.push({ id: '', title: '', url: '' })">+ Agregar link</button>
      </fieldset>
      <div class="grid-2">
        <label class="field"><span>Precio estimado</span><input v-model="form.cost" inputmode="decimal" placeholder="Opcional" /></label>
        <label class="field"><span>Mes objetivo</span><input v-model="form.targetMonth" type="month" /></label>
      </div>
      <label class="check-row"><input v-model="form.bought" type="checkbox" /> <span>Ya lo compré</span></label>

      <details class="extra">
        <summary>Más detalles</summary>
        <label class="field"><span>Categoría</span>
          <select v-model="form.categoryId">
            <option :value="null">Sin categoría</option>
            <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
        </label>
        <fieldset v-if="tags.length" class="field tags-fieldset">
          <legend>Etiquetas</legend>
          <div class="tags-grid">
            <label v-for="t in tags" :key="t.id" class="check-row">
              <input v-model="form.tagIds" type="checkbox" :value="t.id" />
              <span>{{ t.name }}</span>
            </label>
          </div>
        </fieldset>
        <label class="field"><span>Notas</span><textarea v-model="form.description" placeholder="Modelo, medidas, dónde lo vi…"></textarea></label>
        <label class="field"><span>Foto</span><input type="file" accept="image/*" @change="onFile" /></label>
      </details>

      <button class="btn btn-primary submit-btn" type="submit">Guardar</button>
    </form>
  </AppModal>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import AppModal from '../../components/ui/AppModal.vue'
import { db } from '../../db/norte.db'
import { itemScope, newId, nowIso } from '../../db/ids'
import { mutateDomain } from '../../db/mutate'
import { savePhoto } from '../../db/photos'
import type { Category, Item, List, Tag } from '../../db/types'
import { parsePesos } from '../../utils/money'
import { listLabel, liveLists, nextPosition, syncItemLinks, syncItemTags, type LinkDraft } from '../lists/actions'

const props = defineProps<{ open: boolean; item: Item | null; listId: string | null }>()
const emit = defineEmits<{ close: []; saved: [Item] }>()

const lists = ref<List[]>([])
const categories = ref<Category[]>([])
const tags = ref<Tag[]>([])
const photo = ref<File | null>(null)
const form = reactive({
  name: '',
  listId: null as string | null,
  cost: '',
  targetMonth: '',
  bought: false,
  categoryId: null as string | null,
  tagIds: [] as string[],
  description: '',
  links: [] as LinkDraft[],
})

watch(() => props.open, async (open) => {
  if (!open) return
  photo.value = null
  lists.value = await liveLists()
  categories.value = (await db.categories.toArray()).filter((c) => !c.deletedAt).sort((a, b) => a.position - b.position)
  tags.value = (await db.tags.toArray()).filter((t) => !t.deletedAt).sort((a, b) => a.position - b.position)
  const item = props.item
  if (!item) {
    Object.assign(form, {
      name: '', listId: props.listId, cost: '', targetMonth: '', bought: false,
      categoryId: null, tagIds: [], description: '', links: [{ id: '', title: '', url: '' }],
    })
    return
  }
  const links = (await db.inspirations.where('itemId').equals(item.id).toArray())
    .filter((r) => !r.deletedAt)
    .sort((a, b) => a.position - b.position)
    .map((r) => ({ id: r.id, title: r.title, url: r.externalUrl }))
  if (!links.length && item.referenceUrl) links.push({ id: '', title: '', url: item.referenceUrl })
  const tagIds = (await db.itemTags.where('itemId').equals(item.id).toArray()).filter((r) => !r.deletedAt).map((r) => r.tagId)
  Object.assign(form, {
    name: item.name,
    listId: item.listId,
    cost: item.estimatedCostMinor ? String(item.estimatedCostMinor / 100) : '',
    targetMonth: item.targetMonth ?? '',
    bought: item.status === 'comprado',
    categoryId: item.categoryId,
    tagIds,
    description: item.description,
    links: links.length ? links : [{ id: '', title: '', url: '' }],
  })
}, { immediate: true })

function onFile(e: Event) {
  photo.value = (e.target as HTMLInputElement).files?.[0] ?? null
}

async function save() {
  const links = form.links.filter((l) => l.url.trim())
  const status = form.bought ? 'comprado' : 'deseado'
  const scope = itemScope(form.listId, status)
  const base: Item = props.item ?? {
    id: newId(), area: null, listId: form.listId, name: '', categoryId: null, description: '',
    estimatedCostMinor: null, currency: 'ARS', priority: 3, targetMonth: null, status: 'deseado',
    referenceUrl: '', orderScope: '', position: 0, createdAt: nowIso(), updatedAt: nowIso(), deletedAt: null, revision: 0,
  }
  const rec: Item = {
    ...base,
    name: form.name.trim(),
    listId: form.listId,
    categoryId: form.categoryId,
    description: form.description,
    estimatedCostMinor: form.cost ? parsePesos(form.cost) : null,
    targetMonth: form.targetMonth || null,
    status,
    referenceUrl: links[0]?.url.trim() ?? '',
    orderScope: scope,
    position: props.item?.orderScope === scope ? props.item.position : await nextPosition('items', scope),
    updatedAt: nowIso(),
  }
  await mutateDomain({ entityType: 'item', entityId: rec.id, operation: 'upsert', table: 'items', record: rec as unknown as Record<string, unknown> })
  await syncItemLinks(rec, links)
  await syncItemTags(rec.id, form.tagIds)
  if (photo.value) await savePhoto({ file: photo.value, role: 'cover', itemId: rec.id })
  emit('saved', rec)
  emit('close')
}
</script>

<style scoped>
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
.links-fieldset, .tags-fieldset {
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 12px 14px;
}
.link-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
  margin-bottom: 8px;
  align-items: center;
}
.link-row input {
  min-height: 40px;
  min-width: 0;
}
.btn-danger-icon {
  width: 40px;
  height: 40px;
  border: 1px solid var(--danger);
  color: var(--danger);
  border-radius: 10px;
  background: transparent;
  display: grid;
  place-items: center;
}
.add-link-btn {
  min-height: 40px;
  font-size: 0.85rem;
  border-style: dashed;
  width: 100%;
}
.check-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 40px;
  font-size: 0.95rem;
}
.check-row input {
  width: 20px;
  height: 20px;
  accent-color: var(--accent);
}
.tags-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 4px;
}
.extra {
  display: grid;
  gap: 12px;
}
.extra[open] {
  padding-bottom: 4px;
}
.extra summary {
  cursor: pointer;
  font-weight: 700;
  color: var(--muted);
  min-height: 40px;
  display: flex;
  align-items: center;
}
.extra > :not(summary) {
  margin-top: 12px;
}
.submit-btn {
  margin-top: 4px;
  min-height: 48px;
  font-size: 1.05rem;
}
</style>
