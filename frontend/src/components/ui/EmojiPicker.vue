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
  width: var(--h-ctl);
  height: var(--h-ctl);
  border: 1px solid var(--border);
  border-radius: var(--r-md);
  background: var(--surface);
  color: var(--text);
  font-size: 1.25rem;
  line-height: 1;
}
.emoji-btn[aria-expanded='true'] { border-color: var(--accent); }
.emoji-panel {
  grid-column: 1 / -1;
  order: 99;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(36px, 1fr));
  gap: 2px;
  max-height: 180px;
  overflow-y: auto;
  padding: var(--sp-2);
  border: 1px solid var(--border);
  border-radius: var(--r-md);
  background: var(--bg);
}
.emoji-opt {
  height: var(--h-icon);
  border: 0;
  border-radius: var(--r-sm);
  background: transparent;
  font-size: 1.25rem;
}
.emoji-opt:hover,
.emoji-opt[aria-selected='true'] { background: var(--inset); }
.emoji-opt.clear {
  grid-column: 1 / -1;
  font-size: var(--fs-sm);
  font-weight: 600;
  color: var(--muted);
}
</style>
