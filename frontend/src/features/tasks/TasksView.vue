<template>
  <section class="page">
    <div>
      <button class="chip" type="button" :aria-pressed="showDone" @click="showDone = !showDone">
        {{ showDone ? 'Ocultar completadas' : 'Ver completadas' }}
      </button>
    </div>

    <div v-if="visible.length" class="group">
      <TaskCard v-for="task in visible" :key="task.id" :task="task" :list-name="listName(task.listId)" @open="active = $event" @toggle="toggleTask" />
    </div>

    <p v-if="loaded && !visible.length" class="empty-state">No hay tareas pendientes.</p>

    <button class="fab" type="button" aria-label="Nueva tarea" @click="formOpen = true">
      <AppIcon name="plus" :size="24" :stroke="2.2" />
    </button>

    <TaskSheet :task="active" @close="active = null" />
    <TaskForm :open="formOpen" :task="null" :list-id="ui.currentListId" @close="formOpen = false" />
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import AppIcon from '../../components/ui/AppIcon.vue'
import TaskCard from '../../components/tasks/TaskCard.vue'
import TaskSheet from '../../components/tasks/TaskSheet.vue'
import TaskForm from './TaskForm.vue'
import type { Task } from '../../db/types'
import { useUiStore } from '../../stores/ui'
import { toggleTask } from '../lists/actions'
import { useNorteData } from '../lists/useData'

const ui = useUiStore()
const { tasks, loaded, listName } = useNorteData()
const showDone = ref(false)
const active = ref<Task | null>(null)
const formOpen = ref(false)

const visible = computed(() =>
  tasks.value
    .filter((t) => showDone.value || t.status === 'pendiente')
    .sort((a, b) => (a.dueOn ?? '9999').localeCompare(b.dueOn ?? '9999') || a.position - b.position),
)
</script>
