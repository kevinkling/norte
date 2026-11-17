<template>
  <AppCard class="item-card" :class="{ done: item.status === 'comprado' }" @click="$emit('open', item)">
    <button
      class="check no-drag"
      type="button"
      :aria-pressed="item.status === 'comprado'"
      :aria-label="item.status === 'comprado' ? `Marcar ${item.name} como pendiente` : `Marcar ${item.name} como comprado`"
      @click.stop="$emit('toggle', item)"
    >
      <svg v-if="item.status === 'comprado'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6"><path d="M5 13l4 4L19 7"/></svg>
      <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
    </button>
    <img v-if="photo" :src="photo" :alt="''" class="thumb" />
    <div class="info">
      <strong class="name">{{ item.name }}</strong>
      <p v-if="item.estimatedCostMinor || listName || item.targetMonth" class="meta">
        <span v-if="item.estimatedCostMinor" class="price">{{ pesos(item.estimatedCostMinor, item.currency) }}</span>
        <span v-if="listName" class="muted">{{ listName }}</span>
      </p>
      <SourceLink v-if="item.referenceUrl" :url="item.referenceUrl" />
    </div>
    <button class="more no-drag" type="button" aria-label="Acciones" @click.stop="$emit('open', item)">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
    </button>
  </AppCard>
</template>

<script setup lang="ts">
import AppCard from '../ui/AppCard.vue'
import SourceLink from './SourceLink.vue'
import type { Item } from '../../db/types'
import { pesos } from '../../utils/money'

defineProps<{ item: Item; photo?: string; listName?: string }>()
defineEmits<{ open: [Item]; toggle: [Item] }>()
</script>

<style scoped>
.item-card {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 10px 12px;
  cursor: pointer;
}
.check {
  flex: none;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  border: 1.5px solid var(--border);
  background: var(--inset);
  color: var(--muted);
  display: grid;
  place-items: center;
}
.check svg { width: 20px; height: 20px; }
.check[aria-pressed='true'] {
  background: var(--ok);
  border-color: var(--ok);
  color: var(--surface);
}
.thumb {
  flex: none;
  width: 48px;
  height: 48px;
  border-radius: 10px;
  object-fit: cover;
  border: 1px solid var(--border);
}
.info {
  flex: 1;
  min-width: 0;
  display: grid;
  gap: 4px;
  justify-items: start;
}
.name {
  font-size: 1rem;
  font-weight: 650;
  overflow-wrap: anywhere;
}
.done .name {
  text-decoration: line-through;
  color: var(--muted);
}
.meta {
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 0.82rem;
}
.price { font-weight: 700; }
.more {
  flex: none;
  width: 40px;
  height: 40px;
  border: 0;
  background: transparent;
  color: var(--muted);
  border-radius: 12px;
  display: grid;
  place-items: center;
}
.more svg { width: 20px; height: 20px; }
.more:active { background: var(--inset); }
</style>
