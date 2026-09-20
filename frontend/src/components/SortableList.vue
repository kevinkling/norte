<template>
  <div>
    <div class="toolbar">
      <button class="btn" type="button" :disabled="index <= 0" @click="$emit('move', -1)">Subir</button>
      <button class="btn" type="button" :disabled="index < 0 || index >= total - 1" @click="$emit('move', 1)">Bajar</button>
    </div>
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
      @update:modelValue="onUpdate"
    >
      <template #item="{ element, index: i }">
        <div class="row" :class="{ selected: i === index }" @click="$emit('select', i)">
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
.row { margin-bottom: 8px; touch-action: manipulation; }
.selected :deep(.card) { outline: 2px solid var(--accent); }
:deep(.keep-ghost) { opacity: 0.45; }
:deep(.keep-chosen) { transform: scale(1.02); }
</style>
