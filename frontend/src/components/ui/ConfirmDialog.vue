<template>
  <Teleport to="body">
    <div v-if="confirmState.open" class="confirm-backdrop" @click.self="answerConfirm(false)">
      <div class="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-msg">
        <p id="confirm-msg" class="confirm-msg">{{ confirmState.message }}</p>
        <div class="confirm-actions">
          <button ref="cancelBtn" class="btn" type="button" @click="answerConfirm(false)">Cancelar</button>
          <button class="btn btn-danger" type="button" @click="answerConfirm(true)">{{ confirmState.confirmLabel }}</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { answerConfirm, confirmState } from '../../app/confirm'

const cancelBtn = ref<HTMLButtonElement | null>(null)

// El foco arranca en "Cancelar" para que un Enter distraído no borre nada.
watch(() => confirmState.open, async (open) => {
  if (!open) return
  await nextTick()
  cancelBtn.value?.focus()
})

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape' && confirmState.open) answerConfirm(false)
}
onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => window.removeEventListener('keydown', onKey))
</script>

<style scoped>
.confirm-backdrop {
  position: fixed;
  inset: 0;
  z-index: 300; /* por encima de los formularios (AppModal usa 200) */
  display: grid;
  place-items: center;
  padding: var(--sp-4);
  background: var(--scrim);
}
.confirm-dialog {
  width: min(400px, 100%);
  padding: var(--sp-4);
  display: grid;
  gap: var(--sp-4);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r-lg);
  box-shadow: var(--shadow-float);
}
.confirm-msg { margin: 0; line-height: 1.45; }
.confirm-actions { display: flex; justify-content: flex-end; gap: var(--sp-2); }
</style>
