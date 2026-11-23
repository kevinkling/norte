<template>
  <Teleport to="body">
    <div v-if="open" class="backdrop" @click.self="close">
      <div class="dialog" role="dialog" aria-modal="true" :aria-labelledby="titleId">
        <header class="dialog-head">
          <h2 :id="titleId">{{ title }}</h2>
          <button class="icon-btn is-muted" type="button" aria-label="Cerrar" @click="close">
            <AppIcon name="x" />
          </button>
        </header>
        <slot />
      </div>
    </div>
  </Teleport>
</template>
<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import AppIcon from './AppIcon.vue'

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
/* En el celular la hoja sale desde abajo pero sin tapar la barra inferior. */
.backdrop {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: grid;
  place-items: end center;
  padding: var(--sp-3);
  padding-bottom: calc(var(--nav-h) + var(--sp-3) + env(safe-area-inset-bottom, 0px));
  background: var(--scrim);
}
.dialog {
  width: min(560px, 100%);
  max-height: calc(100dvh - var(--nav-h) - var(--sp-6) - env(safe-area-inset-bottom, 0px));
  overflow: auto;
  padding: var(--sp-2) var(--sp-4) var(--sp-4);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r-lg);
  box-shadow: var(--shadow-float);
}
.dialog-head {
  position: sticky;
  top: calc(-1 * var(--sp-2));
  z-index: 1;
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  margin: 0 calc(-1 * var(--sp-2)) var(--sp-3) 0;
  padding-top: var(--sp-1);
  background: var(--surface);
}
h2 {
  flex: 1;
  min-width: 0;
  font-size: var(--fs-lg);
  font-weight: 600;
  overflow-wrap: anywhere;
}
@media (min-width: 900px) {
  .backdrop { place-items: center; padding: var(--sp-5); }
  .dialog { max-height: min(88vh, calc(100dvh - 48px)); }
}
</style>
