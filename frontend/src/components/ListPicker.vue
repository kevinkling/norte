<template>
  <AppModal :open="open" :title="title" @close="$emit('close')">
    <div class="picker">
      <button
        v-if="includeInbox"
        class="btn option"
        type="button"
        :aria-pressed="current === null"
        @click="$emit('pick', null)"
      >📥 Bandeja</button>
      <button
        v-for="l in lists"
        :key="l.id"
        class="btn option"
        type="button"
        :aria-pressed="current === l.id"
        @click="$emit('pick', l.id)"
      >{{ listLabel(l) }}</button>
      <form class="new-list" @submit.prevent="create">
        <EmojiPicker v-model="emoji" />
        <input v-model="name" aria-label="Nombre de la nueva lista" placeholder="Nueva lista (ej. Setup)" />
        <button class="btn btn-primary" type="submit" :disabled="!name.trim()">Crear</button>
      </form>
    </div>
  </AppModal>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import AppModal from './ui/AppModal.vue'
import EmojiPicker from './ui/EmojiPicker.vue'
import { dataTick } from '../app/bus'
import type { List } from '../db/types'
import { listLabel, liveLists, saveList } from '../features/lists/actions'

const props = withDefaults(defineProps<{ open: boolean; title?: string; current?: string | null; includeInbox?: boolean }>(), {
  title: 'Elegí una lista',
  current: undefined,
  includeInbox: false,
})
const emit = defineEmits<{ close: []; pick: [string | null] }>()
const lists = ref<List[]>([])
const name = ref('')
const emoji = ref('')

watch([dataTick, () => props.open], async () => { lists.value = await liveLists() }, { immediate: true })

async function create() {
  if (!name.value.trim()) return
  const id = await saveList({ name: name.value, emoji: emoji.value })
  name.value = ''
  emoji.value = ''
  emit('pick', id)
}
</script>

<style scoped>
.picker {
  display: grid;
  gap: 8px;
  margin-top: 8px;
}
.option {
  justify-content: flex-start;
  width: 100%;
  min-height: 48px;
  font-size: 1rem;
}
.option[aria-pressed='true'] {
  border-color: var(--accent);
  color: var(--accent);
}
.new-list {
  display: grid;
  grid-template-columns: 56px 1fr auto;
  gap: 8px;
  margin-top: 8px;
  padding-top: 12px;
  border-top: 1px solid var(--border);
}
.new-list input {
  min-height: 44px;
  min-width: 0;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--inset);
  color: var(--text);
  padding: 0 12px;
  font: inherit;
}
.emoji-input { text-align: center; }
</style>
