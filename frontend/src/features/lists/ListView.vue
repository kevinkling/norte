<template>
  <section class="list-view">
    <header class="head">
      <h2>{{ list ? listLabel(list) : 'Lista' }}</h2>
      <button v-if="list" class="btn btn-sm" type="button" @click="editOpen = true">Editar lista</button>
    </header>

    <p v-if="loaded && !list" class="empty-state muted">
      Esta lista ya no existe. <RouterLink to="/">Ir al inicio</RouterLink>
    </p>

    <template v-else>
      <QuickAdd :list-id="listId" />

      <div class="section">
        <h3>Para comprar <span class="count">{{ toBuy.length }}</span></h3>
        <SortableList :items="toBuy" @update:items="(n) => reorderRows('item', 'items', toBuy, n)">
          <template #item="{ element }">
            <ItemCard :item="element" :photo="photos[element.id]" @open="activeItem = $event" @toggle="setItemBought($event, true)" />
          </template>
        </SortableList>
        <p v-if="!toBuy.length" class="hint muted">Nada para comprar. Escribí arriba o pegá un link.</p>
      </div>

      <div class="section">
        <h3>Para hacer <span class="count">{{ toDo.length }}</span></h3>
        <SortableList :items="toDo" @update:items="(n) => reorderRows('task', 'tasks', toDo, n)">
          <template #item="{ element }">
            <TaskCard :task="element" @open="activeTask = $event" @toggle="toggleTask" />
          </template>
        </SortableList>
        <p v-if="!toDo.length" class="hint muted">Nada pendiente. Tocá ✅ Hacer para anotar una tarea.</p>
      </div>

      <details v-if="done.length" class="section done-section">
        <summary>Hechos <span class="count">{{ done.length }}</span></summary>
        <div class="done-list">
          <template v-for="row in done" :key="row.id">
            <ItemCard v-if="'name' in row" :item="row" :photo="photos[row.id]" @open="activeItem = $event" @toggle="setItemBought($event, false)" />
            <TaskCard v-else :task="row" @open="activeTask = $event" @toggle="toggleTask" />
          </template>
        </div>
      </details>
    </template>

    <ItemSheet :item="activeItem" @close="activeItem = null" />
    <TaskSheet :task="activeTask" @close="activeTask = null" />

    <AppModal :open="editOpen" title="Editar lista" @close="editOpen = false">
      <form class="list-form" @submit.prevent="saveListEdit">
        <div class="row">
          <EmojiPicker v-model="editEmoji" />
          <label class="field"><span>Nombre</span><input v-model="editName" required /></label>
        </div>
        <button class="btn btn-primary" type="submit">Guardar</button>
        <button class="btn btn-danger" type="button" @click="archiveCurrent">Archivar lista</button>
        <p class="muted small">Al archivarla, lo que tenga pendiente pasa a la Bandeja.</p>
      </form>
    </AppModal>
  </section>
</template>

<script setup lang="ts">
import { askConfirm } from '../../app/confirm'
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import AppModal from '../../components/ui/AppModal.vue'
import EmojiPicker from '../../components/ui/EmojiPicker.vue'
import SortableList from '../../components/SortableList.vue'
import ItemCard from '../../components/items/ItemCard.vue'
import ItemSheet from '../../components/items/ItemSheet.vue'
import TaskCard from '../../components/tasks/TaskCard.vue'
import TaskSheet from '../../components/tasks/TaskSheet.vue'
import QuickAdd from './QuickAdd.vue'
import type { Item, Task } from '../../db/types'
import { useUiStore } from '../../stores/ui'
import { archiveList, listLabel, reorderRows, saveList, setItemBought, toggleTask } from './actions'
import { useNorteData } from './useData'

const props = defineProps<{ listId: string }>()
const ui = useUiStore()
const router = useRouter()
const { lists, items, tasks, photos, loaded } = useNorteData()

const list = computed(() => lists.value.find((l) => l.id === props.listId) ?? null)
const toBuy = computed(() => items.value.filter((i) => i.listId === props.listId && i.status !== 'comprado'))
const toDo = computed(() => tasks.value.filter((t) => t.listId === props.listId && t.status === 'pendiente'))
const done = computed<(Item | Task)[]>(() => [
  ...items.value.filter((i) => i.listId === props.listId && i.status === 'comprado'),
  ...tasks.value.filter((t) => t.listId === props.listId && t.status === 'completada'),
].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)))

const activeItem = ref<Item | null>(null)
const activeTask = ref<Task | null>(null)

const editOpen = ref(false)
const editName = ref('')
const editEmoji = ref('')

watch(() => props.listId, (id) => {
  ui.setList(id)
}, { immediate: true })

watch(editOpen, (open) => {
  if (open && list.value) {
    editName.value = list.value.name
    editEmoji.value = list.value.emoji
  }
})

async function saveListEdit() {
  await saveList({ id: props.listId, name: editName.value, emoji: editEmoji.value })
  editOpen.value = false
}

async function archiveCurrent() {
  if (!list.value) return
  if (!await askConfirm(`¿Archivar la lista "${list.value.name}"?`, { confirmLabel: 'Archivar' })) return
  await archiveList(props.listId)
  editOpen.value = false
  const next = lists.value.find((l) => l.id !== props.listId)
  router.push(next ? `/l/${next.id}` : '/bandeja')
}
</script>

<style scoped>
.list-view {
  display: grid;
  gap: 20px;
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
  overflow-wrap: anywhere;
}
.btn-sm {
  min-height: 36px;
  padding: 0 12px;
  font-size: 0.85rem;
  flex: none;
}
.section {
  display: grid;
  gap: 8px;
}
.section h3, .done-section summary {
  margin: 0;
  font-size: 0.8rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--muted);
  display: flex;
  align-items: center;
  gap: 8px;
}
.done-section summary {
  cursor: pointer;
  min-height: 40px;
}
.count {
  display: inline-grid;
  place-items: center;
  min-width: 22px;
  height: 22px;
  padding: 0 6px;
  border-radius: 999px;
  background: var(--inset);
  color: var(--text);
  font-size: 0.75rem;
}
.done-list {
  display: grid;
  gap: 8px;
  margin-top: 8px;
}
.hint {
  margin: 0;
  font-size: 0.9rem;
}
.empty-state {
  text-align: center;
  padding: 40px 20px;
}
.list-form {
  display: grid;
  gap: 12px;
  margin-top: 12px;
}
.list-form .row {
  display: grid;
  grid-template-columns: 80px 1fr;
  gap: 12px;
}
.small { margin: 0; font-size: 0.85rem; }
</style>
