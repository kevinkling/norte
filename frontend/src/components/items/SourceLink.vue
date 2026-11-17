<template>
  <a
    class="source-link no-drag"
    :data-source="info.source"
    :href="url"
    target="_blank"
    rel="noopener noreferrer"
    :aria-label="`Abrir en ${info.label}`"
    @click.stop
  >
    <span class="dot" aria-hidden="true"></span>
    <span class="label">{{ info.label }}</span>
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8"/></svg>
  </a>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { describeLink } from '../../utils/links'

const props = defineProps<{ url: string }>()
const info = computed(() => describeLink(props.url))
</script>

<style scoped>
.source-link {
  --src: var(--muted);
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 32px;
  padding: 0 10px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text);
  font-size: 0.78rem;
  font-weight: 700;
  text-decoration: none;
  max-width: 100%;
}
.source-link[data-source='instagram'] { --src: #c13584; }
.source-link[data-source='pinterest'] { --src: #e60023; }
.source-link[data-source='mercadolibre'] { --src: #e5c700; }
.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--src);
  flex: none;
}
.label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.source-link:active { background: var(--inset); }
</style>
