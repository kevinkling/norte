<template>
  <div>
    <draggable
      :model-value="items"
      item-key="id"
      :animation="reduced ? 0 : 180"
      :force-fallback="true"
      :fallback-on-body="true"
      :fallback-tolerance="8"
      :delay="200"
      :delay-on-touch-only="true"
      :touch-start-threshold="4"
      :scroll-sensitivity="80"
      filter=".no-drag"
      :prevent-on-filter="false"
      ghost-class="keep-ghost"
      chosen-class="keep-chosen"
      @start="clearSelection"
      @end="clearSelection"
      @update:modelValue="onUpdate"
    >
      <template #item="{ element, index: i }">
        <div class="row">
          <slot name="item" :element="element" :index="i" />
        </div>
      </template>
    </draggable>
  </div>
</template>
<script setup lang="ts" generic="T extends { id: string }">
import draggable from 'vuedraggable'

defineProps<{ items: T[] }>()
const emit = defineEmits<{ 'update:items': [T[]] }>()
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
function clearSelection() {
  window.getSelection()?.removeAllRanges()
}
function onUpdate(next: T[]) {
  emit('update:items', next)
}
</script>
<style scoped>
/* Arrastrar no debe seleccionar el texto de las filas (resaltado azul). */
.row {
  touch-action: manipulation;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
}
:deep(.keep-ghost) { opacity: 0.45; }
:deep(.keep-chosen) { background: var(--inset); }
</style>
