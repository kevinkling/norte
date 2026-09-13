<template>
  <section>
    <header class="head">
      <h2>{{ area === 'casa' ? 'Casa' : 'Auto' }}</h2>
      <button class="btn btn-primary" type="button" @click="openNew">Nuevo ítem</button>
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
          <p class="muted">{{ PRIORITY_LABEL[element.priority] }} · {{ pesos(element.estimatedCostMinor, element.currency) }}</p>
          <p v-if="element.targetMonth" class="muted">Mes objetivo {{ element.targetMonth }}</p>
          <div class="chip-row">
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
        <label class="field"><span>Costo estimado</span><input v-model="form.cost" inputmode="decimal" /></label>
        <label class="field"><span>Prioridad</span>
          <select v-model.number="form.priority">
            <option :value="1">Alta</option>
            <option :value="2">Media-alta</option>
            <option :value="3">Media</option>
            <option :value="4">Baja</option>
          </select>
        </label>
        <label class="field"><span>Mes objetivo</span><input v-model="form.targetMonth" type="month" /></label>
        <label class="field"><span>Estado</span>
          <select v-model="form.status">
            <option v-for="s in statuses" :key="s" :value="s">{{ s }}</option>
          </select>
        </label>
        <label class="field"><span>Link de referencia</span><input v-model="form.referenceUrl" type="url" /></label>
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
import type { Area, Category, Item, ItemStatus } from '../../db/types'
import { pesos, parsePesos, PRIORITY_LABEL } from '../../utils/money'
import { needsRebalance, positionAfter, positionForMove, rebalancePositions } from '../../utils/position'

const props = defineProps<{ area: Area }>()
const statuses: ItemStatus[] = ['idea', 'deseado', 'planificado', 'comprado']
const status = ref<ItemStatus>('deseado')
const q = ref('')
const items = ref<Item[]>([])
const categories = ref<Category[]>([])
const selected = ref(-1)
const formOpen = ref(false)
const editing = ref<Item | null>(null)
const photo = ref<File | null>(null)
const form = reactive({
  name: '', categoryId: null as string | null, cost: '', priority: 2 as 1|2|3|4,
  targetMonth: '', status: 'deseado' as ItemStatus, referenceUrl: '', description: '',
})
const router = useRouter()
const route = useRoute()

const visible = computed(() =>
  items.value
    .filter((i) => i.area === props.area && i.status === status.value && !i.deletedAt)
    .filter((i) => !q.value || i.name.toLowerCase().includes(q.value.toLowerCase()))
    .sort((a, b) => a.position - b.position || a.id.localeCompare(b.id)),
)

async function reload() {
  items.value = await db.items.toArray()
  categories.value = (await db.categories.toArray()).filter((c) => !c.deletedAt && (c.area === props.area || c.area === 'both'))
}
watch([dataTick, () => props.area], reload, { immediate: true })

function openNew() {
  editing.value = null
  photo.value = null
  Object.assign(form, { name: '', categoryId: null, cost: '', priority: 2, targetMonth: '', status: status.value, referenceUrl: '', description: '' })
  formOpen.value = true
}
function edit(item: Item) {
  editing.value = item
  Object.assign(form, {
    name: item.name, categoryId: item.categoryId, cost: item.estimatedCostMinor ? String(item.estimatedCostMinor / 100) : '',
    priority: item.priority, targetMonth: item.targetMonth ?? '', status: item.status,
    referenceUrl: item.referenceUrl, description: item.description,
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
  const rec: Item = {
    id,
    area: props.area,
    name: form.name,
    categoryId: form.categoryId,
    description: form.description,
    estimatedCostMinor: form.cost ? parsePesos(form.cost) : null,
    currency: 'ARS',
    priority: form.priority,
    targetMonth: form.targetMonth || null,
    status: st,
    referenceUrl: form.referenceUrl,
    orderScope: scope,
    position: editing.value && editing.value.status === st ? editing.value.position : positionAfter(last?.position),
    createdAt: editing.value?.createdAt ?? nowIso(),
    updatedAt: nowIso(),
    deletedAt: null,
    revision: editing.value?.revision ?? 0,
  }
  await mutateDomain({ entityType: 'item', entityId: id, operation: 'upsert', table: 'items', record: rec as unknown as Record<string, unknown> })
  if (photo.value) await savePhoto({ file: photo.value, role: 'cover', itemId: id })
  formOpen.value = false
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
h2 { text-transform: capitalize; }
.form { margin-top: 8px; }
</style>
