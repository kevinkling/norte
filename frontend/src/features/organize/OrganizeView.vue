<template>
  <section class="organize-view">
    <header class="head">
      <h2>Categorías y etiquetas</h2>
    </header>

    <!-- Categorías -->
    <div class="section-block">
      <h3>Categorías</h3>
      <form class="form-card neu" @submit.prevent="saveCategory">
        <label class="field">
          <span>{{ editingCategory ? 'Renombrar categoría' : 'Nueva categoría' }}</span>
          <input v-model="catName" required placeholder="Ej. Iluminación" />
        </label>
        <div class="form-actions">
          <button class="btn btn-primary" type="submit">
            {{ editingCategory ? 'Guardar' : 'Agregar' }}
          </button>
          <button v-if="editingCategory" class="btn" type="button" @click="cancelCat">Cancelar</button>
        </div>
      </form>

      <div class="rows-list">
        <AppCard v-for="c in visibleCats" :key="c.id" class="row-card">
          <div class="row-info">
            <strong class="row-name">{{ c.name }}</strong>
            <span v-if="c.parentId" class="muted sub-label">Subcategoría</span>
          </div>
          <div class="row-actions">
            <button class="btn btn-sm" type="button" @click="startEditCat(c)">Renombrar</button>
            <button class="btn btn-sm btn-danger" type="button" @click="handleRemoveCategory(c)">Archivar</button>
          </div>
        </AppCard>
        <p v-if="!visibleCats.length" class="empty-state muted">No hay categorías creadas.</p>
      </div>
    </div>

    <!-- Etiquetas -->
    <div class="section-block">
      <h3>Etiquetas</h3>
      <form class="form-card neu" @submit.prevent="saveTag">
        <label class="field">
          <span>{{ editingTag ? 'Renombrar etiqueta' : 'Nueva etiqueta' }}</span>
          <input v-model="tagName" required placeholder="Ej. Urgente" />
        </label>
        <div class="form-actions">
          <button class="btn btn-primary" type="submit">
            {{ editingTag ? 'Guardar' : 'Agregar' }}
          </button>
          <button v-if="editingTag" class="btn" type="button" @click="cancelTag">Cancelar</button>
        </div>
      </form>

      <div class="rows-list">
        <AppCard v-for="t in visibleTags" :key="t.id" class="row-card">
          <div class="row-info">
            <strong class="row-name">{{ t.name }}</strong>
          </div>
          <div class="row-actions">
            <button class="btn btn-sm" type="button" @click="startEditTag(t)">Renombrar</button>
            <button class="btn btn-sm btn-danger" type="button" @click="handleRemoveTag(t)">Archivar</button>
          </div>
        </AppCard>
        <p v-if="!visibleTags.length" class="empty-state muted">No hay etiquetas creadas.</p>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AppCard from '../../components/ui/AppCard.vue'
import { dataTick } from '../../app/bus'
import { db } from '../../db/norte.db'
import { newId, nowIso } from '../../db/ids'
import { mutateDomain } from '../../db/mutate'
import { useUiStore } from '../../stores/ui'
import type { Category, Tag } from '../../db/types'
import { positionAfter } from '../../utils/position'

const ui = useUiStore()
const cats = ref<Category[]>([])
const tags = ref<Tag[]>([])
const catName = ref('')
const tagName = ref('')
const editingCategory = ref<Category | null>(null)
const editingTag = ref<Tag | null>(null)

const visibleCats = computed(() =>
  cats.value
    .filter((c) => !c.deletedAt && (c.area === ui.area || c.area === 'both'))
    .sort((a, b) => a.position - b.position || a.name.localeCompare(b.name)),
)
const visibleTags = computed(() =>
  tags.value
    .filter((t) => !t.deletedAt && (t.area === ui.area || t.area === 'both'))
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
    area: existing?.area ?? ui.area,
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
  if (confirm(`¿Seguro que querés archivar la categoría "${c.name}"?`)) {
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
    area: existing?.area ?? ui.area,
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
  if (confirm(`¿Seguro que querés archivar la etiqueta "${t.name}"?`)) {
    await removeTag(t.id)
  }
}

async function removeTag(id: string) {
  await mutateDomain({ entityType: 'tag', entityId: id, operation: 'delete', table: 'tags', record: { id } })
}
</script>

<style scoped>
.organize-view {
  display: grid;
  gap: 24px;
}
@media (min-width: 768px) {
  .organize-view {
    grid-template-columns: 1fr 1fr;
    align-items: start;
    gap: 32px;
  }
  .head {
    grid-column: 1 / -1;
  }
}
.head h2 {
  font-family: var(--display);
  font-size: 1.8rem;
  font-weight: 600;
  margin: 0;
}

.section-block {
  display: grid;
  gap: 12px;
}
.section-block h3 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
}

.form-card {
  padding: 16px;
  background: var(--surface);
  display: grid;
  gap: 12px;
}
.form-card .field {
  margin-bottom: 0;
}
.form-actions {
  display: flex;
  gap: 8px;
}

.rows-list {
  display: grid;
  gap: 8px;
}
.row-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
}
.row-info {
  display: grid;
  gap: 2px;
}
.row-name {
  font-size: 1rem;
  font-weight: 600;
}
.sub-label {
  font-size: 0.75rem;
}
.row-actions {
  display: flex;
  gap: 6px;
}
.btn-sm {
  min-height: 32px;
  padding: 0 10px;
  font-size: 0.8rem;
  border-radius: 8px;
}

.empty-state {
  text-align: center;
  padding: 16px;
  font-size: 0.9rem;
}
</style>
