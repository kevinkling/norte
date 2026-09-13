<template>
  <div v-if="open" class="backdrop" @click.self="close">
    <div class="neu dialog" role="dialog" aria-modal="true" :aria-labelledby="titleId">
      <header>
        <h2 :id="titleId">{{ title }}</h2>
        <button class="btn" type="button" aria-label="Cerrar" @click="close">Cerrar</button>
      </header>
      <slot />
    </div>
  </div>
</template>
<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'

const props = defineProps<{ open: boolean; title: string }>()
const emit = defineEmits<{ close: [] }>()
const titleId = 'dialog-title'
function close() { emit('close') }
function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.open) close()
}
onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => window.removeEventListener('keydown', onKey))
</script>
<style scoped>
.backdrop {
  position: fixed; inset: 0; background: rgba(15, 23, 42, 0.45);
  display: grid; place-items: end center; z-index: 30; padding: 12px;
}
.dialog { width: min(640px, 100%); max-height: 92vh; overflow: auto; padding: 16px; }
header { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
h2 { margin: 0 0 8px; font-size: 1.2rem; }
@media (min-width: 800px) {
  .backdrop { place-items: center; }
}
</style>
