<template>
  <section class="inbox-view">
    <header class="head">
      <h2>Bandeja</h2>
      <p class="muted lead">Lo que guardás desde Instagram, Pinterest o Mercado Libre cae acá. Después lo pasás a una lista.</p>
    </header>

    <div class="paste neu">
      <button class="btn btn-primary paste-btn" type="button" :disabled="busy" @click="pasteFromClipboard">📋 Pegar link copiado</button>
      <form class="manual" @submit.prevent="saveManual">
        <input v-model="manual" type="url" inputmode="url" placeholder="…o escribilo acá: https://" aria-label="Link a guardar" />
        <button class="btn" type="submit" :disabled="!manual.trim() || busy">Guardar</button>
      </form>
      <p v-if="message" class="msg" role="status">{{ message }}</p>
    </div>

    <div class="rows">
      <div v-for="item in pending" :key="item.id" class="row">
        <ItemCard :item="item" :photo="photos[item.id]" @open="active = $event" @toggle="setItemBought($event, true)" />
        <button class="btn move-btn" type="button" @click="moving = item">Mover a una lista →</button>
      </div>
      <TaskCard v-for="task in pendingTasks" :key="task.id" :task="task" @open="activeTask = $event" @toggle="toggleTask" />
    </div>

    <p v-if="loaded && !pending.length && !pendingTasks.length" class="empty-state muted">
      La bandeja está vacía. Compartí un link desde el iPhone con el Atajo “Guardar en Norte” o pegalo arriba.
    </p>

    <ItemSheet :item="active" @close="active = null" />
    <TaskSheet :task="activeTask" @close="activeTask = null" />
    <ListPicker :open="Boolean(moving)" title="Mover a…" @close="moving = null" @pick="moveTo" />
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
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
.inbox-view {
  display: grid;
  gap: 18px;
}
.head h2 {
  font-family: var(--display);
  font-size: 1.8rem;
  font-weight: 600;
  margin: 0;
}
.lead {
  margin: 6px 0 0;
  font-size: 0.92rem;
}
.paste {
  display: grid;
  gap: 10px;
  padding: 12px;
}
.paste-btn {
  min-height: 48px;
  width: 100%;
  justify-content: center;
  font-size: 1rem;
}
.manual {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
}
.manual input {
  min-height: 44px;
  min-width: 0;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface);
  color: var(--text);
  padding: 0 12px;
  font: inherit;
}
.msg {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 600;
}
.rows {
  display: grid;
  gap: 12px;
}
.row {
  display: grid;
  gap: 6px;
}
.move-btn {
  min-height: 38px;
  font-size: 0.85rem;
  justify-self: end;
}
.empty-state {
  text-align: center;
  padding: 32px 16px;
}
</style>
