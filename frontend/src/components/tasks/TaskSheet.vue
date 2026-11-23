<template>
  <AppModal :open="Boolean(task) && mode === 'menu'" :title="task?.title || 'Acciones'" @close="$emit('close')">
    <div v-if="task" class="sheet">
      <button class="btn sheet-btn" type="button" @click="mode = 'edit'">Editar</button>
      <button class="btn sheet-btn" type="button" @click="mode = 'move'">Mover a otra lista</button>
      <button class="btn btn-danger sheet-btn" type="button" @click="archive">Eliminar</button>
    </div>
  </AppModal>

  <TaskForm :open="Boolean(task) && mode === 'edit'" :task="task" :list-id="task?.listId ?? null" @close="done" />

  <ListPicker
    :open="Boolean(task) && mode === 'move'"
    title="Mover a…"
    :current="task?.listId ?? null"
    include-inbox
    @close="done"
    @pick="move"
  />
</template>

<script setup lang="ts">
import { askConfirm } from '../../app/confirm'
import { ref, watch } from 'vue'
import AppModal from '../ui/AppModal.vue'
import ListPicker from '../ListPicker.vue'
import TaskForm from '../../features/tasks/TaskForm.vue'
import type { Task } from '../../db/types'
import { moveTaskToList, remove } from '../../features/lists/actions'

const props = defineProps<{ task: Task | null }>()
const emit = defineEmits<{ close: [] }>()
const mode = ref<'menu' | 'edit' | 'move'>('menu')

watch(() => props.task?.id, () => { mode.value = 'menu' })

function done() {
  mode.value = 'menu'
  emit('close')
}

async function move(listId: string | null) {
  if (props.task) await moveTaskToList(props.task, listId)
  done()
}

async function archive() {
  if (!props.task) return
  if (!await askConfirm(`¿Eliminar "${props.task.title}"?`, { confirmLabel: 'Eliminar' })) return
  await remove('task', 'tasks', props.task.id)
  done()
}
</script>

<style scoped>
.sheet {
  display: grid;
  gap: 10px;
  padding: 8px 0;
}
.sheet-btn {
  width: 100%;
  justify-content: center;
  min-height: 48px;
  font-size: 1rem;
}
</style>
