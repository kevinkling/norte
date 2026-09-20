<template>
  <section>
    <header class="head">
      <h2>Categorías y etiquetas</h2>
    </header>
    <div class="chip-row">
      <button class="chip" type="button" :aria-pressed="area === 'casa'" @click="area = 'casa'">Casa</button>
      <button class="chip" type="button" :aria-pressed="area === 'auto'" @click="area = 'auto'">Auto</button>
    </div>

    <h3>Categorías</h3>
    <form class="neu form" @submit.prevent="saveCategory">
      <label class="field"><span>{{ editingCategory ? 'Renombrar categoría' : 'Nueva categoría' }}</span>
        <input v-model="catName" required />
      </label>
      <div class="chip-row">
        <button class="btn btn-primary" type="submit">{{ editingCategory ? 'Guardar' : 'Agregar' }}</button>
        <button v-if="editingCategory" class="btn" type="button" @click="cancelCat">Cancelar</button>
      </div>
    </form>
    <AppCard v-for="c in visibleCats" :key="c.id" class="row">
      <strong>{{ c.name }}</strong>
      <p v-if="c.parentId" class="muted">Subcategoría</p>
      <div class="chip-row">
        <button class="btn" type="button" @click="startEditCat(c)">Renombrar</button>
        <button class="btn btn-danger" type="button" @click="removeCategory(c.id)">Archivar</button>
      </div>
    </AppCard>

    <h3>Etiquetas</h3>
    <form class="neu form" @submit.prevent="saveTag">
      <label class="field"><span>{{ editingTag ? 'Renombrar etiqueta' : 'Nueva etiqueta' }}</span>
        <input v-model="tagName" required />
      </label>
      <div class="chip-row">
        <button class="btn btn-primary" type="submit">{{ editingTag ? 'Guardar' : 'Agregar' }}</button>
        <button v-if="editingTag" class="btn" type="button" @click="cancelTag">Cancelar</button>
      </div>
    </form>
    <AppCard v-for="t in visibleTags" :key="t.id" class="row">
      <strong>{{ t.name }}</strong>
      <div class="chip-row">
        <button class="btn" type="button" @click="startEditTag(t)">Renombrar</button>
        <button class="btn btn-danger" type="button" @click="removeTag(t.id)">Archivar</button>
      </div>
    </AppCard>
    <p v-if="!visibleTags.length" class="muted">No hay etiquetas en {{ area }}. Agregá una para clasificar ítems.</p>
  </section>
</template>
<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AppCard from '../../components/ui/AppCard.vue'
import { dataTick } from '../../app/bus'
import { db } from '../../db/norte.db'
import { newId, nowIso } from '../../db/ids'
import { mutateDomain } from '../../db/mutate'
import type { Area, Category, Tag } from '../../db/types'
import { positionAfter } from '../../utils/position'

const area = ref<Area>('casa')
const cats = ref<Category[]>([])
const tags = ref<Tag[]>([])
const catName = ref('')
const tagName = ref('')
const editingCategory = ref<Category | null>(null)
const editingTag = ref<Tag | null>(null)

const visibleCats = computed(() =>
  cats.value
    .filter((c) => !c.deletedAt && (c.area === area.value || c.area === 'both'))
    .sort((a, b) => a.position - b.position || a.name.localeCompare(b.name)),
)
const visibleTags = computed(() =>
  tags.value
    .filter((t) => !t.deletedAt && (t.area === area.value || t.area === 'both'))
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
    area: existing?.area ?? area.value,
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
    area: existing?.area ?? area.value,
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
async function removeTag(id: string) {
  await mutateDomain({ entityType: 'tag', entityId: id, operation: 'delete', table: 'tags', record: { id } })
}
</script>
<style scoped>
.head { display: flex; justify-content: space-between; align-items: center; }
.form { padding: 16px; margin-bottom: 12px; }
.row { margin-bottom: 8px; }
h3 { margin-top: 20px; }
</style>
