<template>
  <section class="page organize">
    <div class="section">
      <h2 class="sec-h">Categorías <span class="count">{{ visibleCats.length }}</span></h2>
      <form class="composer" @submit.prevent="saveCategory">
        <input v-model="catName" required :placeholder="editingCategory ? 'Nuevo nombre' : 'Nueva categoría (ej. Iluminación)'" :aria-label="editingCategory ? 'Renombrar categoría' : 'Nueva categoría'" />
        <button v-if="editingCategory" class="icon-btn is-muted" type="button" aria-label="Cancelar" @click="cancelCat">
          <AppIcon name="x" :size="18" />
        </button>
        <button class="icon-btn is-fill" type="submit" :disabled="!catName.trim()" :aria-label="editingCategory ? 'Guardar' : 'Agregar categoría'">
          <AppIcon :name="editingCategory ? 'check' : 'plus'" :size="18" :stroke="2.2" />
        </button>
      </form>
      <div v-if="visibleCats.length" class="group">
        <div v-for="x in visibleCats" :key="x.id" class="list-row" :class="{ editing: editingCategory?.id === x.id }">
          <span class="row-main">
            <span class="row-title">{{ x.name }}</span>
            <span v-if="x.parentId" class="row-meta">Subcategoría</span>
          </span>
          <button class="icon-btn is-muted" type="button" :aria-label="`Renombrar ${x.name}`" title="Renombrar" @click="startEditCat(x)">
            <AppIcon name="pencil" :size="18" />
          </button>
          <button class="icon-btn is-muted" type="button" :aria-label="`Archivar ${x.name}`" title="Archivar" @click="handleRemoveCategory(x)">
            <AppIcon name="archive" :size="18" />
          </button>
        </div>
      </div>
      <p v-else class="hint">No hay categorías creadas.</p>
    </div>

    <div class="section">
      <h2 class="sec-h">Etiquetas <span class="count">{{ visibleTags.length }}</span></h2>
      <form class="composer" @submit.prevent="saveTag">
        <input v-model="tagName" required :placeholder="editingTag ? 'Nuevo nombre' : 'Nueva etiqueta (ej. Urgente)'" :aria-label="editingTag ? 'Renombrar etiqueta' : 'Nueva etiqueta'" />
        <button v-if="editingTag" class="icon-btn is-muted" type="button" aria-label="Cancelar" @click="cancelTag">
          <AppIcon name="x" :size="18" />
        </button>
        <button class="icon-btn is-fill" type="submit" :disabled="!tagName.trim()" :aria-label="editingTag ? 'Guardar' : 'Agregar etiqueta'">
          <AppIcon :name="editingTag ? 'check' : 'plus'" :size="18" :stroke="2.2" />
        </button>
      </form>
      <div v-if="visibleTags.length" class="group">
        <div v-for="x in visibleTags" :key="x.id" class="list-row" :class="{ editing: editingTag?.id === x.id }">
          <span class="row-main">
            <span class="row-title">{{ x.name }}</span>
          </span>
          <button class="icon-btn is-muted" type="button" :aria-label="`Renombrar ${x.name}`" title="Renombrar" @click="startEditTag(x)">
            <AppIcon name="pencil" :size="18" />
          </button>
          <button class="icon-btn is-muted" type="button" :aria-label="`Archivar ${x.name}`" title="Archivar" @click="handleRemoveTag(x)">
            <AppIcon name="archive" :size="18" />
          </button>
        </div>
      </div>
      <p v-else class="hint">No hay etiquetas creadas.</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { askConfirm } from '../../app/confirm'
import { computed, ref, watch } from 'vue'
import AppIcon from '../../components/ui/AppIcon.vue'
import { dataTick } from '../../app/bus'
import { db } from '../../db/norte.db'
import { newId, nowIso } from '../../db/ids'
import { mutateDomain } from '../../db/mutate'
import type { Category, Tag } from '../../db/types'
import { positionAfter } from '../../utils/position'

const cats = ref<Category[]>([])
const tags = ref<Tag[]>([])
const catName = ref('')
const tagName = ref('')
const editingCategory = ref<Category | null>(null)
const editingTag = ref<Tag | null>(null)

const visibleCats = computed(() =>
  cats.value
    .filter((c) => !c.deletedAt)
    .sort((a, b) => a.position - b.position || a.name.localeCompare(b.name)),
)
const visibleTags = computed(() =>
  tags.value
    .filter((t) => !t.deletedAt)
    .sort((a, b) => a.position - b.position || a.name.localeCompare(b.name)),
)

watch(dataTick, async () => {
  cats.value = await db.categories.toArray()
  tags.value = await db.tags.toArray()
}, { immediate: true })

function startEditCat(c: Category) {
  editingCategory.value = c
  catName.value = c.name
}
function cancelCat() {
  editingCategory.value = null
  catName.value = ''
}
async function saveCategory() {
  const name = catName.value.trim()
  if (!name) return
  const existing = editingCategory.value
  const id = existing?.id ?? newId()
  const rec: Category = {
    id,
    area: existing?.area ?? 'both',
    name,
    parentId: existing?.parentId ?? null,
    position: existing?.position ?? positionAfter(visibleCats.value.at(-1)?.position),
    createdAt: existing?.createdAt ?? nowIso(),
    updatedAt: nowIso(),
    deletedAt: null,
    revision: existing?.revision ?? 0,
  }
  await mutateDomain({ entityType: 'category', entityId: id, operation: 'upsert', table: 'categories', record: rec as unknown as Record<string, unknown> })
  cancelCat()
}

async function handleRemoveCategory(c: Category) {
  if (await askConfirm(`¿Seguro que querés archivar la categoría "${c.name}"?`, { confirmLabel: 'Archivar' })) {
    await removeCategory(c.id)
  }
}

async function removeCategory(id: string) {
  await mutateDomain({ entityType: 'category', entityId: id, operation: 'delete', table: 'categories', record: { id } })
}

function startEditTag(t: Tag) {
  editingTag.value = t
  tagName.value = t.name
}
function cancelTag() {
  editingTag.value = null
  tagName.value = ''
}
async function saveTag() {
  const name = tagName.value.trim()
  if (!name) return
  const existing = editingTag.value
  const id = existing?.id ?? newId()
  const rec: Tag = {
    id,
    area: existing?.area ?? 'both',
    name,
    position: existing?.position ?? positionAfter(visibleTags.value.at(-1)?.position),
    createdAt: existing?.createdAt ?? nowIso(),
    updatedAt: nowIso(),
    deletedAt: null,
    revision: existing?.revision ?? 0,
  }
  await mutateDomain({ entityType: 'tag', entityId: id, operation: 'upsert', table: 'tags', record: rec as unknown as Record<string, unknown> })
  cancelTag()
}

async function handleRemoveTag(t: Tag) {
  if (await askConfirm(`¿Seguro que querés archivar la etiqueta "${t.name}"?`, { confirmLabel: 'Archivar' })) {
    await removeTag(t.id)
  }
}

async function removeTag(id: string) {
  await mutateDomain({ entityType: 'tag', entityId: id, operation: 'delete', table: 'tags', record: { id } })
}
</script>

<style scoped>
.list-row.editing { background: var(--accent-soft); }
@media (min-width: 900px) {
  .organize { grid-template-columns: 1fr 1fr; align-items: start; }
}
</style>
