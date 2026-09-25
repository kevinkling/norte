<template>
  <Teleport to="body">
    <div v-if="open" class="backdrop" @click.self="close">
      <div class="neu dialog" role="dialog" aria-modal="true" :aria-labelledby="titleId">
        <header>
          <h2 :id="titleId">{{ title }}</h2>
          <button class="btn" type="button" aria-label="Cerrar" @click="close">Cerrar</button>
        </header>
        <slot />
      </div>
    </div>
  </Teleport>
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
  --shell-gap: 12px;
  --shell-bar: 64px;
  --safe-bottom: env(safe-area-inset-bottom, 0px);
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  display: grid;
  place-items: end center;
  z-index: 200;
  padding: 12px;
  padding-bottom: calc(var(--shell-gap) + var(--safe-bottom) + var(--shell-bar) + var(--shell-gap));
}
.dialog {
  width: min(640px, 100%);
  max-height: calc(100dvh - 24px - var(--shell-gap) - var(--safe-bottom) - var(--shell-bar) - var(--shell-gap));
  overflow: auto;
  padding: 16px;
}
header { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
h2 { margin: 0 0 8px; font-size: 1.2rem; }
@media (min-width: 900px) {
  .backdrop {
    place-items: center;
    padding: 24px;
  }
  .dialog {
    max-height: min(92vh, calc(100dvh - 48px));
  }
}
</style>
