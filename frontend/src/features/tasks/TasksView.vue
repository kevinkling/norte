<template>
  <section>
    <header class="head">
      <h2>Tareas</h2>
      <button class="btn btn-primary" type="button" @click="openNew">Nueva tarea</button>
    </header>
    <div class="chip-row">
      <button class="chip" type="button" :aria-pressed="area === 'casa'" @click="area = 'casa'">Casa</button>
      <button class="chip" type="button" :aria-pressed="area === 'auto'" @click="area = 'auto'">Auto</button>
      <button class="chip" type="button" :aria-pressed="showDone" @click="showDone = !showDone">Ver completadas</button>
    </div>
    <SortableList :items="visible" :index="selected" @update:items="reorder" @select="selected = $event" @move="nudge">
      <template #item="{ element }">
        <AppCard>
          <label class="done no-drag">
            <input type="checkbox" :checked="element.status === 'completada'" @change="toggle(element)" />
            <strong>{{ element.title }}</strong>
          </label>
          <p class="muted">{{ element.dueOn || 'Sin fecha' }} {{ element.recurrenceRule ? '· Recurrente' : '' }}</p>
          <div class="chip-row no-drag">
            <button class="btn" type="button" @click="edit(element)">Editar</button>
            <button class="btn btn-danger" type="button" @click="remove(element.id)">Archivar</button>
          </div>
        </AppCard>
      </template>
    </SortableList>
    <AppModal :open="open" :title="editing ? 'Editar tarea' : 'Nueva tarea'" @close="open = false">
      <form @submit.prevent="save">
        <label class="field"><span>Título</span><input v-model="form.title" required /></label>
        <label class="field"><span>Área</span>
          <select v-model="form.area"><option value="casa">Casa</option><option value="auto">Auto</option></select>
        </label>
        <label class="field"><span>Fecha límite</span><input v-model="form.dueOn" type="date" /></label>
        <label class="field"><span>Recurrencia</span>
          <select v-model="form.recurrenceRule">
            <option v-for="o in RECURRENCE_OPTIONS" :key="o.value" :value="o.value">{{ o.label }}</option>
          </select>
        </label>
        <label class="field"><span>Notas</span><textarea v-model="form.notes"></textarea></label>
        <button class="btn btn-primary" type="submit">Guardar</button>
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
import { newId, nowIso, taskScope } from '../../db/ids'
import { mutateDomain } from '../../db/mutate'
import type { Area, Task } from '../../db/types'
import { needsRebalance, positionAfter, positionForMove, rebalancePositions } from '../../utils/position'
import { addInterval, RECURRENCE_OPTIONS } from '../../utils/recurrence'

const area = ref<Area>('casa')
const showDone = ref(false)
const tasks = ref<Task[]>([])
const selected = ref(-1)
const open = ref(false)
const editing = ref<Task | null>(null)
const form = reactive({ title: '', area: 'casa' as Area, dueOn: '', recurrenceRule: '', notes: '' })

const visible = computed(() =>
  tasks.value
    .filter((t) => !t.deletedAt && t.area === area.value && (showDone.value || t.status === 'pendiente'))
    .sort((a, b) => a.position - b.position || a.id.localeCompare(b.id)),
)

watch(dataTick, async () => { tasks.value = await db.tasks.toArray() }, { immediate: true })

function resetForm() {
  Object.assign(form, { title: '', area: area.value, dueOn: '', recurrenceRule: '', notes: '' })
}
function openNew() {
  editing.value = null
  resetForm()
  open.value = true
}
function edit(task: Task) {
  editing.value = task
  Object.assign(form, {
    title: task.title, area: task.area, dueOn: task.dueOn ?? '',
    recurrenceRule: task.recurrenceRule ?? '', notes: task.notes,
  })
  open.value = true
}
async function save() {
  const id = editing.value?.id ?? newId()
  const rec: Task = {
    id,
    area: form.area,
    title: form.title,
    notes: form.notes,
    dueOn: form.dueOn || null,
    recurrenceRule: form.recurrenceRule || null,
    recurrenceRootId: editing.value?.recurrenceRootId ?? null,
    status: editing.value?.status ?? 'pendiente',
    completedAt: editing.value?.completedAt ?? null,
    orderScope: editing.value ? taskScope(form.area, editing.value.status) : taskScope(form.area, 'pendiente'),
    position: editing.value?.position ?? positionAfter(visible.value.at(-1)?.position),
    createdAt: editing.value?.createdAt ?? nowIso(),
    updatedAt: nowIso(),
    deletedAt: null,
    revision: editing.value?.revision ?? 0,
  }
  await mutateDomain({ entityType: 'task', entityId: id, operation: 'upsert', table: 'tasks', record: rec as unknown as Record<string, unknown> })
  open.value = false
}

async function toggle(task: Task) {
  if (task.status === 'pendiente') {
    await mutateDomain({
      entityType: 'task', entityId: task.id, operation: 'upsert', table: 'tasks',
      record: { ...task, status: 'completada', completedAt: nowIso(), orderScope: taskScope(task.area, 'completada') } as unknown as Record<string, unknown>,
    })
    if (task.recurrenceRule) {
      const base = task.dueOn || nowIso().slice(0, 10)
      const nextDue = addInterval(base, task.recurrenceRule)
      if (nextDue) {
        const id = newId()
        const rec: Task = {
          ...task, id, status: 'pendiente', completedAt: null, dueOn: nextDue,
          recurrenceRootId: task.recurrenceRootId ?? task.id,
          orderScope: taskScope(task.area, 'pendiente'),
          position: positionAfter(visible.value.at(-1)?.position),
          createdAt: nowIso(), updatedAt: nowIso(), deletedAt: null, revision: 0,
        }
        await mutateDomain({ entityType: 'task', entityId: id, operation: 'upsert', table: 'tasks', record: rec as unknown as Record<string, unknown> })
      }
    }
  } else {
    await mutateDomain({
      entityType: 'task', entityId: task.id, operation: 'upsert', table: 'tasks',
      record: { ...task, status: 'pendiente', completedAt: null, orderScope: taskScope(task.area, 'pendiente') } as unknown as Record<string, unknown>,
    })
  }
}

async function remove(id: string) {
  await mutateDomain({ entityType: 'task', entityId: id, operation: 'delete', table: 'tasks', record: { id } })
}
async function reorder(next: Task[]) {
  const movedIndex = next.findIndex((row, i) => row.id !== visible.value[i]?.id)
  if (movedIndex < 0) return
  const moved = next[movedIndex]
  const pos = positionForMove(next, movedIndex)
  await mutateDomain({ entityType: 'task', entityId: moved.id, operation: 'upsert', table: 'tasks', record: { ...moved, position: pos } as unknown as Record<string, unknown> })
  if (needsRebalance(next.map((x, i) => (i === movedIndex ? pos : x.position)))) {
    for (const row of rebalancePositions(next)) {
      const task = next.find((x) => x.id === row.id)
      if (task) await mutateDomain({ entityType: 'task', entityId: task.id, operation: 'upsert', table: 'tasks', record: { ...task, position: row.position } as unknown as Record<string, unknown> })
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
.head { display: flex; justify-content: space-between; align-items: center; }
.done { display: flex; gap: 8px; align-items: center; }
.done input { width: 20px; height: 20px; }
</style>
