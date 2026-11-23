<template>
  <AppModal :open="open" :title="title" @close="$emit('close')">
    <div class="picker">
      <div class="group">
        <button
          v-if="includeInbox"
          class="list-row"
          type="button"
          :aria-pressed="current === null"
          @click="$emit('pick', null)"
        >
          <span class="emoji" aria-hidden="true">📥</span>
          <span class="row-main row-title">Bandeja</span>
          <AppIcon v-if="current === null" class="sel" name="check" :size="18" />
        </button>
        <button
          v-for="l in lists"
          :key="l.id"
          class="list-row"
          type="button"
          :aria-pressed="current === l.id"
          @click="$emit('pick', l.id)"
        >
          <span class="emoji" aria-hidden="true">{{ l.emoji || '•' }}</span>
          <span class="row-main row-title">{{ l.name }}</span>
          <AppIcon v-if="current === l.id" class="sel" name="check" :size="18" />
        </button>
      </div>
      <form class="new-list" @submit.prevent="create">
        <EmojiPicker v-model="emoji" />
        <div class="composer">
          <input v-model="name" aria-label="Nombre de la nueva lista" placeholder="Nueva lista (ej. Setup)" />
          <button class="icon-btn is-fill" type="submit" :disabled="!name.trim()" aria-label="Crear lista">
            <AppIcon name="plus" :size="18" :stroke="2.2" />
          </button>
        </div>
      </form>
    </div>
  </AppModal>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import AppIcon from './ui/AppIcon.vue'
import AppModal from './ui/AppModal.vue'
import EmojiPicker from './ui/EmojiPicker.vue'
import { dataTick } from '../app/bus'
import type { List } from '../db/types'
import { liveLists, saveList } from '../features/lists/actions'

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
.picker { display: grid; gap: var(--sp-4); }
.emoji { width: 24px; text-align: center; font-size: 1.15rem; flex: none; }
.list-row[aria-pressed='true'] .row-title { font-weight: 600; }
.sel { color: var(--accent); }
.new-list {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: var(--sp-2);
}
</style>
