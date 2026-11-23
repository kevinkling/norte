<template>
  <div class="emoji-root">
    <button
      class="emoji-btn"
      type="button"
      :aria-expanded="open"
      aria-label="Elegir emoji"
      @click="open = !open"
    >{{ modelValue || '✨' }}</button>
    <div v-if="open" class="emoji-panel" role="listbox" aria-label="Emojis">
      <button
        v-for="e in EMOJIS"
        :key="e"
        class="emoji-opt"
        type="button"
        role="option"
        :aria-selected="e === modelValue"
        @click="pick(e)"
      >{{ e }}</button>
      <button class="emoji-opt clear" type="button" @click="pick('')">Sin emoji</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

defineProps<{ modelValue: string }>()
const emit = defineEmits<{ 'update:modelValue': [string] }>()
const open = ref(false)

const EMOJIS = [
  '🏠', '🛋️', '🛏️', '🚿', '🍳', '🧺', '🧹', '🔧', '🔨', '🪴',
  '🚗', '⛽', '🛞', '🏍️', '🚲', '✈️', '🧳', '🏖️', '🏔️', '🗺️',
  '🛒', '🍎', '🥦', '🍖', '🍞', '☕', '🍕', '🍷', '🎂', '💊',
  '💻', '🖥️', '⌨️', '🖱️', '🎧', '📱', '🔌', '💡', '🎮', '📷',
  '📚', '📝', '📌', '📎', '📦', '🎁', '👕', '👟', '💼', '🎒',
  '💰', '💳', '🧾', '📈', '🏦', '❤️', '⭐', '🔥', '🎯', '✨',
  '🏋️', '⚽', '🎵', '🎬', '🐶', '🐱', '👨‍👩‍👧', '🎓', '🩺', '📅',
]

function pick(e: string) {
  emit('update:modelValue', e)
  open.value = false
}
</script>

<style scoped>
.emoji-root { display: contents; }
.emoji-btn {
  min-height: 44px;
  min-width: 0;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--inset);
  color: var(--text);
  font-size: 1.4rem;
  cursor: pointer;
}
.emoji-btn[aria-expanded='true'] { border-color: var(--accent); }
.emoji-panel {
  grid-column: 1 / -1;
  order: 99;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(40px, 1fr));
  gap: 4px;
  max-height: 180px;
  overflow-y: auto;
  padding: 8px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--inset);
}
.emoji-opt {
  min-height: 40px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  font-size: 1.3rem;
  cursor: pointer;
}
.emoji-opt:hover,
.emoji-opt[aria-selected='true'] { background: var(--border); }
.emoji-opt.clear {
  grid-column: 1 / -1;
  font-size: 0.85rem;
  color: var(--text);
}
</style>
