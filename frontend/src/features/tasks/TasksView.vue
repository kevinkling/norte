<template>
  <section class="tasks-view">
    <header class="head">
      <h2>Tareas pendientes</h2>
      <button class="chip toggle-done-btn" type="button" :aria-pressed="showDone" @click="showDone = !showDone">
        {{ showDone ? 'Ocultar completadas' : 'Ver completadas' }}
      </button>
    </header>

    <SortableList :items="visible" :index="selected" @update:items="reorder" @select="selected = $event" @move="nudge">
      <template #item="{ element }">
        <AppCard class="task-card" @click="openActions(element)">
          <label class="done no-drag" @click.stop>
            <input type="checkbox" :checked="element.status === 'completada'" @change="toggle(element)" />
            <span :class="{ 'line-through': element.status === 'completada' }">{{ element.title }}</span>
          </label>
          <div class="task-info">
            <p class="task-meta">
              <span v-if="element.dueOn" class="due" :class="{ 'overdue': isOverdue(element.dueOn) }">
                Vence {{ formatDate(element.dueOn) }}
              </span>
              <span v-else class="muted">Sin fecha</span>
              <span v-if="element.recurrenceRule" class="bullet">·</span>
              <span v-if="element.recurrenceRule" class="recurrence">Recurrente</span>
            </p>
          </div>
          <button class="icon-btn action-trigger no-drag" type="button" aria-label="Acciones" @click.stop="openActions(element)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
          </button>
        </AppCard>
      </template>
    </SortableList>

    <p v-if="!visible.length" class="empty-state muted">
      No hay tareas pendientes.
    </p>

    <!-- FAB Nueva tarea -->
    <button class="fab" type="button" aria-label="Nueva tarea" @click="openNew">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
    </button>

    <!-- Hoja de acciones para Tarea -->
    <AppModal :open="actionsOpen" :title="activeTask?.title || 'Acciones'" @close="actionsOpen = false">
      <div class="actions-sheet">
        <p class="sheet-meta muted">
          {{ activeTask?.dueOn ? `Vence ${formatDate(activeTask.dueOn)}` : 'Sin fecha límite' }}
          <span v-if="activeTask?.recurrenceRule"> · Recurrente</span>
        </p>
        <div class="sheet-buttons">
          <button class="btn sheet-btn" type="button" @click="handleEdit">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            Editar tarea
          </button>
          <button class="btn btn-danger sheet-btn" type="button" @click="handleRemove">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
            Archivar tarea
          </button>
        </div>
      </div>
    </AppModal>

    <!-- Modal de Formulario (Alta/Edición) -->
    <AppModal :open="open" :title="editing ? 'Editar tarea' : 'Nueva tarea'" @close="open = false">
      <form class="form" @submit.prevent="save">
        <label class="field"><span>Título</span><input v-model="form.title" required placeholder="Ej. Revisar gotera del techo" /></label>
        <label class="field"><span>Área</span>
          <select v-model="form.area">
            <option value="casa">Casa</option>
            <option value="auto">Auto</option>
          </select>
        </label>
        <div class="grid-2">
          <label class="field"><span>Fecha límite</span><input v-model="form.dueOn" type="date" /></label>
          <label class="field"><span>Recurrencia</span>
            <select v-model="form.recurrenceRule">
              <option v-for="o in RECURRENCE_OPTIONS" :key="o.value" :value="o.value">{{ o.label }}</option>
            </select>
          </label>
        </div>
        <label class="field"><span>Notas</span><textarea v-model="form.notes" placeholder="Detalles de la tarea..."></textarea></label>
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
import { newId, nowIso, taskScope } from '../../db/ids'
import { mutateDomain } from '../../db/mutate'
import { useUiStore } from '../../stores/ui'
import type { Task } from '../../db/types'
import { needsRebalance, positionAfter, positionForMove, rebalancePositions } from '../../utils/position'
import { addInterval, RECURRENCE_OPTIONS } from '../../utils/recurrence'

const ui = useUiStore()
const showDone = ref(false)
const tasks = ref<Task[]>([])
const selected = ref(-1)
const open = ref(false)
const actionsOpen = ref(false)
const activeTask = ref<Task | null>(null)
const editing = ref<Task | null>(null)
const form = reactive({ title: '', area: ui.area, dueOn: '', recurrenceRule: '', notes: '' })

const visible = computed(() =>
  tasks.value
    .filter((t) => !t.deletedAt && t.area === ui.area && (showDone.value || t.status === 'pendiente'))
    .sort((a, b) => a.position - b.position || a.id.localeCompare(b.id)),
)

function formatDate(ymd: string) {
  try {
    const [y, m, d] = ymd.split('-')
    const date = new Date(Number(y), Number(m) - 1, Number(d))
    return date.toLocaleDateString('es', { day: 'numeric', month: 'short' })
  } catch {
    return ymd
  }
}

function isOverdue(ymd: string) {
  const today = nowIso().slice(0, 10)
  return ymd < today
}

watch(dataTick, async () => { tasks.value = await db.tasks.toArray() }, { immediate: true })

function resetForm() {
  Object.assign(form, { title: '', area: ui.area, dueOn: '', recurrenceRule: '', notes: '' })
}

function openActions(task: Task) {
  activeTask.value = task
  actionsOpen.value = true
}

function handleEdit() {
  if (!activeTask.value) return
  actionsOpen.value = false
  edit(activeTask.value)
}

async function handleRemove() {
  if (!activeTask.value) return
  if (confirm(`¿Seguro que querés archivar "${activeTask.value.title}"?`)) {
    actionsOpen.value = false
    await remove(activeTask.value.id)
  }
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
.tasks-view {
  display: grid;
  gap: 16px;
}
.head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}
.head h2 {
  font-family: var(--display);
  font-size: 1.8rem;
  font-weight: 600;
  margin: 0;
}
.toggle-done-btn {
  box-shadow: var(--shadow);
}

.task-card {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 14px;
  align-items: center;
  padding: 12px 16px;
  margin-bottom: 10px;
  cursor: pointer;
  transition: transform 0.15s ease;
}
.task-card:active {
  transform: scale(0.99);
}
.done {
  display: flex;
  align-items: center;
  gap: 12px;
  font-weight: 600;
  font-size: 1.05rem;
  cursor: pointer;
}
.done input {
  width: 20px;
  height: 20px;
  accent-color: var(--accent);
}
.line-through {
  text-decoration: line-through;
  color: var(--muted);
}
.task-info {
  grid-column: 2;
}
.task-meta {
  margin: 0;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  gap: 6px;
}
.due {
  font-weight: 700;
  color: var(--accent);
}
.due.overdue {
  color: var(--danger);
}
.bullet {
  color: var(--border);
}
.recurrence {
  color: var(--muted);
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
.submit-btn {
  margin-top: 8px;
  min-height: 48px;
  font-size: 1.05rem;
}
</style>
