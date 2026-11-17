<template>
  <section class="tasks-view">
    <header class="head">
      <h2>Todas las tareas</h2>
      <button class="chip" type="button" :aria-pressed="showDone" @click="showDone = !showDone">
        {{ showDone ? 'Ocultar completadas' : 'Ver completadas' }}
      </button>
    </header>

    <div class="rows">
      <TaskCard v-for="task in visible" :key="task.id" :task="task" :list-name="listName(task.listId)" @open="active = $event" @toggle="toggleTask" />
    </div>

    <p v-if="loaded && !visible.length" class="empty-state muted">No hay tareas pendientes.</p>

    <button class="fab" type="button" aria-label="Nueva tarea" @click="formOpen = true">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
    </button>

    <TaskSheet :task="active" @close="active = null" />
    <TaskForm :open="formOpen" :task="null" :list-id="ui.currentListId" @close="formOpen = false" />
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
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
  flex-wrap: wrap;
}
.head h2 {
  font-family: var(--display);
  font-size: 1.8rem;
  font-weight: 600;
  margin: 0;
}
.rows {
  display: grid;
  gap: 8px;
}
.empty-state {
  text-align: center;
  padding: 40px 20px;
}
</style>
