<template>
  <section class="page">
    <p class="lead">Lo que compartís desde Instagram, Pinterest o Mercado Libre cae acá. Después lo pasás a una lista.</p>

    <form class="capture" @submit.prevent="saveManual">
      <div class="composer">
        <button class="icon-btn is-muted lead-icon" type="button" :disabled="busy" aria-label="Pegar link copiado" title="Pegar link copiado" @click="pasteFromClipboard">
          <AppIcon name="clipboard" :size="18" />
        </button>
        <input v-model="manual" type="url" inputmode="url" placeholder="Pegá o escribí un link" aria-label="Link a guardar" />
        <button class="icon-btn is-fill" type="submit" :disabled="!manual.trim() || busy" aria-label="Guardar link">
          <AppIcon name="arrow-up" :size="18" :stroke="2.2" />
        </button>
      </div>
      <p v-if="message" class="hint" role="status">{{ message }}</p>
    </form>

    <div v-if="pending.length || pendingTasks.length" class="section">
      <h2 class="sec-h">Sin ordenar <span class="count">{{ pending.length + pendingTasks.length }}</span></h2>
      <div class="group">
        <div v-for="item in pending" :key="item.id" class="with-action">
          <ItemCard :item="item" :photo="photos[item.id]" @open="active = $event" @toggle="setItemBought($event, true)" />
          <button class="icon-btn move-btn" type="button" aria-label="Mover a una lista" title="Mover a una lista" @click="moving = item">
            <AppIcon name="move" />
          </button>
        </div>
        <TaskCard v-for="task in pendingTasks" :key="task.id" :task="task" @open="activeTask = $event" @toggle="toggleTask" />
      </div>
    </div>

    <p v-if="loaded && !pending.length && !pendingTasks.length" class="empty-state">
      La bandeja está vacía. Compartí un link desde el iPhone con el Atajo “Guardar en Norte” o pegalo arriba.
    </p>

    <ItemSheet :item="active" @close="active = null" />
    <TaskSheet :task="activeTask" @close="activeTask = null" />
    <ListPicker :open="Boolean(moving)" title="Mover a…" @close="moving = null" @pick="moveTo" />
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import AppIcon from '../../components/ui/AppIcon.vue'
import ItemCard from '../../components/items/ItemCard.vue'
import ItemSheet from '../../components/items/ItemSheet.vue'
import TaskCard from '../../components/tasks/TaskCard.vue'
import TaskSheet from '../../components/tasks/TaskSheet.vue'
import ListPicker from '../../components/ListPicker.vue'
import type { Item, Task } from '../../db/types'
import { extractUrl } from '../../utils/links'
import { createItem, findItemByUrl, moveItemToList, setItemBought, toggleTask } from '../lists/actions'
import { useNorteData } from '../lists/useData'

const { items, tasks, photos, loaded, listName } = useNorteData()
const pending = computed(() => items.value.filter((i) => i.listId === null && i.status !== 'comprado'))
const pendingTasks = computed(() => tasks.value.filter((t) => t.listId === null && t.status === 'pendiente'))

const active = ref<Item | null>(null)
const activeTask = ref<Task | null>(null)
const moving = ref<Item | null>(null)
const manual = ref('')
const message = ref('')
const busy = ref(false)

async function saveUrl(raw: string) {
  const url = extractUrl(raw)
  if (!url) {
    message.value = 'No encontré un link en lo que pegaste.'
    return
  }
  busy.value = true
  try {
    const existing = await findItemByUrl(url)
    if (existing) {
      message.value = `Ya lo tenías guardado en ${listName(existing.listId)}: “${existing.name}”.`
      return
    }
    const item = await createItem({ listId: null, url })
    message.value = `Guardado: “${item.name}”.`
    manual.value = ''
  } finally {
    busy.value = false
  }
}

async function pasteFromClipboard() {
  try {
    const text = await navigator.clipboard.readText()
    await saveUrl(text)
  } catch {
    message.value = 'No pude leer el portapapeles. Pegá el link en el campo de abajo.'
  }
}

async function saveManual() {
  await saveUrl(manual.value)
}

async function moveTo(listId: string | null) {
  if (moving.value) await moveItemToList(moving.value, listId)
  moving.value = null
}
</script>

<style scoped>
.capture { display: grid; gap: var(--sp-2); }
/* La fila del ítem deja lugar a la derecha para el botón Mover. */
.with-action { position: relative; }
.with-action :deep(.list-row) { padding-right: 52px; }
.move-btn {
  position: absolute;
  right: var(--sp-2);
  top: 50%;
  transform: translateY(-50%);
  color: var(--muted);
}
</style>
