<template>
  <AppModal :open="open" :title="task ? 'Editar tarea' : 'Nueva tarea'" @close="$emit('close')">
    <form class="form" @submit.prevent="save">
      <label class="field"><span>Qué hay que hacer</span><input v-model="form.title" required placeholder="Ej. Limpiar la PC" /></label>
      <label class="field"><span>Lista</span>
        <select v-model="form.listId">
          <option :value="null">📥 Bandeja</option>
          <option v-for="l in lists" :key="l.id" :value="l.id">{{ listLabel(l) }}</option>
        </select>
      </label>
      <div class="grid-2">
        <label class="field"><span>Fecha límite</span><input v-model="form.dueOn" type="date" /></label>
        <label class="field"><span>Se repite</span>
          <select v-model="form.recurrenceRule">
            <option v-for="o in RECURRENCE_OPTIONS" :key="o.value" :value="o.value">{{ o.label }}</option>
          </select>
        </label>
      </div>
      <label class="field"><span>Notas</span><textarea v-model="form.notes" placeholder="Detalles…"></textarea></label>
      <div class="form-actions"><button class="btn btn-primary" type="submit">Guardar</button></div>
    </form>
  </AppModal>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import AppModal from '../../components/ui/AppModal.vue'
import { newId, nowIso, taskScope } from '../../db/ids'
import { mutateDomain } from '../../db/mutate'
import type { List, Task } from '../../db/types'
import { RECURRENCE_OPTIONS } from '../../utils/recurrence'
import { listLabel, liveLists, nextPosition } from '../lists/actions'

const props = defineProps<{ open: boolean; task: Task | null; listId: string | null }>()
const emit = defineEmits<{ close: [] }>()

const lists = ref<List[]>([])
const form = reactive({ title: '', listId: null as string | null, dueOn: '', recurrenceRule: '', notes: '' })

watch(() => props.open, async (open) => {
  if (!open) return
  lists.value = await liveLists()
  const t = props.task
  Object.assign(form, t
    ? { title: t.title, listId: t.listId, dueOn: t.dueOn ?? '', recurrenceRule: t.recurrenceRule ?? '', notes: t.notes }
    : { title: '', listId: props.listId, dueOn: '', recurrenceRule: '', notes: '' })
}, { immediate: true })

async function save() {
  const prev = props.task
  const status = prev?.status ?? 'pendiente'
  const scope = taskScope(form.listId, status)
  const rec: Task = {
    id: prev?.id ?? newId(),
    area: prev?.area ?? null,
    listId: form.listId,
    title: form.title.trim(),
    notes: form.notes,
    dueOn: form.dueOn || null,
    recurrenceRule: form.recurrenceRule || null,
    recurrenceRootId: prev?.recurrenceRootId ?? null,
    status,
    completedAt: prev?.completedAt ?? null,
    orderScope: scope,
    position: prev?.orderScope === scope ? prev.position : await nextPosition('tasks', scope),
    createdAt: prev?.createdAt ?? nowIso(),
    updatedAt: nowIso(),
    deletedAt: null,
    revision: prev?.revision ?? 0,
  }
  await mutateDomain({ entityType: 'task', entityId: rec.id, operation: 'upsert', table: 'tasks', record: rec as unknown as Record<string, unknown> })
  emit('close')
}
</script>
