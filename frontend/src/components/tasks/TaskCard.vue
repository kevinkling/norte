<template>
  <AppCard class="task-card" :class="{ done: task.status === 'completada' }" @click="$emit('open', task)">
    <button
      class="check no-drag"
      type="button"
      :aria-pressed="task.status === 'completada'"
      :aria-label="task.status === 'completada' ? `Reabrir ${task.title}` : `Completar ${task.title}`"
      @click.stop="$emit('toggle', task)"
    >
      <svg v-if="task.status === 'completada'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6"><path d="M5 13l4 4L19 7"/></svg>
    </button>
    <div class="info">
      <strong class="name">{{ task.title }}</strong>
      <p v-if="task.dueOn || task.recurrenceRule || listName" class="meta">
        <span v-if="task.dueOn" :class="{ overdue: task.status === 'pendiente' && task.dueOn < today }">Vence {{ formatDate(task.dueOn) }}</span>
        <span v-if="task.recurrenceRule" class="muted">Se repite</span>
        <span v-if="listName" class="muted">{{ listName }}</span>
      </p>
    </div>
    <button class="more no-drag" type="button" aria-label="Acciones" @click.stop="$emit('open', task)">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
    </button>
  </AppCard>
</template>

<script setup lang="ts">
import AppCard from '../ui/AppCard.vue'
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
.task-card {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 10px 12px;
  cursor: pointer;
}
.check {
  flex: none;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1.5px solid var(--border);
  background: var(--inset);
  color: var(--surface);
  display: grid;
  place-items: center;
}
.check svg { width: 20px; height: 20px; }
.check[aria-pressed='true'] {
  background: var(--ok);
  border-color: var(--ok);
}
.info {
  flex: 1;
  min-width: 0;
  display: grid;
  gap: 4px;
}
.name {
  font-size: 1rem;
  font-weight: 650;
  overflow-wrap: anywhere;
}
.done .name {
  text-decoration: line-through;
  color: var(--muted);
}
.meta {
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 0.82rem;
}
.overdue { color: var(--danger); font-weight: 700; }
.more {
  flex: none;
  width: 40px;
  height: 40px;
  border: 0;
  background: transparent;
  color: var(--muted);
  border-radius: 12px;
  display: grid;
  place-items: center;
}
.more svg { width: 20px; height: 20px; }
.more:active { background: var(--inset); }
</style>
