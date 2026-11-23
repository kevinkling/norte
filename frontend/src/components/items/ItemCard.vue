<template>
  <div class="list-row is-link item-row" :class="{ done: item.status === 'comprado' }" @click="$emit('open', item)">
    <button
      class="row-check no-drag"
      type="button"
      :aria-pressed="item.status === 'comprado'"
      :aria-label="item.status === 'comprado' ? `Marcar ${item.name} como pendiente` : `Marcar ${item.name} como comprado`"
      @click.stop="$emit('toggle', item)"
    >
      <AppIcon v-if="item.status === 'comprado'" name="check" :size="14" :stroke="3" />
    </button>
    <img v-if="photo" :src="photo" alt="" class="thumb" />
    <div class="row-main">
      <span class="row-title">{{ item.name }}</span>
      <span v-if="listName || item.referenceUrl" class="row-meta">
        <span v-if="listName">{{ listName }}</span>
        <SourceLink v-if="item.referenceUrl" :url="item.referenceUrl" />
      </span>
    </div>
    <span v-if="item.estimatedCostMinor" class="row-end price">{{ pesos(item.estimatedCostMinor, item.currency) }}</span>
  </div>
</template>

<script setup lang="ts">
import AppIcon from '../ui/AppIcon.vue'
import SourceLink from './SourceLink.vue'
import type { Item } from '../../db/types'
import { pesos } from '../../utils/money'

defineProps<{ item: Item; photo?: string; listName?: string }>()
defineEmits<{ open: [Item]; toggle: [Item] }>()
</script>

<style scoped>
.thumb {
  flex: none;
  width: 40px;
  height: 40px;
  border-radius: var(--r-sm);
  object-fit: cover;
  background: var(--inset);
}
.done .row-title { color: var(--muted); text-decoration: line-through; }
.done .price { color: var(--muted); font-weight: 400; }
.done .thumb { opacity: 0.6; }
</style>
