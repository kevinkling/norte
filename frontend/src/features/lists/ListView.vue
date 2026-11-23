<template>
  <section class="page">
    <Teleport v-if="list" defer to="#page-actions">
      <button class="icon-btn" type="button" aria-label="Editar lista" title="Editar lista" @click="editOpen = true">
        <AppIcon name="more" />
      </button>
    </Teleport>

    <p v-if="loaded && !list" class="empty-state">
      Esta lista ya no existe. <RouterLink to="/">Ir al inicio</RouterLink>
    </p>

    <template v-else>
      <QuickAdd :list-id="listId" />

      <div class="section">
        <h2 class="sec-h">Para comprar <span class="count">{{ toBuy.length }}</span>
          <span v-if="toBuyTotal" class="aside">{{ pesos(toBuyTotal) }}</span>
        </h2>
        <SortableList v-if="toBuy.length" class="group" :items="toBuy" @update:items="(n) => reorderRows('item', 'items', toBuy, n)">
          <template #item="{ element }">
            <ItemCard :item="element" :photo="photos[element.id]" @open="activeItem = $event" @toggle="setItemBought($event, true)" />
          </template>
        </SortableList>
        <p v-else class="hint">Nada para comprar. Escribí arriba o pegá un link.</p>
      </div>

      <div class="section">
        <h2 class="sec-h">Para hacer <span class="count">{{ toDo.length }}</span></h2>
        <SortableList v-if="toDo.length" class="group" :items="toDo" @update:items="(n) => reorderRows('task', 'tasks', toDo, n)">
          <template #item="{ element }">
            <TaskCard :task="element" @open="activeTask = $event" @toggle="toggleTask" />
          </template>
        </SortableList>
        <p v-else class="hint">Nada pendiente. Elegí ✅ Hacer arriba para anotar una tarea.</p>
      </div>

      <details v-if="done.length" class="section done-section">
        <summary class="sec-h">
          <AppIcon class="caret" name="chevron-right" :size="14" :stroke="2.4" />
          Hechos <span class="count">{{ done.length }}</span>
        </summary>
        <div class="group">
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
      <form class="form" @submit.prevent="saveListEdit">
        <div class="name-row">
          <EmojiPicker v-model="editEmoji" />
          <input v-model="editName" class="input" aria-label="Nombre de la lista" required />
        </div>
        <div class="form-actions">
          <button class="btn btn-danger" type="button" @click="archiveCurrent">
            <AppIcon name="archive" :size="18" />Archivar
          </button>
          <span class="spacer"></span>
          <button class="btn btn-primary" type="submit">Guardar</button>
        </div>
        <p class="hint">Al archivarla, lo que tenga pendiente pasa a la Bandeja.</p>
      </form>
    </AppModal>
  </section>
</template>

<script setup lang="ts">
import { askConfirm } from '../../app/confirm'
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from '../../components/ui/AppIcon.vue'
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
import { pesos } from '../../utils/money'
import { archiveList, reorderRows, saveList, setItemBought, toggleTask } from './actions'
import { useNorteData } from './useData'

const props = defineProps<{ listId: string }>()
const ui = useUiStore()
const router = useRouter()
const { lists, items, tasks, photos, loaded } = useNorteData()

const list = computed(() => lists.value.find((l) => l.id === props.listId) ?? null)
const toBuy = computed(() => items.value.filter((i) => i.listId === props.listId && i.status !== 'comprado'))
const toBuyTotal = computed(() => toBuy.value.reduce((s, i) => s + (i.estimatedCostMinor ?? 0), 0))
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
.done-section summary {
  cursor: pointer;
  list-style: none;
  min-height: var(--h-sm);
  align-items: center;
}
.done-section summary::-webkit-details-marker { display: none; }
.done-section .caret { transition: transform var(--ease); }
.done-section[open] .caret { transform: rotate(90deg); }
.name-row {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: var(--sp-2);
}
</style>
