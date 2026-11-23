<template>
  <div class="list-row is-link task-row" :class="{ done: task.status === 'completada' }" @click="$emit('open', task)">
    <button
      class="row-check is-square no-drag"
      type="button"
      :aria-pressed="task.status === 'completada'"
      :aria-label="task.status === 'completada' ? `Reabrir ${task.title}` : `Completar ${task.title}`"
      @click.stop="$emit('toggle', task)"
    >
      <AppIcon v-if="task.status === 'completada'" name="check" :size="14" :stroke="3" />
    </button>
    <div class="row-main">
      <span class="row-title">{{ task.title }}</span>
      <span v-if="task.dueOn || task.recurrenceRule || listName" class="row-meta">
        <span v-if="task.dueOn" :class="{ overdue: task.status === 'pendiente' && task.dueOn < today }">Vence {{ formatDate(task.dueOn) }}</span>
        <span v-if="task.recurrenceRule">Se repite</span>
        <span v-if="listName">{{ listName }}</span>
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import AppIcon from '../ui/AppIcon.vue'
import type { Task } from '../../db/types'

defineProps<{ task: Task; listName?: string }>()
defineEmits<{ open: [Task]; toggle: [Task] }>()

const today = new Date().toISOString().slice(0, 10)

function formatDate(ymd: string) {
  const [y, m, d] = ymd.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return Number.isNaN(date.getTime()) ? ymd : date.toLocaleDateString('es', { day: 'numeric', month: 'short' })
}
</script>

<style scoped>
.done .row-title { color: var(--muted); text-decoration: line-through; }
.overdue { color: var(--danger); font-weight: 600; }
</style>
