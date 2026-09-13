<template>
  <div>
    <div class="toolbar">
      <button class="btn" type="button" :disabled="index <= 0" @click="$emit('move', -1)">Subir</button>
      <button class="btn" type="button" :disabled="index < 0 || index >= total - 1" @click="$emit('move', 1)">Bajar</button>
    </div>
    <draggable
      :model-value="items"
      item-key="id"
      handle=".handle"
      :animation="reduced ? 0 : 180"
      @update:modelValue="onUpdate"
    >
      <template #item="{ element, index: i }">
        <div class="row" :class="{ selected: i === index }" @click="$emit('select', i)">
          <button class="handle btn" type="button" aria-label="Arrastrar para reordenar">::</button>
          <slot name="item" :element="element" :index="i" />
        </div>
      </template>
    </draggable>
  </div>
</template>
<script setup lang="ts" generic="T extends { id: string }">
import { computed } from 'vue'
import draggable from 'vuedraggable'

const props = defineProps<{ items: T[]; index: number }>()
const emit = defineEmits<{ 'update:items': [T[]]; select: [number]; move: [number] }>()
const total = computed(() => props.items.length)
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
function onUpdate(next: T[]) {
  emit('update:items', next)
}
</script>
<style scoped>
.toolbar { display: flex; gap: 8px; margin-bottom: 8px; }
.row { display: grid; grid-template-columns: 44px 1fr; gap: 8px; align-items: stretch; margin-bottom: 8px; }
.selected { outline: 2px solid var(--accent); border-radius: 12px; }
.handle { font-weight: 700; }
</style>
